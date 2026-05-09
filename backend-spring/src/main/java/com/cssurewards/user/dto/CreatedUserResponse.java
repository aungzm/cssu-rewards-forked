package com.cssurewards.user.dto;

import java.time.Instant;

public record CreatedUserResponse(Integer id, String utorid, String name, String email,
    boolean verified, String resetToken, Instant expiresAt, String message) {
}
