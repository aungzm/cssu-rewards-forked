package com.cssurewards.transaction;

import com.cssurewards.transaction.dto.ProcessRedemptionRequest;
import com.cssurewards.transaction.dto.ProcessedRedemptionResponse;
import com.cssurewards.transaction.dto.SuspiciousRequest;
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
import org.springframework.web.bind.annotation.RequestParam;

@RestController
@RequestMapping("/transactions")
public class TransactionController {
    private final TransactionService service;

    public TransactionController(TransactionService service) {
        this.service = service;
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
}
