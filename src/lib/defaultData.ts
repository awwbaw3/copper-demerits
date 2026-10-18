import { Member, StaffAlias, DemeritSlip, UploadedSourceFile } from '../types/demerits';

export const MEMBER_IDS = {
  RICK: '11111111-1111-4111-8111-111111111111',
  BURTIS: '22222222-2222-4222-8222-222222222222',
  SARAH: '33333333-3333-4333-8333-333333333333',
  MATT_BARNES: '44444444-4444-4444-8444-444444444444',
} as const;

export const FABRICATED_SEED_SLIP_IDS = new Set([
  '22222222-2222-4222-8222-222222222201',
  '22222222-2222-4222-8222-222222222202',
  '22222222-2222-4222-8222-222222222203',
  '22222222-2222-4222-8222-222222222204',
]);

export const DEFAULT_MEMBERS: Member[] = [
  {
    id: MEMBER_IDS.RICK,
    display_name: 'Rick',
    is_staff: false,
    is_patron: true,
    created_at: '2026-10-17T20:00:00Z',
  },
  {
    id: MEMBER_IDS.BURTIS,
    display_name: 'Burtis',
    is_staff: true,
    is_patron: true,
    created_at: '2026-10-17T20:00:00Z',
  },
  {
    id: MEMBER_IDS.SARAH,
    display_name: 'Sarah',
    is_staff: true,
    is_patron: false,
    created_at: '2026-10-17T20:00:00Z',
  },
  {
    id: MEMBER_IDS.MATT_BARNES,
    display_name: 'Matt Barnes',
    is_staff: true,
    is_patron: false,
    created_at: '2026-10-17T20:00:00Z',
  },
];

export const DEFAULT_STAFF_ALIASES: StaffAlias[] = [
  {
    id: '33333333-3333-4333-8333-333333333301',
    alias: 'the boss',
    member_id: MEMBER_IDS.SARAH,
  },
  {
    id: '33333333-3333-4333-8333-333333333302',
    alias: 'the boss - aka sarah',
    member_id: MEMBER_IDS.SARAH,
  },
  {
    id: '33333333-3333-4333-8333-333333333303',
    alias: 'aka sarah',
    member_id: MEMBER_IDS.SARAH,
  },
  {
    id: '33333333-3333-4333-8333-333333333304',
    alias: 'sarah',
    member_id: MEMBER_IDS.SARAH,
  },
  {
    id: '33333333-3333-4333-8333-333333333308',
    alias: 'your boss!',
    member_id: MEMBER_IDS.SARAH,
  },
  {
    id: '33333333-3333-4333-8333-333333333309',
    alias: 'your boss',
    member_id: MEMBER_IDS.SARAH,
  },
  {
    id: '33333333-3333-4333-8333-333333333305',
    alias: 'the douche',
    member_id: MEMBER_IDS.MATT_BARNES,
  },
  {
    id: '33333333-3333-4333-8333-333333333306',
    alias: 'matt barnes',
    member_id: MEMBER_IDS.MATT_BARNES,
  },
  {
    id: '33333333-3333-4333-8333-333333333310',
    alias: 'matt barnes (signature)',
    member_id: MEMBER_IDS.MATT_BARNES,
  },
  {
    id: '33333333-3333-4333-8333-333333333307',
    alias: 'burtis',
    member_id: MEMBER_IDS.BURTIS,
  },
];

/**
 * Exact SHA-256 digests of the uploaded image files & extracted slip crops
 * so re-uploading either original photo (or rotated scan) is immediately caught.
 */
export const KNOWN_UPLOADED_FILE_HASHES: Record<
  string,
  { slipId: string; description: string }
