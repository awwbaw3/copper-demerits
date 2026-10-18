import { Member, StaffAlias, DemeritSlip } from '../types/demerits';

export const MEMBER_IDS = {
  RICK: '11111111-1111-4111-8111-111111111101',
  BURTIS: '11111111-1111-4111-8111-111111111102',
  SARAH: '11111111-1111-4111-8111-111111111103',
  MATT_BARNES: '11111111-1111-4111-8111-111111111104',
} as const;

export const FABRICATED_SEED_SLIP_IDS = new Set([
  '22222222-2222-4222-8222-222222222201',
  '22222222-2222-4222-8222-222222222202',
  '22222222-2222-4222-8222-222222222203',
  '22222222-2222-4222-8222-222222222204',
]);

export const MAX_OFFICIAL_SLIPS = 4;

export const DEFAULT_MEMBERS: Member[] = [
  {
    id: MEMBER_IDS.RICK,
    display_name: 'Rick',
    is_staff: false,
    is_patron: true,
    created_at: '2026-09-01T18:00:00Z',
  },
  {
    id: MEMBER_IDS.BURTIS,
    display_name: 'Burtis',
    is_staff: true,
    is_patron: true,
    created_at: '2026-09-01T18:00:00Z',
  },
  {
    id: MEMBER_IDS.SARAH,
    display_name: 'Sarah',
    is_staff: true,
    is_patron: false,
    created_at: '2026-09-01T18:00:00Z',
  },
  {
    id: MEMBER_IDS.MATT_BARNES,
    display_name: 'Matt Barnes',
    is_staff: true,
    is_patron: false,
    created_at: '2026-09-01T18:00:00Z',
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
    id: '33333333-3333-4333-8333-333333333307',
    alias: 'burtis',
    member_id: MEMBER_IDS.BURTIS,
  },
];

// Strictly empty: only real uploaded slip images are permitted on the site.
export const DEFAULT_DEMERITS: DemeritSlip[] = [];
