package com.cssurewards.transaction.dto;

import java.math.BigDecimal;

public record TransactionFilters(String type, Integer relatedId, Integer promotionId,
    BigDecimal amount, String operator, int page, int limit) {
}