> = {
  // Original multi-slip bar photo (docs/20261017_211324.jpg)
  ecc1ca1e8a95d0cf62f82a5949e40a6044ea7bb335a2f5991cc500c4557feb36: {
    slipId: 'a3333333-3333-4333-8333-333333333333',
    description: '20261017_211324.jpg (Multi-Slip Bar Photo: Burtis 8:50 PM, Burtis 8:56 PM, Rick 9:09 PM)',
  },
  // Original unrotated scan (docs/Scan_20261017_212309.jpg)
  c03f872eb440b12c9835d1b84407278c39eb106df64c446c35eb06eb382def9e: {
    slipId: 'a3333333-3333-4333-8333-333333333333',
    description: 'Scan_20261017_212309.jpg (Single-Slip Scan: Rick 9:09 PM)',
  },
  // Upright rotated scan (public/slips/Scan_20261017_212309.jpg)
  '3c1b69a7e7b05253560753de5c6a3a2eda800f760814fb15f963f08ca106384b': {
    slipId: 'a3333333-3333-4333-8333-333333333333',
    description: 'Scan_20261017_212309.jpg (Upright Scan: Rick 9:09 PM)',
  },
  // Cropped slip 1: Burtis 8:50 PM
  a88e9b61232ff9d47abda74d8db70de8aa80ffa4037115d25ea5beacd8f3347d: {
    slipId: 'a1111111-1111-4111-8111-111111111111',
    description: '20261017_211324_burtis_2050.jpg (Burtis 8:50 PM Slip)',
  },
  // Cropped slip 2: Burtis 8:56 PM
  de5d75f906950591314f38f2ad6fe4fde09545759ee5fba74c42905150c96ef8: {
    slipId: 'a2222222-2222-4222-8222-222222222222',
    description: '20261017_211324_burtis_2056.jpg (Burtis 8:56 PM Slip)',
  },
  // Cropped slip 3: Rick 9:09 PM
  d0e27033e69d8c789fdec035769ad37eca920a2ccb2a9d1208bfeb01f35c4ae8: {
    slipId: 'a3333333-3333-4333-8333-333333333333',
    description: '20261017_211324_rick_2109.jpg (Rick 9:09 PM Slip)',
  },
};

/**
 * The 2 real uploaded image files in docs/, accounting for:
 * - Image 1 (20261017_211324.jpg): 3 physical slips on the copper bar table (8:50 PM, 8:56 PM, 9:09 PM)
 * - Image 2 (Scan_20261017_212309.jpg): 1 scanned physical slip (9:09 PM Rick — deduplicated against Slip #3 in Image 1)
 */
export const UPLOADED_SOURCE_FILES: UploadedSourceFile[] = [
  {
    id: 'upload-1-multi-slip-bar-photo',
    filename: '20261017_211324.jpg',
    capturedAt: '2026-10-17 21:13:24 (9:13 PM)',
    slipCountInImage: 3,
    imageUrl: '/slips/20261017_211324.jpg',
    sha256: 'ecc1ca1e8a95d0cf62f82a5949e40a6044ea7bb335a2f5991cc500c4557feb36',
    description:
      'Multi-slip bar table photo containing 3 physical slips written between 8:50 PM and 9:09 PM.',
    extractedSlips: [
      {
        label: 'Top-Right Slip (#1 Chronological)',
        slipId: 'a1111111-1111-4111-8111-111111111111',
        student: 'Burtis',
        time: '8:50 PM (20:50)',
        demerits: 1,
        room: 'Copper Bar',
        cropUrl: '/slips/20261017_211324_burtis_2050.jpg',
      },
      {
        label: 'Bottom-Right Slip (#2 Chronological, +6 mins later)',
        slipId: 'a2222222-2222-4222-8222-222222222222',
        student: 'Burtis',
        time: '8:56 PM (20:56)',
        demerits: 2,
        room: 'Copper',
        cropUrl: '/slips/20261017_211324_burtis_2056.jpg',
      },
      {
        label: 'Bottom-Left Slip (#3 Chronological)',
        slipId: 'a3333333-3333-4333-8333-333333333333',
        student: 'Rick',
        time: '9:09 PM (21:09)',
        demerits: 3,
        room: 'Copper A.C.',
        cropUrl: '/slips/20261017_211324_rick_2109.jpg',
      },
    ],
  },
  {
    id: 'upload-2-single-slip-scan',
    filename: 'Scan_20261017_212309.jpg',
    capturedAt: '2026-10-17 21:23:09 (9:23 PM)',
    slipCountInImage: 1,
    imageUrl: '/slips/Scan_20261017_212309.jpg',
    sha256: 'c03f872eb440b12c9835d1b84407278c39eb106df64c446c35eb06eb382def9e',
    altSha256: '3c1b69a7e7b05253560753de5c6a3a2eda800f760814fb15f963f08ca106384b',
    description:
      'High-contrast single-slip scan of Rick’s 9:09 PM slip (taken 10 mins after the bar photo). Automatically deduplicated & merged with Slip #3 so Rick is not double-counted.',
    extractedSlips: [
      {
        label: 'Single-Slip Scan (Deduplicated Match -> 9:09 PM Rick)',
        slipId: 'a3333333-3333-4333-8333-333333333333',
        student: 'Rick',
        time: '9:09 PM (21:09)',
        demerits: 3,
        room: 'Copper A.C.',
        cropUrl: '/slips/Scan_20261017_212309.jpg',
        isDeduplicatedMerge: true,
      },
    ],
  },
];

