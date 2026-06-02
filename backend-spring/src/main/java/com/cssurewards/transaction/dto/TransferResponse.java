package com.cssurewards.transaction.dto;

public record TransferResponse(Integer id, String sender, String recipient, String type,
    int sent, String remark, String createdBy) {
}
