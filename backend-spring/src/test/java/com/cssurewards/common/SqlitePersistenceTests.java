package com.cssurewards.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cssurewards.RewardsApplication;
import com.cssurewards.event.Event;
import com.cssurewards.event.EventRepository;
import com.cssurewards.transaction.Transaction;
import com.cssurewards.transaction.TransactionRepository;
import com.cssurewards.user.UserRepository;
import com.zaxxer.hikari.HikariDataSource;
import java.math.BigDecimal;
import java.nio.file.Path;
import java.time.Instant;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

class SqlitePersistenceTests {
    @TempDir Path directory;

    @Test
    void migratesBootstrapsAndRetainsDataAcrossApplicationRestarts() {
        Path database = directory.resolve("rewards.db");
        Instant start = Instant.parse("2030-01-02T12:34:56.123Z");
        int userId;
        int eventId;
        try (var context = start(database)) {
            var users = context.getBean(UserRepository.class);
            var events = context.getBean(EventRepository.class);
            var transactions = context.getBean(TransactionRepository.class);
            var user = users.findByUtorid("Demo0001").orElseThrow();
            userId = user.getId();
            user.updateProfile("Demo user", null, start.minusSeconds(86400));
            user.updateAvatar("demo-avatar");
            users.save(user);
            context.getBean(JdbcTemplate.class).update("UPDATE users SET points = 40 WHERE id = ?", userId);
            eventId = events.save(new Event("Persistent event", "Demo", "Hall", start,
                start.plusSeconds(3600), 2, 100)).getId();
            transactions.save(Transaction.purchase(userId, userId, new BigDecimal("2.50"), 40, "demo", false));
            assertConnectionSettings(context);
            // Driver properties must apply to replacement connections too.
            context.getBean(HikariDataSource.class).getHikariPoolMXBean().softEvictConnections();
            assertConnectionSettings(context);
        }

        assertThat(database).isRegularFile();
        try (var context = start(database)) {
            var users = context.getBean(UserRepository.class);
            var user = users.findById(userId).orElseThrow();
            assertThat(users.count()).isEqualTo(1);
            assertThat(user.getPoints()).isEqualTo(40);
            assertThat(user.getName()).isEqualTo("Demo user");
            assertThat(user.getAvatar()).isEqualTo("demo-avatar");
            assertThat(user.getBirthday()).isEqualTo(start.minusSeconds(86400));
            var events = context.getBean(EventRepository.class);
            assertThat(events.findById(eventId).orElseThrow().getStartTime()).isEqualTo(start);
            assertThat(events.findAll((root, query, cb) -> cb.greaterThan(root.get("startTime"), start.minusMillis(1))))
                .hasSize(1);
            assertThat(events.findAll((root, query, cb) -> cb.greaterThan(root.get("startTime"), start.plusMillis(1))))
                .isEmpty();
            assertThat(context.getBean(TransactionRepository.class).findAll().getFirst().getSpent())
                .isEqualByComparingTo("2.50");
            assertThat(context.getBean(Flyway.class).info().applied()).hasSize(5);
            assertThat(context.getBean(Flyway.class).info().pending()).isEmpty();
            assertConnectionSettings(context);
            var jdbc = context.getBean(JdbcTemplate.class);
            assertThatThrownBy(() -> jdbc.update(
                "INSERT INTO rsvps(event_id, user_id) VALUES (?, ?)", eventId, userId + 999))
                .isInstanceOf(DataIntegrityViolationException.class);
            jdbc.update("INSERT INTO rsvps(event_id, user_id) VALUES (?, ?)", eventId, userId);
            assertThatThrownBy(() -> jdbc.update(
                "INSERT INTO rsvps(event_id, user_id) VALUES (?, ?)", eventId, userId))
                .isInstanceOf(DataIntegrityViolationException.class);
            jdbc.update("DELETE FROM events WHERE id = ?", eventId);
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM rsvps", Integer.class)).isZero();
        }
    }

    private void assertConnectionSettings(ConfigurableApplicationContext context) {
        var jdbc = context.getBean(JdbcTemplate.class);
        assertThat(context.getBean(HikariDataSource.class).getMaximumPoolSize()).isEqualTo(1);
        assertThat(jdbc.queryForObject("PRAGMA foreign_keys", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("PRAGMA journal_mode", String.class)).isEqualTo("wal");
        assertThat(jdbc.queryForObject("PRAGMA busy_timeout", Integer.class)).isEqualTo(10000);
    }

    private ConfigurableApplicationContext start(Path database) {
        return new SpringApplicationBuilder(RewardsApplication.class).run(
            "--DATABASE_URL=jdbc:sqlite:" + database.toAbsolutePath(),
            "--server.port=0",
            "--app.jwt-secret=sqlite-persistence-test-only-secret-123456789",
            "--app.demo-mode=true",
            "--BOOTSTRAP_SUPERUSER_UTORID=Demo0001",
            "--BOOTSTRAP_SUPERUSER_EMAIL=demo@mail.utoronto.ca",
            "--BOOTSTRAP_SUPERUSER_PASSWORD=TestPassword123!");
    }
}
