-- =============================================================================
-- COPPER ATHLETIC CLUB — RING OF HONOR DEMERIT LEADERBOARD
-- Supabase Schema Migration (supabase/schema.sql)
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. MEMBERS TABLE (Patrons & Staff Roster)
-- -----------------------------------------------------------------------------
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  display_name text not null unique,
  is_staff boolean not null default false,
  is_patron boolean not null default true,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 2. STAFF ALIASES TABLE (Signature Normalization Lookup)
-- -----------------------------------------------------------------------------
create table if not exists public.staff_aliases (
  id uuid primary key default gen_random_uuid(),
  alias text not null unique check (alias = lower(trim(alias))),
  member_id uuid not null references public.members(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_staff_aliases_alias on public.staff_aliases (alias);
create index if not exists idx_staff_aliases_member_id on public.staff_aliases (member_id);

-- -----------------------------------------------------------------------------
-- 3. DEMERITS TABLE (Uploaded Physical Slip Images & Deduplication Hashes)
-- -----------------------------------------------------------------------------
create table if not exists public.demerits (
  id uuid primary key default gen_random_uuid(),
  patron_id uuid references public.members(id) on delete set null,
  raw_student text not null,
  issuer_id uuid references public.members(id) on delete set null,
  raw_signature text not null,
  demerit_count integer not null default 1 check (demerit_count > 0),
  incident_date date not null default current_date,
  incident_time time,
  location_area text not null default 'Copper Athletic Club',
  infractions jsonb not null default '[]'::jsonb,
  image_url text not null,
  image_sha256 text unique,
  image_dhash text,
  status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists idx_demerits_patron_id on public.demerits (patron_id);
create index if not exists idx_demerits_issuer_id on public.demerits (issuer_id);
create index if not exists idx_demerits_incident_date on public.demerits (incident_date desc);
create index if not exists idx_demerits_image_sha256 on public.demerits (image_sha256);
create index if not exists idx_demerits_image_dhash on public.demerits (image_dhash);

-- -----------------------------------------------------------------------------
-- 4. AUTOMATIC SIGNATURE & PATRON NORMALIZATION TRIGGER
-- -----------------------------------------------------------------------------
create or replace function public.normalize_demerit_slip()
returns trigger
language plpgsql
security definer
as $$
declare
  v_normalized_sig text;
  v_normalized_student text;
  v_issuer_uuid uuid;
  v_patron_uuid uuid;
begin
  if new.issuer_id is null and new.raw_signature is not null then
    v_normalized_sig := lower(trim(new.raw_signature));

    select sa.member_id
      into v_issuer_uuid
      from public.staff_aliases sa
     where sa.alias = v_normalized_sig
     limit 1;

    if v_issuer_uuid is null then
      select m.id
        into v_issuer_uuid
        from public.members m
       where lower(trim(m.display_name)) = v_normalized_sig
         and m.is_staff = true
       limit 1;
    end if;

    new.issuer_id := v_issuer_uuid;
  end if;

  if new.patron_id is null and new.raw_student is not null then
    v_normalized_student := lower(trim(new.raw_student));

    if v_normalized_student not in ('anonymous', 'anonymous patron', 'unknown') then
      select m.id
        into v_patron_uuid
        from public.members m
       where lower(trim(m.display_name)) = v_normalized_student
         and m.is_patron = true
       limit 1;

      new.patron_id := v_patron_uuid;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_normalize_demerit_slip on public.demerits;
create trigger trg_normalize_demerit_slip
before insert or update on public.demerits
for each row
execute function public.normalize_demerit_slip();

-- -----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES & `slips` STORAGE BUCKET
-- -----------------------------------------------------------------------------
alter table public.members enable row level security;
alter table public.staff_aliases enable row level security;
alter table public.demerits enable row level security;

drop policy if exists "Allow public read access on members" on public.members;
create policy "Allow public read access on members"
  on public.members for select to anon, authenticated using (true);

drop policy if exists "Allow member creation and updates" on public.members;
create policy "Allow member creation and updates"
  on public.members for all to anon, authenticated using (true) with check (true);

drop policy if exists "Allow public read access on staff_aliases" on public.staff_aliases;
create policy "Allow public read access on staff_aliases"
  on public.staff_aliases for select to anon, authenticated using (true);

drop policy if exists "Allow staff alias management" on public.staff_aliases;
create policy "Allow staff alias management"
  on public.staff_aliases for all to anon, authenticated using (true) with check (true);

drop policy if exists "Allow public read access on demerits" on public.demerits;
create policy "Allow public read access on demerits"
  on public.demerits for select to anon, authenticated using (true);

drop policy if exists "Allow patron slip submissions on demerits" on public.demerits;
create policy "Allow patron slip submissions on demerits"
  on public.demerits for insert to anon, authenticated with check (true);

drop policy if exists "Allow moderation updates on demerits" on public.demerits;
create policy "Allow moderation updates on demerits"
  on public.demerits for update to anon, authenticated using (true) with check (true);

drop policy if exists "Allow moderation deletes on demerits" on public.demerits;
create policy "Allow moderation deletes on demerits"
  on public.demerits for delete to anon, authenticated using (true);

insert into storage.buckets (id, name, public)
values ('slips', 'slips', true)
on conflict (id) do nothing;

drop policy if exists "Public read access for slips bucket" on storage.objects;
create policy "Public read access for slips bucket"
  on storage.objects for select to anon, authenticated using (bucket_id = 'slips');

drop policy if exists "Allow patron uploads to slips bucket" on storage.objects;
create policy "Allow patron uploads to slips bucket"
  on storage.objects for insert to anon, authenticated with check (bucket_id = 'slips');
