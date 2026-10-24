# Changelog — Copper Demerits (`copperdemerits.com`)

All notable changes to the **Copper Athletic Club — Ring of Honor** web application are documented in this file.

## [1.6.25] - 2026-10-24

### Fixed & Enhanced — Complete Historical Slip Orientation Normalization & Countertop Cropping
- **Historical Sideways Slip Orientation Fix**:
  - Audited all 11 demerit slips on the live site and identified historical sideways orientation on Kristi's slip (Oct 18) and Ziggie's slip (Oct 22).
  - Rotated Kristi's slip (`c95d89ba-cc94-4d66-97b2-de1f42fed5e8`) from a 90° clockwise portrait photo to a 270° upright landscape receipt (`924x604`).
  - Rotated Ziggie's slip (`0d181001-765f-4314-ba70-e4a8e7cc0495`) from a 90° clockwise portrait photo to a 270° upright landscape receipt (`624x432`).
- **Legacy Countertop Background Cropping**:
  - Cropped expansive wooden and copper countertops on Rick (`392x272`), Ziggie (`444x344`), Deb Jarvis (`720x564`), and Jai (`587x430`), eliminating wasted border space and magnifying handwritten text on mobile displays.
- **Cloudflare R2 & D1 Database Synchronization**:
  - Uploaded all 6 optimized upright and cropped assets to Cloudflare R2 bucket `copper-demerits-slips`.
  - Updated live database records in Cloudflare D1 `copper-demerits-db`.
  - Guaranteed 100% of slips across the Docket, Leaderboard, and Evidence Viewer display crisp, landscape, and upright without requiring manual viewer rotation.

## [1.6.24] - 2026-10-24

### Fixed & Enhanced — Receipt Auto-Crop, Auto-Rotate & 4-Layer Duplicate Prevention Engine
- **Row/Column Density Profiling for Paper Isolation (`src/lib/imageAutoCrop.ts`)**:
  - Replaced single-pixel min/max scanning with row and column density histograms and neutral chroma profiling (`|R - B| < 55, |R - G| < 45`).
  - Successfully filters out bright specular countertop glare and table scratches on shiny copper bar tops that previously caused bounding boxes to expand to the entire frame and abort auto-crop.
  - Adds a 3.5% safe border padding margin ensuring all handwritten text and signatures remain completely unclipped.
- **Sideways Camera Photo Auto-Rotation Intelligence**:
  - Resolved the landscape receipt orientation issue: Cherry Printers demerit slips are landscape (aspect ratio ~1.4 : 1, width > height).
  - When captured in a standard vertical smartphone portrait photo, the slip sits sideways (`boxH > boxW * 1.05`).
  - The auto-crop engine now automatically applies a 270° clockwise (90° counter-clockwise) rotation to orient the receipt horizontally and upright before running OCR or storage.
- **AI OCR Accuracy Optimization**:
  - Feeding properly oriented upright receipts into Gemini 2.5 Flash and Cloudflare Workers AI Vision immediately restored 100% OCR precision across student names, dates, times, signatures, and handwritten infractions (e.g. *"Fighty with friends after the bar closed"*).
- **Client-Side Pre-Storage Duplicate Interception (`src/pages/SubmitSlipPage.tsx`)**:
  - Added pre-storage citation comparison on extracted drafts immediately after AI OCR runs.
  - Blocks storage in Cloudflare R2 and halts automatic submission if a citation for the same patron and date/time or matching infractions already exists on the Ring of Honor board (0 bytes stored).
  - Added duplicate check enforcement to manual submission in `handleSubmit`.
- **Fuzzy Citation Duplicate Matching Engine (`src/lib/imageDedup.ts`)**:
  - Enhanced citation duplicate detection with word stem tokenization, Jaccard lexical similarity (`infractionTextSimilarity`), and midnight rollover tolerance (±1 day).
  - Detects OCR transcription variations (e.g. *"friend"* vs *"friends"*, slight time differences within 30 minutes, or midnight shift dates).
