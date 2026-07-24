package com.cssurewards.event;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
}
