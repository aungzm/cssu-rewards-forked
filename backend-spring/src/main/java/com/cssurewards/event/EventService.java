package com.cssurewards.event;

import com.cssurewards.event.dto.CreateEventRequest;
import com.cssurewards.event.dto.UpdateEventRequest;
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
import com.cssurewards.user.User;
import com.cssurewards.user.UserRepository;

@Service
public class EventService {
    private final EventRepository events;
    private final JdbcTemplate jdbc;
    private final UserRepository users;

    public EventService(EventRepository events, JdbcTemplate jdbc, UserRepository users) {
        this.events = events;
        this.jdbc = jdbc;
        this.users = users;
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

    @Transactional(readOnly = true)
    public Map<String, Object> get(Integer eventId, Integer userId, boolean manager) {
        Event event = events.findById(eventId).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));
        List<Integer> organizerIds = jdbc.queryForList(
            "SELECT organizer_id FROM organizer_events WHERE event_id = ?", Integer.class, eventId);
        boolean full = manager || organizerIds.contains(userId);
        if (!full && !event.isPublished()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found");
        }
        List<Integer> guestIds = jdbc.queryForList("SELECT user_id FROM rsvps WHERE event_id = ?",
            Integer.class, eventId);
        List<Map<String, Object>> organizers = organizerIds.stream().map(this::person).toList();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", event.getId());
        result.put("name", event.getName());
        result.put("description", event.getDescription());
        result.put("location", event.getLocation());
        result.put("startTime", event.getStartTime());
        result.put("endTime", event.getEndTime());
        result.put("capacity", event.getCapacity());
        result.put("organizers", organizers);
        if (full) {
            result.put("pointsRemain", event.getPointsRemain());
            result.put("pointsAwarded", event.getPointsAwarded());
            result.put("published", event.isPublished());
            result.put("guests", guestIds.stream().map(this::person).toList());
        } else {
            result.put("numGuests", guestIds.size());
        }
        return result;
    }

    private Map<String, Object> person(Integer id) {
        User user = users.findById(id).orElseThrow();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", user.getId());
        result.put("utorid", user.getUtorid());
        result.put("name", user.getName());
        return result;
    }

    @Transactional
    public Map<String, Object> update(Integer eventId, UpdateEventRequest request, Integer userId, boolean manager) {
        Event event = events.findById(eventId).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));
        boolean organizer = jdbc.queryForObject(
            "SELECT COUNT(*) FROM organizer_events WHERE event_id = ? AND organizer_id = ?",
            Integer.class, eventId, userId) > 0;
        if (!manager && !organizer) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Insufficient clearance");
        }
        if (request.name() == null && request.description() == null && request.location() == null
                && request.startTime() == null && request.endTime() == null && request.capacity() == null
                && request.points() == null && request.published() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one field must have a value.");
        }
        if (event.getStartTime().isBefore(Instant.now()) && (request.name() != null
                || request.description() != null || request.location() != null || request.capacity() != null)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot update event details after the event has started.");
        }
        Instant start = request.startTime() == null ? event.getStartTime() : request.startTime();
        Instant end = request.endTime() == null ? event.getEndTime() : request.endTime();
        if (request.startTime() != null && start.isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot set a start time in the past");
        }
        if (!end.isAfter(start)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "endTime must be after startTime");
        }
        if (request.endTime() != null && end.isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot set endTime to a past date");
        }
        if (request.capacity() != null && request.capacity() < guestCount(eventId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Cannot reduce capacity below the number of guests already attending.");
        }
        if (!manager && (request.points() != null || request.published() != null)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Insufficient clearance");
        }
        if (request.points() != null && request.points() < event.getPointsAwarded()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Total points cannot be reduced below the points already awarded.");
        }
        if (Boolean.FALSE.equals(request.published())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Published can only be set to true.");
        }
        event.update(request.name(), request.description(), request.location(), request.startTime(),
            request.endTime(), request.capacity(), request.points(), request.published());
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", eventId);
        response.put("name", event.getName());
        response.put("location", event.getLocation());
        response.put("startTime", event.getStartTime());
        response.put("endTime", event.getEndTime());
        if (request.description() != null) response.put("description", event.getDescription());
        if (request.capacity() != null) response.put("capacity", event.getCapacity());
        if (request.published() != null) response.put("published", event.isPublished());
        response.put("pointsRemain", event.getPointsRemain());
        response.put("pointsAwarded", event.getPointsAwarded());
        return response;
    }

    @Transactional
    public void delete(Integer eventId) {
        Event event = events.findById(eventId).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));
        if (event.isPublished()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot delete a published event");
        }
        if (jdbc.queryForObject("SELECT COUNT(*) FROM transactions WHERE related_event_id = ?",
                Integer.class, eventId) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Cannot delete an event with awarded points");
        }
        events.delete(event);
    }

    @Transactional
    public Map<String, Object> addOrganizer(Integer eventId, String utorid) {
        if (eventId < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid eventId");
        }
        Event event = events.findByIdForUpdate(eventId).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));
        User user = users.findByUtorid(utorid).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        if (Instant.now().isAfter(event.getEndTime())) {
            throw new ResponseStatusException(HttpStatus.GONE, "Event has ended");
        }
        if (membershipCount("rsvps", eventId, user.getId()) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "User is currently a guest; remove them as a guest first before adding as an organizer");
        }
        if (membershipCount("organizer_events", eventId, user.getId()) > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "User is already an organizer");
        }
        jdbc.update("INSERT INTO organizer_events(event_id, organizer_id) VALUES (?, ?)", eventId, user.getId());
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", eventId);
        response.put("name", event.getName());
        response.put("location", event.getLocation());
        response.put("organizers", jdbc.queryForList(
            "SELECT organizer_id FROM organizer_events WHERE event_id = ? ORDER BY id", Integer.class, eventId)
            .stream().map(this::person).toList());
        return response;
    }

    @Transactional
    public void removeOrganizer(Integer eventId, Integer userId) {
        if (eventId < 1 || userId < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid eventId or userId");
        }
        events.findByIdForUpdate(eventId).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));
        if (membershipCount("organizer_events", eventId, userId) == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User is not an organizer of this event");
        }
        if (membershipCount("rsvps", eventId, userId) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "User is currently a guest; remove them as a guest first before removing as an organizer");
        }
        jdbc.update("DELETE FROM organizer_events WHERE event_id = ? AND organizer_id = ?", eventId, userId);
    }

    private int membershipCount(String table, Integer eventId, Integer userId) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM " + table + " WHERE event_id = ? AND "
            + (table.equals("rsvps") ? "user_id" : "organizer_id") + " = ?", Integer.class, eventId, userId);
    }

    @Transactional
    public Map<String, Object> addGuest(Integer eventId, String utorid, Integer requesterId,
            boolean manager, boolean self) {
        if (eventId < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid eventId");
        }
        if (!self && !manager && membershipCount("organizer_events", eventId, requesterId) == 0) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Insufficient clearance to add a guest");
        }
        Event event = events.findByIdForUpdate(eventId).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));
        User guest = self ? users.findById(requesterId).orElseThrow()
            : users.findByUtorid(utorid).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        if (Instant.now().isAfter(event.getEndTime())) {
            throw new ResponseStatusException(HttpStatus.GONE, "Event has ended");
        }
        if (membershipCount("organizer_events", eventId, guest.getId()) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, self
                ? "You are currently an organizer; remove yourself as organizer first"
                : "User is currently an organizer; remove them as organizer first");
        }
        if (membershipCount("rsvps", eventId, guest.getId()) > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, self
                ? "You are already on the guest list" : "User is already a guest");
        }
        if (event.getCapacity() != null && guestCount(eventId) >= event.getCapacity()) {
            throw new ResponseStatusException(HttpStatus.GONE, "Event is full");
        }
        jdbc.update("INSERT INTO rsvps(event_id, user_id) VALUES (?, ?)", eventId, guest.getId());
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", eventId);
        result.put("name", event.getName());
        result.put("location", event.getLocation());
        result.put("guestAdded", person(guest.getId()));
        result.put("numGuests", guestCount(eventId));
        return result;
    }

    @Transactional
    public void removeGuest(Integer eventId, Integer userId, Integer requesterId) {
        if (eventId < 1 || userId < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid eventId or userId");
        }
        events.findByIdForUpdate(eventId).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));
        if (membershipCount("organizer_events", eventId, requesterId) > 0) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Organizers are not allowed to remove guests.");
        }
        if (membershipCount("rsvps", eventId, userId) == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User is not a guest of this event");
        }
        jdbc.update("DELETE FROM rsvps WHERE event_id = ? AND user_id = ?", eventId, userId);
    }

    @Transactional
    public void unregister(Integer eventId, Integer userId) {
        if (eventId < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid eventId");
        }
        Event event = events.findByIdForUpdate(eventId).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));
        if (Instant.now().isAfter(event.getEndTime())) {
            throw new ResponseStatusException(HttpStatus.GONE, "Event has ended");
        }
        if (membershipCount("rsvps", eventId, userId) == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "You did not RSVP to this event");
        }
        jdbc.update("DELETE FROM rsvps WHERE event_id = ? AND user_id = ?", eventId, userId);
    }
}
