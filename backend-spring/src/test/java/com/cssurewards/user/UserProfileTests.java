package com.cssurewards.user;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.cssurewards.auth.ResetTokenRepository;
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
class UserProfileTests {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired ResetTokenRepository resetTokens;
    @Autowired PasswordEncoder passwords;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;

    @BeforeEach
    void createUsers() {
        resetTokens.deleteAll();
        users.deleteAll();
        users.save(new User("clive123", "clive@example.com", passwords.encode("SuperUser123!"), RoleType.SUPERUSER));
        users.save(new User("jane1234", "jane@example.com", passwords.encode("Secret123!"), RoleType.REGULAR));
    }

    private String login() throws Exception {
        String body = mvc.perform(post("/auth/tokens").contentType(MediaType.APPLICATION_JSON)
                .content("{\"utorid\":\"clive123\",\"password\":\"SuperUser123!\"}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return "Bearer " + json.readTree(body).get("token").asText();
    }

    @Test
    void returnsOnlyOwnProfileAndFetchesAvatarSeparately() throws Exception {
        String token = login();
        mvc.perform(get("/users/me").header("Authorization", token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.utorid").value("clive123"))
            .andExpect(jsonPath("$.email").value("clive@example.com"))
            .andExpect(jsonPath("$.role").value("SUPERUSER"))
            .andExpect(jsonPath("$.hasAvatar").value(false))
            .andExpect(jsonPath("$.promotions").isArray())
            .andExpect(jsonPath("$.password").doesNotExist());
        mvc.perform(get("/users/me/avatar").header("Authorization", token))
            .andExpect(status().isOk()).andExpect(jsonPath("$.avatar").value(org.hamcrest.Matchers.nullValue()));
        jdbc.update("UPDATE users SET avatar = ? WHERE utorid = ?", "data:image/png;base64,AA==", "clive123");
        mvc.perform(get("/users/me").header("Authorization", token))
            .andExpect(status().isOk()).andExpect(jsonPath("$.hasAvatar").value(true))
            .andExpect(jsonPath("$.avatar").doesNotExist());
        mvc.perform(get("/users/me/avatar").header("Authorization", token))
            .andExpect(status().isOk()).andExpect(jsonPath("$.avatar").value("data:image/png;base64,AA=="));
    }

    @Test
    void roleChangesAndDeletedAccountsTakeEffectOnNextRequest() throws Exception {
        String token = login();
        jdbc.update("UPDATE users SET role = 'REGULAR' WHERE utorid = 'clive123'");
        mvc.perform(get("/users/me").header("Authorization", token))
            .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("REGULAR"));
        users.delete(users.findByUtorid("clive123").orElseThrow());
        mvc.perform(get("/users/me").header("Authorization", token))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void changePasswordRequiresCurrentPasswordAndValidNewPassword() throws Exception {
        String token = login();
        mvc.perform(patch("/users/me/password").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"old\":\"BadPassword1!\",\"new\":\"NewPassword1!\"}"))
            .andExpect(status().isForbidden());
        mvc.perform(patch("/users/me/password").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"old\":\"SuperUser123!\",\"new\":\"short\"}"))
            .andExpect(status().isBadRequest());
        mvc.perform(patch("/users/me/password").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"old\":\"SuperUser123!\",\"new\":\"NewPassword1!\"}"))
            .andExpect(status().isOk());
        mvc.perform(post("/auth/tokens").contentType(MediaType.APPLICATION_JSON)
                .content("{\"utorid\":\"clive123\",\"password\":\"SuperUser123!\"}"))
            .andExpect(status().isUnauthorized());
        mvc.perform(post("/auth/tokens").contentType(MediaType.APPLICATION_JSON)
                .content("{\"utorid\":\"clive123\",\"password\":\"NewPassword1!\"}"))
            .andExpect(status().isOk());
    }

    @Test
    void profileEditsValidateOwnershipAndDates() throws Exception {
        String token = login();
        mvc.perform(patch("/users/me").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isBadRequest());
        mvc.perform(patch("/users/me").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"birthday\":\"2025-02-30\"}"))
            .andExpect(status().isBadRequest());
        mvc.perform(patch("/users/me").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"jane@example.com\"}"))
            .andExpect(status().isBadRequest());
        mvc.perform(patch("/users/me").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"New Name\",\"birthday\":\"2001-04-05\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("New Name"))
            .andExpect(jsonPath("$.birthday").value("2001-04-05T00:00:00Z"));
        mvc.perform(get("/users/me").header("Authorization", token))
            .andExpect(jsonPath("$.name").value("New Name"));
        org.assertj.core.api.Assertions.assertThat(users.findByUtorid("jane1234").orElseThrow().getName()).isNull();
    }
}
