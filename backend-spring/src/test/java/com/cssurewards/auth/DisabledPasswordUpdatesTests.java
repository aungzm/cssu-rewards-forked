package com.cssurewards.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cssurewards.user.RoleType;
import com.cssurewards.user.User;
import com.cssurewards.user.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = "app.password-updates-enabled=false")
@AutoConfigureMockMvc
class DisabledPasswordUpdatesTests {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired ResetTokenRepository tokens;
    @Autowired PasswordEncoder passwords;
    @Autowired ObjectMapper json;

    @Test
    void resetEndpointsAndAuthenticatedPasswordChangesCannotUpdatePasswords() throws Exception {
        tokens.deleteAll();
        users.deleteAll();
        users.save(new User("member01", "member@example.com", passwords.encode("Password123!"), RoleType.REGULAR));

        mvc.perform(post("/auth/resets").contentType(MediaType.APPLICATION_JSON)
                .content("{\"utorid\":\"member01\"}"))
            .andExpect(status().isNotFound());
        mvc.perform(post("/auth/resets/any-token").contentType(MediaType.APPLICATION_JSON)
                .content("{\"utorid\":\"member01\",\"password\":\"NewPassword1!\"}"))
            .andExpect(status().isNotFound());
        assertThat(tokens.count()).isZero();

        String login = mvc.perform(post("/auth/tokens").contentType(MediaType.APPLICATION_JSON)
                .content("{\"utorid\":\"member01\",\"password\":\"Password123!\"}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        mvc.perform(patch("/users/me/password")
                .header("Authorization", "Bearer " + json.readTree(login).get("token").asText())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"old\":\"Password123!\",\"new\":\"NewPassword1!\"}"))
            .andExpect(status().isNotFound());
        assertThat(passwords.matches("Password123!", users.findByUtorid("member01").orElseThrow().getPassword()))
            .isTrue();
    }
}
