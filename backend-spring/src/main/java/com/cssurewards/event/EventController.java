package com.cssurewards.event;

import com.cssurewards.event.dto.CreateEventRequest;
import com.cssurewards.event.dto.UpdateEventRequest;
import com.cssurewards.event.dto.AddOrganizerRequest;
import com.cssurewards.event.dto.AddGuestRequest;
import com.cssurewards.event.dto.AwardPointsRequest;
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
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PathVariable;
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

    @GetMapping("/{eventId}")
    public Map<String, Object> get(@PathVariable Integer eventId, Authentication authentication) {
        boolean manager = authentication.getAuthorities().stream().anyMatch(a ->
            a.getAuthority().equals("ROLE_MANAGER") || a.getAuthority().equals("ROLE_SUPERUSER"));
        return service.get(eventId, (Integer) authentication.getPrincipal(), manager);
    }

    @PatchMapping("/{eventId}")
    public Map<String, Object> update(@PathVariable Integer eventId,
            @Valid @RequestBody UpdateEventRequest request, Authentication authentication) {
        boolean manager = authentication.getAuthorities().stream().anyMatch(a ->
            a.getAuthority().equals("ROLE_MANAGER") || a.getAuthority().equals("ROLE_SUPERUSER"));
        return service.update(eventId, request, (Integer) authentication.getPrincipal(), manager);
    }

    @DeleteMapping("/{eventId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('MANAGER', 'SUPERUSER')")
    public void delete(@PathVariable Integer eventId) {
        service.delete(eventId);
    }

    @PostMapping("/{eventId}/organizers")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('MANAGER', 'SUPERUSER')")
    public Map<String, Object> addOrganizer(@PathVariable Integer eventId,
            @Valid @RequestBody AddOrganizerRequest request) {
        return service.addOrganizer(eventId, request.utorid());
    }

    @DeleteMapping("/{eventId}/organizers/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('MANAGER', 'SUPERUSER')")
    public void removeOrganizer(@PathVariable Integer eventId, @PathVariable Integer userId) {
        service.removeOrganizer(eventId, userId);
    }

    @PostMapping("/{eventId}/guests")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> addGuest(@PathVariable Integer eventId,
            @Valid @RequestBody AddGuestRequest request, Authentication authentication) {
        return service.addGuest(eventId, request.utorid(), (Integer) authentication.getPrincipal(),
            isManager(authentication), false);
    }

    @PostMapping("/{eventId}/guests/me")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> register(@PathVariable Integer eventId, Authentication authentication) {
        return service.addGuest(eventId, null, (Integer) authentication.getPrincipal(),
            isManager(authentication), true);
    }

    @DeleteMapping("/{eventId}/guests/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('MANAGER', 'SUPERUSER')")
    public void removeGuest(@PathVariable Integer eventId, @PathVariable Integer userId,
            Authentication authentication) {
        service.removeGuest(eventId, userId, (Integer) authentication.getPrincipal());
    }

    @DeleteMapping("/{eventId}/guests/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unregister(@PathVariable Integer eventId, Authentication authentication) {
        service.unregister(eventId, (Integer) authentication.getPrincipal());
    }

    private boolean isManager(Authentication authentication) {
        return authentication.getAuthorities().stream().anyMatch(a ->
            a.getAuthority().equals("ROLE_MANAGER") || a.getAuthority().equals("ROLE_SUPERUSER"));
    }

    @PostMapping("/{eventId}/transactions")
    @ResponseStatus(HttpStatus.CREATED)
    public Object award(@PathVariable Integer eventId, @Valid @RequestBody AwardPointsRequest request,
            Authentication authentication) {
        return service.award(eventId, request, (Integer) authentication.getPrincipal(), isManager(authentication));
    }
}
