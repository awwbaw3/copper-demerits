# Task Tracker — Copper Demerits (`copperdemerits.com`)

## Active Sprint — v1.6.18 (Ref Booth Gating & Role Separation)
- [x] Gate "Ref Booth" navigation link in desktop header to authenticated admins/staff (`isAdminOrStaff`)
- [x] Gate "Ref Booth" navigation link in mobile bottom nav to authenticated admins/staff (`isAdminOrStaff`)
- [x] Dynamically switch mobile navigation grid between `grid-cols-4` (public) and `grid-cols-5` (admin)
- [x] Gate Ref Booth pending review ticker alerts to authenticated admins/staff only
- [x] Add direct "Ref Booth" link button in signed-in active session banner (`ClaimProfileModal.tsx`)
- [x] Add "Return to Scoreboard" exit button on `/admin` access-denied lock screen
- [x] Guard auto-blurred slip post-submission routing to only redirect to `/admin` if signed in as admin/staff
- [x] Pass `npm run build` and `npm run lint` cleanly
- [x] Honor user directive: Do NOT publish to Netlify production

## Completed Sprints
### v1.6.17 (Mobile Accessibility & Friendly UX Overhaul)
- [x] Prevent iOS Safari auto-zoom by enforcing `text-base sm:text-sm` / `text-base sm:text-xs` (>= 16px) across all inputs and selects
- [x] Enforce Apple HIG 44×44px minimum touch targets across buttons, filters, date pickers, thumbnails, and modal actions
- [x] Add global `touch-action: manipulation` across all buttons, inputs, and links to eliminate 300ms mobile tap delay
- [x] Add tactile depression feedback (`active:scale-95`) across primary interactive elements and navigation pills
- [x] Re-architect Hero Jumbotron on `LeaderboardPage` into a mobile-first responsive 2×2 grid with full 48px touch CTAs
- [x] Upgrade secondary text contrast to `#D6C7B8` / `#E8B888` / `#DFC15E` for WCAG AA/AAA compliance
- [x] Add global `:focus-visible` golden ring indicators and `aria-label` accessibility attributes
- [x] Add friendly jovial bar copy and empty-state filter reset button
- [x] Pass `npm run build` and `npm run lint` cleanly
- [x] Verified zero Netlify deployment
- [x] Merge and push to both `dev` and `main`
### v1.6.16 (Instant Quick QR Modal & Backbar QR Visibility)
- [x] Integrate instant 1-tap Quick QR Modal into header `[QR Code]` / `[Share QR]` button (`src/components/Navbar.tsx`)
- [x] Fix mobile header button label visibility by replacing non-standard `xs:` Tailwind classes with responsive `<span className="sm:hidden font-extrabold">QR Code</span>`
- [x] Provide instant 1-tap "Text / Share" (`navigator.share`) and "Copy Link" within the Quick QR modal
- [x] Add link to dedicated tabletop placard and flyer print page (`/share`) directly within Quick QR modal
- [x] Add `Share QR` item to desktop navigation bar
- [x] Verified zero Netlify deployment
- [x] Pass `npm run build` and `npm run lint`
### v1.6.15 (Universal Profile Display Name Prioritization & Slip Attribution Rule)
- [x] Prioritize user's chosen profile display name (`patronDisplayName`) across all features over physical demerit slip text (`raw_student`) whenever a profile exists
- [x] Update `PhysicalSlipCard.tsx` to display `slip.patronDisplayName` as the primary student name with secondary `Slip: "${slip.raw_student}"` note
- [x] Standardize image alt tags and titles in `DocketPage.tsx` and `LeaderboardPage.tsx`
- [x] Update `SubmitSlipPage.tsx` summary cards and duplicate warnings to display profile display name
- [x] Compute Head Referee Sarah's sustained citation rate dynamically in `Navbar.tsx` (`5-for-5`, 100% conviction rate)
- [x] Standardize Ref Booth notifications in `cloudflare/worker.js`
- [x] Reassigned Kristine Boley's 2-demerit citation in live Cloudflare D1 and purged phantom "Josh" member
- [x] Honor user directive: Do NOT publish to Netlify production
### v1.6.14 (iPhone Safe-Zone Header Login Button & Font Legibility Overhaul)
- [x] Add CSS environment safe-area-inset padding to header (`pt-[env(safe-area-inset-top,0px)] pr-[env(safe-area-inset-right,0px)] pl-[env(safe-area-inset-left,0px)]`)
- [x] Expand upper login button to Apple HIG 44x44pt touch target (`min-h-[44px] px-3.5 py-2`)
- [x] Add `touch-manipulation` to eliminate mobile 300ms tap delay and `active:scale-95` tactile depression feedback
- [x] Replace condensed headline fonts (`font-athletic`) with highly recognizable Apple system / Inter typography (`font-sans font-black text-xs sm:text-sm tracking-tight`)
- [x] Upgrade contrast with high-visibility gold gradient pill styling for signed-out state and emerald badge for signed-in state
- [x] Apply safe area insets and 44pt touch targets to `ClaimProfileModal.tsx` and mobile bottom bar
- [x] Honor user directive: Do NOT publish to Netlify production

