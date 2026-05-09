package com.cssurewards.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true)
    private String utorid;

    @Column(nullable = false, unique = true)
    private String email;

    private String name;
    private Instant birthday;
    private String avatarUrl;

    @Column(columnDefinition = "text")
    private String avatar;

    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RoleType role;

    @Column(nullable = false)
    private boolean activated;
    @Column(nullable = false)
    private boolean verified;
    @Column(nullable = false)
    private boolean suspicious;
    private Instant lastLogin;

    @Column(nullable = false)
    private int points;
    @Column(nullable = false)
    private Instant createdAt;
    @Column(nullable = false)
    private Instant updatedAt;

    protected User() {
    }

    public User(String utorid, String email, String password, RoleType role) {
        this.utorid = utorid;
        this.email = email;
        this.password = password;
        this.role = role;
        this.activated = true;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    public User(String utorid, String email, String name) {
        this.utorid = utorid;
        this.email = email;
        this.name = name;
        this.role = RoleType.REGULAR;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    public Integer getId() { return id; }
    public String getUtorid() { return utorid; }
    public String getEmail() { return email; }
    public String getName() { return name; }
    public Instant getBirthday() { return birthday; }
    public String getAvatarUrl() { return avatarUrl; }
    public String getAvatar() { return avatar; }
    public String getPassword() { return password; }
    public RoleType getRole() { return role; }
    public boolean isActivated() { return activated; }
    public boolean isVerified() { return verified; }
    public boolean isSuspicious() { return suspicious; }
    public Instant getLastLogin() { return lastLogin; }
    public int getPoints() { return points; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void setLastLogin(Instant lastLogin) {
        this.lastLogin = lastLogin;
        this.updatedAt = lastLogin;
    }
}
