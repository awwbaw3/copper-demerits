import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Member,
  StaffAlias,
  DemeritSlip,
  DemeritLineItem,
  EnrichedDemeritSlip,
  PatronStanding,
  DemeritTypeSummary,
  LeaderboardPeriodFilter,
  SlipStatus,
  SlipReactionKey,
  UploadedSourceFile,
  NotificationPreferences,
} from '../types/demerits';
import {
  DEFAULT_MEMBERS,
  DEFAULT_STAFF_ALIASES,
  DEFAULT_DEMERITS,
  FABRICATED_SEED_SLIP_IDS,
  UPLOADED_SOURCE_FILES,
  normalizeSlipDemeritItems,
} from '../lib/defaultData';
import { cloudflareFetch, isCloudflareConfigured } from '../lib/supabase';
import {
  checkDuplicateSlipImage,
  checkDuplicateCitationContent,
  DuplicateCheckResult,
  fingerprintImageUrl,
  ImageFingerprint,
} from '../lib/imageDedup';
import { moderateTextInstant, scanWithRefereeMonitor } from '../lib/moderation';

const STORAGE_KEYS = {
  MEMBERS: 'cac_demerits_members_v6',
  ALIASES: 'cac_demerits_aliases_v6',
  SLIPS: 'cac_demerits_slips_v6',
  AUTO_APPROVE: 'cac_demerits_auto_approve_v6',
  ACTIVE_MEMBER: 'cac_demerits_active_member_v6',
  ACTIVE_PIN: 'cac_demerits_active_pin_v6',
};

export interface NewSlipPayload {
  raw_student: string;
  raw_signature: string;
  submitted_by_member_id?: string | null;
  demerit_count: number;
  incident_date: string;
  incident_time: string | null;
  location_area: string;
  infractions: string[];
  demerit_items?: DemeritLineItem[];
  image_url: string;
  source_image_url?: string | null;
  secondary_image_url?: string | null;
  image_sha256?: string | null;
  image_dhash?: string | null;
  capture_note?: string | null;
  is_blurred?: boolean;
  moderation_flag_reason?: string | null;
  createPatronIfNew?: boolean;
  allowMultiSlipBatch?: boolean;
  mergeIfCitationDuplicate?: boolean;
}

export interface ClaimProfilePayload {
  action?: 'login' | 'claim' | 'new';
  loginIdentifier?: string;
  memberId?: string;
  displayName?: string;
  pin: string;
  email?: string;
  phone?: string;
  favoriteTeam?: string;
  tagline?: string;
  role?: 'staff' | 'patron' | 'both';
  notificationPreferences?: NotificationPreferences;
}

export interface UpdateMyProfilePayload {
  memberId: string;
  currentPin: string;
  newPin?: string;
  displayName?: string;
  tagline?: string;
  favoriteTeam?: string;
  notificationEmail?: string;
  notificationPhone?: string;
  notificationCarrier?: string;
  notificationOptIn?: boolean;
  notificationPreferences?: NotificationPreferences;
}

interface DemeritsContextValue {
  members: Member[];
  aliases: StaffAlias[];
  demerits: EnrichedDemeritSlip[];
  uploadedSourceFiles: UploadedSourceFile[];
  loading: boolean;
  isSupabaseConnected: boolean;
  isCloudflareConnected: boolean;
  currentMember: Member | null;
  activePin: string;
  isAdminOrStaff: boolean;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (open: boolean) => void;
  claimOrLoginProfile: (
    payload: ClaimProfilePayload
  ) => Promise<{ ok: boolean; member?: Member; mode?: string; error?: string }>;
  updateMyProfile: (
    payload: UpdateMyProfilePayload
  ) => Promise<{ ok: boolean; member?: Member; error?: string }>;
  requestNotificationVerification: (payload: {
    memberId: string;
    pin: string;
    email?: string;
    phone?: string;
    carrier?: string;
    optInAccepted: boolean;
  }) => Promise<{ ok: boolean; message?: string; verificationCodePreview?: string; error?: string }>;
  verifyNotificationCode: (payload: {
    memberId: string;
    pin: string;
    code: string;
  }) => Promise<{ ok: boolean; member?: Member; error?: string }>;
  logoutProfile: () => void;
  sendFridayDigestTest: () => Promise<{ ok: boolean; message?: string; preview?: any; error?: string }>;
  autoApproveSubmissions: boolean;
  setAutoApproveSubmissions: (val: boolean) => void;
  resolveStaffSignature: (rawSignature: string) => { member: Member | null; matchedAlias: string | null };
  resolvePatronNickname: (rawStudent: string) => { member: Member | null; matchedAlias: string | null };
  resolvePatronName: (rawStudent: string) => Member | null;
  checkImageDuplicate: (
    fingerprint: Pick<ImageFingerprint, 'sha256' | 'dhash' | 'rotatedDhashes'>
  ) => DuplicateCheckResult;
  checkCitationDuplicate: (candidate: {
    raw_student: string;
    incident_date: string;
    incident_time: string | null;
    demerit_count: number;
    infractions: string[];
  }) => DuplicateCheckResult;
  computeStandings: (filter?: LeaderboardPeriodFilter | string | null) => {
    patronStandings: PatronStanding[];
    anonymousStanding: PatronStanding | null;
    typeSummaries: DemeritTypeSummary[];
    periodSlips: EnrichedDemeritSlip[];
  };
  submitDemeritSlip: (
    payload: NewSlipPayload
  ) => Promise<{
    slip: EnrichedDemeritSlip;
    wasMergedDuplicate: boolean;
    wasBlurredAndQueued?: boolean;
    moderationReason?: string | null;
  }>;
  reactToSlip: (slipId: string, reaction: SlipReactionKey) => Promise<void>;
  adminOverrideSlip: (
    slipId: string,
    action: 'approve_unblur' | 'approve_keep_blurred' | 'reject'
  ) => Promise<{ ok: boolean; error?: string }>;
  updateSlipStatus: (id: string, status: SlipStatus) => Promise<void>;
  deleteSlip: (id: string) => Promise<void>;
  updateSlipAssignment: (id: string, patronId: string | null, issuerId: string | null) => Promise<void>;
  addStaffAlias: (alias: string, memberId: string) => Promise<{ ok: boolean; mergedCount?: number; error?: string }>;
  deleteStaffAlias: (id: string) => Promise<{ ok: boolean; error?: string }>;
  rerunAliasNormalization: () => Promise<number>;
  addOrUpdateMember: (displayName: string, isPatron: boolean, isStaff: boolean) => Promise<Member>;
  deduplicateExistingSlips: () => Promise<number>;
}

