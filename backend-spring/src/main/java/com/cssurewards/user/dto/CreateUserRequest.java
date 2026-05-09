package com.cssurewards.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateUserRequest(
    @NotBlank @Size(max = 50) String name,
    @Pattern(regexp = "[a-zA-Z0-9]{8}", message = "UTORid must be 8 alphanumeric characters")
    @NotBlank String utorid,
    @NotBlank @Email @Pattern(regexp = "[^@]+@mail\\.utoronto\\.ca",
        message = "Email must be a valid @mail.utoronto.ca address") String email
) {
}
