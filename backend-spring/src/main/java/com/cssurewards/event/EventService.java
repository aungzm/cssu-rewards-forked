package com.cssurewards.event;

import com.cssurewards.event.dto.CreateEventRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.domain.Sort;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;
import jakarta.persistence.criteria.Predicate;

@Service
public class EventService {
    private final EventRepository events;
    private final JdbcTemplate jdbc;

    public EventService(EventRepository events, JdbcTemplate jdbc) {
        this.events = events;
        this.jdbc = jdbc;
    }

    @Transactional
    public Event create(CreateEventRequest request) {
        if (!request.endTime().isAfter(request.startTime())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "endTime must be after startTime");
        }
        return events.save(new Event(request.name(), request.description(), request.location(),
            request.startTime(), request.endTime(), request.capacity(), request.points()));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> list(String name, String location, Boolean started, Boolean ended,
            Boolean showFull, Boolean published, int page, int limit, Integer userId, boolean manager) {
        if (started != null && ended != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Cannot specify both \"started\" and \"ended\" simultaneously.");
        }
        if (page < 1 || limit < 1 || limit > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid pagination parameters.");
        }
        Instant now = Instant.now();
        Specification<Event> filter = (root, query, cb) -> {
            List<Predicate> conditions = new java.util.ArrayList<>();
            if (name != null) conditions.add(cb.like(root.get("name"), "%" + name + "%"));
            if (location != null) conditions.add(cb.like(cb.lower(root.get("location")),
                "%" + location.toLowerCase(java.util.Locale.ROOT) + "%"));
            if (started != null) conditions.add(started ? cb.lessThanOrEqualTo(root.get("startTime"), now)
                : cb.greaterThan(root.get("startTime"), now));
            if (ended != null) conditions.add(ended ? cb.lessThanOrEqualTo(root.get("endTime"), now)
                : cb.greaterThan(root.get("endTime"), now));
            if (!manager) conditions.add(cb.isTrue(root.get("published")));
            else if (published != null) conditions.add(cb.equal(root.get("published"), published));
            return cb.and(conditions.toArray(Predicate[]::new));
        };
        List<Event> matching = events.findAll(filter, Sort.by("startTime"));
        if (Boolean.FALSE.equals(showFull)) matching = matching.stream()
            .filter(event -> event.getCapacity() == null || guestCount(event.getId()) < event.getCapacity())
            .toList();
        int count = matching.size();
        List<Map<String, Object>> results = matching.stream().skip((long) (page - 1) * limit).limit(limit)
            .map(event -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("id", event.getId());
                row.put("name", event.getName());
                row.put("description", event.getDescription());
                row.put("location", event.getLocation());
                row.put("startTime", event.getStartTime());
                row.put("endTime", event.getEndTime());
                row.put("capacity", event.getCapacity());
                if (manager) {
                    row.put("pointsAwarded", event.getPointsAwarded());
                    row.put("pointsRemain", event.getPointsRemain());
                    row.put("published", event.isPublished());
                }
                row.put("numGuests", guestCount(event.getId()));
                row.put("isOrganizer", jdbc.queryForObject(
                    "SELECT COUNT(*) FROM organizer_events WHERE event_id = ? AND organizer_id = ?",
                    Integer.class, event.getId(), userId) > 0);
                row.put("isGuest", jdbc.queryForObject(
                    "SELECT COUNT(*) FROM rsvps WHERE event_id = ? AND user_id = ?",
                    Integer.class, event.getId(), userId) > 0);
                return row;
            }).toList();
        return Map.of("count", count, "results", results);
    }

    private int guestCount(Integer eventId) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM rsvps WHERE event_id = ?", Integer.class, eventId);
    }
}
