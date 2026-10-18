# Task Tracker — Copper Demerits (`copperdemerits.com`)

## Active Sprint — v1.6.9 (Granular Notification Channels, PIN Rate-Limiting & Security Audit)
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
