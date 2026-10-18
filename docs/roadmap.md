# Project Roadmap — Copper Demerits (`copperdemerits.com`)

**Source of Truth** for Copper Athletic Club's **Ring of Honor** Bar Demerit Leaderboard.

## Phase 1: Core Architecture & Database Design (Completed — v1.0.0)
- [x] Vite + React 19 + TypeScript + Tailwind CSS v4 scaffolded with Copper Athletic Club dark sports lounge aesthetic (`#121212`, `#B87333`, `#C86D51`).
- [x] Supabase PostgreSQL migration (`supabase/schema.sql`) with `members`, `staff_aliases`, `demerits`, RLS policies, and `slips` Storage bucket.

## Phase 2: Ring of Honor Public Experience & Admin Hub (Completed — v1.0.0)
- [x] Public Leaderboard (`/`), The Docket (`/docket`), Slip Submission (`/submit`), and Admin Control (`/admin`).

## Phase 3: Cloud Deployment & Edge DNS (Completed — v1.0.0)
- [x] GitHub repository (`awwbaw3/copper-demerits`), Netlify site (`36044d56-88f0-4a30-9e6c-23b645aca925`), and Cloudflare DNS (`copperdemerits.com`).

## Phase 4: Mobile PWA Optimization & Authentic Slip Enforcement (Completed — v1.1.0)
- [x] Eliminated all fabricated statistics and hardcoded seed slips.
- [x] Added Progressive Web App (`manifest.webmanifest`, `sw.js`, mobile bottom navigation bar).

## Phase 5: Multi-Slip Photo Extraction, Timestamp Accounting & 3-Layer Deduplication (Completed — v1.2.0)
- [x] Accounted for the **3 physical slips** in `docs/20261017_211324.jpg` (`8:50 PM` Burtis +1, `8:56 PM` Burtis +2, `9:09 PM` Rick +3) and **1 physical slip scan** in `docs/Scan_20261017_212309.jpg` (`9:09 PM` Rick +3).
- [x] Implemented 3-layer deduplication (SHA-256 + Rotation-Aware 64-bit Perceptual dHash + Citation Timestamp/Content Match).

## Phase 6: Isolated `copper_demerits` Schema & Itemized Demerit Type / Period Leaderboard Engine (Completed — v1.3.1)
- [x] Isolated all Copper Demerits tables (`members`, `staff_aliases`, `demerits`, `normalize_demerit_slip()`) inside the `copper_demerits` PostgreSQL schema on `Supabase5` (`iqbpnkttwtugxkospdqt`), leaving `public` 100% clean for its Fantasy Sports Sync tables.
- [x] Added itemized `demerit_items` (`type`, `description`, `points`) to track the exact number and category of demerits on each slip.
- [x] Added `docs/28318.jpg` (`David Lee`, `6:27 PM`, `1 - so far` demerit for `"back talk, insubordinate"`, signed `"The Boss Lady"` → `Sarah`) as the 4th verified slip in `copper_demerits`.
- [x] Upgraded the Leaderboard (`/`) to calculate demerit leaders across selectable time periods (`All-Time`, `This Month`, `This Week`, `Oct 17 Session`, `Custom Date Range`) and by **Demerit Type**.

## Phase 7: Graphical `copperac.com` & Detroit / Michigan Sports Jumbotron Redesign (Completed — v1.4.0)
- [x] Updated all 4 slips in `copper_demerits` to be attributed to **Sarah** (`"The Boss Lady"`, `"YOUR BOSS!"`, `"Sarah (Cursive Signature)"`, `"The Boss - AKA Sarah"`).
- [x] Integrated authentic `copperac.com` interior photography (`CAC_Homepage_Wall.jpg`, `CAC_Homepage_About.jpg`, `CAC_Taps_web.jpg`) and official Stag logo (`CopperLogo_Web.png`).
- [x] Built animated Detroit Pro Teams (Lions, Red Wings, Bad Boys Pistons, Tigers) & Michigan / MSU visual badges and Copper Moscow Mule Mug point meters (`src/components/MichiganSportsGraphics.tsx`).

## Phase 8: Cloudflare D1 + R2 Edge Backend & Bar Profile Claiming / Login Gate (Completed — v1.5.0)
- [x] Migrated database and slip storage from Supabase to **Cloudflare D1 (`copper-demerits-db`)**, **Cloudflare R2 (`copper-demerits-slips`)**, and **Cloudflare Worker (`copper-demerits-api` on `https://api.copperdemerits.com`)** aligned with the `copperdemerits.com` Cloudflare zone.
- [x] Removed `copper_demerits` schema from `Supabase5` (`iqbpnkttwtugxkospdqt`).
- [x] Added **Staff & Patron Profile Claiming** (`src/components/ClaimProfileModal.tsx` + `POST /api/claim-profile`) with 4-digit Bar PINs and Detroit/Michigan team badges, and required profile sign-in before uploading slips on `/submit`.

## Phase 9: AI Referee Auto-Blur & Override Queue, Profile Editor, Verified Opt-In Alerts & Fan Site Disclaimer (Completed — v1.6.0)
- [x] Purged `Matt Barnes` and all non-authentic / negative aliases from Cloudflare D1, Worker seed data, and UI placeholders.
- [x] Added **Real-Time AI Referee Monitor** (Cloudflare Workers AI `env.AI` + deterministic profanity/slur filter) that blocks offensive names/aliases and **auto-blurs + queues** flagged slip uploads for Site Admin (**Rick**) to review and override in the **Ref Booth (`/admin`)**.
- [x] Added **Self-Service Profile Editing ("My Locker")** with **4–8 digit Bar PINs**, locked `/admin` behind `isAdminOrStaff`, and stripped all PII from public API responses.
- [x] Configured DNS-verified **`copperdemerits.com`** on Resend Free Tier (`referee@copperdemerits.com`) with **Opt-In 6-Digit Verified Email & Free Carrier SMS Gateway Notifications** capped at 25/day ($0 cost).
- [x] Added **Preset Jovial Bar Reactions** (`🍺 Buy 'Em A Round`, `🦁 Tough Call Ref!`, `🐙 2 Mins in the Box`, `😂 Instant Classic`) and the **Unofficial Patron-Run Fan Site Disclaimer**.


