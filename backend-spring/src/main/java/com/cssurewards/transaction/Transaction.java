package com.cssurewards.transaction;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "transactions")
public class Transaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TransactionType type;
    private BigDecimal spent;
    private Integer amount;
    @Column(columnDefinition = "text")
    private String remarks;
    @Column(nullable = false)
    private Instant createdAt;
    private Integer userId;
    private Integer operatorId;
    private Integer senderId;
    private Integer receiverId;
    @Column(nullable = false)
    private boolean suspicious;
    private Integer relatedId;

    protected Transaction() {
    }

    public static Transaction transfer(Integer userId, Integer senderId, Integer receiverId,
            int amount, String remark) {
        Transaction transaction = new Transaction();
        transaction.type = TransactionType.TRANSFER;
        transaction.userId = userId;
        transaction.senderId = senderId;
        transaction.receiverId = receiverId;
        transaction.amount = amount;
        transaction.remarks = remark == null ? "" : remark;
        transaction.createdAt = Instant.now();
        return transaction;
    }

    public static Transaction redemption(Integer userId, int amount, String remark) {
        Transaction transaction = new Transaction();
        transaction.type = TransactionType.REDEMPTION;
        transaction.userId = userId;
        transaction.amount = -amount;
        transaction.remarks = remark == null ? "" : remark;
        transaction.createdAt = Instant.now();
        return transaction;
    }

    public Integer getId() { return id; }
    public TransactionType getType() { return type; }
    public BigDecimal getSpent() { return spent; }
    public Integer getAmount() { return amount; }
    public String getRemarks() { return remarks; }
    public Instant getCreatedAt() { return createdAt; }
    public Integer getUserId() { return userId; }
    public Integer getOperatorId() { return operatorId; }
    public Integer getSenderId() { return senderId; }
    public Integer getReceiverId() { return receiverId; }
    public boolean isSuspicious() { return suspicious; }
    public Integer getRelatedId() { return relatedId; }

    public void setSuspicious(boolean suspicious) { this.suspicious = suspicious; }
}