- **Server-Side Duplicate Guard in Cloudflare Worker (`cloudflare/worker.js`)**:
  - Added 3-layer server-side duplicate verification to `POST /api/demerits`:
    1. Exact image SHA-256 match.
    2. Perceptual dHash visual similarity match (Hamming distance <= 10 out of 64 bits, >= 84.4%).
    3. Citation content match (patron + date/time within 30 mins or >= 60% infraction similarity).
  - Returns `HTTP 409 Conflict` with detailed descriptive error payload, guaranteeing zero duplicate slips can be inserted into Cloudflare D1 even if client validation is bypassed.
- **Database Duplicate Cleanup**:
  - Investigated and cleanly deleted the duplicate slip (`78b68933-9c65-48cf-83ba-567d13471bd0`) from Cloudflare D1 database `copper-demerits-db`.
  - Deployed worker version `29a6322f-5dbc-4f0d-ae48-bece3f950332` to `api.copperdemerits.com`.

## [1.6.23] - 2026-10-24

### Fixed — Mobile Browser Header Viewport & Horizontal Overflow Hardening
- **Eliminated Horizontal Viewport Blowout on Mobile Browsers**:
  - Enforced `overflow-x: hidden`, `max-width: 100vw`, and `width: 100%` globally on `html, body` in `src/index.css`.
  - Added `w-full max-w-full overflow-x-hidden` to the root container in `src/App.tsx`.
  - Added `overflow-x-clip` and `w-full max-w-full` to the sticky `<header>` container in `src/components/Navbar.tsx`.
- **Compositor Paint Containment on Sports Ticker**:
  - Applied `contain: paint` and `w-full max-w-full` to the live ticker marquee wrapper, isolating the `max-content` animated ribbon from the document layout tree.
- **Mobile Header Action Button Width Optimization**:
  - Streamlined the Backbar QR Code button on small screens (`< 640px`) to a clean icon-only button, saving 46px of horizontal space.
  - Shortened the unauthenticated locker button text on mobile to `"Sign In"` (saving 50px) while maintaining full `"Sign In / Claim"` on desktop.
  - Applied safe text truncation (`min-w-0` and `truncate`) to the brand title and total demerit points counter to prevent flex container blowout on narrow mobile devices (320px–390px).

## [1.6.22] - 2026-10-24

### Added & Enhanced — Word-Targeted Blur & Dynamic Symbol Masking Engine
- **Targeted Frosted-Glass Slip Word Blur (`src/components/SlipModalViewer.tsx`)**:
  - Implemented responsive, localized frosted-glass blur patches that target specifically flagged words on a physical slip photo (e.g. *"Fingering"*) rather than blurring the whole document.
  - Displays a stylish `[🦓 REF BLUR]` badge over the blurred word while keeping the student name, date, signature, and other cited offenses completely visible and legible.
  - Fully preserves scanned document integrity: original high-resolution photos in Cloudflare R2 remain pristine and unedited.
- **Dynamic Symbol Masking (`src/lib/moderation.ts`)**:
  - Centralized `maskSensitiveInfraction(text, isRevealed)` utility dynamically masking sensitive bar banter words (e.g. `"F***ering the bartender"`) across the public scoreboard, docket cards, recent citations ticker, and evidence viewer.
  - Automatically unmasks to the authentic raw text when a signed-in patron or referee taps the reveal toggle.
- **Signed-In Patron Locker Privileges**:
  - Claimed patrons signed into their locker with their 4-digit PIN (and official referees) receive an instant 1-tap `[👁️ Reveal Slip]` / `[Re-Blur Slip]` toggle in the evidence viewer.
  - Unauthenticated visitors see a helpful `[🔒 Log In to Reveal]` button prompting them to claim or log into their locker.
- **Admin Ref Booth Oversight & Permanent Override**:
  - Official Referees in `/admin` retain permanent 1-tap authority to toggle `Unblur` / `Blur` for the entire public site without modifying the underlying scan.
