package com.cssurewards.common;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("sqlite")
public class SqliteConfiguration {
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
