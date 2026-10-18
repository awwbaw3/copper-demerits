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

## Phase 6: Isolated `copper_demerits` Schema & Itemized Demerit Type / Period Leaderboard Engine (Completed — v1.3.0)
- [x] Isolated all Copper Demerits tables (`members`, `staff_aliases`, `demerits`, `normalize_demerit_slip()`) inside the `copper_demerits` PostgreSQL schema on `Supabase5` (`iqbpnkttwtugxkospdqt`), leaving `public` 100% clean for its Fantasy Sports Sync tables.
- [x] Added itemized `demerit_items` (`type`, `description`, `points`) to track the exact number and category of demerits on each slip.
- [x] Upgraded the Leaderboard (`/`) to calculate demerit leaders across selectable time periods (`All-Time`, `This Month`, `This Week`, `Oct 17 Session`, `Custom Date Range`) and by **Demerit Type**.
