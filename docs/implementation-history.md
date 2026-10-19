# Implementation History — Copper Demerits (`copperdemerits.com`)

Chronological log of architectural decisions, database migrations, and infrastructure deployments.

## 2026-10-18 — v1.6.17 Mobile Accessibility & Friendly UX Overhaul
- **iOS Safari Auto-Zoom Eradication (Apple HIG / WCAG Standards)**:
  - Systematically audited and converted all inputs, selects, and textareas across `LeaderboardPage`, `DocketPage`, `SubmitSlipPage`, `ClaimProfileModal`, and `AdminPage` to `text-base sm:text-sm` or `text-base sm:text-xs` (>= 16px font-size on mobile viewports).
  - Eliminates automatic iOS Safari viewport zooming on input focus, preserving seamless orientation and layout on iPhone and iPad devices.
- **Apple HIG 44×44px Touch Targets & 300ms Mobile Delay Elimination**:
  - Enforced minimum 44px tap target heights (`min-h-[44px]`) on buttons, filter tabs, date pickers, thumbnail inspectors, and reaction toggles.
  - Added global `touch-action: manipulation` across `button, a, input, select, textarea` to eliminate mobile browser 300ms double-tap delay.
  - Added tactile depression feedback (`active:scale-95`) across primary interactive buttons, reaction chips, modal dismiss triggers, and navigation tabs.
- **Responsive Sports Bar Hero Jumbotron**:
  - Converted the Hero Jumbotron scoreboard on `LeaderboardPage` from a cramped horizontal row into a mobile-first 2×2 grid layout on screens < 640px, giving scores prominent focus and dedicating full 48px thumb buttons to `[ADD DEMERIT]` and `[SHARE QR]`.
  - Added horizontally scrollable period selectors with `.no-scrollbar` styling and full 44px touch targets.
- **Enhanced Visual Accessibility & Text Contrast**:
  - Elevated secondary text contrast from low-contrast brown `#8E8074` to WCAG AA/AAA compliant `#D6C7B8`, `#E8B888`, and `#DFC15E`.
  - Added global `:focus-visible` golden ring indicators (`2px solid #DFC15E`, offset `2px`) for keyboard and assistive tech accessibility.
  - Added explicit `aria-label` attributes to icon-only buttons, reaction chips, slip thumbnails, and modal close buttons.
- **Friendly Jovial Sports Bar Polish**:
  - Added friendly pro-tips and empty-state handling with 1-tap "Clear Search Filter" button in `DocketPage`.
  - Added safe-area padding for mobile modals (`SlipModalViewer`, `ClaimProfileModal`) and navigation footer links.

---

## 2026-10-18 — v1.6.16 Instant Quick QR Modal & Backbar QR Visibility
- **Instant Quick QR Modal (`src/components/Navbar.tsx`)**:
  - Integrated `qrcode` dynamically inside the sticky navigation header so tapping **`[QR Code]`** or **`[Share QR]`** immediately displays an instant, full-screen high-contrast modal.
  - Generates the live `copperdemerits.com` QR code in-memory on mount with high error correction, Copper Athletic Club logo, and backbar theme styling.
  - Included 1-tap **"Text / Share"** native share sheet integration (`navigator.share`) and 1-tap **"Copy Link"** with visual clipboard confirmation.
  - Included direct link to the dedicated printable tabletop placards and downloadable print-ready flyer page at `/share`.
- **Header Button Visibility Fix for All Screen Widths**:
  - Fixed issue where the header button label was invisible on some viewports due to unsupported Tailwind `xs:` breakpoint classes.
  - Standardized responsive markup: `<span className="hidden sm:inline font-bold">Share QR</span><span className="sm:hidden font-extrabold">QR Code</span>`.
  - Added golden glow, amber border, and high-visibility font styling so mobile users immediately spot the button next to the Ref Booth / Login button.
  - Added `Share QR` to desktop navigation bar items for rapid discovery on laptop and tablet screens.

---

