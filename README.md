# Copper Demerits — Ring of Honor (`copperdemerits.com`)

Official **Ring of Honor** Bar Demerit Leaderboard & Docket for **Copper Athletic Club** (`copperac.com`) in Marshall, Michigan — *"A Sports Bar. Not A Gym."*

## Architecture & Routes

- **`/` — Public Leaderboard**: Month (`Oct 2026` / `Sep 2026`) and `All-Time` standings, patron cards, total demerits received, demerits issued as staff, net score (`Received − Issued`), and the Staff Enforcer leaderboard.
- **`/docket` — The Docket**: Chronological card feed of physical demerit slips with itemized infractions, dates/timestamps, normalized staff issuers vs. raw signatures, and an interactive native `<dialog>` **Slip Modal Viewer**.
- **`/submit` — Ring of Honor**: Self-report station where patrons capture/upload photos of their physical slips to the Supabase Storage bucket `slips`, with real-time staff signature alias normalization and live slip preview.
- **`/admin` — Moderation & Alias Governance**: Lightweight review queue, lowercase unique `staff_aliases` mapper, live signature normalization sandbox, and `members` roster management.

## Supabase Database & Storage

- [`supabase/schema.sql`](./supabase/schema.sql): Creates `members`, `staff_aliases`, and `demerits` tables, automatic normalization trigger (`normalize_demerit_slip`), public read / patron submission RLS policies, and the `slips` storage bucket.
- [`supabase/seed.sql`](./supabase/seed.sql): Seeds the initial roster (`Rick`, `Burtis`, `Sarah`, `Matt Barnes`), staff aliases (`the boss`, `the boss - aka sarah`, `aka sarah`, `sarah`, `the douche`, `matt barnes`, `burtis`), and the 4 initial docket slips.
