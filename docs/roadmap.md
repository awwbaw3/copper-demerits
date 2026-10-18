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
- [x] Cropped individual slips and oriented `Scan_20261017_212309.jpg` upright; uploaded all 5 assets to Supabase `slips` Storage bucket and `public/slips/`.
- [x] Implemented 3-layer deduplication (SHA-256 + Rotation-Aware 64-bit Perceptual dHash + Citation Timestamp/Content Match) so Rick's `9:09 PM` citation is merged across both uploads without double-counting demerits.
- [x] Added Multi-Slip Photo Mode (1–4 slips per image) to `/submit`.
