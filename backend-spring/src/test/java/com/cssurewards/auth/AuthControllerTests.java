package com.cssurewards.auth;

import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cssurewards.user.RoleType;
import com.cssurewards.user.User;
import com.cssurewards.user.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerTests {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired PasswordEncoder passwords;
    @Autowired JwtDecoder decoder;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;

    @BeforeEach
    void createUser() {
        users.deleteAll();
        users.save(new User("clive123", "clive@example.com", passwords.encode("SuperUser123!"), RoleType.SUPERUSER));
    }

    @Test
    void loginReturnsValidOneHourTokenAndUpdatesLastLogin() throws Exception {
        String body = mvc.perform(post("/auth/tokens").contentType(MediaType.APPLICATION_JSON)
                .content("{\"utorid\":\"clive123\",\"password\":\"SuperUser123!\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").isString())
            .andExpect(jsonPath("$.expiresAt").isString())
            .andReturn().getResponse().getContentAsString();

        JsonNode response = json.readTree(body);
        var token = decoder.decode(response.get("token").asText());
        assertThat(token.getClaimAsString("utorid")).isEqualTo("clive123");
        assertThat(token.getClaimAsString("role")).isEqualTo("SUPERUSER");
        assertThat(token.getExpiresAt()).isAfter(Instant.now().plusSeconds(3500));
        assertThat(users.findByUtorid("clive123").orElseThrow().getLastLogin()).isNotNull();
    }

    @Test
    void badPasswordDoesNotUpdateLogin() throws Exception {
        mvc.perform(post("/auth/tokens").contentType(MediaType.APPLICATION_JSON)
                .content("{\"utorid\":\"clive123\",\"password\":\"bad\"}"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error").value("Invalid credentials."));
        assertThat(users.findByUtorid("clive123").orElseThrow().getLastLogin()).isNull();
    }

    @Test
    void inactiveAndUnknownAccountsHaveTheSameError() throws Exception {
        jdbc.update("UPDATE users SET activated = FALSE WHERE utorid = ?", "clive123");
        mvc.perform(post("/auth/tokens").contentType(MediaType.APPLICATION_JSON)
                .content("{\"utorid\":\"clive123\",\"password\":\"SuperUser123!\"}"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error").value("Invalid credentials."));
        mvc.perform(post("/auth/tokens").contentType(MediaType.APPLICATION_JSON)
                .content("{\"utorid\":\"unknown1\",\"password\":\"SuperUser123!\"}"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error").value("Invalid credentials."));
    }

    @Test
    void repeatedFailuresAreThrottled() throws Exception {
        for (int attempt = 0; attempt < 10; attempt++) {
            mvc.perform(post("/auth/tokens").with(request -> { request.setRemoteAddr("192.0.2.10"); return request; })
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"utorid\":\"clive123\",\"password\":\"bad\"}"))
                .andExpect(status().isUnauthorized());
        }
        mvc.perform(post("/auth/tokens").with(request -> { request.setRemoteAddr("192.0.2.10"); return request; })
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"utorid\":\"clive123\",\"password\":\"SuperUser123!\"}"))
            .andExpect(status().isTooManyRequests());
    }

    @Test
    void missingFieldsReturnValidationErrors() throws Exception {
        mvc.perform(post("/auth/tokens").contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error[*].path", hasItem("body.utorid")))
            .andExpect(jsonPath("$.error[*].path", hasItem("body.password")));
    }

    @Test
    void protectedRequestsRejectMissingAndInvalidTokens() throws Exception {
        mvc.perform(get("/users/me")).andExpect(status().isUnauthorized());
        mvc.perform(get("/users/me").header("Authorization", "Bearer invalid"))
            .andExpect(status().isUnauthorized());
    }
}
