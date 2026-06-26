package com.cssurewards.promotion;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cssurewards.auth.ResetTokenRepository;
import com.cssurewards.transaction.TransactionRepository;
import com.cssurewards.user.RoleType;
import com.cssurewards.user.User;
import com.cssurewards.user.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import org.junit.jupiter.api.AfterEach;
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
class PromotionCreateTests {
    @Autowired MockMvc mvc;
    @Autowired PromotionRepository promotions;
    @Autowired TransactionRepository transactions;
    @Autowired ResetTokenRepository tokens;
    @Autowired UserRepository users;
    @Autowired PasswordEncoder passwords;
    @Autowired ObjectMapper json;

    @BeforeEach
    void setup() {
        promotions.deleteAll();
        transactions.deleteAll();
        tokens.deleteAll();
        users.deleteAll();
        users.save(new User("manager1", "manager@example.com", passwords.encode("Password123!"), RoleType.MANAGER));
        users.save(new User("regular1", "regular@example.com", passwords.encode("Password123!"), RoleType.REGULAR));
    }

    @AfterEach
    void cleanup() {
        promotions.deleteAll();
    }

    String token(String utorid) throws Exception {
        String response = mvc.perform(post("/auth/tokens").contentType(MediaType.APPLICATION_JSON)
                .content("{\"utorid\":\"" + utorid + "\",\"password\":\"Password123!\"}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return "Bearer " + json.readTree(response).get("token").asText();
    }

    @Test
    void managerCanCreatePromotionWithDefaults() throws Exception {
        String start = Instant.now().plusSeconds(3600).toString();
        String end = Instant.now().plusSeconds(7200).toString();
        mvc.perform(post("/promotions").header("Authorization", token("manager1"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Bonus\",\"description\":\"Test\",\"type\":\"automatic\",\"startTime\":\""
                    + start + "\",\"endTime\":\"" + end + "\"}"))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.name").value("Bonus"))
            .andExpect(jsonPath("$.points").value(0))
            .andExpect(jsonPath("$.rate").value(0));
        mvc.perform(post("/promotions").header("Authorization", token("regular1"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Bonus\",\"description\":\"Test\",\"type\":\"automatic\",\"startTime\":\""
                    + start + "\",\"endTime\":\"" + end + "\"}"))
            .andExpect(status().isForbidden());
    }

    @Test
    void rejectsPastAndReversedDates() throws Exception {
        String future = Instant.now().plusSeconds(3600).toString();
        String past = Instant.now().minusSeconds(3600).toString();
        String prefix = "{\"name\":\"Bonus\",\"description\":\"Test\",\"type\":\"one-time\",";
        String bearer = token("manager1");
        mvc.perform(post("/promotions").header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON)
                .content(prefix + "\"startTime\":\"" + past + "\",\"endTime\":\"" + future + "\"}"))
            .andExpect(status().isBadRequest());
        mvc.perform(post("/promotions").header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON)
                .content(prefix + "\"startTime\":\"" + future + "\",\"endTime\":\"" + past + "\"}"))
            .andExpect(status().isBadRequest());
    }
}