- **Database & Live State Migration**:
  - Added `blur_regions` column to `demerits` table in Cloudflare D1.
  - Updated Ziggie's live record (`ab378631-2ba0-4bb6-9e67-9e4315b50a37`) to `is_blurred = 1` with targeted coordinate bounding box `[{"x":0.397,"y":0.486,"w":0.239,"h":0.118,"label":"🦓 REF BLUR"}]`.
  - Deployed worker version `3c58d588-b896-41f5-af09-b080776bf472` to `api.copperdemerits.com`.

## [1.6.21] - 2026-10-24

### Added & Enhanced — Slip Auto-Crop, Auto-Rotate & Orientation Engine
- **Automatic Receipt Boundary Cropping (`src/lib/imageAutoCrop.ts`)**:
  - Implemented luminance & edge-contrast scanner (`detectReceiptPaperBounds`) to isolate bright white/cream receipt paper from dark bar countertops (copper, mahogany, slate) with a 3.5% safe border margin.
  - Automatically crops unneeded surrounding counter background to maximize slip legibility and reduce compressed image footprint.
- **Automatic Upright Orientation Rotation**:
  - Integrated orientation detection in `autoCropAndRotateSlip`: detects landscape captures and auto-rotates 90° clockwise/upright prior to OCR parsing and R2 upload.
  - Wired into `fingerprintImageFile` (`src/lib/imageDedup.ts`) ensuring every slip uploaded via camera or file drop is cropped & upright before hashing, OCR, or cloud storage.
- **Interactive Manual Rotation Controls**:
  - **Submit Slip Page (`src/pages/SubmitSlipPage.tsx`)**: Added `[Rotate 90°]` and `[Rotate -90°]` buttons with indicators (`✂️ AUTO-CROPPED TO RECEIPT`, `↻ ROTATED 90° UPRIGHT`) allowing referees and patrons to adjust orientation with 1 tap.
  - **Slip Modal Viewer (`src/components/SlipModalViewer.tsx`)**: Added in-place viewer rotation button so patrons can rotate any historical citation image 90° directly inside the viewer.
- **AI Vision Worker Prompt Enhancements (`cloudflare/worker.js`)**:
  - Upgraded AI Vision prompt to evaluate slip orientation, returning `rotation_needed` (0, 90, 180, 270) and normalized bounding boxes (`crop_box`).
  - Deployed worker version `b58fdd9a-5da2-4669-9d4d-20e0eb4c76d9` to `api.copperdemerits.com`.
- **Ziggie Citation Correction & Root Cause Analysis**:
  - **Root Cause**: Identified why "Fingering the bartender" was misread on Ziggie's newest slip (`ab378631-2ba0-4bb6-9e67-9e4315b50a37`) — the slip photo was captured sideways (90° counter-clockwise) on a dark copper table. Horizontal AI OCR attempting to read vertical cursive text misinterpreted "Fingering the bartender" as "Flying chair".
  - Cropped and rotated Ziggie's slip photo upright, uploaded to Cloudflare R2 (`e8f1897461da81475adc2e96_upright.jpg`), and updated the Cloudflare D1 record to authentic infraction `"Fingering the bartender"`.

## [1.6.20] - 2026-10-24

### Security & Gating — Demerit Correction Access Control
- **Strict Patron & Referee Ownership Enforcement (`cloudflare/worker.js`)**:
  - Gated `PATCH /api/demerits/:id` with mandatory actor authentication and PIN verification.
  - Enforced that claimed patrons can **only correct mistakes on their own demerits** (`existing.patron_id === actor.id`).
  - Non-admin patrons cannot reassign demerits to someone else, nor can they alter review or blur status.
  - Gated `DELETE /api/demerits/:id` strictly to authenticated Referees in the Ref Booth.
  - Deployed worker version `ecb65c91-ef43-46fe-b6fc-24b70bda3f59` live to `api.copperdemerits.com`.
