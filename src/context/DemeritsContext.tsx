import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Member,
  StaffAlias,
  DemeritSlip,
  EnrichedDemeritSlip,
  PatronStanding,
  StaffEnforcerStanding,
  SlipStatus,
} from '../types/demerits';
import { DEFAULT_MEMBERS, DEFAULT_STAFF_ALIASES, DEFAULT_DEMERITS } from '../lib/defaultData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

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
  image_url: string | null;
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
  computeStandings: (monthPrefix?: string | null) => {
    patronStandings: PatronStanding[];
    anonymousStanding: PatronStanding | null;
    enforcerStandings: StaffEnforcerStanding[];
  };
  submitDemeritSlip: (payload: NewSlipPayload) => Promise<EnrichedDemeritSlip>;
  updateSlipStatus: (id: string, status: SlipStatus) => Promise<void>;
  deleteSlip: (id: string) => Promise<void>;
  updateSlipAssignment: (id: string, patronId: string | null, issuerId: string | null) => Promise<void>;
  addStaffAlias: (alias: string, memberId: string) => Promise<{ ok: boolean; error?: string }>;
  deleteStaffAlias: (id: string) => Promise<void>;
  rerunAliasNormalization: () => Promise<number>;
  addOrUpdateMember: (displayName: string, isPatron: boolean, isStaff: boolean) => Promise<Member>;
  resetToSeedData: () => void;
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

