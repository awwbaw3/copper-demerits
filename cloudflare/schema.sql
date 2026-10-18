-- ============================================================================
-- COPPER DEMERITS — CLOUDFLARE D1 (SQLite) SCHEMA (v1.6.0)
-- Aligned with copperdemerits.com Cloudflare Zone
-- ============================================================================

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  is_staff INTEGER NOT NULL DEFAULT 0,
  is_patron INTEGER NOT NULL DEFAULT 1,
  is_admin INTEGER NOT NULL DEFAULT 0,
  claimed_by_contact TEXT,
  claimed_pin TEXT,
  is_claimed INTEGER NOT NULL DEFAULT 0,
  claimed_at TEXT,
  favorite_team TEXT DEFAULT 'lions',
  tagline TEXT,
  notification_email TEXT,
  notification_phone TEXT,
  notification_carrier TEXT DEFAULT 'none',
  notification_opt_in INTEGER NOT NULL DEFAULT 0,
  notification_verified INTEGER NOT NULL DEFAULT 0,
  verification_code TEXT,
  verification_sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS staff_aliases (
  id TEXT PRIMARY KEY,
  alias TEXT NOT NULL UNIQUE,
  member_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS demerits (
  id TEXT PRIMARY KEY,
  patron_id TEXT,
  raw_student TEXT NOT NULL,
  issuer_id TEXT,
  raw_signature TEXT NOT NULL,
  demerit_count INTEGER NOT NULL DEFAULT 1,
  incident_date TEXT NOT NULL,
  incident_time TEXT,
  location_area TEXT NOT NULL DEFAULT 'Copper Athletic Club',
  infractions TEXT NOT NULL DEFAULT '[]',
  demerit_items TEXT NOT NULL DEFAULT '[]',
  image_url TEXT,
  source_image_url TEXT,
  secondary_image_url TEXT,
  image_sha256 TEXT,
  image_dhash TEXT,
  capture_note TEXT,
  submitted_by_member_id TEXT,
  status TEXT NOT NULL DEFAULT 'approved',
  is_blurred INTEGER NOT NULL DEFAULT 0,
  moderation_flag_reason TEXT,
  original_infractions TEXT,
  reactions TEXT NOT NULL DEFAULT '{"buy_round":0,"tough_call":0,"two_mins":0,"instant_classic":0}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notification_log (
  id TEXT PRIMARY KEY,
  member_id TEXT,
  event_type TEXT NOT NULL,
  recipient_masked TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_demerits_date_time ON demerits(incident_date DESC, incident_time DESC);
CREATE INDEX IF NOT EXISTS idx_staff_aliases_alias ON staff_aliases(alias);
CREATE INDEX IF NOT EXISTS idx_notification_log_created ON notification_log(created_at);