## 2026-10-18 — v1.6.15 Profile Display Name Prioritization & Slip Attribution Rule
- **Universal Chosen Display Name Priority Across All Features**:
  - Implemented the core rule: All features must display the user's chosen profile display name (`patronDisplayName`) over the raw handwritten name on the physical demerit form (`raw_student`) whenever a profile exists.
  - **`PhysicalSlipCard.tsx`**: Renders `slip.patronDisplayName` as the primary student name in authentic sports-docket styling. If `slip.raw_student` differs (e.g. `Kristi` on the paper slip vs. `Kristine Boley` on her profile), a secondary badge displays `Slip: "Kristi"`.
  - **`DocketPage.tsx` & `LeaderboardPage.tsx`**: Updated slip alt text, titles, and headers to prioritize `patronDisplayName`.
  - **`SubmitSlipPage.tsx`**: Auto-logged citation cards and duplicate alerts display the profile display name as the primary headline with secondary notes for raw slip text.
  - **`Navbar.tsx`**: Upgraded Head Referee Sarah's sustained citation rate to dynamically compute based on live database slips (`${approvedSlips.length}-FOR-${approvedSlips.length}`).
  - **`cloudflare/worker.js`**: Standardized Ref Booth override email and SMS notifications to prioritize `patronRow.display_name`.

---

## 2026-10-18 — v1.6.14 iPhone Safe-Zone Header Login Button & Font Legibility Overhaul
- **iOS Safe-Zone Padding on Sticky Header (`src/components/Navbar.tsx`)**:
  - Implemented `pt-[env(safe-area-inset-top,0px)] pr-[env(safe-area-inset-right,0px)] pl-[env(safe-area-inset-left,0px)]` on the sticky top header.
  - Fixes iOS Safari collision where taps near the top right collided with the iPhone status bar or Dynamic Island, triggering Safari's "tap status bar to scroll to top" instead of opening the profile modal.
- **Apple Human Interface Guideline (HIG) 44x44pt Touch Targets (`src/components/Navbar.tsx`, `src/components/ClaimProfileModal.tsx`)**:
  - Upgraded upper login button to `min-h-[44px]` with `px-3.5 sm:px-4 py-2`, `touch-manipulation` (zero tap lag), and `active:scale-95` tactile depression.
  - Added safe area padding to bottom navigation bar (`pb-[env(safe-area-inset-bottom,0px)]`), modal backdrop (`pt-[env(safe-area-inset-top,12px)] pb-[env(safe-area-inset-bottom,12px)]`), and expanded touch targets on modal close (`min-h-[44px] min-w-[44px]`), mode tabs (`min-h-[44px]`), and submit buttons (`min-h-[48px]`).
- **Font Recognition & Contrast Enhancement (`src/index.css`, `src/components/Navbar.tsx`, `src/components/ClaimProfileModal.tsx`)**:
  - Replaced narrow condensed headline fonts (`font-athletic` / `Oswald`) on compact action buttons with Apple system / Inter sans-serif typography (`font-sans font-black text-xs sm:text-sm tracking-tight`).
  - Added ultra-legible gold gradient styling (`bg-gradient-to-r from-[#DFC15E] via-[#E8B888] to-[#DFC15E] text-[#121212]`) when signed out, and clean emerald badge when signed in.
  - Configured system font smoothing (`-webkit-font-smoothing: antialiased`) and disabled tap highlight flicker (`-webkit-tap-highlight-color: transparent`) in global CSS.

---

## 2026-10-18 — v1.6.13 Header Share QR Prominence & Page Copy Cloudflare Purge
- **Header Action Share QR Placement (`src/components/Navbar.tsx`)**:
  - Replaced the redundant install button in the top action row with the prominent glowing `[Share QR]` button, keeping the dismissible backbar banner below as the primary install onboarding mechanism.
  - Streamlined desktop navigation to 4 items and mobile bottom bar to 5 items (`Scoreboard`, `Wall of Slips`, `Drop Slip`, `Share QR`, `Ref Booth`).
- **Complete Elimination of Cloudflare References from User-Facing Copies (`src/pages/AdminPage.tsx`)**:
  - Replaced the Ref Booth database status badge (`Cloudflare D1 + R2 + Workers AI Live` → `Cloud Database & AI Live`).
  - Confirmed 0 user-facing or admin-facing copies mention Cloudflare anywhere in the application.

---

