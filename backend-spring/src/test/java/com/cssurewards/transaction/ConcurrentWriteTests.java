package com.cssurewards.transaction;

import static org.assertj.core.api.Assertions.assertThat;

import com.cssurewards.event.Event;
import com.cssurewards.event.EventRepository;
import com.cssurewards.event.EventService;
import com.cssurewards.event.dto.AwardPointsRequest;
import com.cssurewards.promotion.Promotion;
import com.cssurewards.promotion.PromotionRepository;
import com.cssurewards.transaction.dto.PurchaseRequest;
import com.cssurewards.transaction.dto.RedemptionRequest;
import com.cssurewards.user.RoleType;
import com.cssurewards.user.User;
import com.cssurewards.user.UserRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Timeout;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest
@Timeout(30)
class ConcurrentWriteTests {
    @Autowired UserRepository users;
    @Autowired EventRepository events;
    @Autowired PromotionRepository promotions;
    @Autowired TransactionRepository transactions;
    @Autowired TransactionService transactionService;
    @Autowired EventService eventService;
    @Autowired JdbcTemplate jdbc;

    private int member;
    private int other;
    private int manager;

    @BeforeEach
    void setup() {
        cleanup();
        member = users.save(new User("member01", "member@example.com", "unused", RoleType.REGULAR)).getId();
        other = users.save(new User("member02", "other@example.com", "unused", RoleType.REGULAR)).getId();
        manager = users.save(new User("manager1", "manager@example.com", "unused", RoleType.MANAGER)).getId();
        jdbc.update("UPDATE users SET points = 100 WHERE id = ?", member);
    }

    @AfterEach
    void cleanup() {
        jdbc.update("DELETE FROM transaction_promotions");
        jdbc.update("DELETE FROM user_promotions");
        jdbc.update("DELETE FROM transactions WHERE related_id IS NOT NULL");
        transactions.deleteAll();
        jdbc.update("DELETE FROM rsvps");
        jdbc.update("DELETE FROM organizer_events");
        events.deleteAll();
        promotions.deleteAll();
        jdbc.update("DELETE FROM reset_tokens");
        users.deleteAll();
    }

    @RepeatedTest(3)
    void concurrentRedemptionsCannotReserveMoreThanTheBalance() throws Exception {
        Runnable redeem = () -> transactionService.redeem(member, new RedemptionRequest("redemption", 70, null));
        assertThat(successfulAttempts(redeem, redeem)).isEqualTo(1);
        assertThat(transactions.sumPendingRedemptions(member)).isEqualTo(-70);
        assertThat(users.findById(member).orElseThrow().getPoints()).isEqualTo(100);
    }

    @RepeatedTest(3)
    void concurrentProcessingDebitsRedemptionOnlyOnce() throws Exception {
        int id = transactionService.redeem(member, new RedemptionRequest("redemption", 70, null)).id();
        Runnable process = () -> transactionService.processRedemption(id, manager);
        assertThat(successfulAttempts(process, process)).isEqualTo(1);
        assertThat(users.findById(member).orElseThrow().getPoints()).isEqualTo(30);
        assertThat(transactions.findById(id).orElseThrow().getOperatorId()).isEqualTo(manager);
    }

    @RepeatedTest(3)
    void concurrentGuestsCannotExceedEventCapacity() throws Exception {
        int id = event(1, 100).getId();
        assertThat(successfulAttempts(
            () -> eventService.addGuest(id, null, member, false, true),
            () -> eventService.addGuest(id, null, other, false, true))).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM rsvps WHERE event_id = ?", Integer.class, id))
            .isEqualTo(1);
    }

    @RepeatedTest(3)
    void concurrentAwardsCannotOverspendEventBudget() throws Exception {
        int id = event(2, 50).getId();
        jdbc.update("INSERT INTO rsvps(event_id, user_id) VALUES (?, ?)", id, member);
        Runnable award = () -> eventService.award(id, new AwardPointsRequest("event", 40, "member01", null),
            manager, true);
        assertThat(successfulAttempts(award, award)).isEqualTo(1);
        assertThat(events.findById(id).orElseThrow().getPointsRemain()).isEqualTo(10);
        assertThat(users.findById(member).orElseThrow().getPoints()).isEqualTo(140);
        assertThat(transactions.count()).isEqualTo(1);
    }

    @RepeatedTest(3)
    void concurrentPurchasesCannotReuseOneTimePromotion() throws Exception {
        Instant now = Instant.now();
        int id = promotions.save(new Promotion("Bonus", "Demo", now.minusSeconds(60), now.plusSeconds(3600),
            0, 0, 5, "one-time")).getId();
        Runnable purchase = () -> transactionService.purchase(new PurchaseRequest("member01", "purchase",
            new BigDecimal("1.00"), List.of(id), null), manager);
        assertThat(successfulAttempts(purchase, purchase)).isEqualTo(1);
        assertThat(users.findById(member).orElseThrow().getPoints()).isEqualTo(109);
        assertThat(transactions.count()).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM user_promotions", Integer.class)).isEqualTo(1);
    }

    @RepeatedTest(3)
    void concurrentSuspiciousFlagsAdjustPointsOnlyOnce() throws Exception {
        int id = transactions.save(Transaction.purchase(member, manager, new BigDecimal("10.00"),
            40, "demo", false)).getId();
        Runnable flag = () -> transactionService.setSuspicious(id, true);
        assertThat(successfulAttempts(flag, flag)).isEqualTo(2);
        assertThat(users.findById(member).orElseThrow().getPoints()).isEqualTo(60);
        assertThat(transactions.findById(id).orElseThrow().isSuspicious()).isTrue();
    }

    private Event event(int capacity, int budget) {
        Instant now = Instant.now();
        return events.save(new Event("Meetup", "Demo", "Hall", now.plusSeconds(3600),
            now.plusSeconds(7200), capacity, budget));
    }

    private int successfulAttempts(Runnable first, Runnable second) throws Exception {
        var ready = new CountDownLatch(2);
        var start = new CountDownLatch(1);
        var pool = Executors.newFixedThreadPool(2);
        try {
            var attempts = List.of(first, second).stream().map(action -> pool.submit(() -> {
                ready.countDown();
                if (!start.await(10, TimeUnit.SECONDS)) throw new AssertionError("Start timed out");
                try {
                    action.run();
                    return 1;
                } catch (ResponseStatusException exception) {
                    assertThat(exception.getStatusCode().value()).isIn(400, 409, 410);
                    return 0;
                }
            })).toList();
            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            int successes = 0;
            for (var attempt : attempts) successes += attempt.get(10, TimeUnit.SECONDS);
            return successes;
        } finally {
            start.countDown();
            pool.shutdownNow();
            assertThat(pool.awaitTermination(10, TimeUnit.SECONDS)).isTrue();
        }
    }
}
