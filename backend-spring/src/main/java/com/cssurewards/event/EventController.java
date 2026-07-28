package com.cssurewards.event;

import com.cssurewards.event.dto.CreateEventRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;
import java.util.LinkedHashMap;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.security.core.Authentication;

@RestController
@RequestMapping("/events")
public class EventController {
    private final EventService service;

    public EventController(EventService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('MANAGER', 'SUPERUSER')")
    public Map<String, Object> create(@Valid @RequestBody CreateEventRequest request) {
        Event event = service.create(request);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", event.getId());
        result.put("name", event.getName());
        result.put("description", event.getDescription());
        result.put("location", event.getLocation());
        result.put("startTime", event.getStartTime());
        result.put("endTime", event.getEndTime());
        result.put("capacity", event.getCapacity());
        result.put("pointsRemain", event.getPointsRemain());
        result.put("pointsAwarded", event.getPointsAwarded());
        result.put("published", event.isPublished());
        result.put("organizers", List.of());
        result.put("guests", List.of());
        return result;
    }

    @GetMapping
    public Map<String, Object> list(@RequestParam(required = false) String name,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) Boolean started,
            @RequestParam(required = false) Boolean ended,
            @RequestParam(required = false) Boolean showFull,
            @RequestParam(required = false) Boolean published,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit,
            Authentication authentication) {
        boolean manager = authentication.getAuthorities().stream().anyMatch(a ->
            a.getAuthority().equals("ROLE_MANAGER") || a.getAuthority().equals("ROLE_SUPERUSER"));
        return service.list(name, location, started, ended, showFull, published,
            page, limit, (Integer) authentication.getPrincipal(), manager);
    }
}
