# Task Tracker — Copper Demerits (`copperdemerits.com`)

## Active Sprint — v1.6.2 (Post-Claim Self-Service Profile Editor, Claimed Profile & Admin-Only Nicknames + Complementary Local SEO)
- [x] Purge `Matt Barnes` and negative aliases from Cloudflare D1, `cloudflare/worker.js`, `src/lib/defaultData.ts`, and UI placeholders
- [x] Bind Cloudflare Workers AI (`env.AI`) + deterministic Referee Monitor (`src/lib/moderation.ts`) to block offensive names/aliases and auto-blur + queue flagged slip uploads for Admin override
- [x] Add Self-Service Profile Editor ("My Locker"), 4–8 digit Bar PINs, frictionless post-claim editing (display name, email, phone, notification settings, tagline, team badge), and lock `/admin` (`Ref Booth`) to Site Admin (`Rick`) & Staff (`Sarah`)
- [x] Enforce Claimed Profile & Admin-only RBAC on nicknames (`POST /api/aliases`, `DELETE /api/aliases/:id`) and automatically merge slip stats written under any nickname into the target profile
- [x] Verify `copperdemerits.com` in Resend (`Resend-Agency` Free Tier) and implement Opt-In 6-Digit Verified Email & Carrier Email-to-SMS notifications with strict privacy (zero PII exposed)
- [x] Add Complementary Fan-Site Local SEO (`index.html` Schema.org JSON-LD attributing `BarOrPub` to `https://copperac.com`, Marshall MI geo tags, `robots.txt`, `sitemap.xml`, and dofollow link to `copperac.com`)
- [x] Complete VD/VDC workflow (`v1.6.2`) and deploy to `https://copperdemerits.com`