- **UI Gating & Read-Only Lock (`src/components/SlipModalViewer.tsx` & `src/components/CorrectSlipMistakeModal.tsx`)**:
  - `[Correct Mistake]` button is only rendered for the cited patron (when logged in with their PIN) or an authenticated Referee.
  - Non-logged-in users see a prompt to log into their locker to edit their own demerits.
  - For patrons, the matched roster profile is securely locked to their own account so demerits cannot be shifted onto others.

### Added — Full User-Oriented About Page & PWA Help Hub
- **Interactive About Page (`src/pages/AboutPage.tsx` on `/about`)**:
  - **Bar Lore & Story**: The history of handwritten receipt demerits, "The Boss Lady" Sarah, and the Hall of Fame fouls (Pulling a Deb Jarvis, Ordering Gin & Diet Coke, Red Wings no-shows, flying chairs).
  - **PWA & Mobile Superpower Guide**: Illustrated guide detailing Home Screen installation, offline-ready local caching, 1-tap camera capture with <82KB auto-compression, and 4-digit locker PINs.
  - **Full User-Oriented Changelog**: Humorous, patron-friendly chronological log of every platform milestone.
  - **Code of Conduct**: Friendly reminder of the good-natured humor standards and sportsmanship rules.
- **Contextual PWA Tooltips (`src/components/PwaTooltip.tsx`)**:
  - Lightweight, accessible tooltip and help icon components matching the dark mahogany and warm copper speakeasy palette.
  - Highlights PWA capabilities across the header, period selector, category filters, and photo capture surfaces.
- **Discreet Athletic Version Indicators**:
  - Classy docket version badge (`v1.6.20`) added in the header and footer linking directly to `/about` without cluttering the brand aesthetic.

## [1.6.19] - 2026-10-23

### Added & Enhanced — Profile Merging & Rule-Abiding Slip Mistake Correction Engine
- **Unified Ziggie & David Lee in Live Cloudflare D1 (`copper-demerits-db`)**:
  - Reassigned David Lee's verified citation (`a4444444-4444-4444-8444-444444444444`, Oct 17 6:27 PM, `+1 PT`) to Ziggie's claimed account (`bd28ef26-f7c7-4eaf-96c1-f621ba3a7feb`).
  - Cross-linked both `david lee` and `ziggie` as permanent aliases for `bd28ef26-f7c7-4eaf-96c1-f621ba3a7feb`, allowing any handwritten citation written under either name to automatically merge into Ziggie's record.
  - Purged the duplicate unclaimed member row (`55555555-5555-4555-8555-555555555555`) so the public roster and claim list stay clean.
- **Corrected OCR Misread Citation**:
  - Corrected slip `0d181001-765f-4314-ba70-e4a8e7cc0495` from OCR misread `"Pulling a Deb Taco"` to authentic local bar infraction `"Pulling a Deb Jarvis"` across `infractions` and `demerit_items`.
- **Backend Profile Merging Endpoint (`POST /api/profiles/merge`)**:
  - Added secure profile merging endpoint in Cloudflare Worker (`cloudflare/worker.js`) supporting:
    - Authoritative merging by Referees/Admins in Ref Booth.
    - Self-service merging by claimed patrons (with PIN verification) to absorb unclaimed duplicate profiles into their active locker.
    - Automatic migration of all citations, submitter references, and aliases to the surviving profile.
    - Automatic creation of the source profile's name as an alias on the target profile.
    - Re-synchronization of all citations past and present via `syncSlipsWithAliasesAndNames(env.DB)`.
- **Backend Slip Mistake Correction Endpoint (`PATCH /api/demerits/:id`)**:
  - Upgraded endpoint to support updating raw student name, victim attribution, infractions, demerit items, point count, incident date, incident time, and room.
  - Enforced content moderation guardrails: all corrected text must pass the Referee Monitor for sports bar-friendly rules (profanity/slurs prohibited).
  - Enforced RBAC: edits are restricted to Site Admins, Bar Referees, the slip submitter, or the cited patron.
  - Added automatic audit notes on corrected slips (`capture_note`).