## 2026-10-18 — v1.6.12 Pure Leaderboard Ticker Updates & Easy Share Backbar QR Code Page
- **Pure Leaderboard Ticker Updates (`src/components/Navbar.tsx`)**:
  - Removed all venue references ("Copper Athletic Club • Marshall, MI", "A sports bar. Not a gym.") and confirmed zero Cloudflare mentions.
  - Dynamically computes pure leaderboard statistics: current co-leaders/leaders, podium standings, total demerit points across verified slips, Referee Sarah's 100% conviction rate, itemized citation highlights with infractions and times, and active Ref Booth alerts.
- **Dedicated Backbar Easy Share & QR Code Page (`src/pages/SharePage.tsx`, `/share`)**:
  - Built an offline, client-side QR Code generator powered by `qrcode` with high error correction (`H`), crisp styling, and dynamic destination switching (`/`, `/submit`, `/docket`).
  - Integrated 1-tap **Share via Text / Message** (`navigator.share`), instant **Copy Link**, and **Save QR Image (.PNG)**.
  - Added **Print Tabletop Placard / Backbar Card** (`window.print()` with `@media print` layout).
- **Ubiquitous App Discoverability (`src/components/Navbar.tsx`, `src/pages/LeaderboardPage.tsx`, `src/App.tsx`)**:
  - Added sticky header **`[Share QR]`** action, added `/share` to desktop and mobile navigation (`grid-cols-5`), added `SHARE QR` to the Jumbotron counter, and added footer link.

---

## 2026-10-18 — v1.6.11 Prominent PWA Install Callout, Header Action & Universal Installation Guide
- **Prominent PWA Installation Callout & Header Button (`src/components/Navbar.tsx`)**:
  - Made the Progressive Web App install action prominently visible across both mobile and desktop screens whenever a patron has not installed it (`!isStandalone`).
  - Added an animated glowing `[Install App]` button in the top navigation bar.
  - Added a dismissible header callout banner that stays suppressed for 3 days once dismissed.
- **Cross-Platform PWA Installation Guide Modal (`src/components/Navbar.tsx`)**:
  - Implemented an illustrated guide modal providing exact step-by-step instructions tailored for iOS Safari (Share → Add to Home Screen), Android Chrome (⋮ → Install app), and Desktop browsers (⊕ in address bar).
  - Handles Chromium `beforeinstallprompt` natively with immediate 1-tap installation and synchronizes standalone state via `appinstalled`.

---

## 2026-10-18 — v1.6.10 Individual Leaderboard Showcase, Clean Header & "Add Your Demerit" Action
- **Showcase Individual Leaderboard at the Top (`src/pages/LeaderboardPage.tsx`)**:
  - Reordered home page layout to present the **Individual Leaderboard (`RING OF HONOR STANDINGS`)** immediately below the Penalty Box header, moving the 5-team foul categories below the player cards.
- **Header Clean-Up & CTA Redesign (`src/pages/LeaderboardPage.tsx`)**:
  - Changed upload button from `"DROP SLIP"` to **`"ADD YOUR DEMERIT"`** with prominent athletic styling.
  - Removed `"A SPORTS BAR. NOT A GYM. • MARSHALL, MI"` badge and `"Official Bar Demerit Jumbotron · Lions · Red Wings · Pistons · Tigers · UM · MSU"` subtitle to eliminate visual clutter.
  - Removed `"🦁 ACTUAL COPPER AC BACKBAR • MARSHALL, MI"` overlay tag from Sarah's spotlight section.
- **Season / Period Selectors Modernization (`src/pages/LeaderboardPage.tsx`, `src/types/demerits.ts`, `src/context/DemeritsContext.tsx`)**:
  - Removed the development session pill `"Oct 17 Game Night"`, adding `'today'` support alongside `'all-time'`, `'this-month'`, `'this-week'`, and `'custom'`.
  - Replaced fallback `'OCT 17'` with dynamic dates on physical slip thumbnail cards.

---

## 2026-10-18 — v1.6.9 Granular Opt-In Notification Channels, PIN Brute-Force Rate Limiting & Happy Hour Docket
- **Security Audit & Backend Hardening (`cloudflare/worker.js`, `cloudflare/migration_preferences.sql`)**:
  - Full audit confirmed 0 leaked keys or private tokens in git history or tracked repository files; all secrets are securely encrypted in Cloudflare Worker environment variables.
  - Implemented PIN rate-limiting in Cloudflare D1 (`pin_failures` table): locks out unauthorized PIN attempts after 5 failures in 15 minutes.
  - Enforced strict HTTP security response headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) and guaranteed 100% PII stripping on all public endpoints.
