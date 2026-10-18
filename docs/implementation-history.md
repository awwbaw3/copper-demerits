# Implementation History — Copper Demerits (`copperdemerits.com`)

Chronological log of architectural decisions, database migrations, and infrastructure deployments.

---

## 2026-10-18 — v1.2.0 Multi-Slip Photo Extraction, Exact Timestamp Accounting & 3-Layer Deduplication
- **Multi-Slip & Scan Accounting (`docs/20261017_211324.jpg` + `docs/Scan_20261017_212309.jpg`)**:
  - Inspected and cropped the **3 physical slips** in `docs/20261017_211324.jpg` (`20261017_211324_burtis_2050.jpg`, `20261017_211324_burtis_2056.jpg`, `20261017_211324_rick_2109.jpg`) and oriented `docs/Scan_20261017_212309.jpg` upright (`Scan_20261017_212309.jpg`).
  - Uploaded all 5 image assets (`20261017_211324.jpg`, `Scan_20261017_212309.jpg`, and the 3 individual slip crops) to the live Supabase `slips` Storage bucket (`iqbpnkttwtugxkospdqt`) and `public/slips/`.
  - Seeded the exact 3 unique chronological citations on `2026-10-17` into live Supabase `public.demerits` and `src/lib/defaultData.ts`:
    1. `20:50` (`8:50 PM`) — `Burtis` (+1 Demerit, `Copper Bar`): `"No call / no show to see the Red Wings"` — Signed `"YOUR BOSS!"` → `Sarah`.
    2. `20:56` (`8:56 PM`) — `Burtis` (+2 Demerits, `Copper`): `"NOT CARING ABOUT THE FIRST DEMERIT"` — Signed `"Matt Barnes (Signature)"` → `Matt Barnes`.
    3. `21:09` (`9:09 PM`) — `Rick` (+3 Demerits, `Copper A.C.`): `["Too many seat moves", "Try to order Gin & Diet Coke", "The headband :) <3"]` — Signed `"The Boss - AKA Sarah"` → `Sarah` (Deduplicated across both `20261017_211324.jpg` and `Scan_20261017_212309.jpg`).
- **3-Layer Deduplication & Multi-Slip Form**:
  - Enhanced `src/lib/imageDedup.ts` with SHA-256 lookup, rotation-aware (`0°/90°/180°/270°`) 64-bit perceptual dHash, and citation timestamp/content deduplication (`checkDuplicateCitationContent`).
  - Added Multi-Slip Photo Mode (1–4 slips per uploaded image) to `src/pages/SubmitSlipPage.tsx` and interactive multi-photo switching to `src/components/SlipModalViewer.tsx`.

---

## 2026-10-18 — v1.1.0 Mobile PWA & Image Deduplication
- Added PWA manifest, service worker, mobile bottom navigation bar, and SHA-256 / dHash image fingerprinting.

---

## 2026-10-17 — v1.0.0 Initial Architecture & Full-Stack Deployment
- Provisioned GitHub repo (`awwbaw3/copper-demerits`), Netlify site (`36044d56-88f0-4a30-9e6c-23b645aca925`), and Cloudflare DNS (`copperdemerits.com`).
