import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Member,
  StaffAlias,
  DemeritSlip,
  EnrichedDemeritSlip,
  PatronStanding,
  SlipStatus,
  UploadedSourceFile,
} from '../types/demerits';
import {
  DEFAULT_MEMBERS,
  DEFAULT_STAFF_ALIASES,
  DEFAULT_DEMERITS,
  FABRICATED_SEED_SLIP_IDS,
  UPLOADED_SOURCE_FILES,
} from '../lib/defaultData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  checkDuplicateSlipImage,
  checkDuplicateCitationContent,
  DuplicateCheckResult,
  fingerprintImageUrl,
  ImageFingerprint,
} from '../lib/imageDedup';

const STORAGE_KEYS = {
  MEMBERS: 'cac_demerits_members_v2',
  ALIASES: 'cac_demerits_aliases_v2',
  SLIPS: 'cac_demerits_slips_v2',
  AUTO_APPROVE: 'cac_demerits_auto_approve_v2',
};

export interface NewSlipPayload {
  raw_student: string;
  raw_signature: string;
  demerit_count: number;
  incident_date: string;
  incident_time: string | null;
  location_area: string;
  infractions: string[];
  image_url: string;
  source_image_url?: string | null;
  secondary_image_url?: string | null;
  image_sha256?: string | null;
  image_dhash?: string | null;
  capture_note?: string | null;
  createPatronIfNew?: boolean;
  allowMultiSlipBatch?: boolean;
  mergeIfCitationDuplicate?: boolean;
}

interface DemeritsContextValue {
  members: Member[];
  aliases: StaffAlias[];
  demerits: EnrichedDemeritSlip[];
  uploadedSourceFiles: UploadedSourceFile[];
  loading: boolean;
  isSupabaseConnected: boolean;
  autoApproveSubmissions: boolean;
  setAutoApproveSubmissions: (val: boolean) => void;
  resolveStaffSignature: (rawSignature: string) => { member: Member | null; matchedAlias: string | null };
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
  computeStandings: (monthPrefix?: string | null) => {
    patronStandings: PatronStanding[];
    anonymousStanding: PatronStanding | null;
  };
  submitDemeritSlip: (
    payload: NewSlipPayload
  ) => Promise<{ slip: EnrichedDemeritSlip; wasMergedDuplicate: boolean }>;
  updateSlipStatus: (id: string, status: SlipStatus) => Promise<void>;
  deleteSlip: (id: string) => Promise<void>;
  updateSlipAssignment: (id: string, patronId: string | null, issuerId: string | null) => Promise<void>;
  addStaffAlias: (alias: string, memberId: string) => Promise<{ ok: boolean; error?: string }>;
  deleteStaffAlias: (id: string) => Promise<void>;
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

/**
 * Purges any fabricated seed slip and deduplicates slips that share the same
 * (student + incident_date + incident_time) so multiple photos of the same slip
 * (e.g. Rick 2026-10-17 21:09 in both 20261017_211324.jpg and Scan_20261017_212309.jpg)
 * are merged rather than double-counted.
 */
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

    // Check if an identical citation (same student + date + time) is already in deduped
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

    deduped.push({
      ...s,
      incident_time: normTime || null,
    });
  }

  return deduped;
}

