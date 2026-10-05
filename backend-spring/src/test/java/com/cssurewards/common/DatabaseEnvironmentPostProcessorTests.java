package com.cssurewards.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.context.config.ConfigDataEnvironmentPostProcessor;
import org.springframework.mock.env.MockEnvironment;

class DatabaseEnvironmentPostProcessorTests {
    private final DatabaseEnvironmentPostProcessor processor = new DatabaseEnvironmentPostProcessor();

    @Test
    void sqliteUrlAutomaticallyAddsProfileWithoutRemovingOtherProfiles() {
        var environment = new MockEnvironment().withProperty("DATABASE_URL", "jdbc:sqlite:./rewards.db");
        environment.setActiveProfiles("demo");
        processor.postProcessEnvironment(environment, new SpringApplication());
        assertThat(environment.getActiveProfiles()).containsExactly("demo", "sqlite");
        assertThat(processor.getOrder()).isLessThan(ConfigDataEnvironmentPostProcessor.ORDER);
    }

    @Test
    void postgresUrlDoesNotEnableSqlite() {
        var environment = new MockEnvironment()
            .withProperty("DATABASE_URL", "jdbc:postgresql://localhost:5432/rewards");
        processor.postProcessEnvironment(environment, new SpringApplication());
        assertThat(environment.getActiveProfiles()).doesNotContain("sqlite");
    }

    @Test
    void absentDatabaseUrlPreservesLegacyConfiguration() {
        var environment = new MockEnvironment().withProperty("SQLITE_URL", "jdbc:sqlite:legacy.db");
        environment.setActiveProfiles("sqlite");
        processor.postProcessEnvironment(environment, new SpringApplication());
        assertThat(environment.getActiveProfiles()).containsExactly("sqlite");
    }

    @Test
    void rejectsConflictingLegacyProfileBeforeConnecting() {
        var environment = new MockEnvironment()
            .withProperty("DATABASE_URL", "jdbc:postgresql://localhost:5432/rewards")
            .withProperty("spring.profiles.active", "sqlite");
        assertThatThrownBy(() -> processor.postProcessEnvironment(environment, new SpringApplication()))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("Remove the legacy sqlite profile");
    }

    @Test
    void rejectsUnsupportedOrEmptyUrlsWithoutDisclosingSecrets() {
        for (String url : new String[] {"", "jdbc:sqlite:", "postgres://user:secret@example.com/rewards"}) {
            var environment = new MockEnvironment().withProperty("DATABASE_URL", url);
            assertThatThrownBy(() -> processor.postProcessEnvironment(environment, new SpringApplication()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("DATABASE_URL must start with")
                .hasMessageNotContaining("secret");
        }
    }

    @Test
    void absentUrlKeepsPostgresAsDefault() {
        var environment = new MockEnvironment();
        assertThatCode(() -> processor.postProcessEnvironment(environment, new SpringApplication()))
            .doesNotThrowAnyException();
        assertThat(environment.getActiveProfiles()).isEmpty();
    }
}
