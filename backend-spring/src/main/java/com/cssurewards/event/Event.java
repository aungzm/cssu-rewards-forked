package com.cssurewards.event;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "events")
public class Event {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    @Column(nullable = false)
    private String name;
    @Column(nullable = false, columnDefinition = "text")
    private String description;
    @Column(nullable = false)
    private Instant startTime;
    @Column(nullable = false)
    private Instant endTime;
    @Column(nullable = false)
    private String location;
    private Integer capacity;
    @Column(nullable = false)
    private int pointsRemain;
    @Column(nullable = false)
    private int pointsAwarded;
    @Column(nullable = false)
    private boolean published;
    @Column(nullable = false)
    private Instant createdAt;
    @Column(nullable = false)
    private Instant updatedAt;

    protected Event() { }

    public Event(String name, String description, String location, Instant startTime,
            Instant endTime, Integer capacity, int points) {
        this.name = name;
        this.description = description;
        this.location = location;
        this.startTime = startTime;
        this.endTime = endTime;
        this.capacity = capacity;
        this.pointsRemain = points;
        this.createdAt = Instant.now();
        this.updatedAt = createdAt;
    }

    public Integer getId() { return id; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public Instant getStartTime() { return startTime; }
    public Instant getEndTime() { return endTime; }
    public String getLocation() { return location; }
    public Integer getCapacity() { return capacity; }
    public int getPointsRemain() { return pointsRemain; }
    public int getPointsAwarded() { return pointsAwarded; }
    public boolean isPublished() { return published; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
