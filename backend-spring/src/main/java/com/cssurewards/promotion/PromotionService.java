package com.cssurewards.promotion;

import com.cssurewards.promotion.dto.CreatePromotionRequest;
import com.cssurewards.promotion.dto.UpdatePromotionRequest;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import java.util.Map;
import java.util.List;
import java.util.LinkedHashMap;
import jakarta.persistence.criteria.Predicate;

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
            request.points(), request.type()));
    }

    @Transactional(readOnly = true)
    public Promotion get(Integer id, boolean manager) {
        Promotion promotion = promotions.findById(id).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Promotion not found"));
        Instant now = Instant.now();
        if (!manager && (promotion.getStartTime().isAfter(now) || promotion.getEndTime().isBefore(now))) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Promotion not found");
        }
        return promotion;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> list(String name, String type, Boolean started, Boolean ended,
            int pageNumber, int limit, boolean manager) {
        if (pageNumber < 1 || limit < 1 || limit > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid pagination parameters.");
        }
        if (started != null && ended != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Cannot specify both \"started\" and \"ended\" simultaneously.");
        }
        if (type != null && !List.of("automatic", "one-time").contains(type)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid promotion type.");
        }
        Instant now = Instant.now();
        Specification<Promotion> filter = (root, query, cb) -> {
            List<Predicate> conditions = new java.util.ArrayList<>();
            if (name != null) conditions.add(cb.like(root.get("name"), "%" + name + "%"));
            if (type != null) conditions.add(cb.equal(root.get("type"), type));
            if (!manager) {
                conditions.add(cb.lessThanOrEqualTo(root.get("startTime"), now));
                conditions.add(cb.greaterThanOrEqualTo(root.get("endTime"), now));
            } else if (started != null) {
                conditions.add(started ? cb.lessThanOrEqualTo(root.get("startTime"), now)
                    : cb.greaterThan(root.get("startTime"), now));
            } else if (ended != null) {
                conditions.add(ended ? cb.lessThanOrEqualTo(root.get("endTime"), now)
                    : cb.greaterThan(root.get("endTime"), now));
            }
            return cb.and(conditions.toArray(Predicate[]::new));
        };
        Page<Promotion> result = promotions.findAll(filter,
            PageRequest.of(pageNumber - 1, limit, Sort.by("startTime")));
        return Map.of("count", result.getTotalElements(), "results", result.getContent());
    }

    @Transactional
    public Map<String, Object> update(Integer id, UpdatePromotionRequest request) {
        Promotion promotion = promotions.findById(id).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Promotion not found"));
        if (request.name() == null && request.description() == null && request.startTime() == null
                && request.endTime() == null && request.rate() == null && request.minSpending() == null
                && request.points() == null && request.type() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No valid fields to update");
        }
        if (request.startTime() != null && request.startTime().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot set a start time in the past");
        }
        Instant start = request.startTime() == null ? promotion.getStartTime() : request.startTime();
        Instant end = request.endTime() == null ? promotion.getEndTime() : request.endTime();
        if (end.isBefore(start)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End time must be after start time");
        }
        promotion.update(request.name(), request.description(), request.startTime(), request.endTime(),
            request.rate(), request.minSpending(), request.points(), request.type());
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", id);
        response.put("name", promotion.getName());
        response.put("type", promotion.getType());
        response.put("startTime", promotion.getStartTime());
        response.put("endTime", promotion.getEndTime());
        if (request.description() != null) response.put("description", promotion.getDescription());
        if (request.rate() != null) response.put("rate", promotion.getRate());
        if (request.minSpending() != null) response.put("minSpending", promotion.getMinSpending());
        if (request.points() != null) response.put("points", promotion.getPoints());
        return response;
    }

    @Transactional
    public void delete(Integer id) {
        Promotion promotion = promotions.findById(id).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Promotion not found"));
        if (!Instant.now().isBefore(promotion.getStartTime())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Cannot delete a promotion that has started");
        }
        promotions.delete(promotion);
    }
}
