package com.cssurewards.event.dto;

import jakarta.validation.constraints.Min;
import java.time.Instant;

public record UpdateEventRequest(String name, String description, String location,
    Instant startTime, Instant endTime, @Min(0) Integer capacity,
    @Min(1) Integer points, Boolean published) {
}
