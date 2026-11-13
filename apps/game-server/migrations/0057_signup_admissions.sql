-- Admission is separate from game progression and from provider confirmation.
CREATE TABLE mare_game.signup_admissions (
    email_hash text PRIMARY KEY CHECK (email_hash ~ '^[A-Za-z0-9_-]{43}$'),
    expires_at timestamptz NOT NULL
);
CREATE INDEX signup_admissions_expiry ON mare_game.signup_admissions(expires_at);
REVOKE ALL ON mare_game.signup_admissions FROM PUBLIC;
