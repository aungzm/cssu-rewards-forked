package com.cssurewards.transaction;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cssurewards.auth.ResetTokenRepository;
import com.cssurewards.user.RoleType;
import com.cssurewards.user.User;
import com.cssurewards.user.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.cssurewards.transaction.dto.TransferRequest;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class TransferTests {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired TransactionRepository transactions;
    @Autowired ResetTokenRepository tokens;
    @Autowired PasswordEncoder passwords;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @Autowired TransactionService service;

    @BeforeEach
    void setup() {
        transactions.deleteAll();
        tokens.deleteAll();
        users.deleteAll();
        users.save(new User("sender01", "sender@example.com", passwords.encode("Password123!"), RoleType.REGULAR));
        users.save(new User("target01", "target@example.com", passwords.encode("Password123!"), RoleType.REGULAR));
        jdbc.update("UPDATE users SET points = 100 WHERE utorid = 'sender01'");
    }

    @AfterEach
    void cleanup() {
        transactions.deleteAll();
    }

    private String token() throws Exception {
        String body = mvc.perform(post("/auth/tokens").contentType(MediaType.APPLICATION_JSON)
                .content("{\"utorid\":\"sender01\",\"password\":\"Password123!\"}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return "Bearer " + json.readTree(body).get("token").asText();
    }

    private int receiverId() {
        return users.findByUtorid("target01").orElseThrow().getId();
    }

    @Test
    void transferRecordsBothSidesAndPreservesTotalPoints() throws Exception {
        mvc.perform(post("/users/" + receiverId() + "/transactions")
                .header("Authorization", token()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"transfer\",\"amount\":40,\"remark\":\"gift\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.sender").value("sender01"))
            .andExpect(jsonPath("$.recipient").value("target01"))
            .andExpect(jsonPath("$.sent").value(40));
        assertThat(users.findByUtorid("sender01").orElseThrow().getPoints()).isEqualTo(60);
        assertThat(users.findByUtorid("target01").orElseThrow().getPoints()).isEqualTo(40);
        assertThat(transactions.findAll()).extracting(Transaction::getAmount).containsExactly(-40, 40);
    }

    @Test
    void overdrawAndSelfTransferLeaveBalancesUnchanged() throws Exception {
        String bearer = token();
        mvc.perform(post("/users/" + receiverId() + "/transactions")
                .header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"transfer\",\"amount\":101}"))
            .andExpect(status().isBadRequest());
        int senderId = users.findByUtorid("sender01").orElseThrow().getId();
        mvc.perform(post("/users/" + senderId + "/transactions")
                .header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"transfer\",\"amount\":1}"))
            .andExpect(status().isBadRequest());
        assertThat(users.findByUtorid("sender01").orElseThrow().getPoints()).isEqualTo(100);
        assertThat(transactions.count()).isZero();
    }

    @Test
    void malformedAmountsFailBeforeAnyWrite() throws Exception {
        mvc.perform(post("/users/" + receiverId() + "/transactions")
                .header("Authorization", token()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"transfer\",\"amount\":-1}"))
            .andExpect(status().isBadRequest());
        assertThat(transactions.count()).isZero();
    }

    @Test
    void concurrentTransfersCannotOverdrawSender() throws Exception {
        int sender = users.findByUtorid("sender01").orElseThrow().getId();
        int receiver = receiverId();
        CountDownLatch start = new CountDownLatch(1);
        var pool = Executors.newFixedThreadPool(2);
        try {
            var attempts = java.util.stream.IntStream.range(0, 2).mapToObj(i -> pool.submit(() -> {
                start.await();
                try {
                    service.transfer(sender, receiver, new TransferRequest("transfer", 70, null));
                    return true;
                } catch (org.springframework.web.server.ResponseStatusException exception) {
                    return false;
                }
            })).toList();
            start.countDown();
            assertThat(attempts.stream().filter(future -> {
                try {
                    return future.get(10, TimeUnit.SECONDS);
                } catch (Exception exception) {
                    throw new AssertionError(exception);
                }
            }).count()).isEqualTo(1);
            assertThat(users.findById(sender).orElseThrow().getPoints()).isEqualTo(30);
            assertThat(users.findById(receiver).orElseThrow().getPoints()).isEqualTo(70);
            assertThat(transactions.count()).isEqualTo(2);
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void ownHistoryIncludesOnlyOwnSideAndSupportsFiltering() throws Exception {
        String senderToken = token();
        mvc.perform(post("/users/" + receiverId() + "/transactions")
                .header("Authorization", senderToken).contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"transfer\",\"amount\":40}"))
            .andExpect(status().isCreated());
        mvc.perform(get("/users/me/transactions?type=transfer&amount=-40&operator=gte")
                .header("Authorization", senderToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(1))
            .andExpect(jsonPath("$.results[0].amount").value(-40))
            .andExpect(jsonPath("$.results[0].relatedId").value(receiverId()))
            .andExpect(jsonPath("$.results[0].createdBy").value("sender01"));
        mvc.perform(get("/users/me/transactions?type=redemption").header("Authorization", senderToken))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(0));
        mvc.perform(get("/users/me/transactions?limit=101").header("Authorization", senderToken))
            .andExpect(status().isBadRequest());
        mvc.perform(get("/users/me/transactions")).andExpect(status().isUnauthorized());
    }
}
