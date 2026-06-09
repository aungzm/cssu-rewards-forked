package com.cssurewards.transaction.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;

public record ProcessRedemptionRequest(@NotNull @AssertTrue Boolean processed) {
}
