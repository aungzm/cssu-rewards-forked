package com.cssurewards.auth;

import com.cssurewards.auth.dto.LoginRequest;
import com.cssurewards.auth.dto.LoginResponse;
import com.cssurewards.user.User;
import com.cssurewards.user.UserRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {
    private static final Duration TOKEN_LIFETIME = Duration.ofHours(1);
    private static final Duration ATTEMPT_WINDOW = Duration.ofMinutes(15);
    private static final int MAX_FAILURES = 10;

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;
    private final ConcurrentHashMap<String, Failure> failures = new ConcurrentHashMap<>();

    public AuthService(UserRepository users, PasswordEncoder passwordEncoder, JwtEncoder jwtEncoder) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtEncoder = jwtEncoder;
    }

    @Transactional
    public LoginResponse login(LoginRequest request, String ipAddress) {
        String key = ipAddress + ":" + request.utorid();
        Instant now = Instant.now();
        Failure failure = failures.get(key);
        if (failure != null && failure.attempts >= MAX_FAILURES && now.isBefore(failure.started.plus(ATTEMPT_WINDOW))) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                "Too many failed login attempts. Please try again later.");
        }

        User user = users.findByUtorid(request.utorid()).orElse(null);
        if (user == null || !user.isActivated() || user.getPassword() == null
                || !passwordEncoder.matches(request.password(), user.getPassword())) {
            failures.compute(key, (ignored, previous) -> previous == null
                || !now.isBefore(previous.started.plus(ATTEMPT_WINDOW))
                ? new Failure(1, now) : new Failure(previous.attempts + 1, previous.started));
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials.");
        }

        failures.remove(key);
        Instant expiresAt = now.plus(TOKEN_LIFETIME);
        JwtClaimsSet claims = JwtClaimsSet.builder()
            .issuedAt(now).expiresAt(expiresAt)
            .claim("id", user.getId()).claim("utorid", user.getUtorid())
            .claim("role", user.getRole().name()).build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(
            JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        user.setLastLogin(now);
        return new LoginResponse(token, expiresAt);
    }

    private record Failure(int attempts, Instant started) {
    }
}
