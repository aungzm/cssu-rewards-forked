package com.cssurewards.transaction;

import com.cssurewards.transaction.dto.ProcessRedemptionRequest;
import com.cssurewards.transaction.dto.ProcessedRedemptionResponse;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
