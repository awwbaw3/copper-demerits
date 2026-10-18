# Changelog — Copper Demerits (`copperdemerits.com`)

All notable changes to the **Copper Athletic Club — Ring of Honor** web application are documented in this file.

## [1.2.0] - 2026-10-18

### Added
- **Multi-Slip Bar Photo Extraction (`docs/20261017_211324.jpg`) & Single-Slip Scan Deduplication (`docs/Scan_20261017_212309.jpg`)**:
  - Accounted for **3 physical slips** in `20261017_211324.jpg` (captured Oct 17, 2026 at 9:13 PM) and **1 physical slip scan** in `Scan_20261017_212309.jpg` (captured Oct 17, 2026 at 9:23 PM):
    1. **8:50 PM (`20:50`) — `Burtis` (+1 Demerit, Room: `Copper Bar`)**: *"No call / no show to see the Red Wings"* — Signed `"YOUR BOSS!"` (normalized to `Sarah`).
    2. **8:56 PM (`20:56`) — `Burtis` (+2 Demerits, Room: `Copper`)**: *"NOT CARING ABOUT THE FIRST DEMERIT"* — Signed `"Matt Barnes (Signature)"` (normalized to `Matt Barnes`).
    3. **9:09 PM (`21:09`) — `Rick` (+3 Demerits, Room: `Copper A.C.`)**: *"1) Too many seat moves, 2) Try to order Gin & Diet Coke, 3) The headband :) <3"* — Signed `"The Boss - AKA Sarah"` (normalized to `Sarah`).
  - Automatically deduplicated & merged `Scan_20261017_212309.jpg` (9:23 PM upright scan of Rick's 9:09 PM slip) with Slip #3 from `20261017_211324.jpg` (9:13 PM bar photo) so Rick's 9:09 PM citation is counted once (**3 demerits**, not 6) while preserving both photo captures in the Slip Modal switcher.
- **Multi-Slip Photo Logger (`/submit`)**:
  - Added support for logging **1 to 4 slips from a single uploaded image**, with individual timestamps, rooms, demerit counts, infractions, and staff signatures per slip.
- **3-Layer Deduplication Engine (`src/lib/imageDedup.ts`)**:
  - Layer 1: Exact `SHA-256` file digest matching (including known source files & crops).
  - Layer 2: Rotation-aware (`0°`, `90°`, `180°`, `270°`) 64-bit Perceptual `dHash` matching.
  - Layer 3: Citation content & timestamp matching (`raw_student + incident_date + incident_time`), automatically merging secondary scans/photos of an existing citation without double-counting demerits.

## [1.1.0] - 2026-10-18

### Added
- Progressive Web App (PWA) support (`manifest.webmanifest`, `sw.js`, install prompt, mobile bottom navigation bar).
- Initial SHA-256 and 64-bit perceptual dHash image deduplication engine.

## [1.0.0] - 2026-10-17

### Added
- Initial production launch of **Copper Demerits — Ring of Honor** (`https://copperdemerits.com`).
