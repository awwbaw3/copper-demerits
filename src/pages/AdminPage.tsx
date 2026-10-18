import React, { useState } from 'react';
import { useDemerits } from '../context/DemeritsContext';
import { EnrichedDemeritSlip, SlipStatus } from '../types/demerits';
import { SlipModalViewer } from '../components/SlipModalViewer';
import {
  ShieldAlert,
  Sparkles,
  Check,
  X,
  Trash2,
  Plus,
  RefreshCw,
  Users,
  KeyRound,
  Eye,
  Database,
  RotateCcw,
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const {
    members,
    aliases,
    demerits,
    isSupabaseConnected,
    autoApproveSubmissions,
    setAutoApproveSubmissions,
    resolveStaffSignature,
    updateSlipStatus,
    deleteSlip,
    updateSlipAssignment,
    addStaffAlias,
    deleteStaffAlias,
    rerunAliasNormalization,
    addOrUpdateMember,
    resetToSeedData,
  } = useDemerits();

  const [selectedSlip, setSelectedSlip] = useState<EnrichedDemeritSlip | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | SlipStatus>('all');

  // Alias Mapper State
  const [newAliasInput, setNewAliasInput] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    () => members.find((m) => m.is_staff)?.id || ''
  );
  const [aliasFeedback, setAliasFeedback] = useState<{
    type: 'ok' | 'err';
    msg: string;
  } | null>(null);

  // Live Signature Tester
  const [testSignature, setTestSignature] = useState('The Boss - AKA Sarah');

  // New Roster Member State
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberIsPatron, setNewMemberIsPatron] = useState(true);
  const [newMemberIsStaff, setNewMemberIsStaff] = useState(false);

  const staffMembers = members.filter((m) => m.is_staff);
  const patronMembers = members.filter((m) => m.is_patron);

  const filteredQueue = demerits.filter((s) =>
    statusFilter === 'all' ? true : s.status === statusFilter
  );

  const handleAddAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) return;
    const res = await addStaffAlias(newAliasInput, selectedStaffId);
    if (res.ok) {
      const target = members.find((m) => m.id === selectedStaffId);
      setAliasFeedback({
        type: 'ok',
        msg: `Mapped "${newAliasInput.trim().toLowerCase()}" → ${target?.display_name}`,
      });
      setNewAliasInput('');
    } else {
      setAliasFeedback({
        type: 'err',
        msg: res.error || 'Could not add alias',
      });
    }
  };

  const handleRerunNormalization = async () => {
    const count = await rerunAliasNormalization();
    setAliasFeedback({
      type: 'ok',
      msg: `Re-evaluated all slips against alias table (${count} slip assignments updated).`,
    });
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    await addOrUpdateMember(newMemberName, newMemberIsPatron, newMemberIsStaff);
    setNewMemberName('');
  };

  const testResolution = resolveStaffSignature(testSignature);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#B87333]/30 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#B87333]/40 bg-[#B87333]/10 px-3 py-1 text-xs font-mono-docket uppercase tracking-widest text-[#E8B888]">
            <ShieldAlert className="h-3.5 w-3.5 text-[#B87333]" />
            <span>MODERATION &amp; ALIAS GOVERNANCE</span>
          </div>
          <h1 className="mt-2 font-athletic text-4xl sm:text-5xl font-extrabold uppercase tracking-wide text-[#F5F2EB]">
            HOUSE <span className="text-[#B87333]">CONTROL ROOM</span>
          </h1>
          <p className="mt-1 text-sm text-[#B5A99D]">
            Review submitted slips, map bartender nickname signatures to canonical staff members,
            and manage the Copper Athletic Club roster.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#1A1715] px-3 py-2 font-mono-docket text-xs text-[#C4B8AC]">
            <Database className="h-3.5 w-3.5 text-[#B87333]" />
            {isSupabaseConnected ? 'Supabase Live Sync' : 'Local Seed Engine Active'}
          </span>

          <button
            type="button"
            onClick={resetToSeedData}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 font-mono-docket text-xs text-[#D6C7B8] transition hover:border-[#B87333] hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5 text-[#C86D51]" />
            <span>Reset Seed Data</span>
          </button>
        </div>
      </div>

      {/* Top Grid: Staff Alias Mapper + Roster Manager */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Staff Alias Mapper (7 cols) */}
        <section className="lg:col-span-7 rounded-2xl border border-[#B87333]/35 bg-[#1A1715] p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
            <div>
              <h2 className="font-athletic text-2xl font-bold uppercase tracking-wide text-[#F5F2EB] flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-[#B87333]" />
                <span>STAFF SIGNATURE ALIAS MAPPER</span>
              </h2>
              <p className="text-xs font-mono-docket text-[#9E8F82]">
                Lowercase unique lookup (`staff_aliases`) that normalizes raw slip signatures
              </p>
            </div>
            <button
              type="button"
              onClick={handleRerunNormalization}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#B87333]/50 bg-[#B87333]/15 px-3 py-1.5 font-mono-docket text-xs font-bold text-[#E8B888] transition hover:bg-[#B87333] hover:text-[#121212]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Re-Normalize Slips</span>
            </button>
          </div>

          {/* Add New Alias Form */}
          <form onSubmit={handleAddAlias} className="grid grid-cols-1 gap-3 sm:grid-cols-12">
            <div className="sm:col-span-6">
              <label className="block font-mono-docket text-[10px] uppercase text-[#9E8F82] mb-1">
                Raw Signature Alias (Auto-Lowercased)
              </label>
              <input
                type="text"
                required
                value={newAliasInput}
                onChange={(e) => setNewAliasInput(e.target.value)}
                placeholder='e.g. "the boss - aka sarah" or "the douche"'
                className="w-full rounded-xl border border-white/15 bg-[#121212] px-3.5 py-2 text-xs text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block font-mono-docket text-[10px] uppercase text-[#9E8F82] mb-1">
                Maps to Staff Member
              </label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                aria-label="Target staff member"
                className="w-full rounded-xl border border-white/15 bg-[#121212] px-3 py-2 text-xs text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
              >
                {staffMembers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.display_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 flex items-end">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-1 rounded-xl bg-[#B87333] px-3 py-2 font-athletic text-xs font-bold uppercase text-[#121212] transition hover:bg-[#C86D51]"
              >
                <Plus className="h-4 w-4" />
                <span>Map</span>
              </button>
            </div>
          </form>

          {aliasFeedback && (
            <div
              className={`rounded-xl border px-3.5 py-2 font-mono-docket text-xs ${
                aliasFeedback.type === 'ok'
                  ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                  : 'border-rose-500/40 bg-rose-950/40 text-rose-300'
              }`}
            >
              {aliasFeedback.msg}
            </div>
          )}

          {/* Grouped Aliases by Staff Member */}
          <div className="space-y-3">
            {staffMembers.map((staff) => {
              const memberAliases = aliases.filter((a) => a.member_id === staff.id);
              return (
                <div
                  key={staff.id}
                  className="rounded-xl border border-white/10 bg-[#121212] p-4 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-athletic text-lg font-bold uppercase text-[#F5F2EB]">
                        {staff.display_name}
                      </span>
                      {staff.is_patron && (
                        <span className="rounded bg-[#B87333]/20 px-2 py-0.5 font-mono-docket text-[10px] text-[#E8B888]">
                          STAFF + PATRON
                        </span>
                      )}
                    </div>
                    <span className="font-mono-docket text-[11px] text-[#9E8F82]">
                      {memberAliases.length} {memberAliases.length === 1 ? 'alias' : 'aliases'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {memberAliases.map((aliasObj) => (
                      <span
                        key={aliasObj.id}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#B87333]/35 bg-[#1E1815] px-2.5 py-1 font-mono-docket text-xs text-[#E8B888]"
                      >
                        <span>&ldquo;{aliasObj.alias}&rdquo;</span>
                        <button
                          type="button"
                          onClick={() => deleteStaffAlias(aliasObj.id)}
                          aria-label={`Remove alias ${aliasObj.alias}`}
                          className="text-[#9E8F82] hover:text-rose-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Normalization Tester */}
          <div className="rounded-xl border border-dashed border-[#B87333]/40 bg-[#121212]/80 p-4">
            <div className="flex items-center gap-2 font-mono-docket text-xs font-bold uppercase text-[#B87333] mb-2">
              <Sparkles className="h-4 w-4" />
              <span>Test Signature Normalization Sandbox</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <input
                type="text"
                value={testSignature}
                onChange={(e) => setTestSignature(e.target.value)}
                placeholder="Type any raw bartender signature..."
                className="flex-1 rounded-lg border border-white/15 bg-[#1A1715] px-3 py-1.5 font-mono-docket text-xs text-[#F5F2EB]"
              />
              <div className="font-mono-docket text-xs">
                {testResolution.member ? (
                  <span className="text-emerald-400 font-bold">
                    → Resolves to: {testResolution.member.display_name} (via &ldquo;
                    {testResolution.matchedAlias}&rdquo;)
                  </span>
                ) : (
                  <span className="text-amber-400">→ Unmapped signature</span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Roster Manager (5 cols) */}
        <section className="lg:col-span-5 rounded-2xl border border-white/10 bg-[#1A1715] p-6 space-y-6">
          <div className="border-b border-white/10 pb-4">
            <h2 className="font-athletic text-2xl font-bold uppercase tracking-wide text-[#F5F2EB] flex items-center gap-2">
              <Users className="h-5 w-5 text-[#C86D51]" />
              <span>CLUB ROSTER (`members`)</span>
            </h2>
            <p className="text-xs font-mono-docket text-[#9E8F82]">
              Patrons and staff enforcers (supports dual-role members like Burtis)
            </p>
          </div>

          <form onSubmit={handleAddMember} className="space-y-3 rounded-xl border border-white/10 bg-[#121212] p-4">
            <label className="block font-mono-docket text-[10px] uppercase text-[#9E8F82]">
              Add or Update Roster Member
            </label>
            <input
              type="text"
              required
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              placeholder="Display Name (e.g. Rick, Burtis, Sarah)"
              className="w-full rounded-lg border border-white/15 bg-[#1A1715] px-3 py-2 text-xs text-[#F5F2EB]"
            />
            <div className="flex items-center justify-between gap-4 pt-1">
              <div className="flex items-center gap-4 text-xs font-mono-docket text-[#D6C7B8]">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newMemberIsPatron}
                    onChange={(e) => setNewMemberIsPatron(e.target.checked)}
                    className="accent-[#B87333]"
                  />
                  <span>Patron</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newMemberIsStaff}
                    onChange={(e) => setNewMemberIsStaff(e.target.checked)}
                    className="accent-[#C86D51]"
                  />
                  <span>Staff</span>
                </label>
              </div>

              <button
                type="submit"
                className="rounded-lg bg-[#B87333] px-3.5 py-1.5 font-athletic text-xs font-bold uppercase text-[#121212]"
              >
                Save Member
              </button>
            </div>
          </form>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-[#121212] px-3.5 py-2.5"
              >
                <span className="font-athletic text-base font-bold uppercase text-[#F5F2EB]">
                  {m.display_name}
                </span>
                <div className="flex items-center gap-1.5">
                  {m.is_patron && (
                    <span className="rounded bg-[#B87333]/20 border border-[#B87333]/40 px-2 py-0.5 font-mono-docket text-[10px] font-bold text-[#E8B888]">
                      PATRON
                    </span>
                  )}
                  {m.is_staff && (
                    <span className="rounded bg-[#C86D51]/20 border border-[#C86D51]/40 px-2 py-0.5 font-mono-docket text-[10px] font-bold text-[#E08A4E]">
                      STAFF
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Bottom Section: Slip Moderation & Review Queue */}
      <section className="rounded-2xl border border-white/10 bg-[#1A1715] p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="font-athletic text-2xl font-bold uppercase tracking-wide text-[#F5F2EB]">
              SLIP REVIEW &amp; MODERATION QUEUE ({filteredQueue.length})
            </h2>
            <p className="text-xs font-mono-docket text-[#9E8F82]">
              Approve, reject, or re-assign patron and staff mappings on any logged slip
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#121212] px-3 py-1.5 font-mono-docket text-xs text-[#D6C7B8] cursor-pointer">
              <input
                type="checkbox"
                checked={autoApproveSubmissions}
                onChange={(e) => setAutoApproveSubmissions(e.target.checked)}
                className="accent-[#B87333]"
              />
              <span>Auto-Approve Patron Submissions</span>
            </label>

            <div className="inline-flex rounded-xl border border-white/10 bg-[#121212] p-1">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-lg px-3 py-1 font-mono-docket text-xs uppercase transition ${
                    statusFilter === st
                      ? 'bg-[#B87333] text-[#121212] font-bold'
                      : 'text-[#9E8F82] hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {filteredQueue.map((slip) => (
            <div
              key={slip.id}
              className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#121212] p-4"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 font-mono-docket text-[10px] font-bold uppercase ${
                      slip.status === 'approved'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : slip.status === 'pending'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {slip.status}
                  </span>
                  <span className="font-mono-docket text-xs text-[#E8B888]">
                    {slip.incident_date} {slip.incident_time ? `@ ${slip.incident_time}` : ''}
                  </span>
                  <span className="font-mono-docket text-xs font-bold text-[#C86D51]">
                    +{slip.demerit_count} Demerits
                  </span>
                </div>

                <div className="font-athletic text-xl font-bold uppercase text-[#F5F2EB]">
                  Patron: {slip.patronDisplayName}{' '}
                  <span className="font-mono-docket text-xs font-normal text-[#9E8F82]">
                    (raw: &ldquo;{slip.raw_student}&rdquo;)
                  </span>{' '}
                  · Issuer: {slip.issuerDisplayName}{' '}
                  <span className="font-mono-docket text-xs font-normal text-[#9E8F82]">
                    (signed: &ldquo;{slip.raw_signature}&rdquo;)
                  </span>
                </div>

                <p className="text-xs text-[#C4B8AC]">
                  Infractions: {slip.infractions.join(' • ')}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* Quick Reassign Patron */}
                <select
                  value={slip.patron?.id || slip.patron_id || ''}
                  onChange={(e) =>
                    updateSlipAssignment(
                      slip.id,
                      e.target.value || null,
                      slip.issuer?.id || slip.issuer_id
                    )
                  }
                  aria-label="Assign Patron"
                  className="rounded-lg border border-white/15 bg-[#1A1715] px-2.5 py-1.5 font-mono-docket text-xs text-[#F5F2EB]"
                >
                  <option value="">Anonymous Patron</option>
                  {patronMembers.map((p) => (
                    <option key={p.id} value={p.id}>
                      Patron: {p.display_name}
                    </option>
                  ))}
                </select>

                {/* Quick Reassign Issuer */}
                <select
                  value={slip.issuer?.id || slip.issuer_id || ''}
                  onChange={(e) =>
                    updateSlipAssignment(
                      slip.id,
                      slip.patron?.id || slip.patron_id,
                      e.target.value || null
                    )
                  }
                  aria-label="Assign Staff Issuer"
                  className="rounded-lg border border-white/15 bg-[#1A1715] px-2.5 py-1.5 font-mono-docket text-xs text-[#F5F2EB]"
                >
                  <option value="">Unassigned Staff</option>
                  {staffMembers.map((s) => (
                    <option key={s.id} value={s.id}>
                      Staff: {s.display_name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setSelectedSlip(slip)}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 font-mono-docket text-xs text-[#D6C7B8] hover:border-[#B87333]"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Slip</span>
                </button>

                {slip.status !== 'approved' && (
                  <button
                    type="button"
                    onClick={() => updateSlipStatus(slip.id, 'approved')}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600/20 border border-emerald-500/40 px-2.5 py-1.5 font-mono-docket text-xs text-emerald-300 hover:bg-emerald-600/30"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Approve</span>
                  </button>
                )}

                {slip.status !== 'rejected' && (
                  <button
                    type="button"
                    onClick={() => updateSlipStatus(slip.id, 'rejected')}
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-600/20 border border-amber-500/40 px-2.5 py-1.5 font-mono-docket text-xs text-amber-300 hover:bg-amber-600/30"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Reject</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => deleteSlip(slip.id)}
                  aria-label="Delete slip"
                  className="rounded-lg border border-white/10 p-1.5 text-[#9E8F82] hover:border-rose-500/40 hover:text-rose-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <SlipModalViewer slip={selectedSlip} onClose={() => setSelectedSlip(null)} />
    </div>
  );
};
