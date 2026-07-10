package com.cssurewards.transaction;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cssurewards.auth.ResetTokenRepository;
import com.cssurewards.promotion.Promotion;
import com.cssurewards.promotion.PromotionRepository;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class PurchaseTests {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired ResetTokenRepository tokens;
    @Autowired TransactionRepository transactions;
    @Autowired PromotionRepository promotions;
    @Autowired PasswordEncoder passwords;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;

    @BeforeEach
    void setup() {
        jdbc.update("DELETE FROM transaction_promotions");
        jdbc.update("DELETE FROM user_promotions");
        transactions.deleteAll();
        promotions.deleteAll();
        tokens.deleteAll();
        users.deleteAll();
        users.save(new User("member01", "member@example.com", passwords.encode("Password123!"), RoleType.REGULAR));
        users.save(new User("cashier1", "cashier@example.com", passwords.encode("Password123!"), RoleType.CASHIER));
    }

    @AfterEach
    void cleanup() {
        jdbc.update("DELETE FROM transaction_promotions");
        jdbc.update("DELETE FROM user_promotions");
        transactions.deleteAll();
        promotions.deleteAll();
    }

    String token(String utorid) throws Exception {
        String response = mvc.perform(post("/auth/tokens").contentType(MediaType.APPLICATION_JSON)
                .content("{\"utorid\":\"" + utorid + "\",\"password\":\"Password123!\"}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return "Bearer " + json.readTree(response).get("token").asText();
    }

    @Test
    void purchaseAwardsPointsAndConsumesOneTimeOfferOnlyOnce() throws Exception {
        Instant now = Instant.now();
        Promotion offer = promotions.save(new Promotion("Bonus", "Test", now.minusSeconds(60),
            now.plusSeconds(3600), 0.1, 2, 5, "one-time"));
        String body = "{\"utorid\":\"member01\",\"type\":\"purchase\",\"spent\":2.5,\"promotionIds\":["
            + offer.getId() + "]}";
        String cashier = token("cashier1");
        mvc.perform(post("/transactions").header("Authorization", cashier)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.earned").value(40))
            .andExpect(jsonPath("$.promotionIds[0]").value(offer.getId()));
        assertThat(users.findByUtorid("member01").orElseThrow().getPoints()).isEqualTo(40);
        mvc.perform(post("/transactions").header("Authorization", cashier)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest());
        assertThat(transactions.count()).isEqualTo(1);
        mvc.perform(post("/transactions").header("Authorization", cashier)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"utorid\":\"member01\",\"type\":\"purchase\",\"spent\":1}"))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.earned").value(4));
        assertThat(users.findByUtorid("member01").orElseThrow().getPoints()).isEqualTo(44);
    }

    @Test
    void invalidPromotionAndRegularOperatorLeaveBalancesUnchanged() throws Exception {
        String body = "{\"utorid\":\"member01\",\"type\":\"purchase\",\"spent\":1,\"promotionIds\":[9999]}";
        mvc.perform(post("/transactions").header("Authorization", token("cashier1"))
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest());
        mvc.perform(post("/transactions").header("Authorization", token("member01"))
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isForbidden());
        assertThat(users.findByUtorid("member01").orElseThrow().getPoints()).isZero();
    }
}
