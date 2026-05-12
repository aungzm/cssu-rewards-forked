package com.cssurewards.auth.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record CompleteResetRequest(
    @NotNull(message = "UTORid is required")
    @Pattern(regexp = "[a-zA-Z0-9]{8}", message = "UTORid must be 8 alphanumeric characters")
    String utorid,
    @NotNull(message = "Password is required")
    @Pattern(regexp = "(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,20}",
        message = "Password must be 8-20 characters with uppercase, lowercase, number, and special character")
    String password
) {
}
