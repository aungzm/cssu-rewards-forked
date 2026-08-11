package com.cssurewards.event.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AddOrganizerRequest(@NotNull @Size(min = 8, max = 8) String utorid) {
}
