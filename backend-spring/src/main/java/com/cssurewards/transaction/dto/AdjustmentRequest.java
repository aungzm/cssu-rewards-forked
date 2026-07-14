package com.cssurewards.transaction.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.util.List;

public record AdjustmentRequest(@NotBlank String utorid,
    @NotNull @Pattern(regexp = "adjustment") String type,
    @NotNull Integer amount, @NotNull Integer relatedId,
    List<Integer> promotionIds, String remark) {
}
