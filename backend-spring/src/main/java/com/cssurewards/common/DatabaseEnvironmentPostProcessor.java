package com.cssurewards.common;

import java.util.Arrays;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.context.config.ConfigDataEnvironmentPostProcessor;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;

/** Select database-specific defaults before Spring loads profile configuration. */
public class DatabaseEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {
    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String url = environment.getProperty("DATABASE_URL");
        if (url == null) return;

        if (url.startsWith("jdbc:sqlite:") && url.length() > "jdbc:sqlite:".length()) {
            environment.addActiveProfile("sqlite");
        } else if (url.startsWith("jdbc:postgresql:")) {
            if (Arrays.asList(environment.getActiveProfiles()).contains("sqlite")) {
                throw new IllegalArgumentException(
                    "Remove the legacy sqlite profile when DATABASE_URL selects PostgreSQL");
            }
        } else {
            // Never include the supplied URL: it may contain credentials.
            throw new IllegalArgumentException(
                "DATABASE_URL must start with jdbc:sqlite: or jdbc:postgresql: and identify a database");
        }
    }

    @Override
    public int getOrder() {
        return ConfigDataEnvironmentPostProcessor.ORDER - 1;
    }
}
