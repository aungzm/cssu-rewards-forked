package com.cssurewards.transaction;

import com.cssurewards.transaction.dto.TransferRequest;
import com.cssurewards.transaction.dto.TransferResponse;
import com.cssurewards.transaction.dto.RedemptionRequest;
import com.cssurewards.transaction.dto.RedemptionResponse;
import com.cssurewards.transaction.dto.ProcessedRedemptionResponse;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import com.cssurewards.transaction.dto.TransactionFilters;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Subquery;
import com.cssurewards.transaction.dto.PurchaseRequest;
import com.cssurewards.transaction.dto.AdjustmentRequest;
import com.cssurewards.promotion.Promotion;
import com.cssurewards.promotion.PromotionRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import java.math.BigDecimal;
import java.time.Instant;
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
    private final PromotionRepository promotions;
    private final JdbcTemplate jdbc;

    public TransactionService(UserRepository users, TransactionRepository transactions,
            PromotionRepository promotions, JdbcTemplate jdbc) {
        this.users = users;
        this.transactions = transactions;
        this.promotions = promotions;
        this.jdbc = jdbc;
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
        response.put("promotionIds", promotionIds(transaction.getId()));
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
        response.put("promotionIds", promotionIds(transaction.getId()));
        response.put("suspicious", transaction.isSuspicious());
        response.put("relatedId", transaction.getRelatedId());
        response.put("remark", transaction.getRemarks() == null ? "" : transaction.getRemarks());
        response.put("createdBy", operator == null ? null : operator.getUtorid());
        return response;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getMyTransactions(Integer userId, TransactionFilters filters) {
        if (filters.page() < 1 || filters.limit() < 1 || filters.limit() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid pagination parameters.");
        }
        TransactionType type = null;
        if (filters.type() != null) {
            try {
                type = TransactionType.valueOf(filters.type().toUpperCase(java.util.Locale.ROOT));
            } catch (IllegalArgumentException exception) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid transaction type.");
            }
        }
        if (filters.operator() != null && !List.of("gte", "lte").contains(filters.operator())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid amount operator.");
        }
        List<Integer> promotedTransactions = filters.promotionId() == null ? null : jdbc.queryForList(
            "SELECT transaction_id FROM transaction_promotions WHERE promotion_id = ?",
            Integer.class, filters.promotionId());
        TransactionType requestedType = type;
        Specification<Transaction> specification = (root, query, cb) -> {
            List<Predicate> conditions = new java.util.ArrayList<>();
            conditions.add(cb.equal(root.get("userId"), userId));
            if (promotedTransactions != null) conditions.add(root.get("id").in(promotedTransactions));
            if (requestedType != null) conditions.add(cb.equal(root.get("type"), requestedType));
            if (filters.relatedId() != null && requestedType != null) {
                int relatedId = filters.relatedId();
                switch (requestedType) {
                    case TRANSFER -> conditions.add(cb.or(cb.equal(root.get("senderId"), relatedId),
                        cb.equal(root.get("receiverId"), relatedId)));
                    case REDEMPTION -> conditions.add(cb.equal(root.get("operatorId"), relatedId));
                    case ADJUSTMENT -> conditions.add(cb.equal(root.get("relatedId"), relatedId));
                    case EVENT -> conditions.add(cb.disjunction()); // Events are not ported yet.
                    default -> { }
                }
            }
            if (filters.amount() != null && filters.operator() != null) {
                if (filters.operator().equals("gte")) {
                    conditions.add(cb.ge(root.get("amount"), filters.amount()));
                } else {
                    conditions.add(cb.le(root.get("amount"), filters.amount()));
                }
            }
            return cb.and(conditions.toArray(Predicate[]::new));
        };
        Page<Transaction> page = transactions.findAll(specification,
            PageRequest.of(filters.page() - 1, filters.limit(), Sort.by(Sort.Direction.DESC, "createdAt")));
        List<Map<String, Object>> results = page.getContent().stream().map(transaction -> {
            User operator = transaction.getOperatorId() == null ? null : users.findById(transaction.getOperatorId()).orElse(null);
            User sender = transaction.getSenderId() == null ? null : users.findById(transaction.getSenderId()).orElse(null);
            User owner = users.findById(userId).orElse(null);
            Integer relatedId = switch (transaction.getType()) {
                case TRANSFER -> userId.equals(transaction.getSenderId())
                    ? transaction.getReceiverId() : transaction.getSenderId();
                case REDEMPTION -> transaction.getOperatorId();
                case ADJUSTMENT -> transaction.getRelatedId();
                default -> null;
            };
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", transaction.getId());
            item.put("amount", transaction.getAmount() == null ? 0 : transaction.getAmount());
            item.put("type", transaction.getType().name().toLowerCase(java.util.Locale.ROOT));
            item.put("relatedId", relatedId);
            item.put("promotionIds", promotionIds(transaction.getId()));
            item.put("remark", transaction.getRemarks() == null ? "" : transaction.getRemarks());
            item.put("createdBy", operator != null ? operator.getUtorid()
                : sender != null ? sender.getUtorid() : owner == null ? null : owner.getUtorid());
            item.put("createdAt", transaction.getCreatedAt());
            item.put("suspicious", transaction.isSuspicious());
            item.put("operatorId", transaction.getOperatorId());
            return item;
        }).toList();
        return Map.of("count", page.getTotalElements(), "results", results);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> listTransactions(String name, String createdBy, Boolean suspicious,
            Integer promotionId, String typeName, Integer relatedId, Integer amount,
            String operator, int pageNumber, int limit) {
        if (pageNumber < 1 || limit < 1 || limit > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid pagination parameters.");
        }
        TransactionType type = null;
        if (typeName != null) {
            try {
                type = TransactionType.valueOf(typeName.toUpperCase(java.util.Locale.ROOT));
            } catch (IllegalArgumentException exception) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid transaction type.");
            }
        }
        if (operator != null && !List.of("gte", "lte").contains(operator)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid amount operator.");
        }
        List<Integer> promotedTransactions = promotionId == null ? null : jdbc.queryForList(
            "SELECT transaction_id FROM transaction_promotions WHERE promotion_id = ?",
            Integer.class, promotionId);
        TransactionType requestedType = type;
        Specification<Transaction> filters = (root, query, cb) -> {
            List<Predicate> predicates = new java.util.ArrayList<>();
            if (promotedTransactions != null) predicates.add(root.get("id").in(promotedTransactions));
            if (requestedType != null) predicates.add(cb.equal(root.get("type"), requestedType));
            if (suspicious != null) predicates.add(cb.equal(root.get("suspicious"), suspicious));
            if (name != null) {
                Subquery<Integer> owner = query.subquery(Integer.class);
                var u = owner.from(User.class);
                owner.select(u.get("id")).where(cb.equal(u.get("id"), root.get("userId")),
                    cb.or(cb.like(u.get("utorid"), "%" + name + "%"), cb.like(u.get("name"), "%" + name + "%")));
                predicates.add(cb.exists(owner));
            }
            if (createdBy != null) {
                Subquery<Integer> creator = query.subquery(Integer.class);
                var u = creator.from(User.class);
                creator.select(u.get("id")).where(cb.equal(u.get("id"), root.get("operatorId")),
                    cb.or(cb.like(u.get("utorid"), "%" + createdBy + "%"), cb.like(u.get("name"), "%" + createdBy + "%")));
                predicates.add(cb.exists(creator));
            }
            if (relatedId != null && requestedType != null) {
                switch (requestedType) {
                    case TRANSFER -> predicates.add(cb.or(cb.equal(root.get("senderId"), relatedId),
                        cb.equal(root.get("receiverId"), relatedId)));
                    case REDEMPTION -> predicates.add(cb.equal(root.get("operatorId"), relatedId));
                    case ADJUSTMENT -> predicates.add(cb.equal(root.get("relatedId"), relatedId));
                    case EVENT -> predicates.add(cb.disjunction());
                    default -> { }
                }
            }
            if (amount != null && operator != null) {
                predicates.add(operator.equals("gte") ? cb.ge(root.get("amount"), amount)
                    : cb.le(root.get("amount"), amount));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        Page<Transaction> page = transactions.findAll(filters,
            PageRequest.of(pageNumber - 1, limit, Sort.by(Sort.Direction.DESC, "createdAt")));
        List<Map<String, Object>> results = page.getContent().stream().map(transaction -> {
            User owner = transaction.getUserId() == null ? null : users.findById(transaction.getUserId()).orElse(null);
            User creator = transaction.getOperatorId() == null ? null : users.findById(transaction.getOperatorId()).orElse(null);
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", transaction.getId());
            item.put("utorid", owner == null ? null : owner.getUtorid());
            item.put("type", transaction.getType().name().toLowerCase(java.util.Locale.ROOT));
            item.put("promotionIds", promotionIds(transaction.getId()));
            item.put("suspicious", transaction.isSuspicious());
            item.put("remark", transaction.getRemarks() == null ? "" : transaction.getRemarks());
            item.put("createdBy", creator == null ? null : creator.getUtorid());
            item.put("createdAt", transaction.getCreatedAt());
            switch (transaction.getType()) {
                case PURCHASE -> {
                    item.put("spent", transaction.getSpent());
                    item.put("amount", transaction.getAmount());
                }
                case REDEMPTION -> {
                    item.put("amount", transaction.getAmount());
                    item.put("redeemed", Math.abs(transaction.getAmount() == null ? 0 : transaction.getAmount()));
                    item.put("relatedId", transaction.getOperatorId());
                }
                case ADJUSTMENT -> {
                    item.put("amount", transaction.getAmount());
                    item.put("relatedId", transaction.getRelatedId());
                }
                case TRANSFER -> {
                    item.put("amount", transaction.getAmount());
                    item.put("relatedId", transaction.getUserId() != null
                        && transaction.getUserId().equals(transaction.getSenderId())
                        ? transaction.getReceiverId() : transaction.getSenderId());
                }
                case EVENT -> {
                    item.put("amount", transaction.getAmount());
                    item.put("relatedId", null);
                }
            }
            return item;
        }).toList();
        return Map.of("count", page.getTotalElements(), "results", results);
    }

    @Transactional
    public Map<String, Object> purchase(PurchaseRequest request, Integer operatorId) {
        User operator = users.findById(operatorId).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired token."));
        User user = users.findByUtorid(request.utorid()).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
        user = users.findByIdForUpdate(user.getId()).orElseThrow();
        List<Integer> ids = request.promotionIds() == null ? List.of() : request.promotionIds();
        if (ids.stream().anyMatch(id -> id == null) || ids.size() != ids.stream().distinct().count()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid format for promotion IDs.");
        }
        List<Promotion> applied = promotions.findAllById(ids);
        Instant now = Instant.now();
        if (applied.size() != ids.size() || applied.stream().anyMatch(p -> p.getStartTime().isAfter(now)
                || p.getEndTime().isBefore(now))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "One or more promotion IDs are invalid, expired, or not yet active.");
        }
        double spent = request.spent().doubleValue();
        if (!Double.isFinite(spent) || spent <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The spent amount must be a positive number.");
        }
        long points = Math.round(spent / 0.25);
        for (Promotion promotion : applied) {
            if (spent < promotion.getMinSpending()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Promotion " + promotion.getId() + " requires a minimum spending of " + promotion.getMinSpending() + ".");
            }
            if (promotion.getType().equals("one-time") && jdbc.queryForObject(
                    "SELECT COUNT(*) FROM user_promotions WHERE user_id = ? AND promotion_id = ?",
                    Integer.class, user.getId(), promotion.getId()) > 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Promotion " + promotion.getId() + " has already been used by this user.");
            }
            points += Math.round(spent * 100 * promotion.getRate()) + promotion.getPoints();
        }
        if (points > Integer.MAX_VALUE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Purchase points exceed the supported range.");
        }
        int earned = (int) points;
        Transaction transaction = transactions.save(Transaction.purchase(user.getId(), operatorId,
            request.spent(), earned, request.remark(), operator.isSuspicious()));
        if (!operator.isSuspicious()) users.credit(user.getId(), earned);
        for (Promotion promotion : applied) {
            jdbc.update("INSERT INTO transaction_promotions(transaction_id, promotion_id) VALUES (?, ?)",
                transaction.getId(), promotion.getId());
            if (promotion.getType().equals("one-time")) {
                jdbc.update("INSERT INTO user_promotions(user_id, promotion_id) VALUES (?, ?)",
                    user.getId(), promotion.getId());
            }
        }
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", transaction.getId());
        response.put("utorid", user.getUtorid());
        response.put("type", "purchase");
        response.put("spent", request.spent());
        response.put("earned", operator.isSuspicious() ? 0 : earned);
        response.put("remark", transaction.getRemarks());
        response.put("promotionIds", applied.stream().map(Promotion::getId).toList());
        response.put("createdBy", operator.getUtorid());
        return response;
    }

    @Transactional
    public Map<String, Object> adjustment(AdjustmentRequest request, Integer operatorId) {
        User operator = users.findById(operatorId).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired token."));
        if (operator.getRole() != com.cssurewards.user.RoleType.MANAGER
                && operator.getRole() != com.cssurewards.user.RoleType.SUPERUSER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Insufficient clearance to create an adjustment transaction.");
        }
        User user = users.findByUtorid(request.utorid()).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));
        user = users.findByIdForUpdate(user.getId()).orElseThrow();
        if (!transactions.existsById(request.relatedId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Related transaction not found.");
        }
        List<Integer> ids = request.promotionIds() == null ? List.of() : request.promotionIds();
        if (ids.stream().anyMatch(id -> id == null) || ids.size() != ids.stream().distinct().count()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid format for promotion IDs.");
        }
        List<Promotion> applied = promotions.findAllById(ids);
        Instant now = Instant.now();
        if (applied.size() != ids.size() || applied.stream().anyMatch(p -> p.getStartTime().isAfter(now)
                || p.getEndTime().isBefore(now))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "One or more promotion IDs are invalid, expired, or not yet active.");
        }
        for (Promotion promotion : applied) {
            if (promotion.getType().equals("one-time") && jdbc.queryForObject(
                    "SELECT COUNT(*) FROM user_promotions WHERE user_id = ? AND promotion_id = ?",
                    Integer.class, user.getId(), promotion.getId()) > 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Promotion " + promotion.getId() + " has already been used by this user.");
            }
        }
        Transaction transaction = transactions.save(Transaction.adjustment(user.getId(), operatorId,
            request.amount(), request.relatedId(), request.remark()));
        users.credit(user.getId(), request.amount());
        for (Promotion promotion : applied) {
            jdbc.update("INSERT INTO transaction_promotions(transaction_id, promotion_id) VALUES (?, ?)",
                transaction.getId(), promotion.getId());
            if (promotion.getType().equals("one-time")) {
                jdbc.update("INSERT INTO user_promotions(user_id, promotion_id) VALUES (?, ?)",
                    user.getId(), promotion.getId());
            }
        }
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", transaction.getId());
        response.put("utorid", user.getUtorid());
        response.put("amount", request.amount());
        response.put("type", "adjustment");
        response.put("relatedId", request.relatedId());
        response.put("remark", transaction.getRemarks());
        response.put("promotionIds", applied.stream().map(Promotion::getId).toList());
        response.put("createdBy", operator.getUtorid());
        return response;
    }

    private List<Integer> promotionIds(Integer transactionId) {
        return jdbc.queryForList("SELECT promotion_id FROM transaction_promotions WHERE transaction_id = ? ORDER BY promotion_id",
            Integer.class, transactionId);
    }
}
