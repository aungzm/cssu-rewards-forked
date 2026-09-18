package com.cssurewards.promotion.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import java.time.Instant;

public record CreatePromotionRequest(
    @NotBlank String name,
    @NotBlank String description,
    @NotNull Instant startTime,
    @NotNull Instant endTime,
    @DecimalMin("0") Double rate,
    @DecimalMin("0") Double minSpending,
    @NotNull @Min(0) Integer points,
    @NotNull @Pattern(regexp = "automatic|one-time") String type
) {
}