- **Granular Opt-In Notification Matrix (`src/components/ClaimProfileModal.tsx`, `src/types/demerits.ts`, `cloudflare/worker.js`)**:
  - Added independent 4-way selectors (`[Off] [Email] [Text] [Both]`) for 5 events:
    1) 👑 Leaderboard Crown (#1 rank takeover)
    2) 📉 Leaderboard Dethroned (#1 rank loss)
    3) 📋 New Citation (Slip logged against patron or linked nickname)
    4) 📢 Ref Whistle Override (Official review decision)
    5) 🍺 Friday Night Docket (Weekly 5:00 PM EST happy hour digest)
  - Configured Cloudflare Workers Cron trigger (`0 21 * * 5`) to automate weekly digests, with antispam rate caps (25/day site-wide, 15m/5m cooldowns).
  - Added Ref Booth test dispatch button in `src/pages/AdminPage.tsx`.

---

## 2026-10-18 — v1.6.8 Full Domain Verification & noreply@copperdemerits.com Live on Resend-Ninjas
- Successfully verified `copperdemerits.com` directly in user's Resend-Ninjas account (`fe85e77d-54c0-4f74-bc7f-9dd968e94472`), cleaned Cloudflare DNS records, and switched sender to `Copper Demerits <noreply@copperdemerits.com>` with `reply_to: info@drit.ninja`.

---

## 2026-10-18 — v1.6.7 Resend Decoupling, drit.ninja Migration & Discreet Footer Branding
- Decoupled `copperdemerits.com` from `Resend-Agency`, linked to `DR IT - The IT Ninjas` (`https://drit.ninja`) in website footer, removed Cloudflare marketing references, and routed inquiries to `info@drit.ninja`.

---

## 2026-10-18 — v1.6.6 Pre-Storage AI Vision Demerit Slip Verification (Reduce Size -> Verify Slip -> Store in R2)
- **Pre-Storage AI Vision Slip Verification (`cloudflare/worker.js`, `src/lib/moderation.ts`, `src/pages/SubmitSlipPage.tsx`)**:
  - Updated `extractSlipsFromImageWithAI` in `cloudflare/worker.js` to verify `is_demerit_slip: boolean` and return `{ ok: false, isDemeritSlip: false, error: ... }` if an uploaded photo does not contain a physical Demerit Slip.
  - Reordered `handleFileChange` in `src/pages/SubmitSlipPage.tsx` so any size smartphone photo is reduced in-browser (`< 82 KB`), checked for duplicates, and verified as a genuine Demerit Slip by AI Vision **before** calling `uploadCompressedSlipToR2`, guaranteeing that non-slip photos consume `0 bytes` in Cloudflare R2.

---

## 2026-10-18 — v1.6.5 Adaptive Smartphone Slip Image Compression (<82 KB Target) & Zero-Waste Cloudflare R2 Storage Optimization
- **Adaptive Client-Side Slip Image Compressor (`src/lib/imageDedup.ts`, `src/lib/supabase.ts`)**:
  - Upgraded `fingerprintImageFile` to compute raw SHA-256 and 4-rotation 64-bit Perceptual dHash on the original file, then downscale smartphone camera photos to max `960px` on the longest edge with bicubic smoothing (stripping all EXIF/GPS metadata) and step through an adaptive quality loop (`0.74 -> 0.66 -> 0.58 -> 0.52`) so uploaded slip images consistently land between **35 KB and 82 KB** (95%–99% smaller than 4MB–12MB smartphone photos) while keeping handwriting sharp for Vision AI OCR.
