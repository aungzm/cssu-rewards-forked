CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type VARCHAR(32) NOT NULL,
    spent NUMERIC(12,2),
    amount INTEGER,
    remarks TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER REFERENCES users(id),
    operator_id INTEGER REFERENCES users(id),
    sender_id INTEGER REFERENCES users(id),
    receiver_id INTEGER REFERENCES users(id),
    suspicious BOOLEAN NOT NULL DEFAULT FALSE,
    related_id INTEGER REFERENCES transactions(id)
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_sender_id ON transactions(sender_id);
CREATE INDEX idx_transactions_receiver_id ON transactions(receiver_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
