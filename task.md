# Task Tracker — Copper Demerits (`copperdemerits.com`)

## Active Sprint — v1.2.0 (Multi-Slip Accounting, Exact Timestamps & Deduplication)
- [x] Inspect `docs/20261017_211324.jpg` (3 slips: 8:50 PM Burtis, 8:56 PM Burtis, 9:09 PM Rick) and `docs/Scan_20261017_212309.jpg` (1 slip: 9:09 PM Rick scan)
- [x] Crop individual slips from `20261017_211324.jpg`, rotate `Scan_20261017_212309.jpg` upright, and upload all 5 assets to Supabase `slips` Storage bucket and `public/slips/`
- [x] Seed exact transcribed data and timestamps (`20:50`, `20:56`, `21:09`) into live Supabase (`iqbpnkttwtugxkospdqt`) and `src/lib/defaultData.ts`
- [x] Deduplicate Rick's `9:09 PM` citation across `20261017_211324.jpg` and `Scan_20261017_212309.jpg` so both photos are attached without double-counting demerits
- [x] Add Multi-Slip Photo Mode (1–4 slips per image) to `/submit` and 3-layer deduplication (SHA-256 + Rotation-Aware 64-bit dHash + Citation Timestamp/Content Match)
- [x] Complete VD/VDC workflow (`v1.2.0`) and deploy to `https://copperdemerits.com`
