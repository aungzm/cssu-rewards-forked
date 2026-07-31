package com.cssurewards.event;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cssurewards.auth.ResetTokenRepository;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class EventCreateTests {
    @Autowired MockMvc mvc;
    @Autowired EventRepository events;
    @Autowired UserRepository users;
    @Autowired ResetTokenRepository tokens;
    @Autowired PasswordEncoder passwords;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;

    @BeforeEach
    void setup() {
        events.deleteAll();
        tokens.deleteAll();
        users.deleteAll();
        users.save(new User("manager1", "manager@example.com", passwords.encode("Password123!"), RoleType.MANAGER));
        users.save(new User("member01", "member@example.com", passwords.encode("Password123!"), RoleType.REGULAR));
    }

    @AfterEach
    void cleanup() { events.deleteAll(); }

    String token(String utorid) throws Exception {
        String result = mvc.perform(post("/auth/tokens").contentType(MediaType.APPLICATION_JSON)
                .content("{\"utorid\":\"" + utorid + "\",\"password\":\"Password123!\"}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return "Bearer " + json.readTree(result).get("token").asText();
    }

    @Test
    void managerCreatesUnpublishedEventWithPointsBudget() throws Exception {
        String start = Instant.now().plusSeconds(3600).toString();
        String end = Instant.now().plusSeconds(7200).toString();
        String body = "{\"name\":\"Meetup\",\"description\":\"Monthly\",\"location\":\"Hall\","
            + "\"startTime\":\"" + start + "\",\"endTime\":\"" + end + "\",\"capacity\":10,\"points\":500}";
        mvc.perform(post("/events").header("Authorization", token("manager1"))
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.published").value(false))
            .andExpect(jsonPath("$.pointsRemain").value(500))
            .andExpect(jsonPath("$.pointsAwarded").value(0))
            .andExpect(jsonPath("$.organizers").isArray())
            .andExpect(jsonPath("$.guests").isArray());
        mvc.perform(post("/events").header("Authorization", token("member01"))
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isForbidden());
    }

    @Test
    void invalidDateOrderDoesNotCreateEvent() throws Exception {
        String future = Instant.now().plusSeconds(3600).toString();
        mvc.perform(post("/events").header("Authorization", token("manager1"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Meetup\",\"description\":\"Monthly\",\"location\":\"Hall\","
                    + "\"startTime\":\"" + future + "\",\"endTime\":\"" + future + "\",\"points\":500}"))
            .andExpect(status().isBadRequest());
        org.assertj.core.api.Assertions.assertThat(events.count()).isZero();
    }

    @Test
    void regularUsersOnlyListPublishedEventsAndFullFilterPrecedesPagination() throws Exception {
        Instant now = Instant.now();
        Event open = events.save(new Event("Open", "All welcome", "Main Hall",
            now.plusSeconds(3600), now.plusSeconds(7200), 2, 100));
        Event full = events.save(new Event("Full", "Limited", "Main Hall",
            now.plusSeconds(7200), now.plusSeconds(9000), 1, 100));
        events.save(new Event("Hidden", "Private", "Other", now.plusSeconds(10000),
            now.plusSeconds(12000), 2, 100));
        jdbc.update("UPDATE events SET published = TRUE WHERE id IN (?, ?)", open.getId(), full.getId());
        jdbc.update("INSERT INTO rsvps(event_id, user_id) VALUES (?, ?)", full.getId(),
            users.findByUtorid("manager1").orElseThrow().getId());
        mvc.perform(get("/events?showFull=false&limit=1&location=HALL")
                .header("Authorization", token("member01")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(1))
            .andExpect(jsonPath("$.results[0].name").value("Open"))
            .andExpect(jsonPath("$.results[0].published").doesNotExist());
        mvc.perform(get("/events").header("Authorization", token("manager1")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(3));
        mvc.perform(get("/events?started=true&ended=false").header("Authorization", token("manager1")))
            .andExpect(status().isBadRequest());
        jdbc.update("DELETE FROM rsvps");
    }

    @Test
    void eventDetailsRedactBudgetAndGuestRosterForRegularUsers() throws Exception {
        Instant now = Instant.now();
        Event event = events.save(new Event("Open", "All welcome", "Main Hall",
            now.plusSeconds(3600), now.plusSeconds(7200), 2, 100));
        String manager = token("manager1");
        String member = token("member01");
        mvc.perform(get("/events/" + event.getId()).header("Authorization", member))
            .andExpect(status().isNotFound());
        mvc.perform(get("/events/" + event.getId()).header("Authorization", manager))
            .andExpect(status().isOk()).andExpect(jsonPath("$.pointsRemain").value(100));
        jdbc.update("UPDATE events SET published = TRUE WHERE id = ?", event.getId());
        mvc.perform(get("/events/" + event.getId()).header("Authorization", member))
            .andExpect(status().isOk()).andExpect(jsonPath("$.numGuests").value(0))
            .andExpect(jsonPath("$.pointsRemain").doesNotExist())
            .andExpect(jsonPath("$.guests").doesNotExist());
        mvc.perform(get("/events/987654321").header("Authorization", manager))
            .andExpect(status().isNotFound());
    }
}
