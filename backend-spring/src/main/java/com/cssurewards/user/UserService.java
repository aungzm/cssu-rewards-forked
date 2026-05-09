package com.cssurewards.user;

import com.cssurewards.user.dto.UserResponse;
import com.cssurewards.user.dto.CreateUserRequest;
import com.cssurewards.user.dto.CreatedUserResponse;
import com.cssurewards.auth.ResetToken;
import com.cssurewards.auth.ResetTokenRepository;
import java.time.Instant;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserService {
    private final UserRepository users;
    private final ResetTokenRepository resetTokens;

    public UserService(UserRepository users, ResetTokenRepository resetTokens) {
        this.users = users;
        this.resetTokens = resetTokens;
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(Integer id) {
        User user = findUser(id);
        return new UserResponse(user.getId(), user.getUtorid(), user.getEmail(),
            user.getName(), user.getBirthday(), user.getAvatarUrl(), user.getRole(),
            user.getLastLogin(), user.isVerified(), user.getPoints(), user.getCreatedAt(),
            user.getAvatar() != null, List.of());
    }

    @Transactional(readOnly = true)
    public String getAvatar(Integer id) {
        return findUser(id).getAvatar();
    }

    @Transactional
    public CreatedUserResponse createUser(CreateUserRequest request) {
        if (users.findByUtorid(request.utorid()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A user with this utorid already exists.");
        }
        if (users.existsByEmail(request.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A user with this email already exists.");
        }
        User user = users.save(new User(request.utorid(), request.email(), request.name().trim()));
        String token = UUID.randomUUID().toString();
        Instant expiresAt = Instant.now().plus(Duration.ofHours(1));
        resetTokens.save(new ResetToken(token, expiresAt, user));
        return new CreatedUserResponse(user.getId(), user.getUtorid(), user.getName(),
            user.getEmail(), user.isVerified(), token, expiresAt,
            "User created successfully. Activation token included in response.");
    }

    private User findUser(Integer id) {
        return users.findById(id).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
    }
}