## Completed Sprints
### v1.6.13 (Header Share QR Prominence & Cloudflare Copy Purge)
- [x] Replace header action install button with prominent glowing `[Share QR]` button
- [x] Rely on dismissible backbar banner below header for PWA installation onboarding
- [x] Streamline desktop navigation (4 items) and retain 5-item mobile bottom nav
- [x] Remove Cloudflare reference from Ref Booth status badge (`src/pages/AdminPage.tsx`)
- [x] Verify 100% zero public-facing and admin-facing copies mention Cloudflare
- [x] Honor user directive: Do NOT publish to Netlify production

## Completed Sprints
### v1.6.12 (Pure Leaderboard Ticker & Backbar Easy Share QR Code Page)
- [x] Remove Cloudflare and venue branding ("Copper Athletic Club", "A sports bar. Not a gym.") from top ticker
- [x] Dynamically compute pure leaderboard ticker updates (leaders, podium, points, referee records, citations)
- [x] Create dedicated Backbar Easy Share QR Code page (`/share`, `src/pages/SharePage.tsx`)
- [x] Integrate client-side offline QR generator (`qrcode`) with destination switching (`/`, `/submit`, `/docket`)
- [x] Add 1-tap Native Web Share (`navigator.share`), Copy Link, and Save PNG
- [x] Add Tabletop Placard / Backbar Card print styling (`window.print()`)
- [x] Add ubiquitous navigation: top navbar `[Share QR]`, desktop/mobile nav (`grid-cols-5`), jumbotron `SHARE QR`, and footer
- [x] Honor user directive: Do NOT publish to Netlify production

## Completed Sprints
### v1.6.11 (Prominent PWA Installation Banner & Universal Guide)
- [x] Make PWA install action prominently visible across mobile and desktop for uninstalled patrons (`!isStandalone`)
- [x] Add animated glowing `[Install App]` CTA button in top navbar
- [x] Add dismissible top callout banner with 3-day local storage memory
- [x] Add cross-platform PWA installation guide modal (iOS Safari, Android Chrome, Desktop)
- [x] Merge all completed updates from `dev` into `main` and push to `origin/main`
- [x] Honor user directive: Do NOT publish to Netlify production

## Completed Sprints
### v1.6.10 (Individual Leaderboard Showcase, Clean Header & "Add Your Demerit" Action)
- [x] Showcase Individual Leaderboard (`RING OF HONOR STANDINGS`) immediately beneath the Penalty Box header
- [x] Move 5-team foul category banners below player cards so standings are front and center
- [x] Rename upload CTA button from `"DROP SLIP"` to **`"ADD YOUR DEMERIT"`**
- [x] Remove `"A SPORTS BAR. NOT A GYM. • MARSHALL, MI"` badge
- [x] Remove `"Official Bar Demerit Jumbotron · Lions · Red Wings · Pistons · Tigers · UM · MSU"` subtitle
- [x] Remove `"🦁 ACTUAL COPPER AC BACKBAR • MARSHALL, MI"` badge from Sarah's section
- [x] Modernize period filters: replaced `"Oct 17 Game Night"` with production options (`All-Time`, `This Month`, `This Week`, `Today`, `Custom Dates`)
- [x] Replace hardcoded `'OCT 17'` fallback timestamps with dynamic dates on physical slip thumbnail cards
- [x] Honor user directive: Do NOT publish to Netlify production

