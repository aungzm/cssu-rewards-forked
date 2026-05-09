package com.cssurewards.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cssurewards.auth.ResetTokenRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
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
class UserProvisioningTests {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired ResetTokenRepository resetTokens;
    @Autowired PasswordEncoder passwords;
    @Autowired ObjectMapper json;

    @BeforeEach
    void setup() {
        resetTokens.deleteAll();
        users.deleteAll();
        users.save(new User("admin123", "admin@example.com", passwords.encode("Password123!"), RoleType.SUPERUSER));
        users.save(new User("jane1234", "jane@example.com", passwords.encode("Password123!"), RoleType.REGULAR));
    }

    String tokenFor(String utorid) throws Exception {
        String result = mvc.perform(post("/auth/tokens").contentType(MediaType.APPLICATION_JSON)
            .content("{\"utorid\":\"" + utorid + "\",\"password\":\"Password123!\"}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return "Bearer " + json.readTree(result).get("token").asText();
    }

    @Test
    void authorizedStaffCanCreateInactiveAccountWithOneTimeActivationToken() throws Exception {
        String body = "{\"name\":\"New Member\",\"utorid\":\"member01\",\"email\":\"member@mail.utoronto.ca\"}";
        String token = tokenFor("admin123");
        mvc.perform(post("/users").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.utorid").value("member01"))
            .andExpect(jsonPath("$.verified").value(false))
            .andExpect(jsonPath("$.resetToken").isString());
        assertThat(users.findByUtorid("member01").orElseThrow().isActivated()).isFalse();
        assertThat(resetTokens.findByUserId(users.findByUtorid("member01").orElseThrow().getId())).isPresent();
        mvc.perform(post("/users").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isConflict());
    }

    @Test
    void regularUserCannotCreateAccounts() throws Exception {
        mvc.perform(post("/users").header("Authorization", tokenFor("jane1234"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"New Member\",\"utorid\":\"member01\",\"email\":\"member@mail.utoronto.ca\"}"))
            .andExpect(status().isForbidden());
    }

    @Test
    void invalidEmailFailsValidation() throws Exception {
        mvc.perform(post("/users").header("Authorization", tokenFor("admin123"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"New Member\",\"utorid\":\"member01\",\"email\":\"other@example.com\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error[*].path").isArray());
    }
}
