package com.cssurewards.transaction.dto;

public record RedemptionResponse(Integer id, String utorid, String type,
    String processedBy, int amount, String remark, String createdBy) {
}
