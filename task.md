# Task Tracker — Copper Demerits (`copperdemerits.com`)

## Active Sprint — v1.6.6 (Pre-Storage AI Slip Verification + Adaptive Smartphone Image Compression)
- [x] Purge `Matt Barnes` and negative aliases from Cloudflare D1, `cloudflare/worker.js`, `src/lib/defaultData.ts`, and UI placeholders
- [x] Add Zero-Touch AI Vision Slip OCR (`POST /api/extract-slip` via `@cf/mistralai/mistral-small-3.1-24b-instruct`) so capturing or choosing a slip image automatically verifies it is a Demerit Slip, grabs all fields, and logs the slip(s) to R2 & D1 with zero manual input required
- [x] Add Adaptive Smartphone Slip Image Compression (`<82 KB` target, 95%–99% size reduction), pre-storage AI Demerit Slip verification & deduplication (0 bytes uploaded for duplicates or non-slip photos), compact R2 blurred image uploads, and compress all 7 existing R2 slip images (`3.26 MB → 387.6 KB`)
- [x] Bind Cloudflare Workers AI (`env.AI`) + deterministic Referee Monitor (`src/lib/moderation.ts`) to block offensive names/aliases and auto-blur + queue flagged slip uploads for Admin override
- [x] Add Self-Service Profile Editor ("My Locker"), 4–8 digit Bar PINs, frictionless post-claim editing (display name, email, phone, notification settings, tagline, team badge), and lock `/admin` (`Ref Booth`) to Site Admin (`Rick`) & Staff (`Sarah`)
- [x] Require Email Address or 10-Digit Phone Number when claiming or creating a profile, allow returning users to sign in with Email or Phone + 4–8 digit PIN, and hide already-claimed profiles from the claimable list
- [x] Enforce Claimed Profile & Admin-only RBAC on nicknames (`POST /api/aliases`, `DELETE /api/aliases/:id`) and automatically merge slip stats written under any nickname into the target profile
- [x] Verify `copperdemerits.com` in Resend (`Resend-Agency` Free Tier) and implement Opt-In 6-Digit Verified Email & Carrier Email-to-SMS notifications with strict privacy (zero PII exposed)
- [x] Add Complementary Fan-Site Local SEO (`index.html` Schema.org JSON-LD attributing `BarOrPub` to `https://copperac.com`, Marshall MI geo tags, `robots.txt`, `sitemap.xml`, and dofollow link to `copperac.com`)
- [x] Complete VD/VDC workflow (`v1.6.6`) and deploy to `https://copperdemerits.com`
