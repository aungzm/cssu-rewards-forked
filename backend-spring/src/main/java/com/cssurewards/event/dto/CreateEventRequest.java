package com.cssurewards.event.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Min;
import java.time.Instant;

public record CreateEventRequest(@NotBlank String name, @NotBlank String description,
    @NotBlank String location, @NotNull Instant startTime, @NotNull Instant endTime,
    @Min(0) Integer capacity, @NotNull @Min(1) Integer points) {
}
