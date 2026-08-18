package com.cssurewards.event.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AwardPointsRequest(@NotNull @Pattern(regexp = "event") String type,
    @NotNull @Min(1) Integer amount, @Size(min = 8, max = 8) String utorid, String remark) {
}
