package com.cssurewards.promotion;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "promotions")
public class Promotion {
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
    private double rate;
    @Column(nullable = false)
    private double minSpending;
    @Column(nullable = false)
    private String type;
    @Column(nullable = false)
    private int points;
    @Column(nullable = false)
    private Instant createdAt;
    @Column(nullable = false)
    private Instant updatedAt;

    protected Promotion() { }

    public Promotion(String name, String description, Instant startTime, Instant endTime,
            double rate, double minSpending, int points, String type) {
        this.name = name;
        this.description = description;
        this.startTime = startTime;
        this.endTime = endTime;
        this.rate = rate;
        this.minSpending = minSpending;
        this.points = points;
        this.type = type;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    public Integer getId() { return id; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public Instant getStartTime() { return startTime; }
    public Instant getEndTime() { return endTime; }
    public double getRate() { return rate; }
    public double getMinSpending() { return minSpending; }
    public String getType() { return type; }
    public int getPoints() { return points; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
