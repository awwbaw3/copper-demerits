# Implementation History — Copper Demerits (`copperdemerits.com`)

Chronological log of architectural decisions, database migrations, and infrastructure deployments.

---

## 2026-10-18 — v1.4.0 Graphical `copperac.com` & Detroit / Michigan Sports Memorabilia Jumbotron UI + 100% Sarah Attribution
- Updated `copper_demerits.demerits` and `copper_demerits.staff_aliases` so Slip #2 (`20:56`, `Burtis`, `+2 Demerits`) maps its cursive signature (`"Sarah (Cursive Signature)"`) to **Sarah** (`33333333-3333-4333-8333-333333333333`), confirming all 4 slips / 7 demerits were issued by Sarah.
- Downloaded official `copperac.com` visual assets (`CopperLogo_Web.png`, `CAC_Homepage_Wall.jpg`, `CAC_Homepage_About.jpg`, `CAC_Taps_web.jpg`) into `public/brand/`.
- Built `src/components/MichiganSportsGraphics.tsx` with animated Detroit Pro Team (Lions, Red Wings, Pistons Bad Boys, Tigers) and Michigan / Michigan State SVG emblems, plus the `CopperMugMeter` Moscow Mule visual point counter.
- Redesigned `src/pages/LeaderboardPage.tsx`, `src/pages/DocketPage.tsx`, and `src/components/Navbar.tsx` into a mostly-graphical, tongue-in-cheek animated sports scoreboard.

---

## 2026-10-18 — v1.3.1 Added `docs/28318.jpg` (`David Lee` — `6:27 PM` Slip) to `copper_demerits`
- Transcribed `docs/28318.jpg`: **Student**: `David Lee`, **Grade**: `N/A`, **Date**: `10/17/26`, **Time**: `6:27pm` (`18:27:00`), **Room**: `Copper AC`, **Number of Demerits**: `1 - so far` (`1`), **Reason**: `"back talk, insubordinate"` (`Insubordination / Defiance`, `+1 PT`), **Signature**: `"The Boss Lady"` → normalized to `Sarah`.
- Cropped `public/slips/28318_david_lee_1827.jpg`, uploaded both `28318.jpg` and `28318_david_lee_1827.jpg` to Supabase `slips` Storage bucket, and inserted `David Lee`, alias `"the boss lady"`, and slip `a4444444-4444-4444-8444-444444444444` into `copper_demerits`.

---

## 2026-10-18 — v1.3.0 Isolated `copper_demerits` Schema & Itemized Demerit Type / Period Leaderboard Engine
- **Database Isolation in `Supabase5` (`iqbpnkttwtugxkospdqt`)**:
  - Audited `Supabase5` and confirmed its `public` schema hosts 4 tables (`api_cache`, `keepalives`, `leagues_cache`, `provider_accounts`) for the Multi-Provider Fantasy Sports Sync / Keepalive service.
  - Created an isolated PostgreSQL schema `copper_demerits` inside `iqbpnkttwtugxkospdqt`, migrated `members`, `staff_aliases`, `demerits`, and `normalize_demerit_slip()` into `copper_demerits`, exposed `copper_demerits` to PostgREST, and dropped all Copper Demerits objects from `public` so `public` remains 100% clean.
  - Updated `src/lib/supabase.ts` to query `{ db: { schema: 'copper_demerits' } }`.
- **Itemized Demerit Types (`demerit_items`) & Period Leaderboard Calculation**:
  - Added `demerit_items jsonb` (`type`, `description`, `points`) to `copper_demerits.demerits` and `src/types/demerits.ts`.
  - Updated `src/context/DemeritsContext.tsx` and `src/pages/LeaderboardPage.tsx` to calculate demerit leaders across selectable time periods (`all-time`, `this-month`, `this-week`, `oct-17-session`, `custom` date range) and by **Demerit Type** (`Attendance / No-Show`, `Insubordination / Defiance`, `Bar Etiquette / Seating`, `Drink Crime / Order Foul`, `Attire / Headgear Foul`, etc.), with tie-breaking by distinct Offense Count (`offenseCount`).
  - Updated `src/pages/SubmitSlipPage.tsx`, `src/pages/DocketPage.tsx`, and `src/components/SlipModalViewer.tsx` so every infraction line item tracks and displays its specific **Demerit Type** and **Demerit Point Count (`+1 PT`, `+2 PTS`)**.

---

## 2026-10-18 — v1.2.0 Multi-Slip Photo Extraction, Exact Timestamp Accounting & 3-Layer Deduplication
- **Multi-Slip & Scan Accounting (`docs/20261017_211324.jpg` + `docs/Scan_20261017_212309.jpg`)**:
  - Inspected and cropped the **3 physical slips** in `docs/20261017_211324.jpg` and oriented `docs/Scan_20261017_212309.jpg` upright.
  - Seeded the exact 3 unique chronological citations on `2026-10-17` (`20:50` Burtis +1, `20:56` Burtis +2, `21:09` Rick +3).
- **3-Layer Deduplication & Multi-Slip Form**:
  - Enhanced `src/lib/imageDedup.ts` with SHA-256 lookup, rotation-aware (`0°/90°/180°/270°`) 64-bit perceptual dHash, and citation timestamp/content deduplication.

---

## 2026-10-18 — v1.1.0 Mobile PWA & Image Deduplication
- Added PWA manifest, service worker, mobile bottom navigation bar, and SHA-256 / dHash image fingerprinting.

---

## 2026-10-17 — v1.0.0 Initial Architecture & Full-Stack Deployment
- Provisioned GitHub repo (`awwbaw3/copper-demerits`), Netlify site (`36044d56-88f0-4a30-9e6c-23b645aca925`), and Cloudflare DNS (`copperdemerits.com`).
