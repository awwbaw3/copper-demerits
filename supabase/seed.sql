-- =============================================================================
-- COPPER ATHLETIC CLUB — RING OF HONOR DEMERIT LEADERBOARD
-- Seed Script (supabase/seed.sql) — Roster & Aliases Only (No Fabricated Slips)
-- =============================================================================

begin;

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

commit;
