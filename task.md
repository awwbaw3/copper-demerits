# Task Tracker — Copper Demerits (`copperdemerits.com`)

## Active Sprint — v1.6.0 (AI Referee Auto-Blur & Override Queue, Profile Editor, Opt-In Verified Alerts & Fan Site Hardening)
- [x] Purge `Matt Barnes` and negative aliases from Cloudflare D1, `cloudflare/worker.js`, `src/lib/defaultData.ts`, and UI placeholders
- [x] Bind Cloudflare Workers AI (`env.AI`) + deterministic Referee Monitor (`src/lib/moderation.ts`) to block offensive names/aliases and auto-blur + queue flagged slip uploads for Admin override
- [x] Add Self-Service Profile Editor ("My Locker"), 4–8 digit Bar PINs, and lock `/admin` (`Ref Booth`) to Site Admin (`Rick`) & Staff (`Sarah`)
- [x] Verify `copperdemerits.com` in Resend (`Resend-Agency` Free Tier) and implement Opt-In 6-Digit Verified Email & Carrier Email-to-SMS notifications with strict privacy (zero PII exposed)
- [x] Add Preset Jovial Bar Reactions on slips and Unofficial Fan Site Disclaimer across footer, upload page, and profile modal
- [x] Complete VD/VDC workflow (`v1.6.0`) and deploy to `https://copperdemerits.com`
