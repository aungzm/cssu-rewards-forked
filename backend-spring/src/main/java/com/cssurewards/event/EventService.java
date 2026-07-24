package com.cssurewards.event;

import com.cssurewards.event.dto.CreateEventRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class EventService {
    private final EventRepository events;

    public EventService(EventRepository events) {
        this.events = events;
    }

    @Transactional
    public Event create(CreateEventRequest request) {
        if (!request.endTime().isAfter(request.startTime())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "endTime must be after startTime");
        }
        return events.save(new Event(request.name(), request.description(), request.location(),
            request.startTime(), request.endTime(), request.capacity(), request.points()));
    }
}
