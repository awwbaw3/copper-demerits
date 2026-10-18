-- ============================================================================
-- COPPER DEMERITS — RING OF HONOR
-- Seed Script: Authentic Roster, Staff Signature Aliases, and 4 Verified Slips
-- Isolated inside schema `copper_demerits`
-- ============================================================================

-- Clear existing seed records safely
delete from copper_demerits.demerits;
delete from copper_demerits.staff_aliases;
delete from copper_demerits.members;

-- 1. Seed Core Roster (Rick, Burtis, Sarah, Matt Barnes, David Lee)
insert into copper_demerits.members (id, display_name, is_staff, is_patron, created_at)
values
  ('11111111-1111-4111-8111-111111111111', 'Rick', false, true, '2026-10-17T20:00:00Z'),
  ('22222222-2222-4222-8222-222222222222', 'Burtis', true, true, '2026-10-17T20:00:00Z'),
  ('33333333-3333-4333-8333-333333333333', 'Sarah', true, false, '2026-10-17T20:00:00Z'),
  ('44444444-4444-4444-8444-444444444444', 'Matt Barnes', true, false, '2026-10-17T20:00:00Z'),
  ('55555555-5555-4555-8555-555555555555', 'David Lee', false, true, '2026-10-17T18:27:00Z')
on conflict (id) do update
set display_name = excluded.display_name,
    is_staff = excluded.is_staff,
    is_patron = excluded.is_patron;

-- 2. Seed Staff Signature Aliases
insert into copper_demerits.staff_aliases (id, alias, member_id)
values
  -- Sarah aliases
  ('33333333-3333-4333-8333-333333333301', 'the boss', '33333333-3333-4333-8333-333333333333'),
  ('33333333-3333-4333-8333-333333333302', 'the boss - aka sarah', '33333333-3333-4333-8333-333333333333'),
  ('33333333-3333-4333-8333-333333333303', 'aka sarah', '33333333-3333-4333-8333-333333333333'),
  ('33333333-3333-4333-8333-333333333304', 'sarah', '33333333-3333-4333-8333-333333333333'),
  ('33333333-3333-4333-8333-333333333308', 'your boss!', '33333333-3333-4333-8333-333333333333'),
  ('33333333-3333-4333-8333-333333333309', 'your boss', '33333333-3333-4333-8333-333333333333'),
  ('b1111111-1111-4111-8111-111111111111', 'the boss lady', '33333333-3333-4333-8333-333333333333'),
  -- Matt Barnes aliases
  ('33333333-3333-4333-8333-333333333305', 'the douche', '44444444-4444-4444-8444-444444444444'),
  ('33333333-3333-4333-8333-333333333306', 'matt barnes', '44444444-4444-4444-8444-444444444444'),
  ('33333333-3333-4333-8333-333333333310', 'matt barnes (signature)', '44444444-4444-4444-8444-444444444444'),
  -- Burtis alias
  ('33333333-3333-4333-8333-333333333307', 'burtis', '22222222-2222-4222-8222-222222222222')
on conflict (alias) do update
set member_id = excluded.member_id;

