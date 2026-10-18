-- =============================================================================
-- COPPER ATHLETIC CLUB — RING OF HONOR DEMERIT LEADERBOARD
-- Seed Script (supabase/seed.sql)
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. SEED ROSTER (`members`)
--    * Rick (patron)
--    * Burtis (both staff and patron)
--    * Sarah (staff)
--    * Matt Barnes (staff)
-- -----------------------------------------------------------------------------
insert into public.members (id, display_name, is_staff, is_patron)
values
  ('11111111-1111-4111-8111-111111111101', 'Rick', false, true),
  ('11111111-1111-4111-8111-111111111102', 'Burtis', true, true),
  ('11111111-1111-4111-8111-111111111103', 'Sarah', true, false),
  ('11111111-1111-4111-8111-111111111104', 'Matt Barnes', true, false)
on conflict (display_name) do update
set
  is_staff = excluded.is_staff,
  is_patron = excluded.is_patron;

-- -----------------------------------------------------------------------------
-- 2. SEED STAFF ALIASES (`staff_aliases`)
--    * "the boss", "the boss - aka sarah", "aka sarah", "sarah" -> Sarah
--    * "the douche", "matt barnes" -> Matt Barnes
--    * "burtis" -> Burtis
-- -----------------------------------------------------------------------------
insert into public.staff_aliases (alias, member_id)
values
  ('the boss', (select id from public.members where display_name = 'Sarah')),
  ('the boss - aka sarah', (select id from public.members where display_name = 'Sarah')),
  ('aka sarah', (select id from public.members where display_name = 'Sarah')),
  ('sarah', (select id from public.members where display_name = 'Sarah')),
  ('the douche', (select id from public.members where display_name = 'Matt Barnes')),
  ('matt barnes', (select id from public.members where display_name = 'Matt Barnes')),
  ('burtis', (select id from public.members where display_name = 'Burtis'))
on conflict (alias) do update
set
  member_id = excluded.member_id;

-- -----------------------------------------------------------------------------
-- 3. SEED DEMERIT SLIPS (`demerits`)
--    1. Rick | Demerits: 3 | Date: 2026-10-17 | Time: 21:09 | Room: Copper Athletic Club
--       Infractions: ["Too many seat moves", "Tried to order Gin & Diet Coke", "The headband"]
--       Issuer: Sarah (raw: "The Boss - AKA Sarah")
--    2. Burtis | Demerits: 2 | Date: 2026-10-10
--       Infractions: ["Unapproved shift departure", "Stole citrus garnish"]
--       Issuer: Matt Barnes
--    3. Anonymous Patron | Demerits: 1 | Date: 2026-10-14
--       Infractions: ["Whistling at bartender"]
--       Issuer: Burtis
--    4. Rick | Demerits: 2 | Date: 2026-09-28
--       Infractions: ["Complaining about fantasy football trade"]
--       Issuer: Sarah
-- -----------------------------------------------------------------------------
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
  status
)
values
  (
    '22222222-2222-4222-8222-222222222201',
    (select id from public.members where display_name = 'Rick'),
    'Rick',
    (select id from public.members where display_name = 'Sarah'),
    'The Boss - AKA Sarah',
    3,
    '2026-10-17',
    '21:09:00',
    'Copper Athletic Club',
    '["Too many seat moves", "Tried to order Gin & Diet Coke", "The headband"]'::jsonb,
    null,
    'approved'
  ),
  (
    '22222222-2222-4222-8222-222222222202',
    (select id from public.members where display_name = 'Burtis'),
    'Burtis',
    (select id from public.members where display_name = 'Matt Barnes'),
    'Matt Barnes',
    2,
    '2026-10-10',
    '22:15:00',
    'Copper Athletic Club',
    '["Unapproved shift departure", "Stole citrus garnish"]'::jsonb,
    null,
    'approved'
  ),
  (
    '22222222-2222-4222-8222-222222222203',
    null,
    'Anonymous Patron',
    (select id from public.members where display_name = 'Burtis'),
    'Burtis',
    1,
    '2026-10-14',
    '20:42:00',
    'Copper Athletic Club',
    '["Whistling at bartender"]'::jsonb,
    null,
    'approved'
  ),
  (
    '22222222-2222-4222-8222-222222222204',
    (select id from public.members where display_name = 'Rick'),
    'Rick',
    (select id from public.members where display_name = 'Sarah'),
    'Sarah',
    2,
    '2026-09-28',
    '19:30:00',
    'Copper Athletic Club',
    '["Complaining about fantasy football trade"]'::jsonb,
    null,
    'approved'
  )
on conflict (id) do update
set
  patron_id = excluded.patron_id,
  raw_student = excluded.raw_student,
  issuer_id = excluded.issuer_id,
  raw_signature = excluded.raw_signature,
  demerit_count = excluded.demerit_count,
  incident_date = excluded.incident_date,
  incident_time = excluded.incident_time,
  location_area = excluded.location_area,
  infractions = excluded.infractions,
  status = excluded.status;

commit;
