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
}
