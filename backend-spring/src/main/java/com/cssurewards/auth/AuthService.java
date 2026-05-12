package com.cssurewards.auth;

import com.cssurewards.auth.dto.LoginRequest;
import com.cssurewards.auth.dto.LoginResponse;
import com.cssurewards.auth.dto.ResetRequest;
import com.cssurewards.auth.dto.ResetResponse;
import com.cssurewards.auth.dto.CompleteResetRequest;
import com.cssurewards.user.User;
import com.cssurewards.user.UserRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
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
    private final ResetTokenRepository resetTokens;
    private final ConcurrentHashMap<String, Failure> failures = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Instant> resetRequests = new ConcurrentHashMap<>();

    public AuthService(UserRepository users, PasswordEncoder passwordEncoder, JwtEncoder jwtEncoder,
            ResetTokenRepository resetTokens) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtEncoder = jwtEncoder;
        this.resetTokens = resetTokens;
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

    @Transactional
    public ResetResponse requestReset(ResetRequest request, String ipAddress) {
        Instant now = Instant.now();
        Instant last = resetRequests.get(ipAddress);
        if (last != null && now.isBefore(last.plusSeconds(60))) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                "Too many requests. Please wait before requesting another reset.");
        }
        User user = users.findByUtorid(request.utorid()).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
        resetRequests.put(ipAddress, now);
        String token = UUID.randomUUID().toString();
        Instant expiresAt = now.plus(TOKEN_LIFETIME);
        ResetToken record = resetTokens.findByUserId(user.getId()).orElse(null);
        if (record == null) {
            record = new ResetToken(token, expiresAt, user);
        } else {
            record.replace(token, expiresAt);
        }
        resetTokens.save(record);
        return new ResetResponse("Use the provided token to reset your password within 1 hour.",
            token, expiresAt);
    }

    @Transactional
    public void completeReset(String token, CompleteResetRequest request) {
        ResetToken record = resetTokens.findByToken(token).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Invalid reset token."));
        if (!record.getUser().getUtorid().equals(request.utorid())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token does not match the user.");
        }
        if (record.getExpiresAt().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.GONE, "Expired reset token.");
        }
        record.getUser().activate(passwordEncoder.encode(request.password()));
        resetTokens.delete(record);
    }
}
