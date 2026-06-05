package com.cssurewards.transaction;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cssurewards.auth.ResetTokenRepository;
import com.cssurewards.user.RoleType;
import com.cssurewards.user.User;
import com.cssurewards.user.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class RedemptionTests {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired ResetTokenRepository tokens;
    @Autowired TransactionRepository transactions;
    @Autowired PasswordEncoder passwords;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;

    @BeforeEach
    void setup() {
        transactions.deleteAll();
        tokens.deleteAll();
        users.deleteAll();
        users.save(new User("member01", "member@example.com", passwords.encode("Password123!"), RoleType.REGULAR));
        jdbc.update("UPDATE users SET points = 100 WHERE utorid = 'member01'");
    }

    @AfterEach
    void cleanup() {
        transactions.deleteAll();
    }

    private String bearer() throws Exception {
        String body = mvc.perform(post("/auth/tokens").contentType(MediaType.APPLICATION_JSON)
                .content("{\"utorid\":\"member01\",\"password\":\"Password123!\"}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return "Bearer " + json.readTree(body).get("token").asText();
    }

    @Test
    void pendingRequestsReserveBalanceWithoutDebitingUntilProcessing() throws Exception {
        String token = bearer();
        mvc.perform(post("/users/me/transactions").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"redemption\",\"amount\":70,\"remark\":\"first\"}"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.amount").value(70))
            .andExpect(jsonPath("$.processedBy").value(org.hamcrest.Matchers.nullValue()));
        mvc.perform(post("/users/me/transactions").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"redemption\",\"amount\":40}"))
            .andExpect(status().isBadRequest());
        mvc.perform(post("/users/me/transactions").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"redemption\",\"amount\":30}"))
            .andExpect(status().isCreated());
        assertThat(users.findByUtorid("member01").orElseThrow().getPoints()).isEqualTo(100);
        assertThat(transactions.count()).isEqualTo(2);
        assertThat(transactions.sumPendingRedemptions(users.findByUtorid("member01").orElseThrow().getId()))
            .isEqualTo(-100);
    }

    @Test
    void omittedAmountRedeemsAllAvailablePoints() throws Exception {
        mvc.perform(post("/users/me/transactions").header("Authorization", bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"redemption\"}"))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.amount").value(100));
    }
}