const DemeritsContext = createContext<DemeritsContextValue | undefined>(undefined);

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function sanitizeMembersList(list: Member[]): Member[] {
  return list
    .filter(
      (m) =>
        m &&
        m.id !== '44444444-4444-4444-8444-444444444444' &&
        m.display_name.trim().toLowerCase() !== 'matt barnes'
    )
    .map((m) => ({
      ...m,
      is_admin: m.id === '11111111-1111-4111-8111-111111111111' ? true : Boolean(m.is_admin),
    }));
}

function sanitizeAliasesList(list: StaffAlias[]): StaffAlias[] {
  return list.filter(
    (a) =>
      a &&
      a.member_id !== '44444444-4444-4444-8444-444444444444' &&
      !a.alias.toLowerCase().includes('douche') &&
      !a.alias.toLowerCase().includes('matt') &&
      !moderateTextInstant(a.alias).flagged
  );
}

function sanitizeAndDeduplicateSlips(slips: DemeritSlip[]): DemeritSlip[] {
  const valid = slips.filter(
    (s) =>
      s &&
      !FABRICATED_SEED_SLIP_IDS.has(s.id) &&
      typeof s.image_url === 'string' &&
      s.image_url.trim().length > 0
  );

  if (valid.length === 0) {
    return DEFAULT_DEMERITS;
  }

  const deduped: DemeritSlip[] = [];
  for (const s of valid) {
    const normStudent = s.raw_student.trim().toLowerCase();
    const normDate = s.incident_date.trim();
    const normTime = s.incident_time ? s.incident_time.trim().slice(0, 5) : '';

    const existingIdx = deduped.findIndex((existing) => {
      const exStudent = existing.raw_student.trim().toLowerCase();
      const exDate = existing.incident_date.trim();
      const exTime = existing.incident_time ? existing.incident_time.trim().slice(0, 5) : '';
      return exStudent === normStudent && exDate === normDate && exTime !== '' && exTime === normTime;
    });

    if (existingIdx >= 0) {
      const existing = deduped[existingIdx];
      if (!existing.secondary_image_url && s.image_url !== existing.image_url) {
        deduped[existingIdx] = {
          ...existing,
          secondary_image_url: s.image_url,
          capture_note:
            existing.capture_note ||
            `Deduplicated & merged across 2 uploads (${existing.incident_time || ''} citation)`,
        };
      }
      continue;
    }

    const items = normalizeSlipDemeritItems(s);
    const isBurtisCursiveSlip = s.id === 'a2222222-2222-4222-8222-222222222222';
    deduped.push({
      ...s,
      issuer_id: isBurtisCursiveSlip ? '33333333-3333-4333-8333-333333333333' : s.issuer_id,
      raw_signature: isBurtisCursiveSlip ? 'Sarah (Cursive Signature)' : s.raw_signature,
      incident_time: normTime || null,
      demerit_items: items,
      reactions: s.reactions || {
        buy_round: 0,
        tough_call: 0,
        two_mins: 0,
        instant_classic: 0,
      },
    });
  }

  return deduped;
}

