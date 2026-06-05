package com.cssurewards.transaction.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record RedemptionRequest(
    @NotNull @Pattern(regexp = "redemption") String type,
    @Min(1) Integer amount,
    String remark
) {
}