export const DemeritsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [members, setMembers] = useState<Member[]>(() =>
    loadFromStorage(STORAGE_KEYS.MEMBERS, DEFAULT_MEMBERS)
  );
  const [aliases, setAliases] = useState<StaffAlias[]>(() =>
    loadFromStorage(STORAGE_KEYS.ALIASES, DEFAULT_STAFF_ALIASES)
  );
  const [rawSlips, setRawSlips] = useState<DemeritSlip[]>(() =>
    loadFromStorage(STORAGE_KEYS.SLIPS, DEFAULT_DEMERITS)
  );
  const [autoApproveSubmissions, setAutoApproveState] = useState<boolean>(() =>
    loadFromStorage(STORAGE_KEYS.AUTO_APPROVE, true)
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(false);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
    } catch {
      // Ignore quota errors
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

  // Sync with Supabase if configured
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    let cancelled = false;
    async function fetchSupabaseData() {
      setLoading(true);
      try {
        const [membersRes, aliasesRes, slipsRes] = await Promise.all([
          supabase!.from('members').select('*').order('display_name'),
          supabase!.from('staff_aliases').select('*').order('alias'),
          supabase!.from('demerits').select('*').order('incident_date', { ascending: false }),
        ]);

        if (!cancelled && !membersRes.error && !aliasesRes.error && !slipsRes.error) {
          if (membersRes.data && membersRes.data.length > 0) {
            setMembers(membersRes.data as Member[]);
          }
          if (aliasesRes.data && aliasesRes.data.length > 0) {
            setAliases(aliasesRes.data as StaffAlias[]);
          }
          if (slipsRes.data && slipsRes.data.length > 0) {
            const parsedSlips = (slipsRes.data as DemeritSlip[]).map((s) => ({
              ...s,
              infractions: Array.isArray(s.infractions) ? s.infractions : [],
              incident_time: s.incident_time ? s.incident_time.slice(0, 5) : null,
            }));
            setRawSlips(parsedSlips);
          }
          setIsSupabaseConnected(true);
        }
      } catch {
        // Fallback to local state silently
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSupabaseData();
    return () => {
      cancelled = true;
    };
  }, []);

  const resolveStaffSignature = useCallback(
    (rawSignature: string): { member: Member | null; matchedAlias: string | null } => {
      const normalized = rawSignature.trim().toLowerCase();
      if (!normalized) return { member: null, matchedAlias: null };

      // 1. Exact match in staff_aliases
      const exactAlias = aliases.find((a) => a.alias.toLowerCase() === normalized);
      if (exactAlias) {
        const staffMember = members.find((m) => m.id === exactAlias.member_id) || null;
        return { member: staffMember, matchedAlias: exactAlias.alias };
      }

      // 2. Direct match on staff display_name
      const directStaff = members.find(
        (m) => m.is_staff && m.display_name.trim().toLowerCase() === normalized
      );
      if (directStaff) {
        return { member: directStaff, matchedAlias: directStaff.display_name.toLowerCase() };
      }

      // 3. Substring alias match (e.g. if signature includes "aka sarah" or "the boss")
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

  const demerits: EnrichedDemeritSlip[] = useMemo(() => {
    const sorted = [...rawSlips].sort((a, b) => {
      const dateCmp = b.incident_date.localeCompare(a.incident_date);
      if (dateCmp !== 0) return dateCmp;
      return (b.incident_time || '00:00').localeCompare(a.incident_time || '00:00');
    });

    return sorted.map((slip) => {
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
        issuerDisplayName: issuer ? issuer.display_name : slip.raw_signature || 'Unverified Staff',
        matchedAlias: resolvedSig.matchedAlias,
      };
    });
  }, [rawSlips, members, resolvePatronName, resolveStaffSignature]);

  const computeStandings = useCallback(
    (monthPrefix?: string | null) => {
      const approvedSlips = demerits.filter((s) => {
        if (s.status !== 'approved') return false;
        if (monthPrefix && monthPrefix !== 'all-time') {
          return s.incident_date.startsWith(monthPrefix);
        }
        return true;
      });

      // Build Patron Standings for all members where is_patron = true
      const patronMap = new Map<string, PatronStanding>();

      for (const m of members.filter((mem) => mem.is_patron)) {
        patronMap.set(m.id, {
          memberId: m.id,
          displayName: m.display_name,
          isStaff: m.is_staff,
          isPatron: m.is_patron,
          isAnonymous: false,
          totalDemerits: 0,
          slipCount: 0,
          issuedDemerits: 0,
          issuedSlipCount: 0,
          netScore: 0,
          latestIncidentDate: null,
          recentInfractions: [],
          slips: [],
        });
      }

      let anonymousStanding: PatronStanding | null = null;

      for (const slip of approvedSlips) {
        // Count demerits received
        const pId = slip.patron?.id || slip.patron_id;
        if (pId && patronMap.has(pId)) {
          const entry = patronMap.get(pId)!;
          entry.totalDemerits += slip.demerit_count;
          entry.slipCount += 1;
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
          // Anonymous or unlinked patron
          if (!anonymousStanding) {
            anonymousStanding = {
              memberId: null,
              displayName: 'Anonymous Patron',
              isStaff: false,
              isPatron: true,
              isAnonymous: true,
              totalDemerits: 0,
              slipCount: 0,
              issuedDemerits: 0,
              issuedSlipCount: 0,
              netScore: 0,
              latestIncidentDate: null,
              recentInfractions: [],
              slips: [],
            };
          }
          anonymousStanding.totalDemerits += slip.demerit_count;
          anonymousStanding.slipCount += 1;
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

        // Count demerits issued if the issuer is also a patron (e.g. Burtis!)
        const iId = slip.issuer?.id || slip.issuer_id;
        if (iId && patronMap.has(iId)) {
          const issuerEntry = patronMap.get(iId)!;
          issuerEntry.issuedDemerits += slip.demerit_count;
          issuerEntry.issuedSlipCount += 1;
        }
      }

      const patronStandings = Array.from(patronMap.values()).map((entry) => ({
        ...entry,
        netScore: entry.totalDemerits - entry.issuedDemerits,
      }));

      patronStandings.sort((a, b) => {
        if (b.totalDemerits !== a.totalDemerits) return b.totalDemerits - a.totalDemerits;
        if (b.netScore !== a.netScore) return b.netScore - a.netScore;
        return a.displayName.localeCompare(b.displayName);
      });

      if (anonymousStanding) {
        anonymousStanding.netScore = anonymousStanding.totalDemerits;
      }

      // Build Staff Enforcer Standings
      const enforcerStandings: StaffEnforcerStanding[] = members
        .filter((m) => m.is_staff)
        .map((staff) => {
          const staffAliases = aliases
            .filter((a) => a.member_id === staff.id)
            .map((a) => a.alias);
          const issuedSlips = approvedSlips.filter(
            (s) => (s.issuer?.id || s.issuer_id) === staff.id
          );
          const issuedDemerits = issuedSlips.reduce((sum, s) => sum + s.demerit_count, 0);
          const latestIssuedDate =
            issuedSlips.length > 0
              ? issuedSlips.reduce(
                  (max, s) => (s.incident_date > max ? s.incident_date : max),
                  issuedSlips[0].incident_date
                )
              : null;

          return {
            member: staff,
            aliases: staffAliases,
            issuedDemerits,
            issuedSlipCount: issuedSlips.length,
            latestIssuedDate,
          };
        })
        .sort((a, b) => b.issuedDemerits - a.issuedDemerits);

      return { patronStandings, anonymousStanding, enforcerStandings };
    },
    [demerits, members, aliases]
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
        if (supabase && isSupabaseConnected) {
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

      if (supabase && isSupabaseConnected) {
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
      const studentTrimmed = payload.raw_student.trim() || 'Anonymous Patron';
      const sigTrimmed = payload.raw_signature.trim() || 'Unverified Staff';

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
        incident_time: payload.incident_time || null,
        location_area: payload.location_area.trim() || 'Copper Athletic Club',
        infractions: payload.infractions.map((i) => i.trim()).filter(Boolean),
        image_url: payload.image_url,
        status: initialStatus,
        created_at: new Date().toISOString(),
      };

      if (supabase && isSupabaseConnected) {
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
        ...newSlip,
        patron,
        issuer,
        patronDisplayName: patron ? patron.display_name : newSlip.raw_student,
        issuerDisplayName: issuer ? issuer.display_name : newSlip.raw_signature,
        matchedAlias,
      };
    },
    [resolvePatronName, resolveStaffSignature, addOrUpdateMember, autoApproveSubmissions, isSupabaseConnected]
  );

  const updateSlipStatus = useCallback(
    async (id: string, status: SlipStatus) => {
      setRawSlips((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
      if (supabase && isSupabaseConnected) {
        await supabase.from('demerits').update({ status }).eq('id', id);
      }
    },
    [isSupabaseConnected]
  );

  const deleteSlip = useCallback(
    async (id: string) => {
      setRawSlips((prev) => prev.filter((s) => s.id !== id));
      if (supabase && isSupabaseConnected) {
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
      if (supabase && isSupabaseConnected) {
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

      if (supabase && isSupabaseConnected) {
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

      // Automatically link any existing slips that match this new alias
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
      if (supabase && isSupabaseConnected) {
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

  const resetToSeedData = useCallback(() => {
    setMembers(DEFAULT_MEMBERS);
    setAliases(DEFAULT_STAFF_ALIASES);
    setRawSlips(DEFAULT_DEMERITS);
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(DEFAULT_MEMBERS));
    localStorage.setItem(STORAGE_KEYS.ALIASES, JSON.stringify(DEFAULT_STAFF_ALIASES));
    localStorage.setItem(STORAGE_KEYS.SLIPS, JSON.stringify(DEFAULT_DEMERITS));
  }, []);

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
        computeStandings,
        submitDemeritSlip,
        updateSlipStatus,
        deleteSlip,
        updateSlipAssignment,
        addStaffAlias,
        deleteStaffAlias,
        rerunAliasNormalization,
        addOrUpdateMember,
        resetToSeedData,
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
