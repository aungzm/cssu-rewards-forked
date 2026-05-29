package com.cssurewards.user;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
class UserManagementTests {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired ResetTokenRepository tokens;
    @Autowired PasswordEncoder passwords;
    @Autowired ObjectMapper json;

    @BeforeEach
    void setup() {
        tokens.deleteAll();
        users.deleteAll();
        users.save(new User("manager1", "manager@example.com", passwords.encode("Password123!"), RoleType.MANAGER));
        users.save(new User("cashier1", "cashier@example.com", passwords.encode("Password123!"), RoleType.CASHIER));
        users.save(new User("superusr", "super@example.com", passwords.encode("Password123!"), RoleType.SUPERUSER));
        users.save(new User("regular1", "regular@example.com", passwords.encode("Password123!"), RoleType.REGULAR));
    }

    private String token(String utorid) throws Exception {
        String response = mvc.perform(post("/auth/tokens").contentType(MediaType.APPLICATION_JSON)
                .content("{\"utorid\":\"" + utorid + "\",\"password\":\"Password123!\"}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return "Bearer " + json.readTree(response).get("token").asText();
    }

    @Test
    void cashierCanSeeOnlyPublicFieldsAndManagerSeesRedactedPassword() throws Exception {
        int id = users.findByUtorid("regular1").orElseThrow().getId();
        mvc.perform(get("/users/" + id).header("Authorization", token("cashier1")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.points").value(0))
            .andExpect(jsonPath("$.email").doesNotExist());
        mvc.perform(get("/users/" + id).header("Authorization", token("manager1")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.password").value("[redacted]"));
        mvc.perform(get("/users/" + id).header("Authorization", token("regular1")))
            .andExpect(status().isForbidden());
    }

    @Test
    void managerCannotPromoteToManagerOrSuperuser() throws Exception {
        int id = users.findByUtorid("regular1").orElseThrow().getId();
        mvc.perform(patch("/users/" + id).header("Authorization", token("manager1"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"manager\"}"))
            .andExpect(status().isForbidden());
        mvc.perform(patch("/users/" + id).header("Authorization", token("cashier1"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"cashier\"}"))
            .andExpect(status().isForbidden());
        mvc.perform(patch("/users/" + id).header("Authorization", token("superusr"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"manager\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("MANAGER"));
    }

    @Test
    void promotionToCashierClearsSuspiciousAndFalseVerifiedIsRejected() throws Exception {
        int id = users.findByUtorid("regular1").orElseThrow().getId();
        mvc.perform(patch("/users/" + id).header("Authorization", token("manager1"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"verified\":false}"))
            .andExpect(status().isBadRequest());
        mvc.perform(patch("/users/" + id).header("Authorization", token("superusr"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"suspicious\":true}"))
            .andExpect(status().isOk());
        mvc.perform(patch("/users/" + id).header("Authorization", token("manager1"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"cashier\"}"))
            .andExpect(status().isOk());
        org.assertj.core.api.Assertions.assertThat(users.findById(id).orElseThrow().isSuspicious()).isFalse();
    }
}
