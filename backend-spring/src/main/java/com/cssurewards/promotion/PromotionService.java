package com.cssurewards.promotion;

import com.cssurewards.promotion.dto.CreatePromotionRequest;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PromotionService {
    private final PromotionRepository promotions;

    public PromotionService(PromotionRepository promotions) {
        this.promotions = promotions;
    }

    @Transactional
    public Promotion create(CreatePromotionRequest request) {
        if (request.startTime().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "startTime must not be in the past");
        }
        if (!request.endTime().isAfter(request.startTime())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "endTime must be after startTime");
        }
        return promotions.save(new Promotion(request.name(), request.description(),
            request.startTime(), request.endTime(), request.rate() == null ? 0 : request.rate(),
            request.minSpending() == null ? 0 : request.minSpending(),
            request.points() == null ? 0 : request.points(), request.type()));
    }
}
