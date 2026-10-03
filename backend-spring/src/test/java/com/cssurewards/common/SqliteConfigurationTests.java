package com.cssurewards.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.zaxxer.hikari.HikariDataSource;
import java.sql.SQLException;
import org.junit.jupiter.api.Test;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.dao.DataIntegrityViolationException;

class SqliteConfigurationTests {
    private final SqliteConfiguration configuration = new SqliteConfiguration();

    @Test
    void translatesSqliteConstraintAndLockResultCodes() {
        try (var dataSource = new HikariDataSource()) {
            var translator = configuration.sqliteJdbcTemplate(dataSource).getExceptionTranslator();
            assertThat(translator.translate("insert", "INSERT", new SQLException("constraint", null, 19)))
                .isInstanceOf(DataIntegrityViolationException.class);
            assertThat(translator.translate("update", "UPDATE", new SQLException("busy", null, 5)))
                .isInstanceOf(CannotAcquireLockException.class);
            assertThat(translator.translate("update", "UPDATE", new SQLException("locked", null, 6)))
                .isInstanceOf(CannotAcquireLockException.class);
        }
    }

    @Test
    void acceptsOneConnection() {
        try (var dataSource = new HikariDataSource()) {
            dataSource.setJdbcUrl("jdbc:sqlite:test.db");
            dataSource.setMaximumPoolSize(1);
            assertThatCode(() -> configuration.sqliteConnectionSafety(dataSource).afterSingletonsInstantiated())
                .doesNotThrowAnyException();
        }
    }

    @Test
    void rejectsConcurrentConnections() {
        try (var dataSource = new HikariDataSource()) {
            dataSource.setJdbcUrl("jdbc:sqlite:test.db");
            dataSource.setMaximumPoolSize(2);
            assertThatThrownBy(() -> configuration.sqliteConnectionSafety(dataSource).afterSingletonsInstantiated())
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("maximum-pool-size=1");
        }
    }

    @Test
    void rejectsAnotherDatabaseInSqliteProfile() {
        try (var dataSource = new HikariDataSource()) {
            dataSource.setJdbcUrl("jdbc:postgresql://localhost/rewards");
            dataSource.setMaximumPoolSize(1);
            assertThatThrownBy(() -> configuration.sqliteConnectionSafety(dataSource).afterSingletonsInstantiated())
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("jdbc:sqlite:");
        }
    }
}
