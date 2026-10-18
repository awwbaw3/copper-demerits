import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Member,
  StaffAlias,
  DemeritSlip,
  EnrichedDemeritSlip,
  PatronStanding,
  SlipStatus,
} from '../types/demerits';
import {
  DEFAULT_MEMBERS,
  DEFAULT_STAFF_ALIASES,
  FABRICATED_SEED_SLIP_IDS,
  MAX_OFFICIAL_SLIPS,
} from '../lib/defaultData';
import { supabase, isSupabaseConfigured, uploadDataUrlToSupabaseBucket } from '../lib/supabase';
import {
  checkDuplicateSlipImage,
  DuplicateCheckResult,
  fingerprintImageUrl,
  ImageFingerprint,
} from '../lib/imageDedup';

const STORAGE_KEYS = {
  MEMBERS: 'cac_demerits_members_v1',
  ALIASES: 'cac_demerits_aliases_v1',
  SLIPS: 'cac_demerits_slips_v1',
  AUTO_APPROVE: 'cac_demerits_auto_approve_v1',
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
  image_sha256?: string | null;
  image_dhash?: string | null;
  createPatronIfNew?: boolean;
}

interface DemeritsContextValue {
  members: Member[];
  aliases: StaffAlias[];
  demerits: EnrichedDemeritSlip[];
  loading: boolean;
  isSupabaseConnected: boolean;
  autoApproveSubmissions: boolean;
  setAutoApproveSubmissions: (val: boolean) => void;
  resolveStaffSignature: (rawSignature: string) => { member: Member | null; matchedAlias: string | null };
  resolvePatronName: (rawStudent: string) => Member | null;
  checkImageDuplicate: (fingerprint: Pick<ImageFingerprint, 'sha256' | 'dhash'>) => DuplicateCheckResult;
  computeStandings: (monthPrefix?: string | null) => {
    patronStandings: PatronStanding[];
    anonymousStanding: PatronStanding | null;
  };
  submitDemeritSlip: (payload: NewSlipPayload) => Promise<EnrichedDemeritSlip>;
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
 * Purges any fabricated seed slip (no uploaded photo or matching hardcoded seed UUIDs).
 */
function sanitizeRealUploadedSlipsOnly(slips: DemeritSlip[]): DemeritSlip[] {
  const valid = slips.filter(
    (s) =>
      s &&
      !FABRICATED_SEED_SLIP_IDS.has(s.id) &&
      typeof s.image_url === 'string' &&
      s.image_url.trim().length > 0
  );

  // Deduplicate by exact image_url or image_sha256
  const seenUrls = new Set<string>();
  const seenSha = new Set<string>();
  const deduped: DemeritSlip[] = [];

  for (const s of valid) {
    const urlKey = s.image_url!.trim();
    if (seenUrls.has(urlKey)) continue;
    if (s.image_sha256 && seenSha.has(s.image_sha256)) continue;
    seenUrls.add(urlKey);
    if (s.image_sha256) seenSha.add(s.image_sha256);
    deduped.push(s);
  }

  return deduped.slice(0, MAX_OFFICIAL_SLIPS);
}

export const DemeritsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [members, setMembers] = useState<Member[]>(() =>
    loadFromStorage(STORAGE_KEYS.MEMBERS, DEFAULT_MEMBERS)
  );
  const [aliases, setAliases] = useState<StaffAlias[]>(() =>
    loadFromStorage(STORAGE_KEYS.ALIASES, DEFAULT_STAFF_ALIASES)
  );
  const [rawSlips, setRawSlips] = useState<DemeritSlip[]>(() =>
    sanitizeRealUploadedSlipsOnly(loadFromStorage(STORAGE_KEYS.SLIPS, []))
  );
  const [autoApproveSubmissions, setAutoApproveState] = useState<boolean>(() =>
    loadFromStorage(STORAGE_KEYS.AUTO_APPROVE, true)
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(false);

  // Persist sanitized slips to localStorage
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

  // Sync with live Supabase and auto-migrate any local real uploaded images
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let cancelled = false;
    async function syncSupabaseAndMigrateLocalUploads() {
      setLoading(true);
      try {
        // Delete any fabricated seed IDs if they ever existed in Supabase
        await supabase
          .from('demerits')
          .delete()
          .in('id', Array.from(FABRICATED_SEED_SLIP_IDS));

        const [membersRes, aliasesRes, slipsRes] = await Promise.all([
          supabase.from('members').select('*').order('display_name'),
          supabase.from('staff_aliases').select('*').order('alias'),
          supabase.from('demerits').select('*').order('incident_date', { ascending: false }),
        ]);

        if (cancelled) return;

        if (!membersRes.error && membersRes.data && membersRes.data.length > 0) {
          setMembers(membersRes.data as Member[]);
        }
        if (!aliasesRes.error && aliasesRes.data && aliasesRes.data.length > 0) {
          setAliases(aliasesRes.data as StaffAlias[]);
        }

        const remoteSlips = sanitizeRealUploadedSlipsOnly(
          ((slipsRes.data || []) as DemeritSlip[]).map((s) => ({
            ...s,
            infractions: Array.isArray(s.infractions) ? s.infractions : [],
            incident_time: s.incident_time ? s.incident_time.slice(0, 5) : null,
          }))
        );

        // Check if this browser has local uploaded slips that aren't in Supabase yet
        const localSaved = sanitizeRealUploadedSlipsOnly(
          loadFromStorage<DemeritSlip[]>(STORAGE_KEYS.SLIPS, [])
        );

        const mergedSlips = [...remoteSlips];

        for (const localSlip of localSaved) {
          if (mergedSlips.length >= MAX_OFFICIAL_SLIPS) break;
          if (!localSlip.image_url) continue;

          const fp =
            localSlip.image_sha256 && localSlip.image_dhash
              ? { sha256: localSlip.image_sha256, dhash: localSlip.image_dhash }
              : await fingerprintImageUrl(localSlip.image_url);

          const dup = checkDuplicateSlipImage(fp, mergedSlips);
          if (dup.isDuplicate) continue;

          const publicUrl = await uploadDataUrlToSupabaseBucket(localSlip.image_url, fp.sha256);

          const { data: inserted } = await supabase
            .from('demerits')
            .insert({
              patron_id: localSlip.patron_id,
              raw_student: localSlip.raw_student,
              issuer_id: localSlip.issuer_id,
              raw_signature: localSlip.raw_signature,
              demerit_count: localSlip.demerit_count,
              incident_date: localSlip.incident_date,
              incident_time: localSlip.incident_time ? `${localSlip.incident_time}:00` : null,
              location_area: localSlip.location_area || 'Copper Athletic Club',
              infractions: localSlip.infractions,
              image_url: publicUrl,
              image_sha256: fp.sha256,
              image_dhash: fp.dhash,
              status: 'approved',
            })
            .select()
            .single();

          mergedSlips.push({
            ...localSlip,
            id: inserted?.id || localSlip.id,
            image_url: publicUrl,
            image_sha256: fp.sha256,
            image_dhash: fp.dhash,
          });
        }

        if (!cancelled) {
          setRawSlips(mergedSlips.slice(0, MAX_OFFICIAL_SLIPS));
          setIsSupabaseConnected(true);
        }
      } catch {
        // Keep local sanitized state
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    syncSupabaseAndMigrateLocalUploads();
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
    (fingerprint: Pick<ImageFingerprint, 'sha256' | 'dhash'>): DuplicateCheckResult => {
      return checkDuplicateSlipImage(fingerprint, rawSlips);
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

    return sorted.slice(0, MAX_OFFICIAL_SLIPS).map((slip) => {
      const patron = slip.patron_id
        ? members.find((m) => m.id === slip.patron_id) || null
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
              recentInfractions: [],
              slips: [],
            });
          }
          const entry = patronMap.get(pId)!;
          entry.totalDemerits += slip.demerit_count;
          entry.slipCount += 1;
          entry.netScore = entry.totalDemerits;
          entry.slips.push(slip);
          if (!entry.latestIncidentDate || slip.incident_date > entry.latestIncidentDate) {
            entry.latestIncidentDate = slip.incident_date;
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
    async (payload: NewSlipPayload): Promise<EnrichedDemeritSlip> => {
      if (!payload.image_url) {
        throw new Error('An uploaded slip photo is required.');
      }

      // Enforce duplicate check before saving
      if (payload.image_sha256 || payload.image_dhash) {
        const dup = checkDuplicateSlipImage(
          {
            sha256: payload.image_sha256 || '',
            dhash: payload.image_dhash || '',
          },
          rawSlips
        );
        if (dup.isDuplicate) {
          throw new Error(
            `Duplicate slip photo detected (${dup.similarityPercent ?? 100}% match with an already uploaded slip for ${
              dup.matchedSlip?.raw_student || 'a patron'
            }).`
          );
        }
      }

      const studentTrimmed = payload.raw_student.trim() || 'Anonymous Patron';
      const sigTrimmed = payload.raw_signature.trim() || 'Staff';

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
        incident_date: payload.incident_date || new Date().toISOString().slice(0, 10),
        incident_time: payload.incident_time ? payload.incident_time.slice(0, 5) : null,
        location_area: payload.location_area.trim() || 'Copper Athletic Club',
        infractions: payload.infractions.map((i) => i.trim()).filter(Boolean),
        image_url: payload.image_url,
        image_sha256: payload.image_sha256 || null,
        image_dhash: payload.image_dhash || null,
        status: initialStatus,
        created_at: new Date().toISOString(),
      };

      if (isSupabaseConnected) {
        const { data, error } = await supabase
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
            image_sha256: newSlip.image_sha256,
            image_dhash: newSlip.image_dhash,
            status: newSlip.status,
          })
          .select()
          .single();

        if (error && error.code === '23505') {
          throw new Error('Duplicate slip photo: this exact image has already been uploaded.');
        }
        if (data) {
          newSlip.id = data.id;
        }
      }

      setRawSlips((prev) => [newSlip, ...prev].slice(0, MAX_OFFICIAL_SLIPS));

      return {
        ...newSlip,
        patron,
        issuer,
        patronDisplayName: patron ? patron.display_name : newSlip.raw_student,
        issuerDisplayName: issuer ? issuer.display_name : newSlip.raw_signature,
        matchedAlias,
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

      const fp =
        slip.image_sha256 && slip.image_dhash
          ? { sha256: slip.image_sha256, dhash: slip.image_dhash }
          : await fingerprintImageUrl(slip.image_url);

      const dup = checkDuplicateSlipImage(fp, kept);
      if (dup.isDuplicate || kept.length >= MAX_OFFICIAL_SLIPS) {
        removedIds.push(slip.id);
      } else {
        kept.push({
          ...slip,
          image_sha256: fp.sha256,
          image_dhash: fp.dhash,
        });
      }
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
        loading,
        isSupabaseConnected,
        autoApproveSubmissions,
        setAutoApproveSubmissions,
        resolveStaffSignature,
        resolvePatronName,
        checkImageDuplicate,
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
