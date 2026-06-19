package com.cssurewards.transaction.dto;

public record TransactionFilters(String type, Integer relatedId, Integer promotionId,
    Integer amount, String operator, int page, int limit) {
}
