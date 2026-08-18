package com.cssurewards.event;

import static org.assertj.core.api.Assertions.assertThat;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class EventAwardTests {
    @Autowired MockMvc mvc;
    @Autowired EventRepository events;
    @Autowired TransactionRepository transactions;
    @Autowired UserRepository users;
    @Autowired ResetTokenRepository tokens;
    @Autowired PasswordEncoder passwords;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;

    @BeforeEach
    void setup() {
        cleanup();
        users.save(new User("manager1", "manager@example.com", passwords.encode("Password123!"), RoleType.MANAGER));
        users.save(new User("member01", "member@example.com", passwords.encode("Password123!"), RoleType.REGULAR));
        users.save(new User("member02", "other@example.com", passwords.encode("Password123!"), RoleType.REGULAR));
    }

    @AfterEach
    void cleanup() {
        transactions.deleteAll();
        jdbc.update("DELETE FROM rsvps");
        jdbc.update("DELETE FROM organizer_events");
        events.deleteAll();
        tokens.deleteAll();
        users.deleteAll();
    }

    String token(String utorid) throws Exception {
        String result = mvc.perform(post("/auth/tokens").contentType(MediaType.APPLICATION_JSON)
                .content("{\"utorid\":\"" + utorid + "\",\"password\":\"Password123!\"}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return "Bearer " + json.readTree(result).get("token").asText();
    }

    @Test
    void singleAndBulkAwardsDebitBudgetAndCreditGuests() throws Exception {
        Event event = events.save(new Event("Meetup", "Description", "Hall",
            Instant.now().plusSeconds(3600), Instant.now().plusSeconds(7200), 2, 100));
        int first = users.findByUtorid("member01").orElseThrow().getId();
        int second = users.findByUtorid("member02").orElseThrow().getId();
        jdbc.update("INSERT INTO rsvps(event_id, user_id) VALUES (?, ?)", event.getId(), first);
        jdbc.update("INSERT INTO rsvps(event_id, user_id) VALUES (?, ?)", event.getId(), second);
        String url = "/events/" + event.getId() + "/transactions";
        String manager = token("manager1");
        mvc.perform(post(url).header("Authorization", token("member01"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"type\":\"event\",\"amount\":20}"))
            .andExpect(status().isForbidden());
        mvc.perform(post(url).header("Authorization", manager).contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"event\",\"amount\":20,\"utorid\":\"member01\",\"remark\":\"First\"}"))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.recipient").value("member01"))
            .andExpect(jsonPath("$.awarded").value(20));
        mvc.perform(post(url).header("Authorization", manager).contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"event\",\"amount\":30}"))
            .andExpect(status().isCreated()).andExpect(jsonPath("$[0].awarded").value(30))
            .andExpect(jsonPath("$[1].awarded").value(30));
        assertThat(users.findById(first).orElseThrow().getPoints()).isEqualTo(50);
        assertThat(users.findById(second).orElseThrow().getPoints()).isEqualTo(30);
        assertThat(events.findById(event.getId()).orElseThrow().getPointsRemain()).isEqualTo(20);
        assertThat(events.findById(event.getId()).orElseThrow().getPointsAwarded()).isEqualTo(80);
        mvc.perform(post(url).header("Authorization", manager).contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"event\",\"amount\":11}"))
            .andExpect(status().isBadRequest());
        assertThat(transactions.count()).isEqualTo(3);
    }

    @Test
    void organizerCanAwardAndEmptyEventReturnsMessage() throws Exception {
        Event event = events.save(new Event("Meetup", "Description", "Hall",
            Instant.now().plusSeconds(3600), Instant.now().plusSeconds(7200), null, 50));
        int first = users.findByUtorid("member01").orElseThrow().getId();
        jdbc.update("INSERT INTO organizer_events(event_id, organizer_id) VALUES (?, ?)", event.getId(), first);
        String url = "/events/" + event.getId() + "/transactions";
        String organizer = token("member01");
        mvc.perform(post(url).header("Authorization", organizer).contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"event\",\"amount\":10}"))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.transactions").isEmpty());
        mvc.perform(post(url).header("Authorization", organizer).contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"event\",\"amount\":10,\"utorid\":\"member02\"}"))
            .andExpect(status().isBadRequest());
        jdbc.update("INSERT INTO rsvps(event_id, user_id) VALUES (?, ?)", event.getId(),
            users.findByUtorid("member02").orElseThrow().getId());
        mvc.perform(post(url).header("Authorization", organizer).contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"event\",\"amount\":10,\"utorid\":\"member02\"}"))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.createdBy").value("member01"));
    }
}