-- 3. Seed Authentic Demerit Slips (4 Unique Slips Transcribed from 3 Uploaded Photos)
-- Photo 1 (/slips/28318.jpg) contains David Lee's 6:27 PM slip.
-- Photo 2 (/slips/20261017_211324.jpg) contains 3 slips side-by-side (8:50 PM Burtis, 8:56 PM Burtis, 9:09 PM Rick).
-- Photo 3 (/slips/Scan_20261017_212309.jpg) is an individual scan of Rick's 9:09 PM slip (deduplicated).
insert into copper_demerits.demerits (
  id,
  patron_id,
  raw_student,
  issuer_id,
  raw_signature,
  demerit_count,
  incident_date,
  incident_time,
  location_area,
  infractions,
  demerit_items,
  image_url,
  source_image_url,
  secondary_image_url,
  image_sha256,
  image_dhash,
  capture_note,
  status,
  created_at
)
values
  (
    'a4444444-4444-4444-8444-444444444444',
    '55555555-5555-4555-8555-555555555555', -- David Lee
    'David Lee',
    '33333333-3333-4333-8333-333333333333', -- Sarah
    'The Boss Lady',
    1,
    '2026-10-17',
    '18:27:00',
    'Copper AC',
    '["Back talk, insubordinate (1 - so far)"]'::jsonb,
    '[{"type": "Insubordination / Defiance", "points": 1, "description": "Back talk, insubordinate (1 - so far)"}]'::jsonb,
    'https://iqbpnkttwtugxkospdqt.supabase.co/storage/v1/object/public/slips/28318_david_lee_1827.jpg',
    'https://iqbpnkttwtugxkospdqt.supabase.co/storage/v1/object/public/slips/28318.jpg',
    null,
    '40d781dbf9604e6a5a156d79c3387eac15c84ffdfbd7b3ac3e2e65a34c8ee6ee',
    '6d6b692b3329096d',
    'Single slip photo 28318.jpg (logged 6:27 PM, Oct 17, 2026 — Number of Demerits: 1 - so far)',
    'approved',
    '2026-10-17T22:27:00Z'
  ),
  (
    'a1111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222', -- Burtis
    'Burtis',
    '33333333-3333-4333-8333-333333333333', -- Sarah
    'YOUR BOSS!',
    1,
    '2026-10-17',
    '20:50:00',
    'Copper Bar',
    '["No call / no show to see the Red Wings"]'::jsonb,
    '[{"type": "Attendance / No-Show", "description": "No call / no show to see the Red Wings", "points": 1}]'::jsonb,
    'https://iqbpnkttwtugxkospdqt.supabase.co/storage/v1/object/public/slips/20261017_211324_burtis_2050.jpg',
    'https://iqbpnkttwtugxkospdqt.supabase.co/storage/v1/object/public/slips/20261017_211324.jpg',
    null,
    'a88e9b61232ff9d47abda74d8db70de8aa80ffa4037115d25ea5beacd8f3347d',
    '6c6a6b7333290b6d',
    'Slip 1 of 3 extracted from 20261017_211324.jpg (Top-Right slip, logged 8:50 PM)',
    'approved',
    '2026-10-18T00:50:00Z'
  ),
  (
    'a2222222-2222-4222-8222-222222222222',
    '22222222-2222-4222-8222-222222222222', -- Burtis
    'Burtis',
    '33333333-3333-4333-8333-333333333333', -- Sarah
    'Sarah (Cursive Signature)',
    2,
    '2026-10-17',
    '20:56:00',
    'Copper',
    '["NOT CARING ABOUT THE FIRST DEMERIT"]'::jsonb,
    '[{"type": "Insubordination / Defiance", "description": "NOT CARING ABOUT THE FIRST DEMERIT", "points": 2}]'::jsonb,
    'https://iqbpnkttwtugxkospdqt.supabase.co/storage/v1/object/public/slips/20261017_211324_burtis_2056.jpg',
    'https://iqbpnkttwtugxkospdqt.supabase.co/storage/v1/object/public/slips/20261017_211324.jpg',
    null,
    'de5d75f906950591314f38f2ad6fe4fde09545759ee5fba74c42905150c96ef8',
    '4c6e69713131636d',
    'Slip 2 of 3 extracted from 20261017_211324.jpg (Bottom-Right slip, logged 8:56 PM, +6 mins after first slip)',
    'approved',
    '2026-10-18T00:56:00Z'
  ),
  (
    'a3333333-3333-4333-8333-333333333333',
    '11111111-1111-4111-8111-111111111111', -- Rick
    'Rick',
    '33333333-3333-4333-8333-333333333333', -- Sarah
    'The Boss - AKA Sarah',
    3,
    '2026-10-17',
    '21:09:00',
    'Copper A.C.',
    '["Too many seat moves", "Try to order Gin & Diet Coke", "The headband :) <3"]'::jsonb,
    '[{"type": "Bar Etiquette / Seating", "description": "Too many seat moves", "points": 1}, {"type": "Drink Crime / Order Foul", "description": "Try to order Gin & Diet Coke", "points": 1}, {"type": "Attire / Headgear Foul", "description": "The headband :) <3", "points": 1}]'::jsonb,
    'https://iqbpnkttwtugxkospdqt.supabase.co/storage/v1/object/public/slips/Scan_20261017_212309.jpg',
    'https://iqbpnkttwtugxkospdqt.supabase.co/storage/v1/object/public/slips/20261017_211324.jpg',
    'https://iqbpnkttwtugxkospdqt.supabase.co/storage/v1/object/public/slips/20261017_211324_rick_2109.jpg',
    '3c1b69a7e7b05253560753de5c6a3a2eda800f760814fb15f963f08ca106384b',
    '7369292b29236b69',
    'Deduplicated across 2 uploads: Slip 3 of 3 in 20261017_211324.jpg (Bottom-Left, 9:13 PM) + Single Scan in Scan_20261017_212309.jpg (9:23 PM)',
    'approved',
    '2026-10-18T01:09:00Z'
  )
on conflict (id) do update
set patron_id = excluded.patron_id,
    raw_student = excluded.raw_student,
    issuer_id = excluded.issuer_id,
    raw_signature = excluded.raw_signature,
    demerit_count = excluded.demerit_count,
    incident_date = excluded.incident_date,
    incident_time = excluded.incident_time,
    location_area = excluded.location_area,
    infractions = excluded.infractions,
    demerit_items = excluded.demerit_items,
    image_url = excluded.image_url,
    source_image_url = excluded.source_image_url,
    secondary_image_url = excluded.secondary_image_url,
    image_sha256 = excluded.image_sha256,
    image_dhash = excluded.image_dhash,
    capture_note = excluded.capture_note,
    status = excluded.status;
