package com.cssurewards.promotion.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import java.time.Instant;

public record UpdatePromotionRequest(String name, String description, Instant startTime,
    Instant endTime, @DecimalMin("0") Double rate, @DecimalMin("0") Double minSpending,
    @Min(0) Integer points, @Pattern(regexp = "automatic|one-time") String type) {
}
