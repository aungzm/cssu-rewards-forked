CREATE TABLE reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id)
);

CREATE INDEX idx_reset_tokens_token ON reset_tokens(token);