- **Pre-Upload Deduplication, R2 Blurred Image Storage & Existing Asset Optimization (`src/pages/SubmitSlipPage.tsx`, `cloudflare/worker.js`)**:
  - Updated `handleFileChange` to verify `checkImageDuplicate(fingerprint)` **before** calling `uploadCompressedSlipToR2`, ensuring duplicate photos consume `0 bytes` in Cloudflare R2.
  - Updated `persistSlipDrafts` to upload Referee-blurred images to R2 (`_blurred_${i}.jpg`) instead of storing base64 strings in D1, and added a `350 KB` max payload guard on `PUT /api/slips/:filename` in `cloudflare/worker.js` (Worker Version `e1b8dd62-0327-4523-9a0a-70d22449c955`).
  - Optimized all 7 existing slip images in `public/slips/` and re-uploaded them to Cloudflare R2 `copper-demerits-slips`, reducing existing storage from `3,263.0 KB` (`3.26 MB`) to `387.6 KB` (`88.1%` reduction) and preserving both raw and optimized SHA-256 digests in `KNOWN_UPLOADED_FILE_HASHES`.

---

## 2026-10-18 — v1.6.4 Zero-Touch AI Vision Slip Extraction & Automatic Logging on Image Capture
- **Cloudflare Workers AI Vision OCR Endpoint (`POST /api/extract-slip` in `cloudflare/worker.js`)**:
  - Added `extractSlipsFromImageWithAI` using Cloudflare Workers AI Vision (`@cf/mistralai/mistral-small-3.1-24b-instruct`, `@cf/google/gemma-3-12b-it`, `@cf/meta/llama-3.2-11b-vision-instruct`) seeded with the live `members` and `staff_aliases` roster hints.
  - Verified live against both single-slip photos (`28318_david_lee_1827.jpg`, `Scan_20261017_212309.jpg`) and the 3-slip bar photo (`20261017_211324.jpg`), accurately extracting all 3 slips, patron names, timestamps, rooms, offense descriptions, categories, points, and signatures in a single pass.
  - Updated `POST /api/demerits` to automatically create an unclaimed Patron profile in D1 whenever a clean slip cites a brand-new patron name.
- **Zero-Touch Image Capture Workflow (`src/pages/SubmitSlipPage.tsx`, `src/lib/moderation.ts`)**:
  - Updated `handleFileChange` on `/submit` so snapping or selecting a photo automatically verifies uniqueness, uploads to R2, extracts all slip fields via `/api/extract-slip`, runs AI Referee moderation, saves all extracted slips to Cloudflare D1, and renders a **Zero-Touch AI Slip Receipt** without requiring any manual typing or second button press.

---

## 2026-10-18 — v1.6.3 Email or Phone Required to Claim/Sign Up, Returning Email/Phone + PIN Login & Unclaimed-Only Claim List
- **Cloudflare D1 Schema & Worker Auth Upgrade (`cloudflare/worker.js` Version `3a8003ff-8410-4378-b402-dbdc2e6059ab`)**:
  - Added `is_claimed INTEGER NOT NULL DEFAULT 0` to `members` on remote D1 (`copper-demerits-db`) and updated `formatPublicMember` so `is_claimed` is `true` whenever `row.is_claimed` or `row.claimed_pin` is set.
  - Updated `POST /api/claim-profile` (and `POST /api/login`) to support `action === 'login'` (looking up claimed profiles by normalized email or 10-digit phone + verifying 4–8 digit PIN) and `action === 'claim' | 'new'` (requiring at least one valid email or 10-digit phone + 4–8 digit PIN, blocking re-claiming of already-claimed profiles, and preventing duplicate email/phone claims).
- **Frontend Sign-In & Unclaimed-Only Claim Modal (`src/components/ClaimProfileModal.tsx`)**:
  - Split signed-out tabs into **`Sign In`** (Email or 10-Digit Phone + PIN), **`Claim Name (${unclaimedMembers.length})`** (showing only `!m.is_claimed` profiles with a search filter), and **`New Profile`**.

---

## 2026-10-18 — v1.6.2 Complementary Fan-Site Local SEO & Authority Passing to `copperac.com`
- Updated `index.html` `<title>`, `<meta name="description">`, Marshall MI `geo.*` tags, and Schema.org JSON-LD `@graph` so `https://copperdemerits.com` ranks for companion fan queries (`Copper Demerits`, `Ring of Honor leaderboard`) while attributing the canonical `@type: "BarOrPub"` LocalBusiness entity to `https://copperac.com/`.
- Updated `src/App.tsx` footer link to a clean dofollow backlink (`rel="noopener"`) passing local anchor text authority to `https://copperac.com`, and added `public/robots.txt` and `public/sitemap.xml` (indexing `/` and `/docket` while disallowing `/admin` and `/submit`).

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
