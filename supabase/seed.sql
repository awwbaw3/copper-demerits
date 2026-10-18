-- ============================================================================
-- COPPER DEMERITS — RING OF HONOR
-- Seed Script: Authentic Roster, Staff Signature Aliases, and 3 Verified Slips
-- Isolated inside schema `copper_demerits`
-- ============================================================================

-- Clear existing seed records safely
delete from copper_demerits.demerits;
delete from copper_demerits.staff_aliases;
delete from copper_demerits.members;

-- 1. Seed Core Roster (Rick, Burtis, Sarah, Matt Barnes)
insert into copper_demerits.members (id, display_name, is_staff, is_patron, created_at)
values
  ('11111111-1111-4111-8111-111111111101', 'Rick', false, true, '2026-10-17T20:00:00Z'),
  ('11111111-1111-4111-8111-111111111102', 'Burtis', true, true, '2026-10-17T20:00:00Z'),
  ('11111111-1111-4111-8111-111111111103', 'Sarah', true, false, '2026-10-17T20:00:00Z'),
  ('11111111-1111-4111-8111-111111111104', 'Matt Barnes', true, false, '2026-10-17T20:00:00Z')
on conflict (id) do update
set display_name = excluded.display_name,
    is_staff = excluded.is_staff,
    is_patron = excluded.is_patron;

-- 2. Seed Staff Signature Aliases
insert into copper_demerits.staff_aliases (id, alias, member_id)
values
  -- Sarah aliases
  ('22222222-2222-4222-8222-222222222201', 'the boss', '11111111-1111-4111-8111-111111111103'),
  ('22222222-2222-4222-8222-222222222202', 'the boss - aka sarah', '11111111-1111-4111-8111-111111111103'),
  ('22222222-2222-4222-8222-222222222203', 'aka sarah', '11111111-1111-4111-8111-111111111103'),
  ('22222222-2222-4222-8222-222222222204', 'sarah', '11111111-1111-4111-8111-111111111103'),
  ('22222222-2222-4222-8222-222222222208', 'your boss!', '11111111-1111-4111-8111-111111111103'),
  ('22222222-2222-4222-8222-222222222209', 'your boss', '11111111-1111-4111-8111-111111111103'),
  -- Matt Barnes aliases
  ('22222222-2222-4222-8222-222222222205', 'the douche', '11111111-1111-4111-8111-111111111104'),
  ('22222222-2222-4222-8222-222222222206', 'matt barnes', '11111111-1111-4111-8111-111111111104'),
  ('22222222-2222-4222-8222-222222222210', 'matt barnes (signature)', '11111111-1111-4111-8111-111111111104'),
  -- Burtis alias
  ('22222222-2222-4222-8222-222222222207', 'burtis', '11111111-1111-4111-8111-111111111102')
on conflict (alias) do update
set member_id = excluded.member_id;

-- 3. Seed Authentic Demerit Slips (3 Unique Slips Transcribed from the 2 Uploaded Photos)
-- Photo 1 (/slips/20261017_211324.jpg) contains all 3 slips side-by-side (8:50 PM, 8:56 PM, 9:09 PM).
-- Photo 2 (/slips/Scan_20261017_212309.jpg) is an individual scan of Rick's 9:09 PM slip (deduplicated).
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
  image_hash,
  slip_fingerprint,
  source_upload_note,
  status,
  created_at
)
values
  (
    '33333333-3333-4333-8333-333333333301',
    '11111111-1111-4111-8111-111111111102', -- Burtis
    'Burtis',
    '11111111-1111-4111-8111-111111111103', -- Sarah
    'YOUR BOSS!',
    1,
    '2026-10-17',
    '20:50:00',
    'Copper Bar',
    '["No call / no show to see the Red Wings"]'::jsonb,
    '[{"type": "Attendance / No-Show", "description": "No call / no show to see the Red Wings", "points": 1}]'::jsonb,
    '/slips/20261017_211324.jpg',
    'd0fd8fd6e86803e06ee66fb95b8e3078916ba7b4870160bb0466df529886fb08',
    'burtis|2026-10-17|20:50|1|no call / no show to see the red wings',
    'Left slip in 20261017_211324.jpg (3-slip bar photo)',
    'approved',
    '2026-10-17T20:50:00Z'
  ),
  (
    '33333333-3333-4333-8333-333333333302',
    '11111111-1111-4111-8111-111111111102', -- Burtis
    'Burtis',
    '11111111-1111-4111-8111-111111111104', -- Matt Barnes
    'Matt Barnes (Signature)',
    2,
    '2026-10-17',
    '20:56:00',
    'Copper',
    '["NOT CARING ABOUT THE FIRST DEMERIT"]'::jsonb,
    '[{"type": "Insubordination / Defiance", "description": "NOT CARING ABOUT THE FIRST DEMERIT", "points": 2}]'::jsonb,
    '/slips/20261017_211324.jpg',
    'd0fd8fd6e86803e06ee66fb95b8e3078916ba7b4870160bb0466df529886fb08',
    'burtis|2026-10-17|20:56|2|not caring about the first demerit',
    'Middle slip in 20261017_211324.jpg (3-slip bar photo)',
    'approved',
    '2026-10-17T20:56:00Z'
  ),
  (
    '33333333-3333-4333-8333-333333333303',
    '11111111-1111-4111-8111-111111111101', -- Rick
    'Rick',
    '11111111-1111-4111-8111-111111111103', -- Sarah
    'The Boss - AKA Sarah',
    3,
    '2026-10-17',
    '21:09:00',
    'Copper A.C.',
    '["Too many seat moves", "Try to order Gin & Diet Coke", "The headband :) <3"]'::jsonb,
    '[{"type": "Bar Etiquette / Seating", "description": "Too many seat moves", "points": 1}, {"type": "Drink Crime / Order Foul", "description": "Try to order Gin & Diet Coke", "points": 1}, {"type": "Attire / Headgear Foul", "description": "The headband :) <3", "points": 1}]'::jsonb,
    '/slips/Scan_20261017_212309.jpg',
    'ed56e208fd8deef4d52b6959dc7d8beacfd8706da6c8ac1a0637f571d371e3bf',
    'rick|2026-10-17|21:09|3|the headband :) <3|too many seat moves|try to order gin & diet coke',
    'Appears as right slip in 20261017_211324.jpg AND single scan in Scan_20261017_212309.jpg (deduplicated)',
    'approved',
    '2026-10-17T21:09:00Z'
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
    image_hash = excluded.image_hash,
    slip_fingerprint = excluded.slip_fingerprint,
    source_upload_note = excluded.source_upload_note,
    status = excluded.status;
