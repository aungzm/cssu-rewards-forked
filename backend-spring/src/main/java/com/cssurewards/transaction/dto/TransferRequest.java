package com.cssurewards.transaction.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record TransferRequest(
    @NotNull @Pattern(regexp = "transfer") String type,
    @NotNull @Min(value = 1, message = "Amount must be a positive integer value") Integer amount,
    String remark
) {
}
