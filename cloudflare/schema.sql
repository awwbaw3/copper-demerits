-- ============================================================================
-- COPPER DEMERITS — CLOUDFLARE D1 (SQLite) SCHEMA & SEED
-- Database: copper-demerits-db (feb899d8-606e-4937-91b7-9076e2741961)
-- Storage: Cloudflare R2 Bucket `copper-demerits-slips`
-- ============================================================================

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL UNIQUE,
  is_staff INTEGER NOT NULL DEFAULT 0,
  is_patron INTEGER NOT NULL DEFAULT 1,
  claimed_by_contact TEXT,
  claimed_pin TEXT,
  claimed_at TEXT,
  favorite_team TEXT DEFAULT 'lions',
  tagline TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS staff_aliases (
  id TEXT PRIMARY KEY,
  alias TEXT NOT NULL UNIQUE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS demerits (
  id TEXT PRIMARY KEY,
  patron_id TEXT REFERENCES members(id) ON DELETE SET NULL,
  raw_student TEXT NOT NULL,
  issuer_id TEXT REFERENCES members(id) ON DELETE SET NULL,
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
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_d1_demerits_patron ON demerits(patron_id);
CREATE INDEX IF NOT EXISTS idx_d1_demerits_issuer ON demerits(issuer_id);
CREATE INDEX IF NOT EXISTS idx_d1_demerits_date ON demerits(incident_date DESC);
CREATE INDEX IF NOT EXISTS idx_d1_demerits_sha256 ON demerits(image_sha256);
