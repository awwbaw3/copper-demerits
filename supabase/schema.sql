-- ============================================================================
-- COPPER DEMERITS — RING OF HONOR
-- Database Migration: Isolated `copper_demerits` Schema, Tables, Triggers & RLS
-- ============================================================================

create extension if not exists "pgcrypto";

-- 0. Create isolated schema so `public` tables in Supabase5 remain untouched
create schema if not exists copper_demerits;

grant usage on schema copper_demerits to anon, authenticated, service_role;
alter default privileges in schema copper_demerits
  grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema copper_demerits
  grant usage, select on sequences to anon, authenticated, service_role;

-- Expose `copper_demerits` to PostgREST alongside `public`
alter role authenticator set pgrst.db_schemas = 'public, graphql_public, copper_demerits';
notify pgrst, 'reload config';

-- 1. Members Table (Patrons and Staff Roster)
create table if not exists copper_demerits.members (
  id uuid primary key default gen_random_uuid(),
  display_name text not null unique,
  is_staff boolean not null default false,
  is_patron boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. Staff Aliases Table (Maps raw handwritten signatures to canonical Staff member)
create table if not exists copper_demerits.staff_aliases (
  id uuid primary key default gen_random_uuid(),
  alias text not null unique,
  member_id uuid not null references copper_demerits.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint staff_aliases_lowercase_chk check (alias = lower(trim(alias)))
);

-- 3. Demerits Table (Physical Demerit Slips + Itemized Demerit Types & Points)
create table if not exists copper_demerits.demerits (
  id uuid primary key default gen_random_uuid(),
  patron_id uuid references copper_demerits.members(id) on delete set null,
  raw_student text not null,
  issuer_id uuid references copper_demerits.members(id) on delete set null,
  raw_signature text not null,
  demerit_count integer not null default 1 check (demerit_count >= 1 and demerit_count <= 25),
  incident_date date not null default current_date,
  incident_time time without time zone,
  location_area text not null default 'Copper Athletic Club',
  infractions jsonb not null default '[]'::jsonb,
  demerit_items jsonb not null default '[]'::jsonb,
  image_url text,
  image_hash text,
  slip_fingerprint text unique,
  source_Upload_note text,
  status text not null default 'approved' check (status in ('approved', 'pending', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists idx_cd_demerits_patron_id on copper_demerits.demerits(patron_id);
create index if not exists idx_cd_demerits_issuer_id on copper_demerits.demerits(issuer_id);
create index if not exists idx_cd_demerits_incident_date on copper_demerits.demerits(incident_date desc);
create index if not exists idx_cd_demerits_status on copper_demerits.demerits(status);
create index if not exists idx_cd_demerits_image_hash on copper_demerits.demerits(image_hash);
create unique index if not exists idx_cd_demerits_slip_fingerprint on copper_demerits.demerits(slip_fingerprint) where slip_fingerprint is not null;

-- 4. Automatic Normalization Trigger for Handwritten Signatures & Patron Names
create or replace function copper_demerits.normalize_demerit_slip()
returns trigger
language plpgsql
security definer
set search_path = copper_demerits, public
as $$
declare
  matched_issuer uuid;
  matched_patron uuid;
begin
  -- Resolve issuer_id from staff_aliases if not explicitly provided
  if new.issuer_id is null and new.raw_signature is not null then
    select sa.member_id
      into matched_issuer
      from copper_demerits.staff_aliases sa
     where sa.alias = lower(trim(new.raw_signature))
     limit 1;

    if matched_issuer is null then
      select m.id
        into matched_issuer
        from copper_demerits.members m
       where m.is_staff = true
         and lower(trim(m.display_name)) = lower(trim(new.raw_signature))
       limit 1;
    end if;

    new.issuer_id := matched_issuer;
  end if;

  -- Resolve patron_id from members if not explicitly provided
  if new.patron_id is null and new.raw_student is not null then
    select m.id
      into matched_patron
      from copper_demerits.members m
     where lower(trim(m.display_name)) = lower(trim(new.raw_student))
     limit 1;

    new.patron_id := matched_patron;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_normalize_demerit_slip on copper_demerits.demerits;
create trigger trg_normalize_demerit_slip
before insert or update on copper_demerits.demerits
for each row execute function copper_demerits.normalize_demerit_slip();

-- 5. Enable Row Level Security (RLS)
alter table copper_demerits.members enable row level security;
alter table copper_demerits.staff_aliases enable row level security;
alter table copper_demerits.demerits enable row level security;

-- Public Read Policies
drop policy if exists "Public can read members" on copper_demerits.members;
create policy "Public can read members"
  on copper_demerits.members for select
  using (true);

drop policy if exists "Public can read staff aliases" on copper_demerits.staff_aliases;
create policy "Public can read staff aliases"
  on copper_demerits.staff_aliases for select
  using (true);

drop policy if exists "Public can read demerits" on copper_demerits.demerits;
create policy "Public can read demerits"
  on copper_demerits.demerits for select
  using (true);

-- Patron & Staff Interactive Policies (Ring of Honor Submissions & Admin Queue)
drop policy if exists "Anyone can insert demerits" on copper_demerits.demerits;
create policy "Anyone can insert demerits"
  on copper_demerits.demerits for insert
  with check (true);

drop policy if exists "Anyone can update demerits" on copper_demerits.demerits;
create policy "Anyone can update demerits"
  on copper_demerits.demerits for update
  using (true)
  with check (true);

drop policy if exists "Anyone can insert members" on copper_demerits.members;
create policy "Anyone can insert members"
  on copper_demerits.members for insert
  with check (true);

drop policy if exists "Anyone can update members" on copper_demerits.members;
create policy "Anyone can update members"
  on copper_demerits.members for update
  using (true)
  with check (true);

drop policy if exists "Anyone can insert staff aliases" on copper_demerits.staff_aliases;
create policy "Anyone can insert staff aliases"
  on copper_demerits.staff_aliases for insert
  with check (true);

drop policy if exists "Anyone can update staff aliases" on copper_demerits.staff_aliases;
create policy "Anyone can update staff aliases"
  on copper_demerits.staff_aliases for update
  using (true)
  with check (true);

drop policy if exists "Anyone can delete staff aliases" on copper_demerits.staff_aliases;
create policy "Anyone can delete staff aliases"
  on copper_demerits.staff_aliases for delete
  using (true);

-- 6. Storage Bucket for Physical Slip Photos (`slips`)
insert into storage.buckets (id, name, public)
values ('slips', 'slips', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can view slip photos" on storage.objects;
create policy "Public can view slip photos"
  on storage.objects for select
  using (bucket_id = 'slips');

drop policy if exists "Patrons can upload slip photos" on storage.objects;
create policy "Patrons can upload slip photos"
  on storage.objects for insert
  with check (bucket_id = 'slips');
