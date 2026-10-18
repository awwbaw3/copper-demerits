# Changelog — Copper Demerits (`copperdemerits.com`)

All notable changes to the **Copper Athletic Club — Ring of Honor** web application are documented in this file.

## [1.6.12] - 2026-10-18

### Changed & Streamlined
- **Pure Leaderboard Ticker Updates (`src/components/Navbar.tsx`)**:
  - Removed all venue references ("Copper Athletic Club • Marshall, MI", "A sports bar. Not a gym.") and confirmed zero Cloudflare mentions.
  - Dynamically calculates and displays pure leaderboard updates directly from live data:
    - Current Leaderboard Co-Leaders and #1 rank holders with exact points and slip counts.
    - Full Ring of Honor podium standings (`#1 RICK (3 PTS) • #1 BURTIS (3 PTS) • #3 DAVID LEE (1 PT)`).
    - Total demerits and verified slips counter (`7 PTS across 4 verified slips`).
    - Head Referee citation record (Sarah's 4-for-4 conviction rate).
    - Individual citations with patron name, timestamp, demerit points, and infractions.
    - Ref Booth alerts when citations are pending review.

### Added & Enhanced
- **Dedicated Backbar Easy Share & QR Code Page (`src/pages/SharePage.tsx`, `/share`)**:
  - Built an offline, client-side QR Code generator powered by `qrcode` with high error correction (`H`), crisp styling, and dynamic destination switching:
    - 🏆 **Live Scoreboard & Standings** (`https://copperdemerits.com/`)
    - 📸 **Drop A Demerit Slip Camera** (`https://copperdemerits.com/submit`)
    - 📜 **The Docket / Wall of Slips** (`https://copperdemerits.com/docket`)
  - Integrated 1-tap **Share via Text / Message** (`navigator.share`), instant **Copy Link**, and **Save QR Image (.PNG)**.
  - Added **Print Tabletop Placard / Backbar Card** (`window.print()` with `@media print` optimizations for tabletop tent cards).
- **Ubiquitous App Navigation & Discoverability (`src/components/Navbar.tsx`, `src/pages/LeaderboardPage.tsx`, `src/App.tsx`)**:
  - Added prominent **`[Share QR]`** action button to the sticky top navbar header for immediate access from any screen on both mobile and desktop.
  - Added **`Share QR`** item to `navItems` and updated mobile bottom navigation to a 5-column layout (`grid-cols-5`).
  - Added **`SHARE QR`** button to the Scoreboard Jumbotron counter on `/`.
  - Added **`📱 Share App & Backbar QR Code`** link in the site footer.
  - Linked to the QR poster from the PWA Install Guide Modal.

## [1.6.11] - 2026-10-18

### Added & Enhanced
- **Prominent PWA Installation Banner & Multi-Screen CTA (`src/components/Navbar.tsx`)**:
  - Added an animated, glowing **`[Install App]`** action button to the sticky top header across both mobile and desktop viewports whenever the site is not running in standalone mode (`!isStandalone`).
  - Added a dismissible, copper-accented callout banner below the header ("Get The Official Backbar App — Install on your Home Screen for instant 1-tap live scoreboard & demerit alerts") with a 3-day suppression cooldown upon manual dismissal.
  - Added a cross-platform **Install Backbar App Guide Modal** with illustrated step-by-step instructions for:
    - **iPhone / iPad (Safari)**: Tap Share icon (<Share2 />) → "Add to Home Screen" → Add.
    - **Android (Chrome)**: Tap three-dots menu (⋮) → "Install app" / "Add to Home Screen".
    - **Desktop (Chrome / Edge / Brave)**: Click the install icon (⊕) in the browser address bar.
  - Automatically handles native Chromium `beforeinstallprompt` for instant 1-tap installation and monitors `appinstalled` to update UI state immediately.

## [1.6.10] - 2026-10-18

### Changed & Streamlined
- **Individual Leaderboard Front-and-Center (`src/pages/LeaderboardPage.tsx`)**:
  - Showcased the **Individual Leaderboard (`RING OF HONOR STANDINGS`)** directly beneath the Penalty Box header, moving the 5-team foul categories below the player cards so player standings (Rick, Burtis, David Lee) are instantly visible at the top of the fold.
- **Header Streamlining & Clutter Removal (`src/pages/LeaderboardPage.tsx`)**:
  - Renamed the upload CTA button from `"DROP SLIP"` to **`"ADD YOUR DEMERIT"`** with camera icon.
  - Removed clutter tagline `"A SPORTS BAR. NOT A GYM. • MARSHALL, MI"` above the header.
  - Removed verbose subtitle `"Official Bar Demerit Jumbotron · Lions · Red Wings · Pistons · Tigers · UM · MSU"` below The Penalty Box.
  - Removed backbar badge `"Actual Copper AC backbar - marshall, mi"` from the Head Referee (Sarah) section.
- **Modernized Season / Period Selectors (`src/pages/LeaderboardPage.tsx`, `src/types/demerits.ts`, `src/context/DemeritsContext.tsx`)**:
  - Replaced the testing session button `"Oct 17 Game Night"` with production options: **`All-Time`**, **`This Month`**, **`This Week`**, **`Today`**, and **`Custom Dates`**.
  - Replaced hardcoded `'OCT 17'` fallback timestamps with dynamic dates on thumbnail slips.

## [1.6.9] - 2026-10-18

### Added & Hardened
- **Security Audit & Backend Hardening (`cloudflare/worker.js`, `cloudflare/migration_preferences.sql`)**:
  - Confirmed via Git commit history and tracked repository audits that **0 API keys or private secrets were ever committed**.
  - Verified all runtime secrets (`RESEND_API_KEY`, Cloudflare bindings) are encrypted inside Cloudflare Worker runtime variables.
  - Implemented PIN brute-force defense in `cloudflare/worker.js`: 5 failed attempts per IP or member within 15 minutes triggers an automated lockout recorded in the `pin_failures` table on Cloudflare D1.
  - Added strict HTTP security headers across all API responses (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`).
  - Verified 100% PII stripping on all public endpoints (`/api/members`, `/api/bootstrap`, `/api/docket`, `/api/demerits`).
- **Granular Opt-In Notification Triggers & Channels (`src/components/ClaimProfileModal.tsx`, `src/types/demerits.ts`, `cloudflare/worker.js`)**:
  - Implemented granular notification preference schema with 4-way selectors (`[Off] [Email] [Text] [Both]`), **disabled by default** (`none`), across 5 core events:
    1. 👑 **Leaderboard Crown**: When you take over 1st place on the Copper Demerit Leaderboard.
    2. 📉 **Leaderboard Dethroned**: When another patron knocks you out of #1.
    3. 📋 **New Citation**: When a demerit slip cites your name or nickname.
    4. 📢 **Ref Whistle Override**: When an official review approves, unblurs, or rejects your slip.
    5. 🍺 **Friday Night Docket**: Weekly 5:00 PM EST happy hour summary of podium standings and top offenses.
  - Integrated notification preference matrix inside "My Locker" modal with inline validation warnings if Email or 10-Digit Mobile + Carrier are required, along with quick "Mute All" and "Enable All (Both)" helpers.
- **Automated Friday Night Docket (Happy Hour Digest) (`wrangler.toml`, `cloudflare/worker.js`, `src/pages/AdminPage.tsx`)**:
  - Configured Cloudflare Workers Cron trigger `[triggers] crons = ["0 21 * * 5"]` (Fridays at 5:00 PM EDT / 21:00 UTC) invoking `scheduled(event, env, ctx)` to automatically digest podium standings and infractions for opted-in patrons.
  - Added Ref Booth control in `AdminPage.tsx` with a "Send Test Friday Docket" dispatch trigger calling `POST /api/notifications/friday-digest-test`.
  - Added anti-spam safety guards: 15-minute cooldown for rank shifts, 5-minute cooldown for batch citations, and a site-wide safety cap of 25 messages/day to guarantee $0 cost.

## [1.6.8] - 2026-10-18

### Added & Verified
- **Full Domain Verification & noreply@copperdemerits.com Live on Resend-Ninjas (`cloudflare/worker.js`, `Resend-Ninjas`)**:
  - Successfully verified domain `copperdemerits.com` directly inside the user's `drit.ninja` Resend account (`fe85e77d-54c0-4f74-bc7f-9dd968e94472`).
  - Purged conflicting legacy Agency DKIM and manual MX/TXT records in Cloudflare DNS, achieving 100% verified status for DKIM (`resend._domainkey`) and SPF CNAMEs (`rsend`, `send`).
  - Updated Cloudflare Worker notification sender to `Copper Demerits <noreply@copperdemerits.com>` with `reply_to: 'info@drit.ninja'`.
  - Tested live delivery across email (`albaughrick@gmail.com`) and carrier SMS (`2692749665@tmomail.net`) with confirmed delivery.

## [1.6.7] - 2026-10-18

### Changed & Decoupled
- **Decoupled Email & SMS Infrastructure from Agency Account (`cloudflare/worker.js`, `Resend-Ninjas`)**:
  - Removed `copperdemerits.com` entirely from `Resend-Agency`, leaving 0 agency domains tied to the fan site.
  - Migrated email and carrier SMS delivery to the user's `drit.ninja` Resend account (`Resend-Ninjas`).
  - Switched notification sender to `Copper Demerits <noreply@drit.ninja>` with `reply_to: 'info@drit.ninja'`, enabling reliable, verified delivery without cross-account lock blocks.
  - Generated dedicated `copper-demerits-worker` Resend API key and updated Cloudflare Worker `RESEND_API_KEY` secret.
- **Updated Website Footer & Live Ticker Branding (`src/App.tsx`, `src/components/Navbar.tsx`, `src/components/ClaimProfileModal.tsx`)**:
  - Added discrete link to **DR IT - The IT Ninjas** (`https://drit.ninja`) in the footer.
  - Direct all website feedback, questions, concerns, and complaints to `info@drit.ninja`.
  - Removed all Cloudflare marketing mentions from the public footer and navbar marquee ticker.
  - Removed technical internal "Cloudflare D1" mentions from user-facing profile claim and locker save status messages.
- **Production Guardrail**:
  - Maintained strict non-publishing rule for Netlify production pending user greenlight.

## [1.6.6] - 2026-10-18

### Added & Hardened
- **AI Vision Pre-Storage Demerit Slip Verification (`cloudflare/worker.js`, `src/lib/moderation.ts`, `src/pages/SubmitSlipPage.tsx`)**:
  - Upgraded the Zero-Touch capture pipeline so it:
    1. **Never rejects large smartphone images**: Accepts any size camera photo (`4 MB – 25 MB+`) and reduces it locally in the browser to `~35 KB – 82 KB` + checks SHA-256 and 64-bit Perceptual dHash duplicates.
    2. **Verifies it is indeed a Demerit Slip BEFORE storing in R2**: Sends the reduced image to `POST /api/extract-slip` first to verify `is_demerit_slip: true` and read all handwritten fields. If the uploaded photo is not a physical Demerit Slip (e.g., a random selfie, drink, or unrelated photo), it is rejected with a Referee Whistle alert and **0 bytes are ever uploaded or stored in Cloudflare R2**.
    3. **Stores the reduced `< 82 KB` image in R2 & logs to D1**: Only after verifying the image is a genuine Demerit Slip does the app upload the reduced image to `copper-demerits-slips` and log the citation(s) to D1.

## [1.6.5] - 2026-10-18

### Added & Optimized
- **Adaptive Smartphone Slip Image Compression (<82 KB Target, 95%–99% Size Reduction) (`src/lib/imageDedup.ts`, `src/lib/supabase.ts`, `src/pages/SubmitSlipPage.tsx`)**:
  - Upgraded `fingerprintImageFile` to automatically downscale 12MP–48MP smartphone camera photos (typically `4 MB – 12 MB`) to a crisp **`960px` max dimension** using high-quality bicubic canvas resampling (stripping 100% of EXIF, GPS, and camera metadata) and an adaptive JPEG byte-budget loop (`quality: 0.74 -> 0.52`) targeting **`~35 KB – 82 KB` per slip photo**.
  - Added live compression stats (`originalBytes`, `compressedBytes`, `savingsPercent`, `width × height`) displayed on `/submit` so users see the exact size reduction (e.g., `6.4 MB → 58 KB · 99% saved`).
- **Zero-Waste R2 Deduplication & Compact Blurred Image Storage (`src/pages/SubmitSlipPage.tsx`, `src/lib/moderation.ts`, `cloudflare/worker.js`)**:
  - Reordered the capture pipeline so SHA-256 and 64-bit Perceptual dHash duplicate checks run **locally in the browser before uploading to Cloudflare R2** — blocked duplicate photos now consume **0 bytes** of R2 storage and bandwidth.
  - Updated `applyRefereeBlurStampToImage` and `persistSlipDrafts` so Referee-blurred slip images are compressed (`<= 960px`, `quality = 0.72`) and uploaded to Cloudflare R2 (`_blurred.jpg`) rather than storing inline base64 strings in Cloudflare D1.
  - Enforced a hard `350 KB` maximum payload guard on `PUT /api/slips/:filename` in `cloudflare/worker.js`.
  - Compressed all 7 existing slip images in `public/slips/` and Cloudflare R2 (`copper-demerits-slips`), shrinking total existing slip storage from **`3,263 KB (3.26 MB)` down to `387.6 KB` (`88.1%` total reduction; `20261017_211324.jpg` reduced from `1,805.2 KB` to `47.7 KB`)**.

## [1.6.4] - 2026-10-18

### Added
- **Zero-Touch AI Vision Slip OCR & Automatic Logging on Image Capture (`POST /api/extract-slip`, `cloudflare/worker.js`, `src/lib/moderation.ts`, `src/pages/SubmitSlipPage.tsx`)**:
  - Added `POST /api/extract-slip` powered by **Cloudflare Workers AI Vision (`@cf/mistralai/mistral-small-3.1-24b-instruct`)** (with automatic fallback to `@cf/google/gemma-3-12b-it` / `@cf/meta/llama-3.2-11b-vision-instruct` and optional Gemini 2.5 Flash Vision).
  - When a user captures a camera photo or selects a slip image on `/submit`, the app automatically:
    1. Verifies the image is unique (SHA-256 + 64-bit Perceptual dHash) and uploads it to Cloudflare R2 (`copper-demerits-slips`).
    2. Detects how many physical slips are in the photo (1 to 4 slips) and extracts all handwritten fields (**Student / Patron Name**, **Date**, **Time**, **Room**, **Total Demerits**, **Itemized Offenses & Categories**, and **Teacher / Staff Signature**).
    3. Automatically runs the AI Referee profanity/auto-blur monitor, merges stats into matching Patron/Staff profiles (or creates an unclaimed Patron profile if new), and saves all extracted slips directly to **Cloudflare D1** — so the user **only has to snap/choose the photo and does not have to type or click anything else**.

## [1.6.3] - 2026-10-18

### Added & Hardened
- **Email or 10-Digit Phone Required When Claiming / Signing Up (`cloudflare/worker.js`, `src/components/ClaimProfileModal.tsx`, `src/context/DemeritsContext.tsx`)**:
  - When claiming an unclaimed name from the board (`action === 'claim'`) or creating a new profile (`action === 'new'`), the user must enter either their **Email Address** OR their **10-Digit Phone Number** (or both) along with their **4–8 digit Bar PIN**.
  - Automatically normalizes and checks uniqueness of email and 10-digit phone numbers across claimed profiles on Cloudflare D1.
- **Returning User Sign-In via Email or Phone + 4–8 Digit PIN (`POST /api/claim-profile`, `POST /api/login`)**:
  - Added a dedicated **`Sign In`** tab (`mode === 'login'`) so returning patrons and staff sign in directly using their **Email Address OR 10-Digit Phone Number + 4–8 Digit Bar PIN** instead of scrolling through a long list of names.
- **Claimed Profiles Hidden from Claimable List (`unclaimedMembers`)**:
  - Added the `is_claimed INTEGER NOT NULL DEFAULT 0` column to `members` on Cloudflare D1 (`copper-demerits-db`), synced claimed rows (`Rick`), and filtered the `Claim Name` list (`unclaimedMembers = members.filter((m) => !m.is_claimed)`) so once a profile is claimed, it never appears in the list of names available to be claimed.

## [1.6.2] - 2026-10-18

### Added
- **Complementary Fan-Site Local SEO & Authority Passing to `copperac.com` (`index.html`, `src/App.tsx`, `public/robots.txt`, `public/sitemap.xml`)**:
  - Replaced `<title>` and `<meta name="description">` in `index.html` to target fan-club companion terms (`"Copper Demerits · Ring of Honor Fan Leaderboard (Marshall, MI)"`) and explicitly direct restaurant/menu searchers to `copperac.com`, preventing any keyword cannibalization against the official bar website.
  - Added Marshall, MI Geo Meta Tags (`geo.region="US-MI"`, `geo.placename="Marshall, Michigan"`, `ICBM`) and Open Graph tags.
  - Added **Schema.org JSON-LD (`@graph`)** declaring `https://copperdemerits.com` as an unofficial fan `WebSite` whose `about` and `mentions` point to **`https://copperac.com`** as the canonical `@type: "BarOrPub"` entity in Marshall, MI (`49068`).
  - Upgraded the footer link in `src/App.tsx` to a clean **dofollow** backlink (`rel="noopener"`) with local anchor text (`"Official Menus, Tap List & Hours: Copper Athletic Club (copperac.com) — Marshall, MI"`), and added `public/robots.txt` and `public/sitemap.xml` (indexing `/` and `/docket`, disallowing `/admin` and `/submit`).

## [1.6.1] - 2026-10-18

### Added & Hardened
- **Frictionless Post-Claim Profile Editing ("My Locker") (`src/components/ClaimProfileModal.tsx`, `src/context/DemeritsContext.tsx`)**:
  - Persisted the active signed-in user's PIN (`activePin`) in session state so immediately after claiming or signing in to their profile, the user can adjust their **display name**, **email address**, **phone number**, **mobile carrier**, **opt-in notification settings**, **friendly bar tagline**, **team emblem**, and **4–8 digit PIN** without having to re-type their PIN, while strictly enforcing our bar-friendly Referee moderation rules.
- **Claimed Profile & Admin-Only Nicknames + Automatic Slip Stat Merging (`cloudflare/worker.js`, `src/context/DemeritsContext.tsx`, `src/components/ClaimProfileModal.tsx`, `src/pages/SubmitSlipPage.tsx`, `src/pages/AdminPage.tsx`)**:
  - Enforced strict RBAC on `POST /api/aliases` and `DELETE /api/aliases/:id` so **only Site Admins/Referees (`Rick`, `Sarah`) or the signed-in Claimed Profile owner** can add or remove nicknames for a profile.
  - Added a **"My Bar Nicknames & Slip Aliases"** self-service manager inside `My Locker` (`ClaimProfileModal.tsx`) and expanded the **Ref Booth Nickname Mapper** (`/admin`) to cover all members (Patrons and Staff).
  - Added automatic slip nickname normalization (`resolvePatronNickname` + `syncSlipsWithAliasesAndNames` in Cloudflare D1) so whenever a slip is written with a linked nickname (e.g., `"Ricky"`, `"Headband Rick"`, `"Big Burt"`, `"Dave"`, `"Boss Lady"`), its demerit points, offenses, and standings automatically merge into the correct profile.

## [1.6.0] - 2026-10-18

### Added & Hardened
- **Roster Cleanup & Removal of Negative Remarks**:
  - Removed `Matt Barnes` and all non-authentic / negative aliases from Cloudflare D1 (`copper-demerits-db`), `cloudflare/worker.js`, `src/lib/defaultData.ts`, `supabase/seed.sql`, and all UI placeholders. Only the 4 authentic members from the uploaded slips (`Rick`, `Burtis`, `Sarah`, `David Lee`) remain in the seeded roster.
- **Real-Time AI Referee Monitor + Automatic Slip Blurring & Admin Override Queue (`src/lib/moderation.ts`, `cloudflare/worker.js`, `src/pages/AdminPage.tsx`)**:
  - Bound **Cloudflare Workers AI (`env.AI` — 100% Free, Zero API Key Required)** + deterministic Referee profanity/slur/insult guardrails (`moderateTextInstant`, `scanWithRefereeMonitor`).
  - **Names, Taglines & Aliases**: Immediately blocks any profane, racist, vulgar, or insulting display names, taglines, or staff aliases with a Referee Whistle warning.
  - **Slip Uploads**: Instead of hard-denying a slip when profanity or name-calling is detected, the system automatically blurs the slip image (`applyRefereeBlurStampToImage` + `is_blurred = true`), censors the text as `[🍻 CENSORED BY REF]`, and sends the slip to the **Referee Override Queue (`status = 'pending'`)** in the Ref Booth (`/admin`) where Site Admin (**Rick**) or Referee (**Sarah**) can **Approve & Unblur (Override)**, **Approve & Keep Blurred**, or **Eject** the slip.
- **Edit Your Own Profile ("My Locker") + 4–8 Digit Bar PINs (`ClaimProfileModal.tsx`)**:
  - Upgraded Bar PINs to support **4 to 8 digits**.
  - Added the **My Locker & Edit Profile** tab (`PATCH /api/my-profile`) so signed-in users can update their Display Name, Jovial Bar Tagline, Favorite Detroit/Michigan Team Badge, and 4–8 digit PIN at any time.
  - Locked the **Ref Booth (`/admin`)** behind `isAdminOrStaff` so only Site Admin (**Rick**, `is_admin = true`) or Bar Referee (**Sarah**, `is_staff = true`) signed in with their PIN can access moderation controls.
- **Zero-Cost, Opt-In Verified Notifications & Strict Privacy Protection**:
  - Stripped all PII (`claimed_by_contact`, `notification_email`, `notification_phone`, `claimed_pin`) from public API responses (`GET /api/bootstrap`).
  - Verified domain **`copperdemerits.com`** on Resend Free Tier (`$0/mo`, `referee@copperdemerits.com`) and added explicit **Opt-In Notification Consent + 6-Digit Verification Code** (`POST /api/notifications/send-code` and `POST /api/notifications/verify-code`) supporting both Email and free Carrier Email-to-SMS Gateways (`@vtext.com`, `@txt.att.net`, `@tmomail.net`, `@email.uscc.net`) with a strict 25/day D1 rate cap.
- **Preset Jovial Bar Reactions & Unofficial Fan Site Disclaimer**:
  - Added 1-tap preset jovial reactions (`🍺 Buy 'Em A Round`, `🦁 Tough Call Ref!`, `🐙 2 Mins in the Box`, `😂 Instant Classic`) on the Wall of Slips (`/docket`) instead of free-text comments.
  - Added a clear **Unofficial Fan Site Disclaimer** across the global footer (`src/App.tsx`), Drop-a-Slip page (`src/pages/SubmitSlipPage.tsx`), and Profile Modal (`src/components/ClaimProfileModal.tsx`) stating that `copperdemerits.com` is an unofficial, patron-run fan site for friendly fun only and is not affiliated with Copper Athletic Club.

## [1.5.0] - 2026-10-18

### Added
- **Full Migration to Native Cloudflare Edge Backend (`Cloudflare D1` + `Cloudflare R2` + `Cloudflare Worker`)**:
  - Provisioned **Cloudflare D1** database `copper-demerits-db` (`feb899d8-606e-4937-91b7-9076e2741961`), **Cloudflare R2** bucket `copper-demerits-slips`, and **Cloudflare Worker** `copper-demerits-api` mapped to custom domain **`https://api.copperdemerits.com`** (and proxied via `/api/*` in `netlify.toml`).
  - Uploaded all 7 authentic slip photos and crops to **Cloudflare R2** (`copper-demerits-slips`) and seeded all 5 members (`Rick`, `Burtis`, `Sarah`, `Matt Barnes`, `David Lee`), 12 staff aliases, and 4 verified slips into **Cloudflare D1**.
  - Removed the temporary `copper_demerits` schema from `Supabase5` (`iqbpnkttwtugxkospdqt`) so `Supabase5` is 100% free of Copper Demerits.
- **Staff & Patron Profile Claiming + Bar Locker Login Gate (`ClaimProfileModal.tsx`)**:
  - Added `POST /api/claim-profile` in the Cloudflare Worker + D1 schema (`is_claimed`, `claimed_pin`, `claimed_by_contact`, `favorite_team`, `tagline`, `submitted_by_member_id`).
  - Added [`src/components/ClaimProfileModal.tsx`](file:///D:/p/copperdemerits/src/components/ClaimProfileModal.tsx) and top-nav / leaderboard `"Claim / Sign In"` buttons so patrons (`Rick`, `Burtis`, `David Lee`, or new patrons) and staff (`Sarah`, `Burtis`, `Matt Barnes`) can claim their profile with a 4-digit Bar PIN and choose their Detroit/Michigan team emblem.
  - Updated **Drop A Slip (`/submit`)** to require an active claimed/signed-in profile before uploading slip photos to Cloudflare R2 & D1.

## [1.4.0] - 2026-10-18

### Added
- **100% Sarah ("The Boss / Boss Lady") Citation Attribution**:
  - Updated Slip #2 (`8:56 PM` Burtis, `+2 Demerits`) and `copper_demerits.staff_aliases` so the cursive signature (`"Sarah (Cursive Signature)"`) maps to **Sarah**, giving Sarah **4-for-4 (100%)** of all issued slips (`"The Boss Lady"`, `"YOUR BOSS!"`, `"Sarah (Cursive Signature)"`, and `"The Boss - AKA Sarah"`).
- **Graphical `copperac.com` + Detroit & Michigan Sports Memorabilia Jumbotron UI**:
  - Integrated official **Copper Athletic Club** photography and branding from `copperac.com` (`CopperLogo_Web.png` Stag emblem, `CAC_Homepage_Wall.jpg` brick memorabilia wall with Red Wings jersey & Lions sign, `CAC_Homepage_About.jpg` Honolulu Blue Lions helmet & copper Moscow Mule mugs backbar, `CAC_Taps_web.jpg` Michigan craft tap handles).
  - Created [`src/components/MichiganSportsGraphics.tsx`](file:///D:/p/copperdemerits/src/components/MichiganSportsGraphics.tsx) featuring animated SVG team emblems for the **Detroit Red Wings** (`Hockeytown Penalty Box`), **Detroit Pistons** (`Bad Boys Technical Foul`), **Detroit Lions** (`Lions Country False Start`), **Detroit Tigers** (`Comerica Party Foul`), and **Michigan Wolverines / Michigan State Spartans** (`UM / MSU Gear Foul`), plus a visual **Copper Moscow Mule Mug Point Meter** (`CopperMugMeter`).
  - Redesigned the Leaderboard (`/`) and Wall of Slips (`/docket`) into a low-text, high-visual animated sports scoreboard with a live scrolling ticker and framed brick-wall slip gallery.

## [1.3.1] - 2026-10-18

### Added
- **Added 4th Authentic Slip (`docs/28318.jpg` — `David Lee`, `6:27 PM`) to `copper_demerits`**:
  - Added patron **David Lee** (`id: 55555555-5555-4555-8555-555555555555`) to `copper_demerits.members`.
  - Added staff signature alias **`"the boss lady"`** → **Sarah** in `copper_demerits.staff_aliases`.
  - Logged **David Lee's `10/17/26` `6:27 PM` (`18:27`) Slip** (`Room: Copper AC`, `Grade: N/A`, `Number of Demerits: 1 - so far`, `Reason: "Back talk, insubordinate"` categorized under `Insubordination / Defiance`, `+1 PT`, Signed `"The Boss Lady"` → `Sarah`).
  - Cropped `public/slips/28318_david_lee_1827.jpg` and uploaded both `28318.jpg` and `28318_david_lee_1827.jpg` to the Supabase `slips` Storage bucket.

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