export const DemeritsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [members, setMembers] = useState<Member[]>(() =>
    loadFromStorage(STORAGE_KEYS.MEMBERS, DEFAULT_MEMBERS)
  );
  const [aliases, setAliases] = useState<StaffAlias[]>(() =>
    loadFromStorage(STORAGE_KEYS.ALIASES, DEFAULT_STAFF_ALIASES)
  );
  const [rawSlips, setRawSlips] = useState<DemeritSlip[]>(() =>
    sanitizeAndDeduplicateSlips(loadFromStorage(STORAGE_KEYS.SLIPS, DEFAULT_DEMERITS))
  );
  const [autoApproveSubmissions, setAutoApproveState] = useState<boolean>(() =>
    loadFromStorage(STORAGE_KEYS.AUTO_APPROVE, true)
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(false);

  // Clear obsolete v1 storage keys on mount
  useEffect(() => {
    try {
      localStorage.removeItem('cac_demerits_members_v1');
      localStorage.removeItem('cac_demerits_aliases_v1');
      localStorage.removeItem('cac_demerits_slips_v1');
    } catch {
      // Ignore
    }
  }, []);

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

  const setAutoApproveSubmissions = useCallback((val: boolean) => {
    setAutoApproveState(val);
    try {
      localStorage.setItem(STORAGE_KEYS.AUTO_APPROVE, JSON.stringify(val));
    } catch {
      // Ignore
    }
  }, []);

  // Sync with live Supabase
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let cancelled = false;
    async function syncSupabase() {
      setLoading(true);
      try {
        const [membersRes, aliasesRes, slipsRes] = await Promise.all([
          supabase.from('members').select('*').order('display_name'),
          supabase.from('staff_aliases').select('*').order('alias'),
          supabase
            .from('demerits')
            .select('*')
            .order('incident_date', { ascending: false })
            .order('incident_time', { ascending: false }),
        ]);

        if (cancelled) return;

        if (!membersRes.error && membersRes.data && membersRes.data.length > 0) {
          setMembers(membersRes.data as Member[]);
        }
        if (!aliasesRes.error && aliasesRes.data && aliasesRes.data.length > 0) {
          setAliases(aliasesRes.data as StaffAlias[]);
        }

        if (!slipsRes.error && slipsRes.data && slipsRes.data.length > 0) {
          const remoteSlips = sanitizeAndDeduplicateSlips(
            (slipsRes.data as DemeritSlip[]).map((s) => ({
              ...s,
              infractions: Array.isArray(s.infractions) ? s.infractions : [],
              incident_time: s.incident_time ? s.incident_time.slice(0, 5) : null,
            }))
          );
          setRawSlips(remoteSlips);
        }

        setIsSupabaseConnected(true);
      } catch {
        // Fallback to local state
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    syncSupabase();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const resolvePatronName = useCallback(
    (rawStudent: string): Member | null => {
      const normalized = rawStudent.trim().toLowerCase();
      if (
        !normalized ||
        normalized === 'anonymous' ||
        normalized === 'anonymous patron' ||
        normalized === 'unknown'
      ) {
        return null;
      }

      return (
        members.find(
          (m) => m.is_patron && m.display_name.trim().toLowerCase() === normalized
        ) || null
      );
    },
    [members]
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

      return {
        ...slip,
        patron,
        issuer,
        patronDisplayName: patron ? patron.display_name : slip.raw_student || 'Anonymous Patron',
        issuerDisplayName: issuer ? issuer.display_name : slip.raw_signature || 'Staff',
        matchedAlias: resolvedSig.matchedAlias,
      };
    });
  }, [rawSlips, members, resolvePatronName, resolveStaffSignature]);

  const computeStandings = useCallback(
    (monthPrefix?: string | null) => {
      const approvedSlips = demerits.filter((s) => {
        if (s.status !== 'approved') return false;
        if (!s.image_url) return false;
        if (monthPrefix && monthPrefix !== 'all-time') {
          return s.incident_date.startsWith(monthPrefix);
        }
        return true;
      });

      const patronMap = new Map<string, PatronStanding>();
      let anonymousStanding: PatronStanding | null = null;

      for (const slip of approvedSlips) {
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
              netScore: 0,
              latestIncidentDate: null,
              latestIncidentTime: null,
              recentInfractions: [],
              slips: [],
            });
          }
          const entry = patronMap.get(pId)!;
          entry.totalDemerits += slip.demerit_count;
          entry.slipCount += 1;
          entry.netScore = entry.totalDemerits;
          entry.slips.push(slip);
          if (
            !entry.latestIncidentDate ||
            slip.incident_date > entry.latestIncidentDate ||
            (slip.incident_date === entry.latestIncidentDate &&
              (slip.incident_time || '') > (entry.latestIncidentTime || ''))
          ) {
            entry.latestIncidentDate = slip.incident_date;
            entry.latestIncidentTime = slip.incident_time;
          }
          for (const inf of slip.infractions) {
            if (!entry.recentInfractions.includes(inf)) {
              entry.recentInfractions.push(inf);
            }
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
              netScore: 0,
              latestIncidentDate: null,
              latestIncidentTime: null,
              recentInfractions: [],
              slips: [],
            };
          }
          anonymousStanding.totalDemerits += slip.demerit_count;
          anonymousStanding.slipCount += 1;
          anonymousStanding.netScore = anonymousStanding.totalDemerits;
          anonymousStanding.slips.push(slip);
          if (
            !anonymousStanding.latestIncidentDate ||
            slip.incident_date > anonymousStanding.latestIncidentDate
          ) {
            anonymousStanding.latestIncidentDate = slip.incident_date;
            anonymousStanding.latestIncidentTime = slip.incident_time;
          }
          for (const inf of slip.infractions) {
            if (!anonymousStanding.recentInfractions.includes(inf)) {
              anonymousStanding.recentInfractions.push(inf);
            }
          }
        }
      }

      const patronStandings = Array.from(patronMap.values()).sort((a, b) => {
        if (b.totalDemerits !== a.totalDemerits) return b.totalDemerits - a.totalDemerits;
        if (b.slipCount !== a.slipCount) return b.slipCount - a.slipCount;
        return a.displayName.localeCompare(b.displayName);
      });

      return { patronStandings, anonymousStanding };
    },
    [demerits, members]
  );

  const addOrUpdateMember = useCallback(
    async (displayName: string, isPatron: boolean, isStaff: boolean): Promise<Member> => {
      const trimmed = displayName.trim();
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
        if (isSupabaseConnected) {
          await supabase
            .from('members')
            .update({ is_patron: isPatron, is_staff: isStaff })
            .eq('id', existing.id);
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

      if (isSupabaseConnected) {
        const { data } = await supabase
          .from('members')
          .insert({
            display_name: trimmed,
            is_patron: isPatron,
            is_staff: isStaff,
          })
          .select()
          .single();
        if (data) {
          newMember.id = data.id;
        }
      }

      setMembers((prev) => [...prev, newMember]);
      return newMember;
    },
    [members, isSupabaseConnected]
  );

  const submitDemeritSlip = useCallback(
    async (
      payload: NewSlipPayload
    ): Promise<{ slip: EnrichedDemeritSlip; wasMergedDuplicate: boolean }> => {
      if (!payload.image_url) {
        throw new Error('An uploaded slip photo is required.');
      }

      // 1. Check image-level duplicate (unless part of a multi-slip photo batch)
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
              `${imgDup.matchedSlip?.raw_student || 'patron'} slip at ${
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

      // 2. Check citation-content & timestamp duplicate (e.g. same slip captured in a scan AND a group photo)
      const citationDup = checkDuplicateCitationContent(
        {
          raw_student: studentTrimmed,
          incident_date: incidentDate,
          incident_time: incidentTime,
          demerit_count: payload.demerit_count,
          infractions: cleanInfractions,
        },
        rawSlips
      );

      if (citationDup.isDuplicate && citationDup.matchedSlip) {
        if (payload.mergeIfCitationDuplicate !== false) {
          // Merge as secondary photo evidence on the existing citation without double-counting demerits!
          const target = citationDup.matchedSlip;
          const updatedSlip: DemeritSlip = {
            ...target,
            secondary_image_url: target.secondary_image_url || payload.image_url,
            capture_note: `Deduplicated across multiple uploads: matched ${studentTrimmed} (${incidentDate} ${
              incidentTime || ''
            })`,
          };

          setRawSlips((prev) => prev.map((s) => (s.id === target.id ? updatedSlip : s)));

          if (isSupabaseConnected) {
            await supabase
              .from('demerits')
              .update({
                secondary_image_url: updatedSlip.secondary_image_url,
                capture_note: updatedSlip.capture_note,
              })
              .eq('id', target.id);
          }

          const patron = resolvePatronName(updatedSlip.raw_student);
          const { member: issuer, matchedAlias } = resolveStaffSignature(updatedSlip.raw_signature);

          return {
            wasMergedDuplicate: true,
            slip: {
              ...updatedSlip,
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

      let patron = resolvePatronName(studentTrimmed);
      if (
        !patron &&
        payload.createPatronIfNew !== false &&
        !['anonymous', 'anonymous patron', 'unknown'].includes(studentTrimmed.toLowerCase())
      ) {
        patron = await addOrUpdateMember(studentTrimmed, true, false);
      }

      const { member: issuer, matchedAlias } = resolveStaffSignature(sigTrimmed);
      const initialStatus: SlipStatus = autoApproveSubmissions ? 'approved' : 'pending';

      const newSlip: DemeritSlip = {
        id: crypto.randomUUID(),
        patron_id: patron ? patron.id : null,
        raw_student: studentTrimmed,
        issuer_id: issuer ? issuer.id : null,
        raw_signature: sigTrimmed,
        demerit_count: Math.max(1, Number(payload.demerit_count) || 1),
        incident_date: incidentDate,
        incident_time: incidentTime,
        location_area: payload.location_area.trim() || 'Copper Athletic Club',
        infractions: cleanInfractions,
        image_url: payload.image_url,
        source_image_url: payload.source_image_url || null,
        secondary_image_url: payload.secondary_image_url || null,
        image_sha256: payload.image_sha256 || null,
        image_dhash: payload.image_dhash || null,
        capture_note: payload.capture_note || null,
        status: initialStatus,
        created_at: new Date().toISOString(),
      };

      if (isSupabaseConnected) {
        const { data } = await supabase
          .from('demerits')
          .insert({
            patron_id: newSlip.patron_id,
            raw_student: newSlip.raw_student,
            issuer_id: newSlip.issuer_id,
            raw_signature: newSlip.raw_signature,
            demerit_count: newSlip.demerit_count,
            incident_date: newSlip.incident_date,
            incident_time: newSlip.incident_time ? `${newSlip.incident_time}:00` : null,
            location_area: newSlip.location_area,
            infractions: newSlip.infractions,
            image_url: newSlip.image_url,
            source_image_url: newSlip.source_image_url,
            secondary_image_url: newSlip.secondary_image_url,
            image_sha256: newSlip.image_sha256,
            image_dhash: newSlip.image_dhash,
            capture_note: newSlip.capture_note,
            status: newSlip.status,
          })
          .select()
          .single();

        if (data) {
          newSlip.id = data.id;
        }
      }

      setRawSlips((prev) => [newSlip, ...prev]);

      return {
        wasMergedDuplicate: false,
        slip: {
          ...newSlip,
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
      isSupabaseConnected,
    ]
  );

  const updateSlipStatus = useCallback(
    async (id: string, status: SlipStatus) => {
      setRawSlips((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
      if (isSupabaseConnected) {
        await supabase.from('demerits').update({ status }).eq('id', id);
      }
    },
    [isSupabaseConnected]
  );

  const deleteSlip = useCallback(
    async (id: string) => {
      setRawSlips((prev) => prev.filter((s) => s.id !== id));
      if (isSupabaseConnected) {
        await supabase.from('demerits').delete().eq('id', id);
      }
    },
    [isSupabaseConnected]
  );

  const updateSlipAssignment = useCallback(
    async (id: string, patronId: string | null, issuerId: string | null) => {
      setRawSlips((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, patron_id: patronId, issuer_id: issuerId } : s
        )
      );
      if (isSupabaseConnected) {
        await supabase
          .from('demerits')
          .update({ patron_id: patronId, issuer_id: issuerId })
          .eq('id', id);
      }
    },
    [isSupabaseConnected]
  );

  const addStaffAlias = useCallback(
    async (alias: string, memberId: string): Promise<{ ok: boolean; error?: string }> => {
      const normalized = alias.trim().toLowerCase();
      if (!normalized) {
        return { ok: false, error: 'Alias cannot be empty.' };
      }

      const duplicate = aliases.find((a) => a.alias.toLowerCase() === normalized);
      if (duplicate) {
        const owner = members.find((m) => m.id === duplicate.member_id);
        return {
          ok: false,
          error: `Alias "${normalized}" is already mapped to ${owner?.display_name || 'a staff member'}.`,
        };
      }

      const newAlias: StaffAlias = {
        id: crypto.randomUUID(),
        alias: normalized,
        member_id: memberId,
        created_at: new Date().toISOString(),
      };

      if (isSupabaseConnected) {
        const { data, error } = await supabase
          .from('staff_aliases')
          .insert({ alias: normalized, member_id: memberId })
          .select()
          .single();
        if (error) {
          return { ok: false, error: error.message };
        }
        if (data) {
          newAlias.id = data.id;
        }
      }

      setAliases((prev) => [...prev, newAlias]);

      setRawSlips((prev) =>
        prev.map((s) => {
          if (s.raw_signature.trim().toLowerCase() === normalized) {
            return { ...s, issuer_id: memberId };
          }
          return s;
        })
      );

      return { ok: true };
    },
    [aliases, members, isSupabaseConnected]
  );

  const deleteStaffAlias = useCallback(
    async (id: string) => {
      setAliases((prev) => prev.filter((a) => a.id !== id));
      if (isSupabaseConnected) {
        await supabase.from('staff_aliases').delete().eq('id', id);
      }
    },
    [isSupabaseConnected]
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

      // Check citation-level duplicate first (student + date + time)
      const citDup = checkDuplicateCitationContent(slip, kept);
      if (citDup.isDuplicate && citDup.matchedSlip) {
        // Attach secondary image to the kept slip if not already present
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
    if (isSupabaseConnected && removedIds.length > 0) {
      await supabase.from('demerits').delete().in('id', removedIds);
    }
    return removedIds.length;
  }, [rawSlips, isSupabaseConnected]);

  return (
    <DemeritsContext.Provider
      value={{
        members,
        aliases,
        demerits,
        uploadedSourceFiles: UPLOADED_SOURCE_FILES,
        loading,
        isSupabaseConnected,
        autoApproveSubmissions,
        setAutoApproveSubmissions,
        resolveStaffSignature,
        resolvePatronName,
        checkImageDuplicate,
        checkCitationDuplicate,
        computeStandings,
        submitDemeritSlip,
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
