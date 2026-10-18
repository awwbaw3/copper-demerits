# Implementation History — Copper Demerits (`copperdemerits.com`)

Chronological log of architectural decisions, database migrations, and infrastructure deployments.

---

## 2026-10-18 — v1.6.1 Frictionless Post-Claim Profile Editing, Claimed Profile & Admin-Only Nicknames & Automatic Slip Stat Merging
- **Frictionless Post-Claim Self-Service Profile Editing ("My Locker")**:
  - Added `activePin` session persistence in `src/context/DemeritsContext.tsx` and pre-populated `pin` inside `src/components/ClaimProfileModal.tsx` (`My Locker & Edit Profile` tab) so newly claimed or signed-in users can immediately adjust their display name, email address, phone number, carrier SMS gateway, notification opt-in settings, friendly bar tagline, and team badge without re-typing their PIN.
- **Claimed Profile & Admin-Only Nicknames + Automatic Slip Stat Merging**:
  - Upgraded `cloudflare/worker.js` (`POST /api/aliases`, `DELETE /api/aliases/:id`, `PATCH /api/my-profile`, `POST /api/demerits`) and deployed Worker Version `14d236b9-0440-4a2f-b90f-009dfcd4c081` to `https://api.copperdemerits.com`.
  - Enforced RBAC so only Site Admins/Staff (`actor.is_admin || actor.is_staff`) or the signed-in Claimed Profile owner (`actor.id === memberId && actor.is_claimed`) can add or remove nicknames for a profile, with every nickname checked by `moderateContent` / `moderateTextInstant` for bar-friendly rules.
  - Added `syncSlipsWithAliasesAndNames(env.DB)` on Cloudflare D1 and `resolvePatronNickname(rawStudent)` in `DemeritsContext.tsx` so any slip written with a member's nickname automatically merges its points and stats into the target profile.
  - Added the **My Bar Nicknames & Slip Aliases** manager in `ClaimProfileModal.tsx`, the live **Stats Merge Into Profile** badge on `SubmitSlipPage.tsx`, and full Patron + Staff nickname mapping in `AdminPage.tsx`.

---

## 2026-10-18 — v1.6.0 AI Referee Auto-Blur & Admin Override Queue, Self-Service Profile Editor, Zero-Cost Verified Notifications & Fan Site Disclaimer
- **Roster Cleanup (`Matt Barnes` & Negative Aliases Purged)**:
  - Executed Cloudflare D1 SQL cleanup removing `Matt Barnes` (`44444444-4444-4444-8444-444444444444`) and any negative aliases from `copper-demerits-db`, `cloudflare/worker.js`, `src/lib/defaultData.ts`, `supabase/seed.sql`, and UI placeholders.
- **Real-Time AI Referee Monitor + Automatic Slip Blurring & Admin Override Queue**:
  - Bound Cloudflare Workers AI (`[ai] binding = "AI"` in `wrangler.toml`) to `copper-demerits-api` (`$0/mo`, zero external API key required) alongside deterministic profanity/slur/insult guardrails (`src/lib/moderation.ts` & `cloudflare/worker.js`).
  - Configured slip uploads so any slip flagged for profanity or name-calling is **automatically blurred** (`applyRefereeBlurStampToImage` + `is_blurred = 1`), censored (`[🍻 CENSORED BY REF]`), and routed to `status = 'pending'` in the **Ref Booth Override Queue (`/admin`)** for Site Admin (**Rick**) to review and override (`approve_unblur`, `approve_keep_blurred`, or `reject`).
  - Configured strict immediate blocking for offensive display names, taglines, and staff aliases.
- **Edit Your Own Profile ("My Locker"), 4–8 Digit PINs & Ref Booth RBAC**:
  - Upgraded PIN validation to 4–8 digits across client and worker (`PATCH /api/my-profile`).
  - Designated **Rick** (`11111111-1111-4111-8111-111111111111`) as Site Administrator (`is_admin = 1`) and gated `/admin` behind `isAdminOrStaff`.
- **Zero-Cost Verified Notifications (`Resend-Agency` + Carrier SMS Gateways) & Privacy Hardening**:
  - Created and DNS-verified domain `copperdemerits.com` (`id: fee19476-c651-4f63-8ede-76e3ad5dd10f`) in `Resend-Agency` (Free tier) and stored `RESEND_API_KEY` in Cloudflare Worker secrets.
  - Added 6-digit verification code endpoints (`POST /api/notifications/send-code`, `POST /api/notifications/verify-code`) and D1 `notification_log` rate-limiting (max 25/day) with zero PII exposed in `GET /api/bootstrap`.
- **Preset Jovial Bar Reactions & Unofficial Fan Site Disclaimer**:
  - Added `POST /api/demerits/:id/react` (`🍺 Buy 'Em A Round`, `🦁 Tough Call Ref!`, `🐙 2 Mins in the Box`, `😂 Instant Classic`) and added the Unofficial Fan Site Disclaimer across the footer, upload page, and profile modal.

---

## 2026-10-18 — v1.5.0 Cloudflare D1 + R2 + Worker Backend Migration & Staff/Patron Profile Claiming
- **Cloudflare Backend Provisioning (`https://api.copperdemerits.com`)**:
  - Provisioned **Cloudflare D1** database `copper-demerits-db` (`feb899d8-606e-4937-91b7-9076e2741961`) and applied `cloudflare/schema.sql` (`members`, `staff_aliases`, `demerits`) + seeded all 5 members, 12 aliases, and 4 verified slips.
  - Provisioned **Cloudflare R2** bucket `copper-demerits-slips` and uploaded all 7 slip image files (`28318.jpg`, `28318_david_lee_1827.jpg`, `20261017_211324.jpg`, `20261017_211324_burtis_2050.jpg`, `20261017_211324_burtis_2056.jpg`, `20261017_211324_rick_2109.jpg`, `Scan_20261017_212309.jpg`).
  - Deployed **Cloudflare Worker** `copper-demerits-api` (`cloudflare/worker.js`, `wrangler.toml`) bound to `DB` (D1) and `SLIPS_BUCKET` (R2) on custom domain `https://api.copperdemerits.com`.
  - Dropped the temporary `copper_demerits` schema from `Supabase5` (`iqbpnkttwtugxkospdqt`) so `Supabase5` is 100% untouched.
- **Staff & Patron Profile Claiming + Upload Login Gate**:
  - Built `src/components/ClaimProfileModal.tsx` and `/api/claim-profile` so patrons and staff can claim their roster profile (`Sarah`, `Rick`, `Burtis`, `David Lee`, `Matt Barnes`) or create a new Patron profile with a 4-digit Bar PIN and Detroit/Michigan team emblem.
  - Updated `src/pages/SubmitSlipPage.tsx` to require a signed-in profile before uploading a slip and to record `submitted_by_member_id` on every new citation.

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
