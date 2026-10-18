export type SlipStatus = 'pending' | 'approved' | 'rejected';

export interface Member {
  id: string;
  display_name: string;
  is_staff: boolean;
  is_patron: boolean;
  created_at?: string;
}

export interface StaffAlias {
  id: string;
  alias: string; // lowercase unique
  member_id: string;
  created_at?: string;
}

export interface DemeritSlip {
  id: string;
  patron_id: string | null;
  raw_student: string;
  issuer_id: string | null;
  raw_signature: string;
  demerit_count: number;
  incident_date: string; // YYYY-MM-DD
  incident_time: string | null; // HH:MM or HH:MM:SS
  location_area: string;
  infractions: string[];
  image_url: string | null;
  status: SlipStatus;
  created_at?: string;
}

export interface EnrichedDemeritSlip extends DemeritSlip {
  patron: Member | null;
  issuer: Member | null;
  patronDisplayName: string;
  issuerDisplayName: string;
  matchedAlias: string | null;
}

export interface PatronStanding {
  memberId: string | null;
  displayName: string;
  isStaff: boolean;
  isPatron: boolean;
  isAnonymous: boolean;
  totalDemerits: number; // Total demerit points received
  slipCount: number; // Number of slips received
  issuedDemerits: number; // Total demerit points issued as staff
  issuedSlipCount: number; // Number of slips issued as staff
  netScore: number; // totalDemerits - issuedDemerits
  latestIncidentDate: string | null;
  recentInfractions: string[];
  slips: EnrichedDemeritSlip[];
}

export interface StaffEnforcerStanding {
  member: Member;
  aliases: string[];
  issuedDemerits: number;
  issuedSlipCount: number;
  latestIssuedDate: string | null;
}

export type TimeframeFilter = 'all-time' | 'current-month' | '2026-10' | '2026-09';
