package com.cssurewards.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateUserRequest(
    @Email @Pattern(regexp = "[^@]+@mail\\.utoronto\\.ca") String email,
    @Size(min = 1, max = 50) String name,
    @Pattern(regexp = "regular|cashier|manager|superuser") String role,
    Boolean verified,
    Boolean suspicious
) {
}