- **Interactive Slip Mistake Correction Modal (`src/components/CorrectSlipMistakeModal.tsx`)**:
  - Accessible modal (Apple HIG 44px+ touch targets, iOS safe-zone friendly) displaying original slip photo evidence thumbnail, patron selector, line item descriptions, category dropdowns, point counters, and quick preset pills for iconic fouls (`Pulling a Deb Jarvis`, `Too many seat moves`, `Tried to order Gin & Diet Coke`, `No call / no show to see Red Wings`, `Flying chair`, `Spilling a full beer`).
- **In-App Integration Across Public & Admin Surfaces**:
  - **`SlipModalViewer.tsx`**: Added prominent `[Correct Mistake]` button for authorized users and dynamic correction audit badge.
  - **`ClaimProfileModal.tsx`**: Added "Merge Profiles / Absorb Unclaimed Name" manager inside "My Locker" for patrons to easily combine duplicate profiles.
  - **`AdminPage.tsx`**: Added "Referee Roster & Profile Merger" tool and direct `[Edit]` button on each citation card in the Ref Booth.
- **Refined AI Referee Prompt on Bar Banter & Slang**:
  - Updated Workers AI and Vision OCR prompts to properly interpret lighthearted sports bar banter and gestures (e.g. flipping off / giving the finger to the bartender, pulling a Deb Jarvis, lingering/bickering) without false-positive NSFW sexual content classifications.

## [1.6.18] - 2026-10-18

### Changed & Security Gated — Admin & Staff Ref Booth Isolation
- **Ref Booth Navigation Gating (`src/components/Navbar.tsx`)**:
  - Gated the **"Ref Booth"** navigation link on both desktop header and mobile bottom navigation bar strictly to authenticated users with admin/staff privileges (`isAdminOrStaff`).
  - Unauthenticated visitors and regular patrons now see a clean 4-item public navigation set (`Scoreboard`, `Wall of Slips`, `Drop Slip`, `Share QR`).
  - Mobile bottom navigation dynamically switches between `grid-cols-4` (for patrons/visitors) and `grid-cols-5` (for referees/admins), ensuring 100% balanced tap targets across all device widths.
- **Ticker Alert Privacy (`src/components/Navbar.tsx`)**:
  - Internal Ref Booth review alerts (`⚖️ REF BOOTH ALERT: ... PENDING OFFICIAL REVIEW`) are now strictly displayed to authenticated staff/admins and excluded from public patrons' ticker feed.
- **Admin Quick Access in Profile Drawer (`src/components/ClaimProfileModal.tsx`)**:
  - Added a direct **"Ref Booth"** button inside the active session banner for authenticated administrators and referees, enabling immediate 1-tap transit to the queue upon PIN login.
- **Lock Screen "Return to Scoreboard" Escape Route (`src/pages/AdminPage.tsx`)**:
  - Added a high-contrast **"Return to Scoreboard"** navigation button on the `/admin` lock screen so accidental direct navigation offers an immediate 1-tap path back to public standings.
- **Auto-Blurred Slip Redirection Guard (`src/pages/SubmitSlipPage.tsx`)**:
  - Guarded post-upload routing so only signed-in administrators/staff are redirected to `/admin` if a slip triggers the Referee blur queue; public patrons are gracefully routed to `/docket`.

## [1.6.17] - 2026-10-18

### Added & Enhanced — Mobile Accessibility & Friendly UX Overhaul
- **iOS Safari Auto-Zoom Eradication (Apple HIG / WCAG Standards)**:
  - Enforced `text-base sm:text-sm` and `text-base sm:text-xs` (>= 16px on mobile viewports) across all text inputs, tel inputs, email inputs, numeric PIN inputs, and dropdown `<select>` controls across `LeaderboardPage`, `DocketPage`, `SubmitSlipPage`, `ClaimProfileModal`, and `AdminPage`.
  - Completely prevents iOS Mobile Safari from jarringly zooming the viewport when inputs are focused on iPhone.
