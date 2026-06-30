package com.cssurewards.promotion;

import com.cssurewards.promotion.dto.CreatePromotionRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.security.core.Authentication;
import java.util.Map;

@RestController
@RequestMapping("/promotions")
public class PromotionController {
    private final PromotionService service;

    public PromotionController(PromotionService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('MANAGER', 'SUPERUSER')")
    public Promotion create(@Valid @RequestBody CreatePromotionRequest request) {
        return service.create(request);
    }

    @GetMapping
    public Map<String, Object> list(@RequestParam(required = false) String name,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Boolean started,
            @RequestParam(required = false) Boolean ended,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit,
            Authentication authentication) {
        return service.list(name, type, started, ended, page, limit, isManager(authentication));
    }

    @GetMapping("/{promotionId}")
    public Promotion get(@PathVariable Integer promotionId, Authentication authentication) {
        return service.get(promotionId, isManager(authentication));
    }

    private boolean isManager(Authentication authentication) {
        return authentication.getAuthorities().stream().anyMatch(a ->
            a.getAuthority().equals("ROLE_MANAGER") || a.getAuthority().equals("ROLE_SUPERUSER"));
    }
}