/**
 * Exact real citations transcribed from docs/20261017_211324.jpg (3 slips)
 * and docs/Scan_20261017_212309.jpg (1 slip, deduplicated against Rick's 9:09 PM citation).
 */
export const DEFAULT_DEMERITS: DemeritSlip[] = [
  {
    id: 'a1111111-1111-4111-8111-111111111111',
    patron_id: MEMBER_IDS.BURTIS,
    raw_student: 'Burtis',
    issuer_id: MEMBER_IDS.SARAH,
    raw_signature: 'YOUR BOSS!',
    demerit_count: 1,
    incident_date: '2026-10-17',
    incident_time: '20:50',
    location_area: 'Copper Bar',
    infractions: ['No call / no show to see the Red Wings'],
    image_url: '/slips/20261017_211324_burtis_2050.jpg',
    source_image_url: '/slips/20261017_211324.jpg',
    secondary_image_url: null,
    image_sha256: 'a88e9b61232ff9d47abda74d8db70de8aa80ffa4037115d25ea5beacd8f3347d',
    image_dhash: '6c6a6b7333290b6d',
    capture_note: 'Slip 1 of 3 in 20261017_211324.jpg (Top-Right slip, logged 8:50 PM)',
    status: 'approved',
    created_at: '2026-10-17T20:50:00-04:00',
  },
  {
    id: 'a2222222-2222-4222-8222-222222222222',
    patron_id: MEMBER_IDS.BURTIS,
    raw_student: 'Burtis',
    issuer_id: MEMBER_IDS.MATT_BARNES,
    raw_signature: 'Matt Barnes (Signature)',
    demerit_count: 2,
    incident_date: '2026-10-17',
    incident_time: '20:56',
    location_area: 'Copper',
    infractions: ['NOT CARING ABOUT THE FIRST DEMERIT'],
    image_url: '/slips/20261017_211324_burtis_2056.jpg',
    source_image_url: '/slips/20261017_211324.jpg',
    secondary_image_url: null,
    image_sha256: 'de5d75f906950591314f38f2ad6fe4fde09545759ee5fba74c42905150c96ef8',
    image_dhash: '4c6e69713131636d',
    capture_note: 'Slip 2 of 3 in 20261017_211324.jpg (Bottom-Right slip, logged 8:56 PM — 6 mins after Slip #1)',
    status: 'approved',
    created_at: '2026-10-17T20:56:00-04:00',
  },
  {
    id: 'a3333333-3333-4333-8333-333333333333',
    patron_id: MEMBER_IDS.RICK,
    raw_student: 'Rick',
    issuer_id: MEMBER_IDS.SARAH,
    raw_signature: 'The Boss - AKA Sarah',
    demerit_count: 3,
    incident_date: '2026-10-17',
    incident_time: '21:09',
    location_area: 'Copper A.C.',
    infractions: [
      'Too many seat moves',
      'Try to order Gin & Diet Coke',
      'The headband :) <3',
    ],
    image_url: '/slips/Scan_20261017_212309.jpg',
    source_image_url: '/slips/20261017_211324.jpg',
    secondary_image_url: '/slips/20261017_211324_rick_2109.jpg',
    image_sha256: '3c1b69a7e7b05253560753de5c6a3a2eda800f760814fb15f963f08ca106384b',
    image_dhash: '7369292b29236b69',
    capture_note:
      'Deduplicated across 2 uploads: Slip 3 of 3 in 20261017_211324.jpg (Bottom-Left, 9:13 PM) + Single Scan in Scan_20261017_212309.jpg (9:23 PM)',
    status: 'approved',
    created_at: '2026-10-17T21:09:00-04:00',
  },
];