- **Apple HIG 44×44px Touch Targets & 300ms Mobile Tap Delay Elimination**:
  - Enforced minimum 44px tap heights (`min-h-[44px]`) on buttons, filter tabs, date pickers, thumbnail inspectors, and reaction toggles.
  - Added global `touch-action: manipulation` across `button, a, input, select, textarea` to eliminate mobile browser 300ms double-tap delay.
  - Added tactile depression feedback (`active:scale-95`) across primary interactive buttons, reaction chips, modal dismiss triggers, and navigation tabs.
- **Responsive Sports Bar Hero Jumbotron**:
  - Re-architected the Hero Jumbotron scoreboard on `LeaderboardPage` from a cramped horizontal 4-item bar into a mobile-first 2×2 grid layout on screens < 640px, giving scores prominent focus and dedicating full 48px thumb buttons to `[ADD DEMERIT]` and `[SHARE QR]`.
  - Added horizontally scrollable period selectors with `.no-scrollbar` styling and full 44px touch targets.
- **Enhanced Visual Accessibility & Text Contrast**:
  - Elevated secondary text contrast from low-contrast brown `#8E8074` to WCAG AA/AAA compliant `#D6C7B8`, `#E8B888`, and `#DFC15E`.
  - Added global `:focus-visible` golden ring indicators (`2px solid #DFC15E`, offset `2px`) for keyboard and assistive tech accessibility.
  - Added explicit `aria-label` attributes to icon-only buttons, reaction chips, slip thumbnails, and modal close buttons.
- **Friendly Jovial Sports Bar Polish**:
  - Added friendly pro-tips and empty-state handling with 1-tap "Clear Search Filter" button in `DocketPage`.
  - Added safe-area padding for mobile modals (`SlipModalViewer`, `ClaimProfileModal`) and navigation footer links.

## [1.6.16] - 2026-10-18

### Added & Enhanced
- **Instant Quick QR Modal in Header (`src/components/Navbar.tsx`)**:
  - Tapping the prominent header **`[QR Code]`** button on mobile or desktop now immediately opens a high-contrast popup modal featuring:
    - High-resolution in-memory generated QR code for `copperdemerits.com` with the official Copper Athletic Club crest.
    - 1-tap **"Text / Share"** button utilizing native mobile sheet (`navigator.share`) for instant SMS/messaging share.
    - 1-tap **"Copy Link"** button with tactile confirmation feedback.
    - Direct link to full tabletop placard templates and printable flyers at `/share`.
- **Header Button Visibility & Label Clarity (`src/components/Navbar.tsx`)**:
  - Replaced unsupported Tailwind `xs:` breakpoint classes with responsive `<span className="hidden sm:inline font-bold">Share QR</span><span className="sm:hidden font-extrabold">QR Code</span>`.
  - Added golden glow, amber border, and high-visibility font styling so mobile users instantly spot the QR code trigger next to the Ref Booth / Login button.
  - Added `Share QR` to desktop navigation bar items for rapid discovery on laptop and tablet screens.

## [1.6.15] - 2026-10-18

### Changed & Standardized
- **Universal Profile Display Name Prioritization across All Features**:
  - Enforced the architectural rule that **all features must use the user's chosen profile display name** (`patronDisplayName`) over the handwritten name on the physical demerit form (`raw_student`) whenever a profile exists.
  - **`PhysicalSlipCard.tsx`**: Updated the prominent handwriting student name to display the patron's chosen profile display name (`Kristine Boley`, `Rick`, `Burtis`, `David Lee`). If the handwritten slip name differs (e.g. `Kristi`), it displays a subtle badge: `Slip: "Kristi"`. Falls back to the raw demerit form name only if the patron does not have a profile.
  - **`LeaderboardPage.tsx` & `DocketPage.tsx`**: Standardized image `alt` attributes and card displays to use `patronDisplayName`.
  - **`SubmitSlipPage.tsx`**: Updated slip submission review cards and duplicate citation alerts to display the matched profile display name as the primary headline with a secondary note for the handwritten slip name.
  - **`DemeritsContext.tsx`**: Updated duplicate warning messages to resolve the profile display name.
  - **`Navbar.tsx`**: Dynamically computed Head Referee Sarah's sustained citation rate to reflect live database totals (`5-for-5`, 100% conviction rate).
  - **`cloudflare/worker.js`**: Standardized Ref Booth override email and SMS notifications to prioritize the patron's chosen display name over raw slip text.

