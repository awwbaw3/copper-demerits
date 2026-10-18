# Changelog

All notable changes to **Copper Demerits (`copperdemerits.com`)** are documented in this file.

## [1.0.0] - 2026-10-17

### Added
- Scaffolded Vite + React 19 + TypeScript + Tailwind CSS v4 web application styled after **Copper Athletic Club** (`#B87333` / `#C86D51` copper/bronze palette on `#121212` dark charcoal with bold athletic typography).
- Built `/` **Public Leaderboard** with Month (`Oct 2026` / `Sep 2026`) and `All-Time` standings, patron cards, total demerits, staff-issued demerits, net score (`Received - Issued`), and Staff Enforcer standings.
- Built `/docket` **The Docket** card feed displaying itemized infractions, timestamps, raw signature vs. normalized issuer badges, and a native HTML `<dialog closedby="any">` **Slip Modal Viewer**.
- Built `/submit` **Ring of Honor** patron self-submission flow with camera capture & file upload to the Supabase Storage `slips` bucket, live signature alias resolution, and real-time physical slip preview.
- Built `/admin` **House Control Room** featuring the slip moderation queue, `staff_aliases` lowercase mapper, live signature normalization tester, and `members` roster manager.
- Added `supabase/schema.sql`, `supabase/seed.sql`, and `netlify.toml`.
