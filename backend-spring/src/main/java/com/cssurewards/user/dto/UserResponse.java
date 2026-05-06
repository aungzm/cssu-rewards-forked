package com.cssurewards.user.dto;

import com.cssurewards.user.RoleType;
import java.time.Instant;
import java.util.List;

public record UserResponse(
    Integer id, String utorid, String email, String name, Instant birthday,
    String avatarUrl, RoleType role, Instant lastLogin, boolean verified, int points,
    Instant createdAt, boolean hasAvatar, List<PromotionSummary> promotions
) {
    public record PromotionSummary(Integer id, String name, int points, double minSpending) {
    }
}
