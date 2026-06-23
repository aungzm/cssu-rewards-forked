package com.cssurewards.transaction;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
        users.save(new User("cashier1", "cashier@example.com", passwords.encode("Password123!"), RoleType.CASHIER));
        users.save(new User("manager1", "manager@example.com", passwords.encode("Password123!"), RoleType.MANAGER));
        jdbc.update("UPDATE users SET points = 100 WHERE utorid = 'member01'");
    }

    @AfterEach
    void cleanup() {
        transactions.deleteAll();
    }

    private String bearer() throws Exception {
        return bearer("member01");
    }

    private String bearer(String utorid) throws Exception {
        String body = mvc.perform(post("/auth/tokens").contentType(MediaType.APPLICATION_JSON)
                .content("{\"utorid\":\"" + utorid + "\",\"password\":\"Password123!\"}"))
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

    @Test
    void onlyStaffCanProcessAndProcessingDebitsExactlyOnce() throws Exception {
        String body = mvc.perform(post("/users/me/transactions").header("Authorization", bearer())
                .contentType(MediaType.APPLICATION_JSON).content("{\"type\":\"redemption\",\"amount\":70}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        int id = json.readTree(body).get("id").asInt();
        mvc.perform(patch("/transactions/" + id + "/processed").header("Authorization", bearer())
                .contentType(MediaType.APPLICATION_JSON).content("{\"processed\":true}"))
            .andExpect(status().isForbidden());
        mvc.perform(patch("/transactions/" + id + "/processed").header("Authorization", bearer("cashier1"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"processed\":true}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.redeemed").value(70))
            .andExpect(jsonPath("$.processedBy").value("cashier1"));
        mvc.perform(patch("/transactions/" + id + "/processed").header("Authorization", bearer("cashier1"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"processed\":true}"))
            .andExpect(status().isBadRequest());
        assertThat(users.findByUtorid("member01").orElseThrow().getPoints()).isEqualTo(30);
    }

    @Test
    void insufficientPointsRollBackClaim() throws Exception {
        String body = mvc.perform(post("/users/me/transactions").header("Authorization", bearer())
                .contentType(MediaType.APPLICATION_JSON).content("{\"type\":\"redemption\",\"amount\":70}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        int id = json.readTree(body).get("id").asInt();
        jdbc.update("UPDATE users SET points = 20 WHERE utorid = 'member01'");
        mvc.perform(patch("/transactions/" + id + "/processed").header("Authorization", bearer("cashier1"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"processed\":true}"))
            .andExpect(status().isBadRequest());
        assertThat(transactions.findById(id).orElseThrow().getOperatorId()).isNull();
        assertThat(users.findByUtorid("member01").orElseThrow().getPoints()).isEqualTo(20);
    }

    @Test
    void suspiciousProcessedRedemptionRefundsOnceAndRestoringChargesOnce() throws Exception {
        String body = mvc.perform(post("/users/me/transactions").header("Authorization", bearer())
                .contentType(MediaType.APPLICATION_JSON).content("{\"type\":\"redemption\",\"amount\":70}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        int id = json.readTree(body).get("id").asInt();
        String url = "/transactions/" + id + "/suspicious";
        mvc.perform(patch(url).header("Authorization", bearer("cashier1"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"suspicious\":true}"))
            .andExpect(status().isForbidden());
        mvc.perform(patch(url).header("Authorization", bearer("manager1"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"suspicious\":true}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.suspicious").value(true));
        assertThat(users.findByUtorid("member01").orElseThrow().getPoints()).isEqualTo(100);
        mvc.perform(patch(url).header("Authorization", bearer("manager1"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"suspicious\":false}"))
            .andExpect(status().isOk());
        mvc.perform(patch("/transactions/" + id + "/processed").header("Authorization", bearer("cashier1"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"processed\":true}"))
            .andExpect(status().isOk());
        assertThat(users.findByUtorid("member01").orElseThrow().getPoints()).isEqualTo(30);
        mvc.perform(patch(url).header("Authorization", bearer("manager1"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"suspicious\":true}"))
            .andExpect(status().isOk());
        assertThat(users.findByUtorid("member01").orElseThrow().getPoints()).isEqualTo(100);
        mvc.perform(patch(url).header("Authorization", bearer("manager1"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"suspicious\":true}"))
            .andExpect(status().isOk());
        assertThat(users.findByUtorid("member01").orElseThrow().getPoints()).isEqualTo(100);
        mvc.perform(patch(url).header("Authorization", bearer("manager1"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"suspicious\":false}"))
            .andExpect(status().isOk());
        assertThat(users.findByUtorid("member01").orElseThrow().getPoints()).isEqualTo(30);
    }

    @Test
    void transactionDetailIsRestrictedToManagersAndNeverExposesPrivateFields() throws Exception {
        String body = mvc.perform(post("/users/me/transactions").header("Authorization", bearer())
                .contentType(MediaType.APPLICATION_JSON).content("{\"type\":\"redemption\",\"amount\":10}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        int id = json.readTree(body).get("id").asInt();
        mvc.perform(get("/transactions/" + id).header("Authorization", bearer("cashier1")))
            .andExpect(status().isForbidden());
        mvc.perform(get("/transactions/" + id).header("Authorization", bearer("manager1")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.utorid").value("member01"))
            .andExpect(jsonPath("$.type").value("redemption"))
            .andExpect(jsonPath("$.amount").value(-10))
            .andExpect(jsonPath("$.promotionIds").isArray())
            .andExpect(jsonPath("$.password").doesNotExist());
        mvc.perform(get("/transactions/987654321").header("Authorization", bearer("manager1")))
            .andExpect(status().isNotFound());
    }

    @Test
    void managerCanFilterAndPageTransactionList() throws Exception {
        String created = mvc.perform(post("/users/me/transactions").header("Authorization", bearer())
                .contentType(MediaType.APPLICATION_JSON).content("{\"type\":\"redemption\",\"amount\":20}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        int id = json.readTree(created).get("id").asInt();
        mvc.perform(patch("/transactions/" + id + "/processed")
                .header("Authorization", bearer("cashier1"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"processed\":true}"))
            .andExpect(status().isOk());
        mvc.perform(get("/transactions?type=redemption&name=member&createdBy=cashier&amount=-20&operator=gte&page=1&limit=1")
                .header("Authorization", bearer("manager1")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(1))
            .andExpect(jsonPath("$.results[0].id").value(id))
            .andExpect(jsonPath("$.results[0].redeemed").value(20))
            .andExpect(jsonPath("$.results[0].createdBy").value("cashier1"));
        mvc.perform(get("/transactions?type=transfer").header("Authorization", bearer("manager1")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(0));
        mvc.perform(get("/transactions").header("Authorization", bearer("cashier1")))
            .andExpect(status().isForbidden());
        mvc.perform(get("/transactions?limit=0").header("Authorization", bearer("manager1")))
            .andExpect(status().isBadRequest());
    }
}
