package com.cssurewards.user;

import com.cssurewards.user.dto.UserResponse;
import com.cssurewards.user.dto.CreateUserRequest;
import com.cssurewards.user.dto.CreatedUserResponse;
import com.cssurewards.user.dto.ChangePasswordRequest;
import com.cssurewards.user.dto.UpdateProfileRequest;
import com.cssurewards.user.dto.UpdateUserRequest;
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
import java.util.LinkedHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

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

    @Transactional(readOnly = true)
    public Map<String, Object> listUsers(String name, String role, Boolean verified,
            Boolean activated, int page, int limit, boolean cashier) {
        RoleType roleFilter = null;
        if (role != null) {
            try {
                roleFilter = RoleType.valueOf(role.toUpperCase(java.util.Locale.ROOT));
            } catch (IllegalArgumentException exception) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid role.");
            }
        }
        RoleType requestedRole = roleFilter;
        Specification<User> filters = (root, query, cb) -> {
            var conditions = new java.util.ArrayList<jakarta.persistence.criteria.Predicate>();
            if (name != null) conditions.add(cb.like(root.get("name"), "%" + name + "%"));
            if (requestedRole != null) conditions.add(cb.equal(root.get("role"), requestedRole));
            if (verified != null) conditions.add(cb.equal(root.get("verified"), verified));
            if (activated != null) conditions.add(cb.equal(root.get("activated"), activated));
            return cb.and(conditions.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
        Page<User> usersPage = users.findAll(filters,
            PageRequest.of(page - 1, limit, Sort.by(Sort.Direction.DESC, "createdAt")));
        List<Map<String, Object>> results = usersPage.stream().map(user -> {
            Map<String, Object> fields = new LinkedHashMap<>();
            fields.put("id", user.getId());
            fields.put("name", user.getName());
            fields.put("utorid", user.getUtorid());
            fields.put("avatarUrl", user.getAvatarUrl());
            fields.put("verified", user.isVerified());
            if (!cashier) {
                fields.put("email", user.getEmail());
                fields.put("role", user.getRole());
                fields.put("birthday", user.getBirthday());
                fields.put("points", user.getPoints());
                fields.put("activated", user.isActivated());
                fields.put("createdAt", user.getCreatedAt());
                fields.put("lastLogin", user.getLastLogin());
            }
            return fields;
        }).toList();
        return Map.of("count", usersPage.getTotalElements(), "results", results);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getUser(Integer id, boolean cashier) {
        User user = findUser(id);
        Map<String, Object> fields = new LinkedHashMap<>();
        fields.put("id", user.getId());
        fields.put("utorid", user.getUtorid());
        fields.put("name", user.getName());
        fields.put("verified", user.isVerified());
        fields.put("points", user.getPoints());
        fields.put("promotions", List.of());
        if (!cashier) {
            fields.put("email", user.getEmail());
            fields.put("birthday", user.getBirthday());
            fields.put("avatarUrl", user.getAvatarUrl());
            fields.put("role", user.getRole());
            fields.put("activated", user.isActivated());
            fields.put("suspicious", user.isSuspicious());
            fields.put("createdAt", user.getCreatedAt());
            fields.put("updatedAt", user.getUpdatedAt());
            fields.put("lastLogin", user.getLastLogin());
            fields.put("password", user.getPassword() == null ? null : "[redacted]");
        }
        return fields;
    }

    @Transactional
    public Map<String, Object> updateUser(Integer id, UpdateUserRequest request, boolean manager) {
        User user = findUser(id);
        if (request.email() == null && request.name() == null && request.role() == null
                && request.verified() == null && request.suspicious() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one field must be provided");
        }
        if (request.email() != null && !request.email().equals(user.getEmail())
                && users.existsByEmail(request.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A user with this email already exists.");
        }
        if (Boolean.FALSE.equals(request.verified())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid verified value.");
        }
        RoleType newRole = request.role() == null ? null : RoleType.valueOf(request.role().toUpperCase(java.util.Locale.ROOT));
        if (manager && (newRole == RoleType.MANAGER || newRole == RoleType.SUPERUSER)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Forbidden. Managers cannot promote users to Manager or Superuser.");
        }
        user.updateAdmin(request.name(), request.email(), newRole, request.verified(), request.suspicious());
        Map<String, Object> fields = new LinkedHashMap<>();
        fields.put("id", user.getId());
        fields.put("utorid", user.getUtorid());
        fields.put("name", user.getName());
        if (request.email() != null) fields.put("email", user.getEmail());
        if (request.role() != null) fields.put("role", user.getRole());
        if (request.verified() != null) fields.put("verified", user.isVerified());
        if (request.suspicious() != null || newRole == RoleType.CASHIER) fields.put("suspicious", user.isSuspicious());
        return fields;
    }

    private User findUser(Integer id) {
        return users.findById(id).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
    }
}
