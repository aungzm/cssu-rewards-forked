package com.cssurewards.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cssurewards.user.User;
import com.cssurewards.user.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class PasswordResetTests {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired ResetTokenRepository tokens;
    @Autowired ObjectMapper json;
    @Autowired PasswordEncoder passwords;

    @BeforeEach
    void createInactiveUser() {
        tokens.deleteAll();
        users.deleteAll();
        users.save(new User("member01", "member@mail.utoronto.ca", "Member"));
    }

    @Test
    void issuedTokenActivatesAccountAndCanOnlyBeUsedOnce() throws Exception {
        String response = mvc.perform(post("/auth/resets")
                .with(request -> { request.setRemoteAddr("192.0.2.21"); return request; })
                .contentType(MediaType.APPLICATION_JSON).content("{\"utorid\":\"member01\"}"))
            .andExpect(status().isAccepted()).andExpect(jsonPath("$.resetToken").isString())
            .andReturn().getResponse().getContentAsString();
        String token = json.readTree(response).get("resetToken").asText();

        mvc.perform(post("/auth/resets/" + token).contentType(MediaType.APPLICATION_JSON)
                .content("{\"utorid\":\"member01\",\"password\":\"NewPassword1!\"}"))
            .andExpect(status().isOk());
        User user = users.findByUtorid("member01").orElseThrow();
        assertThat(user.isActivated()).isTrue();
        assertThat(passwords.matches("NewPassword1!", user.getPassword())).isTrue();
        assertThat(tokens.findByUserId(user.getId())).isEmpty();

        mvc.perform(post("/auth/resets/" + token).contentType(MediaType.APPLICATION_JSON)
                .content("{\"utorid\":\"member01\",\"password\":\"NewPassword1!\"}"))
            .andExpect(status().isNotFound());
        mvc.perform(post("/auth/tokens").contentType(MediaType.APPLICATION_JSON)
                .content("{\"utorid\":\"member01\",\"password\":\"NewPassword1!\"}"))
            .andExpect(status().isOk());
    }

    @Test
    void wrongAccountAndExpiredTokenCannotActivate() throws Exception {
        User user = users.findByUtorid("member01").orElseThrow();
        tokens.save(new ResetToken("test-token", Instant.now().minusSeconds(10), user));
        mvc.perform(post("/auth/resets/test-token").contentType(MediaType.APPLICATION_JSON)
                .content("{\"utorid\":\"unknown1\",\"password\":\"NewPassword1!\"}"))
            .andExpect(status().isUnauthorized());
        mvc.perform(post("/auth/resets/test-token").contentType(MediaType.APPLICATION_JSON)
                .content("{\"utorid\":\"member01\",\"password\":\"NewPassword1!\"}"))
            .andExpect(status().isGone());
        assertThat(users.findByUtorid("member01").orElseThrow().isActivated()).isFalse();
    }
}
