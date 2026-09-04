package com.cssurewards.promotion;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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
            .andExpect(jsonPath("$.rate").value(0))
            .andExpect(jsonPath("$.createdAt").doesNotExist())
            .andExpect(jsonPath("$.updatedAt").doesNotExist());
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

    @Test
    void regularUsersSeeOnlyActivePromotionsWhileManagersCanBrowseAll() throws Exception {
        Instant now = Instant.now();
        Promotion active = promotions.save(new Promotion("Active", "Live", now.minusSeconds(100),
            now.plusSeconds(3600), 0, 0, 5, "automatic"));
        Promotion upcoming = promotions.save(new Promotion("Soon", "Future", now.plusSeconds(3600),
            now.plusSeconds(7200), 0, 0, 10, "one-time"));
        mvc.perform(get("/promotions").header("Authorization", token("regular1")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(1))
            .andExpect(jsonPath("$.results[0].name").value("Active"));
        mvc.perform(get("/promotions/" + upcoming.getId()).header("Authorization", token("regular1")))
            .andExpect(status().isNotFound());
        mvc.perform(get("/promotions/" + active.getId()).header("Authorization", token("regular1")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Active"));
        mvc.perform(get("/promotions?started=false&type=one-time").header("Authorization", token("manager1")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(1))
            .andExpect(jsonPath("$.results[0].id").value(upcoming.getId()));
        mvc.perform(get("/promotions?started=true&ended=false").header("Authorization", token("manager1")))
            .andExpect(status().isBadRequest());
    }

    @Test
    void managerCanEditFuturePromotionButCannotMoveStartIntoPast() throws Exception {
        Instant now = Instant.now();
        Promotion offer = promotions.save(new Promotion("Before", "Old", now.plusSeconds(3600),
            now.plusSeconds(7200), 0, 0, 0, "automatic"));
        String url = "/promotions/" + offer.getId();
        String manager = token("manager1");
        mvc.perform(patch(url).header("Authorization", token("regular1"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"After\"}"))
            .andExpect(status().isForbidden());
        mvc.perform(patch(url).header("Authorization", manager)
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isBadRequest());
        mvc.perform(patch(url).header("Authorization", manager)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"startTime\":\"" + now.minusSeconds(3600) + "\"}"))
            .andExpect(status().isBadRequest());
        mvc.perform(patch(url).header("Authorization", manager)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"After\",\"points\":25,\"type\":\"one-time\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("After"))
            .andExpect(jsonPath("$.points").value(25));
        mvc.perform(get(url).header("Authorization", manager))
            .andExpect(status().isOk()).andExpect(jsonPath("$.type").value("one-time"));
    }

    @Test
    void onlyManagersMayRemoveNotYetStartedPromotions() throws Exception {
        Instant now = Instant.now();
        Promotion active = promotions.save(new Promotion("Active", "Live", now.minusSeconds(100),
            now.plusSeconds(3600), 0, 0, 5, "automatic"));
        Promotion upcoming = promotions.save(new Promotion("Soon", "Future", now.plusSeconds(3600),
            now.plusSeconds(7200), 0, 0, 10, "one-time"));
        mvc.perform(delete("/promotions/" + upcoming.getId()).header("Authorization", token("regular1")))
            .andExpect(status().isForbidden());
        mvc.perform(delete("/promotions/" + active.getId()).header("Authorization", token("manager1")))
            .andExpect(status().isForbidden());
        mvc.perform(delete("/promotions/" + upcoming.getId()).header("Authorization", token("manager1")))
            .andExpect(status().isNoContent());
        mvc.perform(delete("/promotions/" + upcoming.getId()).header("Authorization", token("manager1")))
            .andExpect(status().isNotFound());
    }
}
