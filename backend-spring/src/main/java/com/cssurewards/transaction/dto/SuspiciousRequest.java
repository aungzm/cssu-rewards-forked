package com.cssurewards.transaction.dto;

import jakarta.validation.constraints.NotNull;

public record SuspiciousRequest(@NotNull Boolean suspicious) {
}
