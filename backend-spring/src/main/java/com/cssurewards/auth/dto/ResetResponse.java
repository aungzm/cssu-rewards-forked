package com.cssurewards.auth.dto;

import java.time.Instant;

public record ResetResponse(String message, String resetToken, Instant expiresAt) {
}
