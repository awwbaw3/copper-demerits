ALTER TABLE members ADD COLUMN notification_preferences TEXT;

CREATE TABLE IF NOT EXISTS pin_failures (
  id TEXT PRIMARY KEY,
  ip TEXT,
  member_id TEXT,
  failed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pin_failures ON pin_failures(ip, member_id, failed_at);
