package com.cssurewards.user.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import com.fasterxml.jackson.annotation.JsonProperty;

public record ChangePasswordRequest(
    @NotNull @Size(min = 8, max = 20) String old,
    @NotNull @Pattern(regexp = "(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,20}",
        message = "Password must be 8-20 characters with uppercase, lowercase, number, and special character")
    @JsonProperty("new") String newPassword
) {
}
