# Implementation History — Copper Demerits

## 2026-10-17 — v1.1.0 Uploaded-Images-Only Enforcement, Image Deduplication & Mobile PWA
- **Data Integrity**: Removed all fabricated seed slips (`DEFAULT_DEMERITS = []`) and synthetic leaderboard stats. Enforced that only real uploaded slip images (`image_url !== null`, capped at the 4 uploaded images) are counted and displayed. Added automatic `localStorage` → Supabase migration for any real uploaded images on user devices while purging legacy seed IDs.
- **Image Deduplication (`src/lib/imageDedup.ts`)**: Implemented exact `SHA-256` (`crypto.subtle.digest`) and 64-bit Perceptual Difference Hash (`dHash` on a `9x8` luminance grid with Hamming distance threshold `<= 8`) to reject duplicate or re-saved slip photos on upload. Added `image_sha256` (UNIQUE) and `image_dhash` columns to `public.demerits`.
- **Mobile-First PWA**: Added `public/manifest.webmanifest`, `public/sw.js` service worker, `icon-192.svg`/`icon-512.svg`, `beforeinstallprompt` install button, and fixed bottom thumb-zone navigation bar with `env(safe-area-inset-bottom)`.

## 2026-10-17 — v1.0.0 Initial End-to-End Build & Production Deployment
- **Architecture**: Built Vite + React 19 + TypeScript + Tailwind CSS v4 SPA and deployed to `https://copperdemerits.com`.
