package com.cssurewards.common;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.SQLErrorCodes;
import org.springframework.jdbc.support.SQLErrorCodeSQLExceptionTranslator;

@Configuration
@Profile("sqlite")
public class SqliteConfiguration {
    @Bean
    JdbcTemplate sqliteJdbcTemplate(HikariDataSource dataSource) {
        // SQLite reports numeric result codes rather than SQLState classes.
        // Match Spring's normal integrity/lock exceptions for native SQL too.
        var codes = new SQLErrorCodes();
        codes.setDataIntegrityViolationCodes("19");
        codes.setCannotAcquireLockCodes("5", "6");
        var jdbc = new JdbcTemplate(dataSource);
        jdbc.setExceptionTranslator(new SQLErrorCodeSQLExceptionTranslator(codes));
        return jdbc;
    }

    @Bean
    SmartInitializingSingleton sqliteConnectionSafety(HikariDataSource dataSource) {
        return () -> {
            if (!dataSource.getJdbcUrl().startsWith("jdbc:sqlite:")) {
                throw new IllegalStateException("The sqlite profile requires a jdbc:sqlite: URL");
            }
            if (dataSource.getMaximumPoolSize() != 1) {
                throw new IllegalStateException(
                    "The sqlite profile requires maximum-pool-size=1 to serialize service transactions");
            }
        };
    }
}
