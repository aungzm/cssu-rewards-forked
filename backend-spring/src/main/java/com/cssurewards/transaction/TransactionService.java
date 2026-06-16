package com.cssurewards.transaction;

import com.cssurewards.transaction.dto.TransferRequest;
import com.cssurewards.transaction.dto.TransferResponse;
import com.cssurewards.transaction.dto.RedemptionRequest;
import com.cssurewards.transaction.dto.RedemptionResponse;
import com.cssurewards.transaction.dto.ProcessedRedemptionResponse;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import com.cssurewards.user.User;
import com.cssurewards.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TransactionService {
    private final UserRepository users;
    private final TransactionRepository transactions;

    public TransactionService(UserRepository users, TransactionRepository transactions) {
        this.users = users;
        this.transactions = transactions;
    }

    @Transactional
    public TransferResponse transfer(Integer senderId, Integer receiverId, TransferRequest request) {
        User recipient = users.findById(receiverId).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Recipient user not found."));
        if (senderId.equals(receiverId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot transfer points to yourself.");
        }
        User sender = users.findById(senderId).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired token."));
        if (users.debitIfEnough(senderId, request.amount()) != 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Insufficient points for transfer.");
        }
        users.credit(receiverId, request.amount());
        String remark = request.remark() == null ? "" : request.remark();
        Transaction sent = transactions.save(Transaction.transfer(senderId, senderId, receiverId,
            -request.amount(), remark));
        transactions.save(Transaction.transfer(receiverId, senderId, receiverId, request.amount(), remark));
        return new TransferResponse(sent.getId(), sender.getUtorid(), recipient.getUtorid(),
            "transfer", request.amount(), remark, sender.getUtorid());
    }

    @Transactional
    public RedemptionResponse redeem(Integer userId, RedemptionRequest request) {
        User user = users.findByIdForUpdate(userId).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
        int amount = request.amount() == null ? user.getPoints() : request.amount();
        if (amount <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Amount must be a positive integer.");
        }
        long reserved = -transactions.sumPendingRedemptions(userId);
        if (amount > (long) user.getPoints() - reserved) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Insufficient points for redemption.");
        }
        String remark = request.remark() == null ? "" : request.remark();
        Transaction redemption = transactions.save(Transaction.redemption(userId, amount, remark));
        return new RedemptionResponse(redemption.getId(), user.getUtorid(), "redemption",
            null, amount, remark, user.getUtorid());
    }

    @Transactional
    public ProcessedRedemptionResponse processRedemption(Integer transactionId, Integer operatorId) {
        Transaction redemption = transactions.findById(transactionId).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found."));
        if (redemption.getType() != TransactionType.REDEMPTION) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Transaction is not of type 'redemption'.");
        }
        if (redemption.getOperatorId() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Transaction has already been processed.");
        }
        if (redemption.getUserId() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found.");
        }
        User user = users.findById(redemption.getUserId()).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
        User operator = users.findById(operatorId).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired token."));
        if (transactions.claimRedemption(transactionId, operatorId) != 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Transaction has already been processed.");
        }
        int amount = Math.abs(redemption.getAmount());
        if (users.debitIfEnough(user.getId(), amount) != 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Insufficient points for redemption.");
        }
        return new ProcessedRedemptionResponse(transactionId, user.getUtorid(), "redemption",
            operator.getUtorid(), amount, redemption.getRemarks(), user.getUtorid());
    }

    @Transactional
    public Map<String, Object> setSuspicious(Integer transactionId, boolean suspicious) {
        Transaction transaction = transactions.findByIdForUpdate(transactionId).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found."));
        int adjustment = 0;
        if (transaction.isSuspicious() != suspicious && transaction.getAmount() != null) {
            int amount = transaction.getAmount();
            switch (transaction.getType()) {
                case PURCHASE, EVENT -> adjustment = suspicious ? -amount : amount;
                case REDEMPTION -> {
                    if (transaction.getOperatorId() != null) {
                        adjustment = suspicious ? Math.abs(amount) : -Math.abs(amount);
                    }
                }
                default -> { }
            }
        }
        if (adjustment != 0 && transaction.getUserId() != null) {
            users.credit(transaction.getUserId(), adjustment);
        }
        transaction.setSuspicious(suspicious);
        User user = transaction.getUserId() == null ? null : users.findById(transaction.getUserId()).orElse(null);
        User operator = transaction.getOperatorId() == null ? null : users.findById(transaction.getOperatorId()).orElse(null);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", transaction.getId());
        response.put("utorid", user == null ? null : user.getUtorid());
        response.put("type", transaction.getType().name().toLowerCase(java.util.Locale.ROOT));
        response.put("spent", transaction.getSpent());
        response.put("amount", transaction.getAmount());
        response.put("promotionIds", List.of());
        response.put("suspicious", suspicious);
        response.put("remark", transaction.getRemarks() == null ? "" : transaction.getRemarks());
        response.put("createdBy", operator == null ? null : operator.getUtorid());
        return response;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getTransaction(Integer id) {
        Transaction transaction = transactions.findById(id).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found."));
        User user = transaction.getUserId() == null ? null : users.findById(transaction.getUserId()).orElse(null);
        User operator = transaction.getOperatorId() == null ? null : users.findById(transaction.getOperatorId()).orElse(null);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", transaction.getId());
        response.put("utorid", user == null ? null : user.getUtorid());
        response.put("type", transaction.getType().name().toLowerCase(java.util.Locale.ROOT));
        response.put("spent", transaction.getSpent());
        response.put("amount", transaction.getAmount());
        response.put("promotionIds", List.of());
        response.put("suspicious", transaction.isSuspicious());
        response.put("relatedId", transaction.getRelatedId());
        response.put("remark", transaction.getRemarks() == null ? "" : transaction.getRemarks());
        response.put("createdBy", operator == null ? null : operator.getUtorid());
        return response;
    }
}
