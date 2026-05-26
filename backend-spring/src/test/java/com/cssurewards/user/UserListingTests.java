package com.cssurewards.user;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
class UserListingTests {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired ResetTokenRepository tokens;
    @Autowired PasswordEncoder passwords;
    @Autowired ObjectMapper json;

    @BeforeEach
    void setup() {
        tokens.deleteAll();
        users.deleteAll();
        users.save(new User("cashier1", "cashier@example.com", passwords.encode("Password123!"), RoleType.CASHIER));
        users.save(new User("manager1", "manager@example.com", passwords.encode("Password123!"), RoleType.MANAGER));
        users.save(new User("regular1", "regular@example.com", passwords.encode("Password123!"), RoleType.REGULAR));
    }

    private String token(String utorid) throws Exception {
        String response = mvc.perform(post("/auth/tokens").contentType(MediaType.APPLICATION_JSON)
                .content("{\"utorid\":\"" + utorid + "\",\"password\":\"Password123!\"}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return "Bearer " + json.readTree(response).get("token").asText();
    }

    @Test
    void cashierListOmitsPrivateFields() throws Exception {
        mvc.perform(get("/users?role=regular&page=1&limit=1").header("Authorization", token("cashier1")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(1))
            .andExpect(jsonPath("$.results[0].utorid").value("regular1"))
            .andExpect(jsonPath("$.results[0].email").doesNotExist())
            .andExpect(jsonPath("$.results[0].points").doesNotExist());
    }

    @Test
    void managersSeeFullFieldsButRegularUsersCannotList() throws Exception {
        mvc.perform(get("/users?role=regular").header("Authorization", token("manager1")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.results[0].email").value("regular@example.com"));
        mvc.perform(get("/users").header("Authorization", token("regular1")))
            .andExpect(status().isForbidden());
        mvc.perform(get("/users?limit=101").header("Authorization", token("manager1")))
            .andExpect(status().isBadRequest());
    }
}
