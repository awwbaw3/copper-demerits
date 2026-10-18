-- =============================================================================
-- COPPER ATHLETIC CLUB — RING OF HONOR DEMERIT LEADERBOARD
-- Seed Script (supabase/seed.sql) — Exact Transcribed Data from Uploaded Slips:
--   1. docs/20261017_211324.jpg (3 slips on the bar at 8:50 PM, 8:56 PM, 9:09 PM)
--   2. docs/Scan_20261017_212309.jpg (1 scanned slip at 9:09 PM — deduplicated)
-- =============================================================================

begin;

insert into public.members (id, display_name, is_staff, is_patron)
values
  ('11111111-1111-4111-8111-111111111111', 'Rick', false, true),
  ('22222222-2222-4222-8222-222222222222', 'Burtis', true, true),
  ('33333333-3333-4333-8333-333333333333', 'Sarah', true, false),
  ('44444444-4444-4444-8444-444444444444', 'Matt Barnes', true, false)
on conflict (display_name) do update
set
  is_staff = excluded.is_staff,
  is_patron = excluded.is_patron;

insert into public.staff_aliases (alias, member_id)
values
  ('the boss', '33333333-3333-4333-8333-333333333333'),
  ('the boss - aka sarah', '33333333-3333-4333-8333-333333333333'),
  ('aka sarah', '33333333-3333-4333-8333-333333333333'),
  ('sarah', '33333333-3333-4333-8333-333333333333'),
  ('your boss!', '33333333-3333-4333-8333-333333333333'),
  ('your boss', '33333333-3333-4333-8333-333333333333'),
  ('the douche', '44444444-4444-4444-8444-444444444444'),
  ('matt barnes', '44444444-4444-4444-8444-444444444444'),
  ('matt barnes (signature)', '44444444-4444-4444-8444-444444444444'),
  ('burtis', '22222222-2222-4222-8222-222222222222')
on conflict (alias) do update
set
  member_id = excluded.member_id;

delete from public.demerits;

insert into public.demerits (
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
  image_url,
  source_image_url,
  secondary_image_url,
  image_sha256,
  image_dhash,
  capture_note,
  status,
  created_at
) values
(
  'a1111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  'Burtis',
  '33333333-3333-4333-8333-333333333333',
  'YOUR BOSS!',
  1,
  '2026-10-17',
  '20:50:00',
  'Copper Bar',
  '["No call / no show to see the Red Wings"]'::jsonb,
  'https://iqbpnkttwtugxkospdqt.supabase.co/storage/v1/object/public/slips/20261017_211324_burtis_2050.jpg',
  'https://iqbpnkttwtugxkospdqt.supabase.co/storage/v1/object/public/slips/20261017_211324.jpg',
  null,
  'a88e9b61232ff9d47abda74d8db70de8aa80ffa4037115d25ea5beacd8f3347d',
  '6c6a6b7333290b6d',
  'Slip 1 of 3 extracted from 20261017_211324.jpg (Top-Right slip, logged 8:50 PM)',
  'approved',
  '2026-10-17T20:50:00-04:00'
),
(
  'a2222222-2222-4222-8222-222222222222',
  '22222222-2222-4222-8222-222222222222',
  'Burtis',
  '44444444-4444-4444-8444-444444444444',
  'Matt Barnes (Signature)',
  2,
  '2026-10-17',
  '20:56:00',
  'Copper',
  '["NOT CARING ABOUT THE FIRST DEMERIT"]'::jsonb,
  'https://iqbpnkttwtugxkospdqt.supabase.co/storage/v1/object/public/slips/20261017_211324_burtis_2056.jpg',
  'https://iqbpnkttwtugxkospdqt.supabase.co/storage/v1/object/public/slips/20261017_211324.jpg',
  null,
  'de5d75f906950591314f38f2ad6fe4fde09545759ee5fba74c42905150c96ef8',
  '4c6e69713131636d',
  'Slip 2 of 3 extracted from 20261017_211324.jpg (Bottom-Right slip, logged 8:56 PM, +6 mins after first slip)',
  'approved',
  '2026-10-17T20:56:00-04:00'
),
(
  'a3333333-3333-4333-8333-333333333333',
  '11111111-1111-4111-8111-111111111111',
  'Rick',
  '33333333-3333-4333-8333-333333333333',
  'The Boss - AKA Sarah',
  3,
  '2026-10-17',
  '21:09:00',
  'Copper A.C.',
  '["Too many seat moves", "Try to order Gin & Diet Coke", "The headband :) <3"]'::jsonb,
  'https://iqbpnkttwtugxkospdqt.supabase.co/storage/v1/object/public/slips/Scan_20261017_212309.jpg',
  'https://iqbpnkttwtugxkospdqt.supabase.co/storage/v1/object/public/slips/20261017_211324.jpg',
  'https://iqbpnkttwtugxkospdqt.supabase.co/storage/v1/object/public/slips/20261017_211324_rick_2109.jpg',
  '3c1b69a7e7b05253560753de5c6a3a2eda800f760814fb15f963f08ca106384b',
  '7369292b29236b69',
  'Deduplicated across 2 uploads: Slip 3 of 3 in 20261017_211324.jpg (Bottom-Left, 9:13 PM) + Single Scan in Scan_20261017_212309.jpg (9:23 PM)',
  'approved',
  '2026-10-17T21:09:00-04:00'
);

commit;
