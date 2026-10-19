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

## Phase 9: AI Referee Auto-Blur, Zero-Touch Vision OCR Slip Capture, Adaptive Smartphone Image Compression, Profile Editor, Claimed Nickname Stat Merging, Email/Phone Login & Complementary Local SEO (Completed — v1.6.6)
- [x] Purged `Matt Barnes` and all non-authentic / negative aliases from Cloudflare D1, Worker seed data, and UI placeholders.
- [x] Added **Zero-Touch AI Vision Slip OCR (`POST /api/extract-slip` via `@cf/mistralai/mistral-small-3.1-24b-instruct`)** so snapping or choosing a slip photo automatically verifies it is a genuine Demerit Slip, extracts all fields (single or multi-slip), and logs them to Cloudflare R2 & D1 with zero manual typing required.
- [x] Added **Adaptive Smartphone Slip Image Compression (`<82 KB` target, 95%–99% size reduction)** with EXIF/GPS stripping, pre-storage AI slip verification & deduplication (0 R2 bytes for duplicates or non-slip photos), and compressed all 7 existing R2 slip photos from `3.26 MB` down to `387.6 KB` (enabling **150,000+ slip photos** inside Cloudflare R2's $0/month 10 GB free tier).
- [x] Added **Real-Time AI Referee Monitor** (Cloudflare Workers AI `env.AI` + deterministic profanity/slur filter) that blocks offensive names/aliases and **auto-blurs + queues** flagged slip uploads for Site Admin (**Rick**) to review and override in the **Ref Booth (`/admin`)**.
- [x] Added **Self-Service Profile Editing ("My Locker")** with **4–8 digit Bar PINs**, frictionless post-claim editing of display name, email, phone, notification settings, tagline, and team badge, locked `/admin` behind `isAdminOrStaff`, and stripped all PII from public API responses.
- [x] Added **Email or 10-Digit Phone Requirement on Claim/Sign-Up**, **Returning User Email/Phone + PIN Sign-In**, and **Unclaimed-Only Claim List** (hiding already-claimed profiles from the claimable list).
- [x] Added **Claimed Profile & Admin-Only Nicknames (`My Bar Nicknames & Slip Aliases`)** with automatic slip stat merging so slips written with any linked nickname automatically merge their points and offenses into the correct profile.
- [x] Configured DNS-verified **`copperdemerits.com`** on Resend Free Tier (`referee@copperdemerits.com`) with **Opt-In 6-Digit Verified Email & Free Carrier SMS Gateway Notifications** capped at 25/day ($0 cost).
- [x] Added **Preset Jovial Bar Reactions**, **Unofficial Patron-Run Fan Site Disclaimer**, and **Complementary Local SEO (`index.html` JSON-LD `BarOrPub` attribution + dofollow backlink to `copperac.com`)**.

## Phase 10: Granular Notification Matrix, PIN Rate-Limiting Defense & Automated Happy Hour Docket (Completed — v1.6.9)
- [x] Zero-Leak Security Audit: Verified 0 API keys in git history or tracked repository files; all secrets encrypted in Cloudflare Worker environment variables.
- [x] Backend PIN Brute-Force Defense: Added rate-limiting table (`pin_failures`) on Cloudflare D1 with automatic 5-attempt/15-minute lockouts.
- [x] Strict Security Headers: Enforced `nosniff`, `DENY`, and `strict-origin-when-cross-origin` on all API responses.
- [x] Granular Opt-In Notification Triggers (Off by default): Independent 4-way selectors (`[Off] [Email] [Text] [Both]`) for 👑 Crown, 📉 Dethroned, 📋 New Citation, 📢 Ref Whistle, and 🍺 Friday Night Docket.
- [x] Automated Friday 5:00 PM EST Cron: Cloudflare Workers Cron trigger (`0 21 * * 5`) with Ref Booth preview trigger and safety caps.

## Phase 11: Front-Page Leaderboard Showcase & Clean Header UX (Completed — v1.6.10)
- [x] Showcased the Individual Leaderboard directly beneath the Penalty Box header, moving foul categories below player cards.
- [x] Renamed the slip upload button to "Add Your Demerit" with camera icon.
- [x] Streamlined header layout: purged "A sports bar. Not a gym." and "Official bar demerit jumbotron" taglines.
- [x] Removed "Actual Copper AC backbar" tag from Sarah's section.
- [x] Replaced "Oct 17 Game Night" with production period options: All-Time, This Month, This Week, Today, and Custom Dates.

## Phase 12: Prominent Progressive Web App (PWA) Onboarding & Installation Flow (Completed — v1.6.11)
- [x] Prominently display install action across mobile and desktop for all uninstalled patrons (`!isStandalone`).
- [x] Added animated glowing `[Install App]` action in top navigation bar.
- [x] Added dismissible top callout banner with 3-day local storage suppression cooldown.
- [x] Added universal cross-platform PWA installation guide modal (iOS Safari, Android Chrome, Desktop).
- [x] Integrated Chromium native `beforeinstallprompt` and `appinstalled` lifecycle events.

## Phase 13: Pure Leaderboard Ticker & Backbar Easy Share QR Code Experience (Completed — v1.6.12)
- [x] Purged all venue taglines and external cloud references from top scrolling ticker.
- [x] Dynamically compute pure leaderboard ticker updates: leaders, podium, verified demerit points, referee convictions, and recent citations.
- [x] Built client-side offline QR code generator (`/share`) powered by `qrcode` with target switching (`/`, `/submit`, `/docket`).
- [x] Integrated 1-tap Native Web Share, Copy Link, and Save PNG for flyers and social media.
- [x] Implemented printable Tabletop Placard / Backbar Card with `@media print` layout.
- [x] Ubiquitous discoverability: top header `[Share QR]`, desktop/mobile nav (`grid-cols-5`), Scoreboard jumbotron, and footer.

## Phase 14: Header Action Layout Optimization & Cloudflare Copy Elimination (Completed — v1.6.13)
- [x] Replaced header install button with prominent glowing `[Share QR]` button.
- [x] Dedicated top dismissible callout banner as the single clear PWA installation onboarding channel.
- [x] Streamlined desktop header navigation and maintained 5-button mobile bottom bar.
- [x] Completely eliminated Cloudflare references from all public and admin-facing copy.

## Phase 15: iPhone Safe-Zone Header Login Button & Font Legibility Overhaul (Completed — v1.6.14)
- [x] Added CSS safe-area insets (`env(safe-area-inset-top)`, `env(safe-area-inset-right)`, `env(safe-area-inset-left)`) to header container to protect against iPhone notch, Dynamic Island, and status bar touch collision.
- [x] Expanded upper login button and header buttons to Apple HIG 44x44pt minimum touch target standards with `touch-manipulation` and tactile active feedback.
- [x] Replaced narrow condensed headline typography with high-contrast, universally recognizable Apple system / Inter sans-serif typography (`font-sans font-black text-xs sm:text-sm`).
- [x] Enhanced `ClaimProfileModal.tsx` and mobile bottom bar with safe-area bottom padding and 44pt+ touch targets.

## Phase 16: Universal Profile Display Name Prioritization & Slip Attribution Rule (Completed — v1.6.15)
- [x] Standardized all application features to prioritize the patron's chosen profile display name (`patronDisplayName`) over the handwritten slip form text (`raw_student`) whenever a profile exists.
- [x] Updated `PhysicalSlipCard.tsx` to render the profile display name as the primary student name with a secondary `Slip: "${raw_student}"` note.
- [x] Standardized image alt text, card headers, and duplicate messages across `DocketPage.tsx`, `LeaderboardPage.tsx`, `SubmitSlipPage.tsx`, and `DemeritsContext.tsx`.
- [x] Dynamically computed Referee Sarah's sustained citation conviction rate in `Navbar.tsx`.
- [x] Fixed slip attribution for Kristine Boley in live Cloudflare D1 and purged phantom "Josh" member.

## Phase 17: Instant Quick QR Modal & Backbar QR Visibility (Completed — v1.6.16)
- [x] Integrated instant 1-tap Quick QR Modal into header button (`src/components/Navbar.tsx`) with in-memory QR code generation, 1-tap Text/Share sheet, and 1-tap Copy Link.
- [x] Fixed mobile header button label visibility by eliminating non-standard Tailwind breakpoint classes and rendering responsive, high-contrast labels (`[QR Code]` on mobile, `[Share QR]` on desktop).
- [x] Added `Share QR` item to desktop navigation bar.
- [x] Provided instant link to printable tabletop placards and downloadable flyer templates at `/share`.

## Phase 18: Mobile Accessibility & Friendly UX Overhaul (Completed — v1.6.17)
- [x] Prevented iOS Safari auto-zoom by enforcing `text-base sm:text-sm` / `text-base sm:text-xs` (>= 16px) across all inputs, selects, and textareas across all pages and modals.
- [x] Enforced Apple HIG 44×44px minimum touch targets across buttons, filters, date pickers, thumbnails, and modal actions.
- [x] Added global `touch-action: manipulation` across all buttons, inputs, and links to eliminate 300ms mobile tap delay.
- [x] Added tactile depression feedback (`active:scale-95`) across primary interactive elements and navigation pills.
- [x] Re-architected Hero Jumbotron on `LeaderboardPage` into a mobile-first responsive 2×2 grid with full 48px touch CTAs.
- [x] Upgraded secondary text contrast to `#D6C7B8` / `#E8B888` / `#DFC15E` for WCAG AA/AAA compliance.
- [x] Added global `:focus-visible` golden ring indicators and `aria-label` accessibility attributes.
- [x] Added friendly jovial bar copy and empty-state filter reset button.
- [x] Pushed all updates to both `dev` and `main` branches.

## Phase 19: Ref Booth Gating & Role Separation (Completed — v1.6.18)
- [x] Gated "Ref Booth" navigation link in desktop header to authenticated admins and staff (`isAdminOrStaff`).
- [x] Gated "Ref Booth" navigation link in mobile bottom navigation bar to authenticated admins and staff (`isAdminOrStaff`).
- [x] Dynamically switched mobile bottom navigation grid between `grid-cols-4` (public) and `grid-cols-5` (admin) for balanced touch targets.
- [x] Gated pending review alerts on the animated backbar ticker to authenticated staff/admins only.
- [x] Added direct "Ref Booth" navigation link in signed-in active session banner (`ClaimProfileModal.tsx`).
- [x] Added high-contrast "Return to Scoreboard" exit button on `/admin` access-denied lock screen.
- [x] Guarded auto-blurred slip post-submission routing to only redirect to `/admin` if signed in as admin/staff, otherwise gracefully navigating to `/docket`.
- [x] Maintained strict zero Netlify production deployments.