## Completed Sprints
### v1.6.9 (Granular Notification Channels, PIN Rate-Limiting & Security Audit)
- [x] Security Audit: Verified 0 API keys/secrets in git history; all secrets encrypted in Cloudflare Worker
- [x] Backend Security: Added PIN brute-force lockout (5 failed attempts in 15 min via D1 `pin_failures` table)
- [x] Backend Security: Added strict HTTP security headers (`nosniff`, `DENY`, `strict-origin-when-cross-origin`)
- [x] D1 Migration: Added `notification_preferences TEXT` to `members` table in `copper-demerits-db`
- [x] Notification Channels: Implemented independent 4-way selectors (`[Off] [Email] [Text] [Both]`) for 5 events:
  - 👑 Leaderboard Crown (#1 rank takeover)
  - 📉 Leaderboard Dethroned (#1 rank loss)
  - 📋 New Citation (Slip logged against patron or linked nickname)
  - 📢 Ref Whistle Override (Official review decision)
  - 🍺 Friday Night Docket (Weekly 5:00 PM EST happy hour digest)
- [x] My Locker UI: Added Granular Notification Matrix with inline email/carrier warnings and bulk toggles
- [x] Cloudflare Worker Cron: Added `0 21 * * 5` in `wrangler.toml` and `scheduled(event, env, ctx)` handler
- [x] Ref Booth Controls: Added "Send Test Friday Docket" button in `src/pages/AdminPage.tsx`
- [x] Verified live test: Dispatched preview email and SMS to Rick's profile via `noreply@copperdemerits.com`
- [x] Anti-Spam Safety: 15-min cooldown for ranks, 5-min for batch slips, site-wide safety cap of 25 messages/day
- [x] Honor user directive: Do NOT publish to Netlify production

## Completed Sprints
### v1.6.8 (copperdemerits.com Verified on Resend-Ninjas + noreply@ Live)
- [x] Verify `copperdemerits.com` directly inside `Resend-Ninjas` (`fe85e77d-54c0-4f74-bc7f-9dd968e94472`)
- [x] Clean Cloudflare DNS: removed stale Agency DKIM and conflicting manual MX/TXT records
- [x] Switch sender address to `Copper Demerits <noreply@copperdemerits.com>` with `reply_to: 'info@drit.ninja'`
- [x] Deploy Cloudflare Worker (`v1.6.8`) to `api.copperdemerits.com`
- [x] Verify live email & carrier SMS delivery from `noreply@copperdemerits.com` to Rick's profile
- [x] Honor user directive: Do NOT publish to Netlify production

## Completed Sprints
### v1.6.7 (Resend Agency Decoupling + drit.ninja Migration + Footer Branding)
- [x] Decouple completely from `Resend-Agency`: removed `copperdemerits.com` from Agency account
- [x] Migrate to `Resend-Ninjas`: verified `drit.ninja` domain, provisioned `copper-demerits-worker` API key, and updated Cloudflare Worker `RESEND_API_KEY` secret
- [x] Configure notification sender to `Copper Demerits <noreply@drit.ninja>` with `reply_to: 'info@drit.ninja'`
- [x] Add discreet link to `DR IT - The IT Ninjas` (`https://drit.ninja`) in the website footer
- [x] Remove all Cloudflare mentions from the public footer, navbar ticker, and user-facing claim status messages
- [x] Direct all website inquiries, comments, and complaints to `info@drit.ninja`
- [x] Test live email and carrier SMS notifications to Rick's profile (`albaughrick@gmail.com` and `2692749665@tmomail.net`) with verified delivery
- [x] Honor user directive: Do NOT publish to Netlify production
### v1.6.6 (Pre-Storage AI Slip Verification + Adaptive Smartphone Image Compression)
- [x] Purge `Matt Barnes` and negative aliases from Cloudflare D1, `cloudflare/worker.js`, `src/lib/defaultData.ts`, and UI placeholders
- [x] Add Zero-Touch AI Vision Slip OCR (`POST /api/extract-slip` via `@cf/mistralai/mistral-small-3.1-24b-instruct`)
- [x] Add Adaptive Smartphone Slip Image Compression (`<82 KB` target, 95%–99% size reduction)
- [x] Pre-storage AI Demerit Slip verification & deduplication (0 bytes uploaded for duplicates or non-slip photos)
- [x] Compact R2 blurred image uploads, and compress all 7 existing R2 slip images (`3.26 MB → 387.6 KB`)
- [x] Bind Cloudflare Workers AI (`env.AI`) + deterministic Referee Monitor (`src/lib/moderation.ts`)
- [x] Self-Service Profile Editor ("My Locker"), 4–8 digit Bar PINs, and lock `/admin` to Site Admin (`Rick`) & Staff (`Sarah`)
- [x] Require Email or Phone when claiming/creating, sign in with Email/Phone + PIN, hide claimed profiles from claim list
- [x] Enforce Claimed Profile & Admin-only RBAC on nicknames (`POST /api/aliases`, `DELETE /api/aliases/:id`)
- [x] Opt-In 6-Digit Verified Email & Carrier Email-to-SMS notifications with strict privacy (zero PII exposed)
- [x] Complementary Fan-Site Local SEO (`index.html` Schema.org JSON-LD attributing `BarOrPub` to `https://copperac.com`)
