package com.cssurewards.transaction.dto;

public record ProcessedRedemptionResponse(Integer id, String utorid, String type,
    String processedBy, int redeemed, String remark, String createdBy) {
}
