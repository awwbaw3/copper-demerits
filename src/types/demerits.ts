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
  incident_time: string | null; // HH:MM
  location_area: string;
  infractions: string[];
  image_url: string | null;
  source_image_url?: string | null;
  secondary_image_url?: string | null;
  image_sha256?: string | null;
  image_dhash?: string | null;
  capture_note?: string | null;
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
  totalDemerits: number; // Strictly sum of demerit_count from deduplicated uploaded slips
  slipCount: number; // Strictly count of unique physical slips
  netScore: number; // Net demerit score from uploaded slip photos
  latestIncidentDate: string | null;
  latestIncidentTime: string | null;
  recentInfractions: string[];
  slips: EnrichedDemeritSlip[];
}

export interface UploadedSourceFile {
  id: string;
  filename: string;
  capturedAt: string;
  slipCountInImage: number;
  imageUrl: string;
  sha256: string;
  altSha256?: string;
  description: string;
  extractedSlips: {
    label: string;
    slipId: string;
    student: string;
    time: string;
    demerits: number;
    room: string;
    cropUrl: string;
    isDeduplicatedMerge?: boolean;
  }[];
}

export type TimeframeFilter = 'all-time' | 'current-month';
