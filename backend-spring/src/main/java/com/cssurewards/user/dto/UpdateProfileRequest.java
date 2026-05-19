package com.cssurewards.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
    @Size(min = 1, max = 50) String name,
    @Email @Pattern(regexp = "[^@]+@mail\\.utoronto\\.ca",
        message = "Email must be a valid @mail.utoronto.ca address") String email,
    String birthday
) {
}
