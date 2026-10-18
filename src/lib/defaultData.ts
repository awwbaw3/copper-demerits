import { Member, StaffAlias, DemeritSlip } from '../types/demerits';

export const MEMBER_IDS = {
  RICK: '11111111-1111-4111-8111-111111111101',
  BURTIS: '11111111-1111-4111-8111-111111111102',
  SARAH: '11111111-1111-4111-8111-111111111103',
  MATT_BARNES: '11111111-1111-4111-8111-111111111104',
} as const;

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

export const DEFAULT_DEMERITS: DemeritSlip[] = [
  {
    id: '22222222-2222-4222-8222-222222222201',
    patron_id: MEMBER_IDS.RICK,
    raw_student: 'Rick',
    issuer_id: MEMBER_IDS.SARAH,
    raw_signature: 'The Boss - AKA Sarah',
    demerit_count: 3,
    incident_date: '2026-10-17',
    incident_time: '21:09',
    location_area: 'Copper Athletic Club',
    infractions: [
      'Too many seat moves',
      'Tried to order Gin & Diet Coke',
      'The headband',
    ],
    image_url: null,
    status: 'approved',
    created_at: '2026-10-17T21:09:00Z',
  },
  {
    id: '22222222-2222-4222-8222-222222222203',
    patron_id: null,
    raw_student: 'Anonymous Patron',
    issuer_id: MEMBER_IDS.BURTIS,
    raw_signature: 'Burtis',
    demerit_count: 1,
    incident_date: '2026-10-14',
    incident_time: '20:42',
    location_area: 'Copper Athletic Club',
    infractions: ['Whistling at bartender'],
    image_url: null,
    status: 'approved',
    created_at: '2026-10-14T20:42:00Z',
  },
  {
    id: '22222222-2222-4222-8222-222222222202',
    patron_id: MEMBER_IDS.BURTIS,
    raw_student: 'Burtis',
    issuer_id: MEMBER_IDS.MATT_BARNES,
    raw_signature: 'Matt Barnes',
    demerit_count: 2,
    incident_date: '2026-10-10',
    incident_time: '22:15',
    location_area: 'Copper Athletic Club',
    infractions: ['Unapproved shift departure', 'Stole citrus garnish'],
    image_url: null,
    status: 'approved',
    created_at: '2026-10-10T22:15:00Z',
  },
  {
    id: '22222222-2222-4222-8222-222222222204',
    patron_id: MEMBER_IDS.RICK,
    raw_student: 'Rick',
    issuer_id: MEMBER_IDS.SARAH,
    raw_signature: 'Sarah',
    demerit_count: 2,
    incident_date: '2026-09-28',
    incident_time: '19:30',
    location_area: 'Copper Athletic Club',
    infractions: ['Complaining about fantasy football trade'],
    image_url: null,
    status: 'approved',
    created_at: '2026-09-28T19:30:00Z',
  },
];
