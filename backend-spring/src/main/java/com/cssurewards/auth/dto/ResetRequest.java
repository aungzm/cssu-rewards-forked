package com.cssurewards.auth.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record ResetRequest(
    @NotNull(message = "UTORid is required")
    @Pattern(regexp = "[a-zA-Z0-9]{8}", message = "UTORid must be 8 alphanumeric characters")
    String utorid
) {
}
