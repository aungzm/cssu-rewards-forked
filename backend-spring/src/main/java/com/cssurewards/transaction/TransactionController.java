package com.cssurewards.transaction;

import com.cssurewards.transaction.dto.ProcessRedemptionRequest;
import com.cssurewards.transaction.dto.ProcessedRedemptionResponse;
import com.cssurewards.transaction.dto.SuspiciousRequest;
import com.cssurewards.transaction.dto.PurchaseRequest;
import com.cssurewards.transaction.dto.AdjustmentRequest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import jakarta.validation.Validator;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.RequestParam;

@RestController
@RequestMapping("/transactions")
public class TransactionController {
    private final TransactionService service;
    private final ObjectMapper mapper;
    private final Validator validator;

    public TransactionController(TransactionService service, ObjectMapper mapper, Validator validator) {
        this.service = service;
        this.mapper = mapper;
        this.validator = validator;
    }

    @PatchMapping("/{transactionId}/processed")
    @PreAuthorize("hasAnyRole('CASHIER', 'MANAGER', 'SUPERUSER')")
    public ProcessedRedemptionResponse process(@PathVariable Integer transactionId,
            @Valid @RequestBody ProcessRedemptionRequest request, Authentication authentication) {
        return service.processRedemption(transactionId, (Integer) authentication.getPrincipal());
    }

    @PatchMapping("/{transactionId}/suspicious")
    @PreAuthorize("hasAnyRole('MANAGER', 'SUPERUSER')")
    public Map<String, Object> suspicious(@PathVariable Integer transactionId,
            @Valid @RequestBody SuspiciousRequest request) {
        return service.setSuspicious(transactionId, request.suspicious());
    }

    @GetMapping("/{transactionId}")
    @PreAuthorize("hasAnyRole('MANAGER', 'SUPERUSER')")
    public Map<String, Object> getTransaction(@PathVariable Integer transactionId) {
        return service.getTransaction(transactionId);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'SUPERUSER')")
    public Map<String, Object> listTransactions(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String createdBy,
            @RequestParam(required = false) Boolean suspicious,
            @RequestParam(required = false) Integer promotionId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Integer relatedId,
            @RequestParam(required = false) Integer amount,
            @RequestParam(required = false) String operator,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit) {
        return service.listTransactions(name, createdBy, suspicious, promotionId,
            type, relatedId, amount, operator, page, limit);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('CASHIER', 'MANAGER', 'SUPERUSER')")
    public Map<String, Object> createTransaction(@RequestBody JsonNode body,
            Authentication authentication) {
        try {
            if (body.path("type").asText().equals("purchase")) {
                PurchaseRequest request = mapper.treeToValue(body, PurchaseRequest.class);
                validateRequest(request);
                return service.purchase(request, (Integer) authentication.getPrincipal());
            }
            if (body.path("type").asText().equals("adjustment")) {
                AdjustmentRequest request = mapper.treeToValue(body, AdjustmentRequest.class);
                validateRequest(request);
                return service.adjustment(request, (Integer) authentication.getPrincipal());
            }
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid transaction type specified.");
        } catch (JsonProcessingException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid transaction request.");
        }
    }

    private <T> void validateRequest(T request) {
        if (!validator.validate(request).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid transaction request.");
        }
    }
}
