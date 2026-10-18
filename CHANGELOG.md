# Changelog — Copper Demerits (`copperdemerits.com`)

All notable changes to the **Copper Athletic Club — Ring of Honor** web application are documented in this file.

## [1.3.0] - 2026-10-18

### Added
- **Isolated `copper_demerits` PostgreSQL Schema in `Supabase5` (`iqbpnkttwtugxkospdqt`)**:
  - Migrated `members`, `staff_aliases`, `demerits`, and `normalize_demerit_slip()` out of `public` into a dedicated `copper_demerits` PostgreSQL schema so `Supabase5`'s original `public` tables (`api_cache`, `keepalives`, `leagues_cache`, `provider_accounts`) remain 100% isolated and untouched.
  - Configured `@supabase/supabase-js` client (`src/lib/supabase.ts`) with `{ db: { schema: 'copper_demerits' } }` and exposed `copper_demerits` via PostgREST.
- **Itemized Demerit Types & Point Counts (`demerit_items`) + Period Leaderboard Engine**:
  - Added structured `demerit_items` (`type`, `description`, `points`) to every slip in `copper_demerits.demerits` and `src/types/demerits.ts`:
    1. **8:50 PM (`Burtis` — 1 PT)**: `Attendance / No-Show` (+1 PT) — *"No call / no show to see the Red Wings"*
    2. **8:56 PM (`Burtis` — 2 PTS)**: `Insubordination / Defiance` (+2 PTS) — *"NOT CARING ABOUT THE FIRST DEMERIT"*
    3. **9:09 PM (`Rick` — 3 PTS)**: `Bar Etiquette / Seating` (+1 PT) — *"Too many seat moves"*, `Drink Crime / Order Foul` (+1 PT) — *"Try to order Gin & Diet Coke"*, `Attire / Headgear Foul` (+1 PT) — *"The headband :) <3"*
  - Upgraded the **Leaderboard (`/`)** with **Period Selectors** (`All-Time`, `This Month`, `This Week`, `Oct 17 Session`, and `Custom Date Range` with `From`/`To` date pickers) and interactive **Demerit Type Leader Filters** showing category leaders, point breakdowns, and tie-breaking by Offense Types (`offenseCount`).
  - Upgraded **The Docket (`/docket`)**, **Slip Modal Viewer**, and **Submit Slip (`/submit`)** to record and display itemized Demerit Types and Point Counts on every infraction line.

## [1.2.0] - 2026-10-18

### Added
- **Multi-Slip Bar Photo Extraction (`docs/20261017_211324.jpg`) & Single-Slip Scan Deduplication (`docs/Scan_20261017_212309.jpg`)**:
  - Accounted for **3 physical slips** in `20261017_211324.jpg` (captured Oct 17, 2026 at 9:13 PM) and **1 physical slip scan** in `Scan_20261017_212309.jpg` (captured Oct 17, 2026 at 9:23 PM).
  - Automatically deduplicated & merged `Scan_20261017_212309.jpg` with Slip #3 from `20261017_211324.jpg` so Rick's 9:09 PM citation is counted once (**3 demerits**, not 6).
- **Multi-Slip Photo Logger (`/submit`)** & **3-Layer Deduplication Engine (`src/lib/imageDedup.ts`)**.

## [1.1.0] - 2026-10-18

### Added
- Progressive Web App (PWA) support (`manifest.webmanifest`, `sw.js`, install prompt, mobile bottom navigation bar).
- Initial SHA-256 and 64-bit perceptual dHash image deduplication engine.

## [1.0.0] - 2026-10-17

### Added
- Initial production launch of **Copper Demerits — Ring of Honor** (`https://copperdemerits.com`).
