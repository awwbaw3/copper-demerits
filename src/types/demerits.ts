export type SlipStatus = 'pending' | 'approved' | 'rejected';

export type NotificationChannelPreference = 'none' | 'email' | 'text' | 'both';

export interface NotificationPreferences {
  leader_crowned: NotificationChannelPreference;
  leader_dethroned: NotificationChannelPreference;
  slip_cited: NotificationChannelPreference;
  ref_override: NotificationChannelPreference;
  friday_digest: NotificationChannelPreference;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  leader_crowned: 'none',
  leader_dethroned: 'none',
  slip_cited: 'none',
  ref_override: 'none',
  friday_digest: 'none',
};

export interface Member {
  id: string;
  display_name: string;
  is_staff: boolean;
  is_patron: boolean;
  is_admin?: boolean;
  is_claimed?: boolean;
  claimed_at?: string | null;
  favorite_team?: string | null;
  tagline?: string | null;
  notification_email?: string;
  notification_phone?: string;
  notification_carrier?: string;
  notification_opt_in?: boolean;
  notification_verified?: boolean;
  notification_preferences?: NotificationPreferences;
  created_at?: string;
}

export interface StaffAlias {
  id: string;
  alias: string; // lowercase unique
  member_id: string;
  created_at?: string;
}

export interface DemeritLineItem {
  type: string; // e.g. 'Attendance / No-Show', 'Insubordination / Defiance', 'Bar Etiquette / Seating', 'Drink Crime / Order Foul', 'Attire / Headgear Foul'
  description: string; // Specific offense written on slip
  points: number; // Number of demerits assigned to this line item
}

export interface SlipReactions {
  buy_round: number;
  tough_call: number;
  two_mins: number;
  instant_classic: number;
}

export type SlipReactionKey = keyof SlipReactions;

export interface MergeProfilesPayload {
  sourceMemberId: string;
  targetMemberId: string;
  primaryDisplayName?: string;
  sourcePin?: string;
}

export interface CorrectSlipPayload {
  rawStudent?: string;
  patronId?: string | null;
  rawSignature?: string;
  issuerId?: string | null;
  infractions?: string[];
  demeritItems?: DemeritLineItem[];
  demeritCount?: number;
  incidentDate?: string;
  incidentTime?: string | null;
  locationArea?: string;
  correctionNote?: string;
}

export interface DemeritSlip {
  id: string;
  patron_id: string | null;
  raw_student: string;
  issuer_id: string | null;
  raw_signature: string;
  submitted_by_member_id?: string | null;
  demerit_count: number;
  incident_date: string; // YYYY-MM-DD
  incident_time: string | null; // HH:MM
  location_area: string;
  infractions: string[];
  demerit_items?: DemeritLineItem[];
  image_url: string | null;
  source_image_url?: string | null;
  secondary_image_url?: string | null;
  image_sha256?: string | null;
  image_dhash?: string | null;
  capture_note?: string | null;
  status: SlipStatus;
  is_blurred?: boolean;
  moderation_flag_reason?: string | null;
  original_infractions?: string[] | null;
  reactions?: SlipReactions;
  created_at?: string;
}

export interface EnrichedDemeritSlip extends DemeritSlip {
  patron: Member | null;
  issuer: Member | null;
  patronDisplayName: string;
  issuerDisplayName: string;
  matchedAlias: string | null;
  resolvedItems: DemeritLineItem[];
}

export interface PatronStanding {
  memberId: string | null;
  displayName: string;
  isStaff: boolean;
  isPatron: boolean;
  isAnonymous: boolean;
  totalDemerits: number; // Sum of demerit points in the selected period & type filter
  slipCount: number; // Count of unique physical slips in the selected period
  offenseCount: number; // Count of itemized demerit offenses in the selected period
  netScore: number;
  latestIncidentDate: string | null;
  latestIncidentTime: string | null;
  recentInfractions: string[];
  byType: Record<string, { points: number; count: number }>;
  slips: EnrichedDemeritSlip[];
}

export interface DemeritTypeSummary {
  type: string;
  totalPoints: number;
  offenseCount: number;
  leaderName: string;
  leaderPoints: number;
}

export type PeriodMode = 'all-time' | 'this-month' | 'this-week' | 'today' | 'oct-17-session' | 'custom';

export interface LeaderboardPeriodFilter {
  mode: PeriodMode;
  startDate?: string | null;
  endDate?: string | null;
  demeritType?: string | null; // 'all' or specific type
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