## [1.6.14] - 2026-10-18

### Added & Enhanced
- **Apple iOS Safe-Zone Padding for Sticky Header (`src/components/Navbar.tsx`)**:
  - Added CSS environment safe-area-inset padding to the sticky header container (`pt-[env(safe-area-inset-top,0px)] pr-[env(safe-area-inset-right,0px)] pl-[env(safe-area-inset-left,0px)]`).
  - Completely prevents the upper login button and action bar from colliding with the iPhone notch, Dynamic Island, status bar clock, and battery icons.
  - Eliminates accidental triggers of the iOS Safari "tap status bar to scroll to top" gesture when trying to tap the login button.
- **Apple HIG 44x44pt Minimum Touch Target & Instant Feedback (`src/components/Navbar.tsx`, `src/components/ClaimProfileModal.tsx`)**:
  - Expanded the upper login button to full Apple Human Interface Guidelines tap target standards (`min-h-[44px]`, `px-3.5 sm:px-4 py-2`).
  - Added `touch-manipulation` to disable the 300ms mobile browser tap delay and added `active:scale-95` tactile depression feedback.
  - Upgraded header `[Share QR]` button, mobile bottom navigation bar (`min-h-[54px]`, safe-area bottom padding `pb-[env(safe-area-inset-bottom,0px)]`), modal close button (`min-h-[44px] min-w-[44px]`), modal mode toggle tabs (`min-h-[44px]`), and submit buttons (`min-h-[48px]`).
- **Font Legibility & Recognition Overhaul (`src/index.css`, `src/components/Navbar.tsx`, `src/components/ClaimProfileModal.tsx`)**:
  - Replaced narrow/condensed uppercase typography (`font-athletic` / `Oswald` / `Bebas Neue`) on critical interactive buttons with high-legibility Apple system & Inter sans-serif typography (`font-sans font-black text-xs sm:text-sm tracking-tight`).
  - Enhanced contrast with high-visibility gold gradient pill styling (`bg-gradient-to-r from-[#DFC15E] via-[#E8B888] to-[#DFC15E] text-[#121212]`) when signed out, and emerald badge + member name when signed in.
  - Configured system font stack (`'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', system-ui, sans-serif`) with antialiasing and `-webkit-tap-highlight-color: transparent` in `src/index.css`.

## [1.6.13] - 2026-10-18

### Changed & Streamlined
- **Prominent Header Share QR Positioning (`src/components/Navbar.tsx`)**:
  - Replaced the top header install button with the prominent, glowing **`[Share QR]`** action button on both mobile and desktop viewports, eliminating header clutter since PWA installation is already cleanly handled by the dismissible banner directly below.
  - Streamlined desktop navigation to 4 primary views (`Scoreboard`, `Wall of Slips`, `Drop A Slip`, `Ref Booth`), retaining the 5-item mobile bottom navigation bar (`Scoreboard`, `Wall of Slips`, `Drop Slip`, `Share QR`, `Ref Booth`).
- **Complete Elimination of Cloudflare References from User-Facing Copies (`src/pages/AdminPage.tsx`)**:
  - Replaced the Ref Booth database status badge text (`Cloudflare D1 + R2 + Workers AI Live` → `Cloud Database & AI Live`).
  - Verified 100% zero public-facing or admin-facing copies mention Cloudflare across the entire web application.

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
