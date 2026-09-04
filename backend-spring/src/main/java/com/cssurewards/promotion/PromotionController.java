package com.cssurewards.promotion;

import com.cssurewards.promotion.dto.CreatePromotionRequest;
import com.cssurewards.promotion.dto.UpdatePromotionRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.security.core.Authentication;
import java.util.Map;
import java.util.LinkedHashMap;

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
    public Map<String, Object> create(@Valid @RequestBody CreatePromotionRequest request) {
        Promotion promotion = service.create(request);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", promotion.getId());
        response.put("name", promotion.getName());
        response.put("description", promotion.getDescription());
        response.put("type", promotion.getType());
        response.put("startTime", promotion.getStartTime());
        response.put("endTime", promotion.getEndTime());
        response.put("minSpending", promotion.getMinSpending());
        response.put("rate", promotion.getRate());
        response.put("points", promotion.getPoints());
        return response;
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

    @PatchMapping("/{promotionId}")
    @PreAuthorize("hasAnyRole('MANAGER', 'SUPERUSER')")
    public Map<String, Object> update(@PathVariable Integer promotionId,
            @Valid @RequestBody UpdatePromotionRequest request) {
        return service.update(promotionId, request);
    }

    @DeleteMapping("/{promotionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('MANAGER', 'SUPERUSER')")
    public void delete(@PathVariable Integer promotionId) {
        service.delete(promotionId);
    }

    private boolean isManager(Authentication authentication) {
        return authentication.getAuthorities().stream().anyMatch(a ->
            a.getAuthority().equals("ROLE_MANAGER") || a.getAuthority().equals("ROLE_SUPERUSER"));
    }
}
