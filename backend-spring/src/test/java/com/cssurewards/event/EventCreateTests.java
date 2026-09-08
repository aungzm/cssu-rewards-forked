package com.cssurewards.event;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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
        jdbc.update("DELETE FROM rsvps");
        jdbc.update("DELETE FROM organizer_events");
        events.deleteAll();
        tokens.deleteAll();
        users.deleteAll();
        users.save(new User("manager1", "manager@example.com", passwords.encode("Password123!"), RoleType.MANAGER));
        users.save(new User("member01", "member@example.com", passwords.encode("Password123!"), RoleType.REGULAR));
    }

    @AfterEach
    void cleanup() {
        jdbc.update("DELETE FROM rsvps");
        jdbc.update("DELETE FROM organizer_events");
        events.deleteAll();
    }

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

    @Test
    void onlyManagersMayPublishOrChangeEventBudget() throws Exception {
        Instant now = Instant.now();
        Event event = events.save(new Event("Meetup", "Description", "Hall",
            now.plusSeconds(3600), now.plusSeconds(7200), 2, 100));
        String url = "/events/" + event.getId();
        String manager = token("manager1");
        mvc.perform(patch(url).header("Authorization", token("member01"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"published\":true}"))
            .andExpect(status().isForbidden());
        mvc.perform(patch(url).header("Authorization", manager)
                .contentType(MediaType.APPLICATION_JSON).content("{\"published\":false}"))
            .andExpect(status().isBadRequest());
        mvc.perform(patch(url).header("Authorization", manager)
                .contentType(MediaType.APPLICATION_JSON).content("{\"capacity\":0,\"points\":200,\"published\":true}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.pointsRemain").value(200))
            .andExpect(jsonPath("$.published").value(true));
        mvc.perform(get(url).header("Authorization", manager))
            .andExpect(status().isOk()).andExpect(jsonPath("$.capacity").value(0));
        mvc.perform(patch(url).header("Authorization", manager)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"endTime\":\"" + now.plusSeconds(1800) + "\"}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void organizerMaySubmitCurrentTotalButNotChangeBudget() throws Exception {
        Instant now = Instant.now();
        Event event = events.save(new Event("Draft", "Description", "Hall",
            now.plusSeconds(3600), now.plusSeconds(7200), 2, 100));
        int organizerId = users.findByUtorid("member01").orElseThrow().getId();
        jdbc.update("INSERT INTO organizer_events(event_id, organizer_id) VALUES (?, ?)", event.getId(), organizerId);
        jdbc.update("UPDATE events SET points_remain = 60, points_awarded = 40 WHERE id = ?", event.getId());
        String url = "/events/" + event.getId();
        String organizer = token("member01");
        mvc.perform(patch(url).header("Authorization", organizer)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Renamed\",\"points\":100}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Renamed"))
            .andExpect(jsonPath("$.pointsRemain").value(60))
            .andExpect(jsonPath("$.pointsAwarded").value(40));
        mvc.perform(patch(url).header("Authorization", organizer)
                .contentType(MediaType.APPLICATION_JSON).content("{\"points\":120}"))
            .andExpect(status().isForbidden());
        mvc.perform(patch(url).header("Authorization", token("manager1"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"points\":120}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.pointsRemain").value(80));
    }

    @Test
    void managerMayOnlyDeleteUnpublishedEvent() throws Exception {
        Instant now = Instant.now();
        Event event = events.save(new Event("Draft", "Description", "Hall",
            now.plusSeconds(3600), now.plusSeconds(7200), 2, 100));
        String url = "/events/" + event.getId();
        mvc.perform(delete(url).header("Authorization", token("member01")))
            .andExpect(status().isForbidden());
        jdbc.update("UPDATE events SET published = TRUE WHERE id = ?", event.getId());
        mvc.perform(delete(url).header("Authorization", token("manager1")))
            .andExpect(status().isBadRequest());
        jdbc.update("UPDATE events SET published = FALSE WHERE id = ?", event.getId());
        mvc.perform(delete(url).header("Authorization", token("manager1")))
            .andExpect(status().isNoContent());
        mvc.perform(delete(url).header("Authorization", token("manager1")))
            .andExpect(status().isNotFound());
    }

    @Test
    void organizerMembershipChecksGuestConflictsAndPermissions() throws Exception {
        Instant now = Instant.now();
        Event event = events.save(new Event("Draft", "Description", "Hall",
            now.plusSeconds(3600), now.plusSeconds(7200), 2, 100));
        int memberId = users.findByUtorid("member01").orElseThrow().getId();
        String url = "/events/" + event.getId() + "/organizers";
        String manager = token("manager1");
        String body = "{\"utorid\":\"member01\"}";
        mvc.perform(post(url).header("Authorization", token("member01"))
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isForbidden());
        mvc.perform(post(url).header("Authorization", manager)
                .contentType(MediaType.APPLICATION_JSON).content("{\"utorid\":\"unknown1\"}"))
            .andExpect(status().isNotFound());
        mvc.perform(post(url).header("Authorization", manager)
                .contentType(MediaType.APPLICATION_JSON).content("{\"utorid\":\"short\"}"))
            .andExpect(status().isBadRequest());
        jdbc.update("INSERT INTO rsvps(event_id, user_id) VALUES (?, ?)", event.getId(), memberId);
        mvc.perform(post(url).header("Authorization", manager)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isBadRequest());
        jdbc.update("DELETE FROM rsvps WHERE event_id = ?", event.getId());
        mvc.perform(post(url).header("Authorization", manager)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.name").value("Draft"))
            .andExpect(jsonPath("$.organizers[0].utorid").value("member01"));
        mvc.perform(get("/events/" + event.getId()).header("Authorization", token("member01")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.pointsRemain").value(100));
        mvc.perform(post(url).header("Authorization", manager)
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isConflict());
        mvc.perform(delete(url + "/" + memberId).header("Authorization", token("member01")))
            .andExpect(status().isForbidden());
        mvc.perform(delete(url + "/" + memberId).header("Authorization", manager))
            .andExpect(status().isNoContent());
        mvc.perform(delete(url + "/" + memberId).header("Authorization", manager))
            .andExpect(status().isNotFound());
    }

    @Test
    void endedEventCannotGainOrganizers() throws Exception {
        Instant now = Instant.now();
        Event event = events.save(new Event("Past", "Description", "Hall",
            now.minusSeconds(7200), now.minusSeconds(3600), null, 100));
        mvc.perform(post("/events/" + event.getId() + "/organizers")
                .header("Authorization", token("manager1"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"utorid\":\"member01\"}"))
            .andExpect(status().isGone());
    }

    @Test
    void guestRegistrationHonorsCapacityAndAllowsSelfRemoval() throws Exception {
        Instant now = Instant.now();
        Event event = events.save(new Event("Meetup", "Description", "Hall",
            now.plusSeconds(3600), now.plusSeconds(7200), 1, 100));
        String url = "/events/" + event.getId() + "/guests";
        String member = token("member01");
        String manager = token("manager1");
        mvc.perform(post(url).header("Authorization", member)
                .contentType(MediaType.APPLICATION_JSON).content("{\"utorid\":\"manager1\"}"))
            .andExpect(status().isForbidden());
        mvc.perform(post(url + "/me").header("Authorization", member))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.guestAdded.utorid").value("member01"))
            .andExpect(jsonPath("$.numGuests").value(1));
        mvc.perform(post(url + "/me").header("Authorization", member))
            .andExpect(status().isConflict());
        mvc.perform(post(url).header("Authorization", manager)
                .contentType(MediaType.APPLICATION_JSON).content("{\"utorid\":\"manager1\"}"))
            .andExpect(status().isGone());
        mvc.perform(delete(url + "/me").header("Authorization", member))
            .andExpect(status().isNoContent());
        mvc.perform(delete(url + "/me").header("Authorization", member))
            .andExpect(status().isNotFound());
        mvc.perform(post(url).header("Authorization", manager)
                .contentType(MediaType.APPLICATION_JSON).content("{\"utorid\":\"member01\"}"))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.numGuests").value(1));
        mvc.perform(delete(url + "/" + users.findByUtorid("member01").orElseThrow().getId())
                .header("Authorization", manager))
            .andExpect(status().isNoContent());
    }

    @Test
    void organizerCanAddButNotRemoveGuestsAndCannotRegisterAsGuest() throws Exception {
        Instant now = Instant.now();
        Event event = events.save(new Event("Meetup", "Description", "Hall",
            now.plusSeconds(3600), now.plusSeconds(7200), null, 100));
        int organizerId = users.findByUtorid("member01").orElseThrow().getId();
        jdbc.update("INSERT INTO organizer_events(event_id, organizer_id) VALUES (?, ?)", event.getId(), organizerId);
        String url = "/events/" + event.getId() + "/guests";
        String organizer = token("member01");
        mvc.perform(post(url + "/me").header("Authorization", organizer))
            .andExpect(status().isBadRequest());
        mvc.perform(post(url).header("Authorization", organizer)
                .contentType(MediaType.APPLICATION_JSON).content("{\"utorid\":\"manager1\"}"))
            .andExpect(status().isCreated());
        mvc.perform(delete(url + "/" + users.findByUtorid("manager1").orElseThrow().getId())
                .header("Authorization", organizer))
            .andExpect(status().isForbidden());
        mvc.perform(delete(url + "/" + users.findByUtorid("manager1").orElseThrow().getId())
                .header("Authorization", token("manager1")))
            .andExpect(status().isNoContent());
        jdbc.update("INSERT INTO rsvps(event_id, user_id) VALUES (?, ?)", event.getId(), organizerId);
        mvc.perform(post(url).header("Authorization", token("manager1"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"utorid\":\"member01\"}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void organizedEventListFiltersBeforePagination() throws Exception {
        Instant now = Instant.now();
        Event available = events.save(new Event("Available", "Description", "Hall",
            now.plusSeconds(3600), now.plusSeconds(7200), 2, 100));
        Event full = events.save(new Event("Full", "Description", "Hall",
            now.plusSeconds(5000), now.plusSeconds(8000), 1, 100));
        Event past = events.save(new Event("Past", "Description", "Hall",
            now.minusSeconds(7200), now.minusSeconds(3600), null, 100));
        int memberId = users.findByUtorid("member01").orElseThrow().getId();
        for (Event event : java.util.List.of(available, full, past)) {
            jdbc.update("INSERT INTO organizer_events(event_id, organizer_id) VALUES (?, ?)", event.getId(), memberId);
        }
        jdbc.update("INSERT INTO rsvps(event_id, user_id) VALUES (?, ?)", full.getId(),
            users.findByUtorid("manager1").orElseThrow().getId());
        String member = token("member01");
        mvc.perform(get("/users/me/events?showFull=false&limit=1").header("Authorization", member))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(1))
            .andExpect(jsonPath("$.results[0].name").value("Available"))
            .andExpect(jsonPath("$.results[0].isOrganizer").value(true));
        mvc.perform(get("/users/me/events?past=true&ended=true").header("Authorization", member))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(1))
            .andExpect(jsonPath("$.results[0].name").value("Past"));
        mvc.perform(get("/users/me/events?started=true&ended=false").header("Authorization", member))
            .andExpect(status().isBadRequest());
    }

    @Test
    void guestEventListReturnsOnlyMatchingEventIds() throws Exception {
        Instant now = Instant.now();
        Event upcoming = events.save(new Event("Upcoming", "Description", "Hall",
            now.plusSeconds(3600), now.plusSeconds(7200), 2, 100));
        Event past = events.save(new Event("Past", "Description", "Hall",
            now.minusSeconds(7200), now.minusSeconds(3600), 2, 100));
        int member = users.findByUtorid("member01").orElseThrow().getId();
        jdbc.update("INSERT INTO rsvps(event_id, user_id) VALUES (?, ?)", upcoming.getId(), member);
        jdbc.update("INSERT INTO rsvps(event_id, user_id) VALUES (?, ?)", past.getId(), member);
        String bearer = token("member01");
        mvc.perform(get("/users/me/events/guest").header("Authorization", bearer))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(1))
            .andExpect(jsonPath("$.results[0].eventId").value(upcoming.getId()))
            .andExpect(jsonPath("$.results[0].name").doesNotExist());
        mvc.perform(get("/users/me/events/guest?past=true").header("Authorization", bearer))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(1))
            .andExpect(jsonPath("$.results[0].eventId").value(past.getId()));
        mvc.perform(get("/users/me/events/guest?limit=101").header("Authorization", bearer))
            .andExpect(status().isBadRequest());
    }
}