export const DemeritsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [members, setMembers] = useState<Member[]>(() =>
    sanitizeMembersList(loadFromStorage(STORAGE_KEYS.MEMBERS, DEFAULT_MEMBERS))
  );
  const [aliases, setAliases] = useState<StaffAlias[]>(() =>
    sanitizeAliasesList(loadFromStorage(STORAGE_KEYS.ALIASES, DEFAULT_STAFF_ALIASES))
  );
  const [rawSlips, setRawSlips] = useState<DemeritSlip[]>(() =>
    sanitizeAndDeduplicateSlips(loadFromStorage(STORAGE_KEYS.SLIPS, DEFAULT_DEMERITS))
  );
  const [currentMember, setCurrentMember] = useState<Member | null>(() =>
    loadFromStorage<Member | null>(STORAGE_KEYS.ACTIVE_MEMBER, null)
  );
  const [activePin, setActivePin] = useState<string>(() =>
    loadFromStorage<string>(STORAGE_KEYS.ACTIVE_PIN, '')
  );
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [autoApproveSubmissions, setAutoApproveState] = useState<boolean>(() =>
    loadFromStorage(STORAGE_KEYS.AUTO_APPROVE, true)
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [isCloudflareConnected, setIsCloudflareConnected] = useState<boolean>(false);

  const isAdminOrStaff = Boolean(
    currentMember &&
      (currentMember.is_admin ||
        currentMember.is_staff ||
        currentMember.id === '11111111-1111-4111-8111-111111111111')
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
    } catch {
      // Ignore
    }
  }, [members]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ALIASES, JSON.stringify(aliases));
    } catch {
      // Ignore
    }
  }, [aliases]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SLIPS, JSON.stringify(rawSlips));
    } catch {
      // Ignore
    }
  }, [rawSlips]);

  useEffect(() => {
    try {
      if (currentMember) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_MEMBER, JSON.stringify(currentMember));
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_MEMBER);
      }
    } catch {
      // Ignore
    }
  }, [currentMember]);

  useEffect(() => {
    try {
      if (activePin) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_PIN, JSON.stringify(activePin));
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_PIN);
      }
    } catch {
      // Ignore
    }
  }, [activePin]);

  const setAutoApproveSubmissions = useCallback((val: boolean) => {
    setAutoApproveState(val);
    try {
      localStorage.setItem(STORAGE_KEYS.AUTO_APPROVE, JSON.stringify(val));
    } catch {
      // Ignore
    }
  }, []);

  // Sync with Cloudflare D1 + R2 Worker API (`https://api.copperdemerits.com/api/bootstrap`)
  useEffect(() => {
    if (!isCloudflareConfigured) return;

    let cancelled = false;
    async function syncCloudflare() {
      setLoading(true);
      try {
        const data = await cloudflareFetch<{
          ok: boolean;
          members: Member[];
          aliases: StaffAlias[];
          demerits: DemeritSlip[];
        }>('/api/bootstrap');

        if (cancelled || !data?.ok) return;

        if (Array.isArray(data.members) && data.members.length > 0) {
          const cleanMembers = sanitizeMembersList(data.members);
          setMembers(cleanMembers);
          setCurrentMember((prev) => {
            if (!prev) return null;
            const refreshed = cleanMembers.find((m) => m.id === prev.id);
            return refreshed ? { ...prev, ...refreshed } : prev;
          });
        }
        if (Array.isArray(data.aliases) && data.aliases.length > 0) {
          setAliases(sanitizeAliasesList(data.aliases));
        }
        if (Array.isArray(data.demerits) && data.demerits.length > 0) {
          const remoteSlips = sanitizeAndDeduplicateSlips(
            data.demerits.map((s) => ({
              ...s,
              infractions: Array.isArray(s.infractions) ? s.infractions : [],
              demerit_items: normalizeSlipDemeritItems(s),
              incident_time: s.incident_time ? s.incident_time.slice(0, 5) : null,
            }))
          );
          setRawSlips(remoteSlips);
        }
        setIsCloudflareConnected(true);
      } catch {
        // Fallback to local state if offline
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    syncCloudflare();
    return () => {
      cancelled = true;
    };
  }, []);

  const claimOrLoginProfile = useCallback(
    async (
      payload: ClaimProfilePayload
    ): Promise<{ ok: boolean; member?: Member; mode?: string; error?: string }> => {
      const cleanPin = (payload.pin || '').trim();
      if (cleanPin.length < 4 || cleanPin.length > 8) {
        return { ok: false, error: 'Please enter a 4 to 8 digit Bar PIN.' };
      }

      const modCheck = moderateTextInstant(
        `${payload.displayName || ''} ${payload.tagline || ''}`
      );
      if (modCheck.flagged) {
        return {
          ok: false,
          error: `Referee Whistle: Please keep names and taglines friendly, jovial, and profanity-free!`,
        };
      }

      try {
        const res = await cloudflareFetch<{
          ok: boolean;
          mode: string;
          member: Member;
        }>('/api/claim-profile', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        if (res.ok && res.member) {
          setMembers((prev) => {
            const exists = prev.some((m) => m.id === res.member.id);
            if (exists) {
              return prev.map((m) => (m.id === res.member.id ? { ...m, ...res.member } : m));
            }
            return [...prev, res.member];
          });
          setCurrentMember(res.member);
          setActivePin(cleanPin);
          return { ok: true, member: res.member, mode: res.mode };
        }
        return { ok: false, error: 'Could not claim profile.' };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : 'Profile verification failed.',
        };
      }
    },
    []
  );

  const updateMyProfile = useCallback(
    async (
      payload: UpdateMyProfilePayload
    ): Promise<{ ok: boolean; member?: Member; error?: string }> => {
      const modCheck = moderateTextInstant(
        `${payload.displayName || ''} ${payload.tagline || ''}`
      );
      if (modCheck.flagged) {
        return {
          ok: false,
          error:
            'Referee Whistle: Please keep your display name and bar tagline friendly and profanity-free!',
        };
      }

      try {
        const res = await cloudflareFetch<{ ok: boolean; member: Member }>('/api/my-profile', {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        if (res.ok && res.member) {
          setMembers((prev) =>
            prev.map((m) => (m.id === res.member.id ? { ...m, ...res.member } : m))
          );
          setCurrentMember(res.member);
          if (payload.newPin && payload.newPin.trim().length >= 4) {
            setActivePin(payload.newPin.trim());
          } else if (payload.currentPin) {
            setActivePin(payload.currentPin.trim());
          }
          return { ok: true, member: res.member };
        }
        return { ok: false, error: 'Could not update profile.' };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : 'Could not update profile.',
        };
      }
    },
    []
  );

  const requestNotificationVerification = useCallback(
    async (payload: {
      memberId: string;
      pin: string;
      email?: string;
      phone?: string;
      carrier?: string;
      optInAccepted: boolean;
    }): Promise<{
      ok: boolean;
      message?: string;
      verificationCodePreview?: string;
      error?: string;
    }> => {
      try {
        const res = await cloudflareFetch<{
          ok: boolean;
          message: string;
          verificationCodePreview?: string;
        }>('/api/notifications/send-code', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        return {
          ok: true,
          message: res.message,
          verificationCodePreview: res.verificationCodePreview,
        };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : 'Could not send verification code.',
        };
      }
    },
    []
  );

  const verifyNotificationCode = useCallback(
    async (payload: {
      memberId: string;
      pin: string;
      code: string;
    }): Promise<{ ok: boolean; member?: Member; error?: string }> => {
      try {
        const res = await cloudflareFetch<{ ok: boolean; member: Member }>(
          '/api/notifications/verify-code',
          {
            method: 'POST',
            body: JSON.stringify(payload),
          }
        );
        if (res.ok && res.member) {
          setMembers((prev) =>
            prev.map((m) => (m.id === res.member.id ? { ...m, ...res.member } : m))
          );
          setCurrentMember(res.member);
          return { ok: true, member: res.member };
        }
        return { ok: false, error: 'Verification failed.' };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : 'Invalid verification code.',
        };
      }
    },
    []
  );

  const logoutProfile = useCallback(() => {
    setCurrentMember(null);
    setActivePin('');
  }, []);

  const sendFridayDigestTest = useCallback(
    async (): Promise<{ ok: boolean; message?: string; preview?: any; error?: string }> => {
      if (!currentMember || !activePin) {
        return { ok: false, error: 'Sign in with your Admin/Ref PIN first.' };
      }
      try {
        const res = await cloudflareFetch<{ ok: boolean; message: string; preview: any }>(
          '/api/notifications/friday-digest-test',
          {
            method: 'POST',
            body: JSON.stringify({
              memberId: currentMember.id,
              pin: activePin,
            }),
          }
        );
        return { ok: true, message: res.message, preview: res.preview };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : 'Could not trigger test Friday Docket.',
        };
      }
    },
    [currentMember, activePin]
  );

  const resolveStaffSignature = useCallback(
    (rawSignature: string): { member: Member | null; matchedAlias: string | null } => {
      const normalized = rawSignature.trim().toLowerCase();
      if (!normalized) return { member: null, matchedAlias: null };

      const exactAlias = aliases.find((a) => a.alias.toLowerCase() === normalized);
      if (exactAlias) {
        const staffMember = members.find((m) => m.id === exactAlias.member_id) || null;
        return { member: staffMember, matchedAlias: exactAlias.alias };
      }

      const directStaff = members.find(
        (m) => m.is_staff && m.display_name.trim().toLowerCase() === normalized
      );
      if (directStaff) {
        return { member: directStaff, matchedAlias: directStaff.display_name.toLowerCase() };
      }

      const sortedAliases = [...aliases].sort((a, b) => b.alias.length - a.alias.length);
      for (const candidate of sortedAliases) {
        if (normalized.includes(candidate.alias.toLowerCase())) {
          const staffMember = members.find((m) => m.id === candidate.member_id) || null;
          if (staffMember) {
            return { member: staffMember, matchedAlias: candidate.alias };
          }
        }
      }

      return { member: null, matchedAlias: null };
    },
    [aliases, members]
  );

  const resolvePatronNickname = useCallback(
    (rawStudent: string): { member: Member | null; matchedAlias: string | null } => {
      const normalized = rawStudent.trim().toLowerCase();
      if (
        !normalized ||
        normalized === 'anonymous' ||
        normalized === 'anonymous patron' ||
        normalized === 'unknown'
      ) {
        return { member: null, matchedAlias: null };
      }

      // 1. Exact display_name match
      const directPatron = members.find(
        (m) => m.is_patron && m.display_name.trim().toLowerCase() === normalized
      );
      if (directPatron) {
        return { member: directPatron, matchedAlias: directPatron.display_name.toLowerCase() };
      }

      // 2. Exact nickname/alias match in aliases
      const exactAlias = aliases.find((a) => a.alias.toLowerCase() === normalized);
      if (exactAlias) {
        const matchedMember = members.find((m) => m.id === exactAlias.member_id) || null;
        if (matchedMember) {
          return { member: matchedMember, matchedAlias: exactAlias.alias };
        }
      }

      // 3. Substring nickname match (longest alias first, min 3 chars)
      const sortedAliases = [...aliases]
        .filter((a) => a.alias.trim().length >= 3)
        .sort((a, b) => b.alias.length - a.alias.length);
      for (const candidate of sortedAliases) {
        if (normalized.includes(candidate.alias.toLowerCase())) {
          const matchedMember = members.find((m) => m.id === candidate.member_id) || null;
          if (matchedMember) {
            return { member: matchedMember, matchedAlias: candidate.alias };
          }
        }
      }

      // 4. Substring display_name match
      for (const m of members) {
        const dName = m.display_name.trim().toLowerCase();
        if (m.is_patron && dName.length >= 3 && normalized.includes(dName)) {
          return { member: m, matchedAlias: dName };
        }
      }

      return { member: null, matchedAlias: null };
    },
    [aliases, members]
  );

  const resolvePatronName = useCallback(
    (rawStudent: string): Member | null => {
      return resolvePatronNickname(rawStudent).member;
    },
    [resolvePatronNickname]
  );

  const checkImageDuplicate = useCallback(
    (
      fingerprint: Pick<ImageFingerprint, 'sha256' | 'dhash' | 'rotatedDhashes'>
    ): DuplicateCheckResult => {
      return checkDuplicateSlipImage(fingerprint, rawSlips);
    },
    [rawSlips]
  );

  const checkCitationDuplicate = useCallback(
    (candidate: {
      raw_student: string;
      incident_date: string;
      incident_time: string | null;
      demerit_count: number;
      infractions: string[];
    }): DuplicateCheckResult => {
      return checkDuplicateCitationContent(candidate, rawSlips);
    },
    [rawSlips]
  );

  const demerits: EnrichedDemeritSlip[] = useMemo(() => {
    const validUploadedOnly = rawSlips.filter(
      (s) => !FABRICATED_SEED_SLIP_IDS.has(s.id) && Boolean(s.image_url)
    );

    const sorted = [...validUploadedOnly].sort((a, b) => {
      const dateCmp = b.incident_date.localeCompare(a.incident_date);
      if (dateCmp !== 0) return dateCmp;
      return (b.incident_time || '').localeCompare(a.incident_time || '');
    });

    return sorted.map((slip) => {
      const patron = slip.patron_id
        ? members.find((m) => m.id === slip.patron_id) || resolvePatronName(slip.raw_student)
        : resolvePatronName(slip.raw_student);

      const resolvedSig = resolveStaffSignature(slip.raw_signature);
      const issuer = slip.issuer_id
        ? members.find((m) => m.id === slip.issuer_id) || resolvedSig.member
        : resolvedSig.member;

      const resolvedItems = normalizeSlipDemeritItems(slip);

      return {
        ...slip,
        demerit_items: resolvedItems,
        resolvedItems,
        patron,
        issuer,
        patronDisplayName: patron ? patron.display_name : slip.raw_student || 'Anonymous Patron',
        issuerDisplayName: issuer ? issuer.display_name : slip.raw_signature || 'Staff',
        matchedAlias: resolvedSig.matchedAlias,
      };
    });
  }, [rawSlips, members, resolvePatronName, resolveStaffSignature]);

  const computeStandings = useCallback(
    (filterInput?: LeaderboardPeriodFilter | string | null) => {
      const filter: LeaderboardPeriodFilter =
        typeof filterInput === 'string' || !filterInput
          ? {
              mode:
                filterInput === 'current-month' || filterInput === 'this-month'
                  ? 'this-month'
                  : 'all-time',
            }
          : filterInput;

      const nowIso = new Date().toISOString().slice(0, 10);
      const monthPrefix = nowIso.slice(0, 7);

      const periodSlips = demerits.filter((s) => {
        if (s.status !== 'approved' || !s.image_url) return false;

        if (filter.mode === 'this-month') {
          return s.incident_date.startsWith(monthPrefix);
        }
        if (filter.mode === 'today') {
          return s.incident_date === nowIso;
        }
        if (filter.mode === 'oct-17-session') {
          return s.incident_date === '2026-10-17';
        }
        if (filter.mode === 'this-week') {
          const slipTime = new Date(`${s.incident_date}T12:00:00`).getTime();
          const nowTime = new Date(`${nowIso}T12:00:00`).getTime();
          const diffDays = (nowTime - slipTime) / (1000 * 60 * 60 * 24);
          return diffDays >= -1 && diffDays <= 7;
        }
        if (filter.mode === 'custom') {
          if (filter.startDate && s.incident_date < filter.startDate) return false;
          if (filter.endDate && s.incident_date > filter.endDate) return false;
          return true;
        }
        return true;
      });

      const typeMap = new Map<
        string,
        {
          totalPoints: number;
          offenseCount: number;
          byPatron: Map<string, number>;
        }
      >();

      for (const slip of periodSlips) {
        const patronName = slip.patronDisplayName;
        for (const item of slip.resolvedItems) {
          if (!typeMap.has(item.type)) {
            typeMap.set(item.type, {
              totalPoints: 0,
              offenseCount: 0,
              byPatron: new Map(),
            });
          }
          const tEntry = typeMap.get(item.type)!;
          tEntry.totalPoints += item.points;
          tEntry.offenseCount += 1;
          tEntry.byPatron.set(patronName, (tEntry.byPatron.get(patronName) || 0) + item.points);
        }
      }

      const typeSummaries: DemeritTypeSummary[] = Array.from(typeMap.entries())
        .map(([type, data]) => {
          let leaderName = '—';
          let leaderPoints = 0;
          for (const [pName, pts] of data.byPatron.entries()) {
            if (pts > leaderPoints) {
              leaderPoints = pts;
              leaderName = pName;
            }
          }
          return {
            type,
            totalPoints: data.totalPoints,
            offenseCount: data.offenseCount,
            leaderName,
            leaderPoints,
          };
        })
        .sort((a, b) => b.totalPoints - a.totalPoints || b.offenseCount - a.offenseCount);

      const activeTypeFilter =
        filter.demeritType && filter.demeritType !== 'all' ? filter.demeritType : null;

      const patronMap = new Map<string, PatronStanding>();
      let anonymousStanding: PatronStanding | null = null;

      for (const slip of periodSlips) {
        const matchingItems = activeTypeFilter
          ? slip.resolvedItems.filter((item) => item.type === activeTypeFilter)
          : slip.resolvedItems;

        if (matchingItems.length === 0) continue;

        const pointsFromSlip = activeTypeFilter
          ? matchingItems.reduce((sum, i) => sum + i.points, 0)
          : slip.demerit_count;

        const pId = slip.patron?.id || slip.patron_id;
        if (pId) {
          if (!patronMap.has(pId)) {
            const m = members.find((mem) => mem.id === pId);
            patronMap.set(pId, {
              memberId: pId,
              displayName: m?.display_name || slip.patronDisplayName,
              isStaff: Boolean(m?.is_staff),
              isPatron: true,
              isAnonymous: false,
              totalDemerits: 0,
              slipCount: 0,
              offenseCount: 0,
              netScore: 0,
              latestIncidentDate: null,
              latestIncidentTime: null,
              recentInfractions: [],
              byType: {},
              slips: [],
            });
          }
          const entry = patronMap.get(pId)!;
          entry.totalDemerits += pointsFromSlip;
          entry.slipCount += 1;
          entry.offenseCount += matchingItems.length;
          entry.netScore = entry.totalDemerits;
          entry.slips.push(slip);

          for (const item of matchingItems) {
            if (!entry.byType[item.type]) {
              entry.byType[item.type] = { points: 0, count: 0 };
            }
            entry.byType[item.type].points += item.points;
            entry.byType[item.type].count += 1;
            if (!entry.recentInfractions.includes(item.description)) {
              entry.recentInfractions.push(item.description);
            }
          }

          if (
            !entry.latestIncidentDate ||
            slip.incident_date > entry.latestIncidentDate ||
            (slip.incident_date === entry.latestIncidentDate &&
              (slip.incident_time || '') > (entry.latestIncidentTime || ''))
          ) {
            entry.latestIncidentDate = slip.incident_date;
            entry.latestIncidentTime = slip.incident_time;
          }
        } else {
          if (!anonymousStanding) {
            anonymousStanding = {
              memberId: null,
              displayName: slip.patronDisplayName || 'Anonymous Patron',
              isStaff: false,
              isPatron: true,
              isAnonymous: true,
              totalDemerits: 0,
              slipCount: 0,
              offenseCount: 0,
              netScore: 0,
              latestIncidentDate: null,
              latestIncidentTime: null,
              recentInfractions: [],
              byType: {},
              slips: [],
            };
          }
          anonymousStanding.totalDemerits += pointsFromSlip;
          anonymousStanding.slipCount += 1;
          anonymousStanding.offenseCount += matchingItems.length;
          anonymousStanding.netScore = anonymousStanding.totalDemerits;
          anonymousStanding.slips.push(slip);

          for (const item of matchingItems) {
            if (!anonymousStanding.byType[item.type]) {
              anonymousStanding.byType[item.type] = { points: 0, count: 0 };
            }
            anonymousStanding.byType[item.type].points += item.points;
            anonymousStanding.byType[item.type].count += 1;
            if (!anonymousStanding.recentInfractions.includes(item.description)) {
              anonymousStanding.recentInfractions.push(item.description);
            }
          }
        }
      }

      const patronStandings = Array.from(patronMap.values()).sort((a, b) => {
        if (b.totalDemerits !== a.totalDemerits) return b.totalDemerits - a.totalDemerits;
        if (b.offenseCount !== a.offenseCount) return b.offenseCount - a.offenseCount;
        if (b.slipCount !== a.slipCount) return b.slipCount - a.slipCount;
        return a.displayName.localeCompare(b.displayName);
      });

      return { patronStandings, anonymousStanding, typeSummaries, periodSlips };
    },
    [demerits, members]
  );

  const addOrUpdateMember = useCallback(
    async (displayName: string, isPatron: boolean, isStaff: boolean): Promise<Member> => {
      const trimmed = displayName.trim();
      const mod = moderateTextInstant(trimmed);
      if (mod.flagged) {
        throw new Error(
          'Referee Whistle: Member names must be friendly, jovial, and profanity-free!'
        );
      }

      const existing = members.find(
        (m) => m.display_name.toLowerCase() === trimmed.toLowerCase()
      );

      if (existing) {
        const updated: Member = {
          ...existing,
          display_name: trimmed,
          is_patron: isPatron,
          is_staff: isStaff,
        };
        setMembers((prev) => prev.map((m) => (m.id === existing.id ? updated : m)));
        if (isCloudflareConnected) {
          try {
            await cloudflareFetch('/api/members', {
              method: 'POST',
              body: JSON.stringify({
                display_name: trimmed,
                is_patron: isPatron,
                is_staff: isStaff,
              }),
            });
          } catch {
            // Keep local
          }
        }
        return updated;
      }

      const newMember: Member = {
        id: crypto.randomUUID(),
        display_name: trimmed,
        is_patron: isPatron,
        is_staff: isStaff,
        created_at: new Date().toISOString(),
      };

      if (isCloudflareConnected) {
        try {
          const res = await cloudflareFetch<{ ok: boolean; member: Member }>('/api/members', {
            method: 'POST',
            body: JSON.stringify({
              display_name: trimmed,
              is_patron: isPatron,
              is_staff: isStaff,
            }),
          });
          if (res.member?.id) {
            newMember.id = res.member.id;
          }
        } catch {
          // Keep local UUID
        }
      }

      setMembers((prev) => [...prev, newMember]);
      return newMember;
    },
    [members, isCloudflareConnected]
  );

  const submitDemeritSlip = useCallback(
    async (
      payload: NewSlipPayload
    ): Promise<{
      slip: EnrichedDemeritSlip;
      wasMergedDuplicate: boolean;
      wasBlurredAndQueued?: boolean;
      moderationReason?: string | null;
    }> => {
      if (!payload.image_url) {
        throw new Error('An uploaded slip photo is required.');
      }

      if (!payload.allowMultiSlipBatch && (payload.image_sha256 || payload.image_dhash)) {
        const imgDup = checkDuplicateSlipImage(
          {
            sha256: payload.image_sha256 || '',
            dhash: payload.image_dhash || '',
          },
          rawSlips
        );
        if (imgDup.isDuplicate) {
          throw new Error(
            `Duplicate image detected (${imgDup.similarityPercent ?? 100}% match with ${
              imgDup.matchedDescription ||
              `${(imgDup.matchedSlip?.patron_id ? members.find((m) => m.id === imgDup.matchedSlip?.patron_id)?.display_name : null) || imgDup.matchedSlip?.raw_student || 'patron'} slip at ${
                imgDup.matchedSlip?.incident_time || imgDup.matchedSlip?.incident_date
              }`
            }).`
          );
        }
      }

      const studentTrimmed = payload.raw_student.trim() || 'Anonymous Patron';
      const sigTrimmed = payload.raw_signature.trim() || 'Staff';
      const incidentDate = payload.incident_date || new Date().toISOString().slice(0, 10);
      const incidentTime = payload.incident_time ? payload.incident_time.slice(0, 5) : null;
      const cleanInfractions = payload.infractions.map((i) => i.trim()).filter(Boolean);

      // Run AI + Deterministic Referee Monitor on text fields
      const modScan = await scanWithRefereeMonitor([
        studentTrimmed,
        sigTrimmed,
        ...cleanInfractions,
      ]);

      const isFlaggedOrBlurred = Boolean(modScan.flagged || payload.is_blurred);
      const sanitizedStudent = modScan.sanitizedTexts[0] || studentTrimmed;
      const sanitizedSig = modScan.sanitizedTexts[1] || sigTrimmed;
      const sanitizedInfractions = cleanInfractions.map(
        (orig, idx) => modScan.sanitizedTexts[idx + 2] || orig
      );

      const citationDup = checkDuplicateCitationContent(
        {
          raw_student: sanitizedStudent,
          incident_date: incidentDate,
          incident_time: incidentTime,
          demerit_count: payload.demerit_count,
          infractions: sanitizedInfractions,
        },
        rawSlips
      );

      if (citationDup.isDuplicate && citationDup.matchedSlip) {
        if (payload.mergeIfCitationDuplicate !== false) {
          const target = citationDup.matchedSlip;
          const updatedSlip: DemeritSlip = {
            ...target,
            secondary_image_url: target.secondary_image_url || payload.image_url,
            capture_note: `Deduplicated across multiple uploads: matched ${sanitizedStudent} (${incidentDate} ${
              incidentTime || ''
            })`,
          };

          setRawSlips((prev) => prev.map((s) => (s.id === target.id ? updatedSlip : s)));

          if (isCloudflareConnected) {
            try {
              await cloudflareFetch(`/api/demerits/${target.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                  secondary_image_url: updatedSlip.secondary_image_url,
                  capture_note: updatedSlip.capture_note,
                }),
              });
            } catch {
              // Keep local
            }
          }

          const patron = resolvePatronName(updatedSlip.raw_student);
          const { member: issuer, matchedAlias } = resolveStaffSignature(updatedSlip.raw_signature);
          const resolvedItems = normalizeSlipDemeritItems(updatedSlip);

          return {
            wasMergedDuplicate: true,
            slip: {
              ...updatedSlip,
              resolvedItems,
              patron,
              issuer,
              patronDisplayName: patron ? patron.display_name : updatedSlip.raw_student,
              issuerDisplayName: issuer ? issuer.display_name : updatedSlip.raw_signature,
              matchedAlias,
            },
          };
        } else {
          throw new Error(
            `Duplicate citation detected: ${
              citationDup.matchedDescription || 'This slip is already logged.'
            }`
          );
        }
      }

      let patron = resolvePatronName(sanitizedStudent);
      if (
        !patron &&
        payload.createPatronIfNew !== false &&
        !isFlaggedOrBlurred &&
        !['anonymous', 'anonymous patron', 'unknown'].includes(sanitizedStudent.toLowerCase())
      ) {
        patron = await addOrUpdateMember(sanitizedStudent, true, false);
      }

      const { member: issuer, matchedAlias } = resolveStaffSignature(sanitizedSig);
      // Flagged/blurred slips ALWAYS go to 'pending' (Rick's Admin Override Queue)!
      const initialStatus: SlipStatus = isFlaggedOrBlurred
        ? 'pending'
        : autoApproveSubmissions
        ? 'approved'
        : 'pending';

      const sanitizedItems = (payload.demerit_items || []).map((item, idx) => ({
        ...item,
        description:
          sanitizedInfractions[idx] || moderateTextInstant(item.description || '').sanitized,
      }));

      const tempSlip: DemeritSlip = {
        id: crypto.randomUUID(),
        patron_id: patron ? patron.id : null,
        raw_student: sanitizedStudent,
        issuer_id: issuer ? issuer.id : null,
        raw_signature: sanitizedSig,
        submitted_by_member_id: payload.submitted_by_member_id || currentMember?.id || null,
        demerit_count: Math.max(1, Number(payload.demerit_count) || 1),
        incident_date: incidentDate,
        incident_time: incidentTime,
        location_area: payload.location_area.trim() || 'Copper Athletic Club',
        infractions: sanitizedInfractions,
        demerit_items: sanitizedItems,
        image_url: payload.image_url,
        source_image_url: payload.source_image_url || null,
        secondary_image_url: payload.secondary_image_url || null,
        image_sha256: payload.image_sha256 || null,
        image_dhash: payload.image_dhash || null,
        capture_note: payload.capture_note || null,
        status: initialStatus,
        is_blurred: isFlaggedOrBlurred,
        moderation_flag_reason: isFlaggedOrBlurred
          ? modScan.reason ||
            payload.moderation_flag_reason ||
            'Blurred by Referee Monitor — Queued for Site Admin (Rick) Override'
          : null,
        original_infractions: isFlaggedOrBlurred ? cleanInfractions : null,
        reactions: {
          buy_round: 0,
          tough_call: 0,
          two_mins: 0,
          instant_classic: 0,
        },
        created_at: new Date().toISOString(),
      };

      const resolvedItems = normalizeSlipDemeritItems(tempSlip);
      const newSlip: DemeritSlip = {
        ...tempSlip,
        demerit_items: resolvedItems,
      };

      let wasBlurredAndQueued = isFlaggedOrBlurred;
      let moderationReason = newSlip.moderation_flag_reason;

      if (isCloudflareConnected) {
        try {
          const res = await cloudflareFetch<{
            ok: boolean;
            wasBlurredAndQueued?: boolean;
            moderationReason?: string | null;
            slip: DemeritSlip;
          }>('/api/demerits', {
            method: 'POST',
            body: JSON.stringify({
              ...newSlip,
              infractions: cleanInfractions,
              demerit_items: payload.demerit_items,
            }),
          });
          if (res.slip?.id) {
            newSlip.id = res.slip.id;
            newSlip.status = res.slip.status;
            newSlip.is_blurred = res.slip.is_blurred;
            newSlip.moderation_flag_reason = res.slip.moderation_flag_reason;
            newSlip.infractions = res.slip.infractions;
          }
          if (res.wasBlurredAndQueued) {
            wasBlurredAndQueued = true;
            moderationReason = res.moderationReason || moderationReason;
          }
        } catch {
          // Keep local UUID
        }
      }

      setRawSlips((prev) => [newSlip, ...prev]);

      return {
        wasMergedDuplicate: false,
        wasBlurredAndQueued,
        moderationReason,
        slip: {
          ...newSlip,
          resolvedItems,
          patron,
          issuer,
          patronDisplayName: patron ? patron.display_name : newSlip.raw_student,
          issuerDisplayName: issuer ? issuer.display_name : newSlip.raw_signature,
          matchedAlias,
        },
      };
    },
    [
      rawSlips,
      resolvePatronName,
      resolveStaffSignature,
      addOrUpdateMember,
      autoApproveSubmissions,
      isCloudflareConnected,
      currentMember,
    ]
  );

  const reactToSlip = useCallback(
    async (slipId: string, reaction: SlipReactionKey) => {
      setRawSlips((prev) =>
        prev.map((s) => {
          if (s.id !== slipId) return s;
          const prevReactions = s.reactions || {
            buy_round: 0,
            tough_call: 0,
            two_mins: 0,
            instant_classic: 0,
          };
          return {
            ...s,
            reactions: {
              ...prevReactions,
              [reaction]: (prevReactions[reaction] || 0) + 1,
            },
          };
        })
      );

      if (isCloudflareConnected) {
        try {
          await cloudflareFetch(`/api/demerits/${slipId}/react`, {
            method: 'POST',
            body: JSON.stringify({ reaction }),
          });
        } catch {
          // Keep optimistic update
        }
      }
    },
    [isCloudflareConnected]
  );

  const adminOverrideSlip = useCallback(
    async (
      slipId: string,
      action: 'approve_unblur' | 'approve_keep_blurred' | 'reject'
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!currentMember || (!currentMember.is_admin && !currentMember.is_staff)) {
        return {
          ok: false,
          error: 'Only Site Admin (Rick) or verified Bar Staff can override queued slips.',
        };
      }

      if (action === 'reject') {
        setRawSlips((prev) => prev.filter((s) => s.id !== slipId));
      } else if (action === 'approve_unblur') {
        setRawSlips((prev) =>
          prev.map((s) => {
            if (s.id !== slipId) return s;
            const restoredInfractions =
              s.original_infractions && s.original_infractions.length > 0
                ? s.original_infractions
                : s.infractions;
            return {
              ...s,
              status: 'approved',
              is_blurred: false,
              moderation_flag_reason: 'Approved & Unblurred by Admin Override',
              infractions: restoredInfractions,
            };
          })
        );
      } else if (action === 'approve_keep_blurred') {
        setRawSlips((prev) =>
          prev.map((s) =>
            s.id === slipId ? { ...s, status: 'approved', is_blurred: true } : s
          )
        );
      }

      if (isCloudflareConnected) {
        try {
          await cloudflareFetch('/api/admin/override-slip', {
            method: 'POST',
            body: JSON.stringify({
              slipId,
              action,
              adminMemberId: currentMember.id,
            }),
          });
        } catch (err) {
          return {
            ok: false,
            error: err instanceof Error ? err.message : 'Admin override failed.',
          };
        }
      }

      return { ok: true };
    },
    [currentMember, isCloudflareConnected]
  );

  const updateSlipStatus = useCallback(
    async (id: string, status: SlipStatus) => {
      setRawSlips((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
      if (isCloudflareConnected) {
        try {
          await cloudflareFetch(`/api/demerits/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
          });
        } catch {
          // Keep local
        }
      }
    },
    [isCloudflareConnected]
  );

  const deleteSlip = useCallback(
    async (id: string) => {
      setRawSlips((prev) => prev.filter((s) => s.id !== id));
      if (isCloudflareConnected) {
        try {
          await cloudflareFetch(`/api/demerits/${id}`, {
            method: 'DELETE',
          });
        } catch {
          // Keep local
        }
      }
    },
    [isCloudflareConnected]
  );

  const updateSlipAssignment = useCallback(
    async (id: string, patronId: string | null, issuerId: string | null) => {
      setRawSlips((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, patron_id: patronId, issuer_id: issuerId } : s
        )
      );
      if (isCloudflareConnected) {
        try {
          await cloudflareFetch(`/api/demerits/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ patron_id: patronId, issuer_id: issuerId }),
          });
        } catch {
          // Keep local
        }
      }
    },
    [isCloudflareConnected]
  );

  const addStaffAlias = useCallback(
    async (
      alias: string,
      memberId: string
    ): Promise<{ ok: boolean; mergedCount?: number; error?: string }> => {
      const normalized = alias.trim().toLowerCase();
      if (!normalized) {
        return { ok: false, error: 'Nickname / alias cannot be empty.' };
      }

      if (!currentMember) {
        return {
          ok: false,
          error: 'Sign in to your claimed profile or Admin account to adjust nicknames.',
        };
      }

      const isOwnClaimedProfile = Boolean(
        currentMember.id === memberId && (currentMember.is_claimed ?? true)
      );
      if (!isAdminOrStaff && !isOwnClaimedProfile) {
        return {
          ok: false,
          error:
            'Only Site Admins or the claimed profile owner can adjust nicknames for this profile.',
        };
      }

      const mod = moderateTextInstant(normalized);
      if (mod.flagged) {
        return {
          ok: false,
          error:
            'Referee Whistle: Nicknames and aliases must be bar-friendly and cannot contain insults, name-calling, or profanity!',
        };
      }

      const duplicate = aliases.find((a) => a.alias.toLowerCase() === normalized);
      if (duplicate) {
        const owner = members.find((m) => m.id === duplicate.member_id);
        return {
          ok: false,
          error: `Nickname "${normalized}" is already mapped to ${owner?.display_name || 'a profile'}.`,
        };
      }

      const newAlias: StaffAlias = {
        id: crypto.randomUUID(),
        alias: normalized,
        member_id: memberId,
        created_at: new Date().toISOString(),
      };

      let mergedCount = 0;

      if (isCloudflareConnected) {
        try {
          const res = await cloudflareFetch<{
            ok: boolean;
            alias: StaffAlias;
            mergedCount?: number;
          }>('/api/aliases', {
            method: 'POST',
            body: JSON.stringify({
              alias: normalized,
              member_id: memberId,
              actor_member_id: currentMember.id,
              actor_pin: activePin,
            }),
          });
          if (res.alias?.id) {
            newAlias.id = res.alias.id;
          }
          if (typeof res.mergedCount === 'number') {
            mergedCount = res.mergedCount;
          }
        } catch (err) {
          return {
            ok: false,
            error: err instanceof Error ? err.message : 'Could not save nickname.',
          };
        }
      }

      setAliases((prev) => [...prev, newAlias]);

      const targetMember = members.find((m) => m.id === memberId);
      setRawSlips((prev) =>
        prev.map((s) => {
          const rawStudentNorm = s.raw_student.trim().toLowerCase();
          const rawSigNorm = s.raw_signature.trim().toLowerCase();
          let updated = s;
          if (
            targetMember?.is_patron &&
            (rawStudentNorm === normalized ||
              (normalized.length >= 3 && rawStudentNorm.includes(normalized)))
          ) {
            if (updated.patron_id !== memberId) {
              mergedCount++;
              updated = { ...updated, patron_id: memberId };
            }
          }
          if (
            targetMember?.is_staff &&
            (rawSigNorm === normalized ||
              (normalized.length >= 3 && rawSigNorm.includes(normalized)))
          ) {
            if (updated.issuer_id !== memberId) {
              mergedCount++;
              updated = { ...updated, issuer_id: memberId };
            }
          }
          return updated;
        })
      );

      return { ok: true, mergedCount };
    },
    [aliases, members, isCloudflareConnected, currentMember, isAdminOrStaff, activePin]
  );

  const deleteStaffAlias = useCallback(
    async (id: string): Promise<{ ok: boolean; error?: string }> => {
      const targetAlias = aliases.find((a) => a.id === id);
      if (!targetAlias) {
        return { ok: false, error: 'Nickname not found.' };
      }

      if (!currentMember) {
        return {
          ok: false,
          error: 'Sign in to your claimed profile or Admin account to remove nicknames.',
        };
      }

      const isOwnClaimedProfile = Boolean(
        currentMember.id === targetAlias.member_id && (currentMember.is_claimed ?? true)
      );
      if (!isAdminOrStaff && !isOwnClaimedProfile) {
        return {
          ok: false,
          error:
            'Only Site Admins or the claimed profile owner can remove nicknames from this profile.',
        };
      }

      setAliases((prev) => prev.filter((a) => a.id !== id));
      if (isCloudflareConnected) {
        try {
          const qs = new URLSearchParams({
            actor_member_id: currentMember.id,
            actor_pin: activePin || '',
          }).toString();
          await cloudflareFetch(`/api/aliases/${encodeURIComponent(id)}?${qs}`, {
            method: 'DELETE',
          });
        } catch (err) {
          return {
            ok: false,
            error: err instanceof Error ? err.message : 'Could not remove nickname.',
          };
        }
      }
      return { ok: true };
    },
    [aliases, currentMember, isAdminOrStaff, activePin, isCloudflareConnected]
  );

  const rerunAliasNormalization = useCallback(async (): Promise<number> => {
    let updatedCount = 0;
    setRawSlips((prev) =>
      prev.map((slip) => {
        const resolvedSig = resolveStaffSignature(slip.raw_signature);
        const resolvedPatron = resolvePatronName(slip.raw_student);
        const nextIssuerId = resolvedSig.member ? resolvedSig.member.id : slip.issuer_id;
        const nextPatronId = resolvedPatron ? resolvedPatron.id : slip.patron_id;

        if (nextIssuerId !== slip.issuer_id || nextPatronId !== slip.patron_id) {
          updatedCount += 1;
          return {
            ...slip,
            issuer_id: nextIssuerId,
            patron_id: nextPatronId,
          };
        }
        return slip;
      })
    );
    return updatedCount;
  }, [resolveStaffSignature, resolvePatronName]);

  const deduplicateExistingSlips = useCallback(async (): Promise<number> => {
    const kept: DemeritSlip[] = [];
    const removedIds: string[] = [];

    for (const slip of rawSlips) {
      if (!slip.image_url || FABRICATED_SEED_SLIP_IDS.has(slip.id)) {
        removedIds.push(slip.id);
        continue;
      }

      const citDup = checkDuplicateCitationContent(slip, kept);
      if (citDup.isDuplicate && citDup.matchedSlip) {
        const idx = kept.findIndex((k) => k.id === citDup.matchedSlip!.id);
        if (idx >= 0 && !kept[idx].secondary_image_url && slip.image_url !== kept[idx].image_url) {
          kept[idx] = {
            ...kept[idx],
            secondary_image_url: slip.image_url,
          };
        }
        removedIds.push(slip.id);
        continue;
      }

      const fp =
        slip.image_sha256 && slip.image_dhash
          ? { sha256: slip.image_sha256, dhash: slip.image_dhash }
          : await fingerprintImageUrl(slip.image_url);

      kept.push({
        ...slip,
        image_sha256: fp.sha256,
        image_dhash: fp.dhash,
      });
    }

    setRawSlips(kept);
    if (isCloudflareConnected && removedIds.length > 0) {
      for (const id of removedIds) {
        try {
          await cloudflareFetch(`/api/demerits/${id}`, { method: 'DELETE' });
        } catch {
          // Ignore
        }
      }
    }
    return removedIds.length;
  }, [rawSlips, isCloudflareConnected]);

  return (
    <DemeritsContext.Provider
      value={{
        members,
        aliases,
        demerits,
        uploadedSourceFiles: UPLOADED_SOURCE_FILES,
        loading,
        isSupabaseConnected: isCloudflareConnected,
        isCloudflareConnected,
        currentMember,
        activePin,
        isAdminOrStaff,
        isProfileModalOpen,
        setIsProfileModalOpen,
        claimOrLoginProfile,
        updateMyProfile,
        requestNotificationVerification,
        verifyNotificationCode,
        logoutProfile,
        sendFridayDigestTest,
        autoApproveSubmissions,
        setAutoApproveSubmissions,
        resolveStaffSignature,
        resolvePatronNickname,
        resolvePatronName,
        checkImageDuplicate,
        checkCitationDuplicate,
        computeStandings,
        submitDemeritSlip,
        reactToSlip,
        adminOverrideSlip,
        updateSlipStatus,
        deleteSlip,
        updateSlipAssignment,
        addStaffAlias,
        deleteStaffAlias,
        rerunAliasNormalization,
        addOrUpdateMember,
        deduplicateExistingSlips,
      }}
    >
      {children}
    </DemeritsContext.Provider>
  );
};

export function useDemerits(): DemeritsContextValue {
  const ctx = useContext(DemeritsContext);
  if (!ctx) {
    throw new Error('useDemerits must be used within a DemeritsProvider');
  }
  return ctx;
}
