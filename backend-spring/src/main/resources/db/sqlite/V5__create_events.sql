CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    location VARCHAR(255) NOT NULL,
    capacity INTEGER,
    points_remain INTEGER NOT NULL,
    points_awarded INTEGER NOT NULL DEFAULT 0,
    published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_end_time ON events(end_time);
CREATE INDEX idx_events_published ON events(published);

CREATE TABLE organizer_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    organizer_id INTEGER NOT NULL REFERENCES users(id),
    UNIQUE(event_id, organizer_id)
);
CREATE INDEX idx_organizer_events_organizer_id ON organizer_events(organizer_id);

CREATE TABLE rsvps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(event_id, user_id)
);
CREATE INDEX idx_rsvps_user_id ON rsvps(user_id);

ALTER TABLE transactions ADD COLUMN related_event_id INTEGER REFERENCES events(id);
CREATE INDEX idx_transactions_related_event_id ON transactions(related_event_id);
