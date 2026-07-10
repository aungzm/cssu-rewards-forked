package com.cssurewards.transaction.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.DecimalMin;
import java.math.BigDecimal;
import java.util.List;

public record PurchaseRequest(@NotBlank String utorid,
    @NotNull @Pattern(regexp = "purchase") String type,
    @NotNull @DecimalMin(value = "0", inclusive = false) BigDecimal spent,
    List<Integer> promotionIds, String remark) {
}
