package com.cssurewards.user;

import com.cssurewards.user.dto.UserResponse;
import com.cssurewards.user.dto.CreateUserRequest;
import com.cssurewards.user.dto.CreatedUserResponse;
import com.cssurewards.user.dto.ChangePasswordRequest;
import com.cssurewards.user.dto.UpdateProfileRequest;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import com.cssurewards.auth.ResetToken;
import com.cssurewards.auth.ResetTokenRepository;
import java.time.Instant;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.Base64;
import java.util.Map;
import java.util.Arrays;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MultipartFile;

@Service
public class UserService {
    private final UserRepository users;
    private final ResetTokenRepository resetTokens;
    private final PasswordEncoder passwords;

    public UserService(UserRepository users, ResetTokenRepository resetTokens, PasswordEncoder passwords) {
        this.users = users;
        this.resetTokens = resetTokens;
        this.passwords = passwords;
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

    @Transactional
    public void changePassword(Integer id, ChangePasswordRequest request) {
        User user = findUser(id);
        if (user.getPassword() == null || !passwords.matches(request.old(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Old password is incorrect.");
        }
        user.activate(passwords.encode(request.newPassword()));
    }

    @Transactional
    public UserResponse updateProfile(Integer id, UpdateProfileRequest request) {
        User user = findUser(id);
        String name = request.name() == null ? null : request.name().trim();
        if (name != null && name.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name cannot be blank");
        }
        if (name == null && request.email() == null && request.birthday() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "At least one field must be provided with a non-null value");
        }
        Instant birthday = null;
        if (request.birthday() != null) {
            try {
                LocalDate date = LocalDate.parse(request.birthday());
                if (date.isAfter(LocalDate.now(ZoneOffset.UTC))) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "birthday cannot be set in the future");
                }
                birthday = date.atStartOfDay(ZoneOffset.UTC).toInstant();
            } catch (DateTimeParseException exception) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid date. Please provide a valid calendar date.");
            }
        }
        if (request.email() != null && !request.email().equals(user.getEmail())
                && users.existsByEmail(request.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A user with this email already exists.");
        }
        user.updateProfile(name, request.email(), birthday);
        return getCurrentUser(id);
    }

    @Transactional
    public Map<String, String> updateAvatar(Integer id, MultipartFile file) throws java.io.IOException {
        byte[] bytes = file.getBytes();
        byte[] pngSignature = {(byte) 137, 80, 78, 71, 13, 10, 26, 10};
        if (bytes.length == 0 || bytes.length > 5 * 1024 * 1024
                || !"image/png".equals(file.getContentType())
                || bytes.length < pngSignature.length
                || !Arrays.equals(Arrays.copyOf(bytes, pngSignature.length), pngSignature)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only PNG images up to 5 MB are supported.");
        }
        User user = findUser(id);
        String encoded = Base64.getEncoder().encodeToString(bytes);
        user.updateAvatar(encoded);
        return Map.of("avatar", encoded, "avatarUrl", user.getAvatarUrl());
    }

    private User findUser(Integer id) {
        return users.findById(id).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
    }
}
