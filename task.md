# Task Tracker — Copper Demerits (`copperdemerits.com`)

## Active Sprint — v1.5.0 (Cloudflare D1 + R2 Edge Backend & Staff/Patron Profile Claiming)
- [x] Provision Cloudflare D1 database `copper-demerits-db` (`feb899d8-606e-4937-91b7-9076e2741961`) and seed all 5 members, 12 aliases, and 4 verified slips
- [x] Provision Cloudflare R2 bucket `copper-demerits-slips` and upload all 7 authentic slip photos & crops
- [x] Deploy Cloudflare Worker `copper-demerits-api` on `https://api.copperdemerits.com` and clean up `Supabase5`
- [x] Build Staff & Patron Profile Claiming + 4-digit Bar PIN Login (`ClaimProfileModal.tsx`) and require login on `/submit`
- [x] Complete VD/VDC workflow (`v1.5.0`) and deploy to `https://copperdemerits.com`
