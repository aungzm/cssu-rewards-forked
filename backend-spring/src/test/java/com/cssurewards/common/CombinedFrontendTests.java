package com.cssurewards.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.cssurewards.auth.ResetTokenRepository;
import com.cssurewards.user.RoleType;
import com.cssurewards.user.User;
import com.cssurewards.user.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {"app.serve-frontend=true", "app.demo-mode=true"})
@AutoConfigureMockMvc
class CombinedFrontendTests {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired ResetTokenRepository tokens;
    @Autowired PasswordEncoder passwords;
    @Autowired ObjectMapper json;

    @BeforeEach
    void setup() {
        tokens.deleteAll();
        users.deleteAll();
        users.save(new User("Demo0001", "demo@mail.utoronto.ca", passwords.encode("Password123!"), RoleType.REGULAR));
    }

    @Test
    void publishesOnlyPublicRuntimeConfigurationWithoutCaching() throws Exception {
        mvc.perform(get("/app-config.js").header("Authorization", "Bearer invalid"))
            .andExpect(status().isOk())
            .andExpect(header().string("Cache-Control", "no-store"))
            .andExpect(content().contentTypeCompatibleWith("application/javascript"))
            .andExpect(content().string("window.__APP_CONFIG__ = {\"apiBaseUrl\":\"/api\",\"demoMode\":true};\n"));
        assertThat(new FrontendController(false).configuration().getBody()).contains("\"demoMode\":false");
    }

    @Test
    void servesDeepLinksSeparatelyFromApiRoutes() throws Exception {
        for (String path : new String[] {"/", "/login", "/events", "/promotions", "/edit/events/1"}) {
            mvc.perform(get(path)).andExpect(status().isOk()).andExpect(forwardedUrl("/index.html"));
        }
        mvc.perform(get("/api/users/me")).andExpect(status().isUnauthorized());
        mvc.perform(get("/users/me")).andExpect(status().isNotFound());
    }

    @Test
    void authenticatesOnPrefixedApiAndRetainsDemoRestrictions() throws Exception {
        String result = mvc.perform(post("/api/auth/tokens").contentType(MediaType.APPLICATION_JSON)
                .content("{\"utorid\":\"Demo0001\",\"password\":\"Password123!\"}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String bearer = "Bearer " + json.readTree(result).get("token").asText();
        mvc.perform(get("/api/users/me").header("Authorization", bearer))
            .andExpect(status().isOk()).andExpect(jsonPath("$.utorid").value("Demo0001"));
        mvc.perform(post("/api/auth/resets").contentType(MediaType.APPLICATION_JSON)
                .content("{\"utorid\":\"Demo0001\"}"))
            .andExpect(status().isNotFound());
        mvc.perform(patch("/api/users/me/password").header("Authorization", bearer)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"old\":\"Password123!\",\"new\":\"OtherPassword123!\"}"))
            .andExpect(status().isNotFound());
        mvc.perform(get("/api/not-a-route").header("Authorization", bearer))
            .andExpect(status().isNotFound());
    }
}
