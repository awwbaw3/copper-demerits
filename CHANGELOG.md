# Changelog

All notable changes to **Copper Demerits (`copperdemerits.com`)** are documented in this file.

## [1.1.0] - 2026-10-17

### Changed & Added
- **Eliminated Fabricated Seed Slips & Synthetic Statistics**: Purged all hardcoded placeholder slips (`22222222-2222-4222-8222-222222222201`..`2204`) and synthetic staff-offset formulas. Standings and The Docket now strictly display and calculate from the actual uploaded slip photos (`MAX_OFFICIAL_SLIPS = 4`).
- **2-Layer Image Deduplication (`src/lib/imageDedup.ts`)**: Added cryptographic `SHA-256` file digest (`image_sha256`) and 64-bit Perceptual Difference Hash (`image_dhash` with Hamming distance `<= 8`) to block duplicate slip image uploads both client-side and in Supabase.
- **Mobile-First PWA Upgrade**: Added `public/manifest.webmanifest`, `public/sw.js` service worker, SVG maskable icons, safe-area mobile bottom navigation bar, and native PWA install prompt support.
- **Live Supabase Integration**: Connected `copperdemerits.com` to live Supabase PostgreSQL & `slips` Storage bucket with automatic migration/deduplication of any real slip photos already uploaded in browser `localStorage`.

## [1.0.0] - 2026-10-17

### Added
- Initial Vite + React 19 + TypeScript + Tailwind CSS v4 scaffold, GitHub repository (`awwbaw3/copper-demerits`), Netlify deployment, and Cloudflare DNS/SSL configuration.
