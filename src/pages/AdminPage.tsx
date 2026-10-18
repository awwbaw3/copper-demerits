import React, { useState } from 'react';
import { useDemerits } from '../context/DemeritsContext';
import { EnrichedDemeritSlip } from '../types/demerits';
import { SlipModalViewer } from '../components/SlipModalViewer';
import {
  ShieldAlert,
  Sparkles,
  X,
  Trash2,
  Plus,
  RefreshCw,
  Users,
  KeyRound,
  Eye,
  Database,
  Fingerprint,
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const {
    members,
    aliases,
    demerits,
    isSupabaseConnected,
    resolveStaffSignature,
    deleteSlip,
    updateSlipAssignment,
    addStaffAlias,
    deleteStaffAlias,
    rerunAliasNormalization,
    addOrUpdateMember,
    deduplicateExistingSlips,
  } = useDemerits();

  const [selectedSlip, setSelectedSlip] = useState<EnrichedDemeritSlip | null>(null);

  // Alias Mapper State
  const [newAliasInput, setNewAliasInput] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    () => members.find((m) => m.is_staff)?.id || ''
  );
  const [feedback, setFeedback] = useState<{
    type: 'ok' | 'err';
    msg: string;
  } | null>(null);

  const [testSignature, setTestSignature] = useState('The Boss - AKA Sarah');

  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberIsPatron, setNewMemberIsPatron] = useState(true);
  const [newMemberIsStaff, setNewMemberIsStaff] = useState(false);

  const staffMembers = members.filter((m) => m.is_staff);
  const patronMembers = members.filter((m) => m.is_patron);

  const handleAddAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) return;
    const res = await addStaffAlias(newAliasInput, selectedStaffId);
    if (res.ok) {
      const target = members.find((m) => m.id === selectedStaffId);
      setFeedback({
        type: 'ok',
        msg: `Mapped "${newAliasInput.trim().toLowerCase()}" → ${target?.display_name}`,
      });
      setNewAliasInput('');
    } else {
      setFeedback({
        type: 'err',
        msg: res.error || 'Could not add alias',
      });
    }
  };

  const handleDeduplicate = async () => {
    const removed = await deduplicateExistingSlips();
    setFeedback({
      type: 'ok',
      msg:
        removed > 0
          ? `Removed ${removed} duplicate or non-image slip(s).`
          : 'All uploaded slip photos are unique (SHA-256 + 64-bit Perceptual dHash verified).',
    });
  };

  const handleRerunNormalization = async () => {
    const count = await rerunAliasNormalization();
    setFeedback({
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
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-5 sm:py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#B87333]/30 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#B87333]/40 bg-[#B87333]/10 px-3 py-1 text-[11px] font-mono-docket uppercase tracking-widest text-[#E8B888]">
            <ShieldAlert className="h-3.5 w-3.5 text-[#B87333]" />
            <span>MODERATION &amp; DEDUPLICATION</span>
          </div>
          <h1 className="mt-2 font-athletic text-3xl sm:text-5xl font-extrabold uppercase tracking-wide text-[#F5F2EB]">
            ADMIN <span className="text-[#B87333]">CONTROL</span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#1A1715] px-3 py-2 font-mono-docket text-xs text-[#C4B8AC]">
            <Database className="h-3.5 w-3.5 text-[#B87333]" />
            {isSupabaseConnected ? 'Supabase Connected' : 'Local Storage'}
          </span>

          <button
            type="button"
            onClick={handleDeduplicate}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#B87333] bg-[#B87333]/20 px-3.5 py-2 font-mono-docket text-xs font-bold text-[#E8B888] transition hover:bg-[#B87333] hover:text-[#121212]"
          >
            <Fingerprint className="h-3.5 w-3.5" />
            <span>Scan &amp; Deduplicate Images</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 font-mono-docket text-xs ${
            feedback.type === 'ok'
              ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
              : 'border-rose-500/40 bg-rose-950/40 text-rose-300'
          }`}
        >
          {feedback.msg}
        </div>
      )}

      {/* Uploaded Slips Queue */}
      <section className="rounded-2xl border border-white/10 bg-[#1A1715] p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="font-athletic text-xl sm:text-2xl font-bold uppercase text-[#F5F2EB]">
            UPLOADED SLIP PHOTOS ({demerits.length}/4)
          </h2>
          <button
            type="button"
            onClick={handleRerunNormalization}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#B87333]/50 bg-[#B87333]/15 px-3 py-1.5 font-mono-docket text-xs font-bold text-[#E8B888]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Re-Normalize Aliases</span>
          </button>
        </div>

        {demerits.length === 0 ? (
          <p className="py-6 text-center font-mono-docket text-xs text-[#9E8F82]">
            No slip images uploaded yet.
          </p>
        ) : (
          <div className="space-y-3">
            {demerits.map((slip) => (
              <div
                key={slip.id}
                className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#121212] p-3.5"
              >
                <div className="flex items-center gap-3.5">
                  {slip.image_url && (
                    <img
                      src={slip.image_url}
                      alt={`Slip for ${slip.patronDisplayName}`}
                      className="h-16 w-16 shrink-0 rounded-lg border border-[#B87333]/40 object-cover bg-black"
                    />
                  )}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 font-mono-docket text-xs text-[#E8B888]">
                      <span>{slip.incident_date}</span>
                      {slip.incident_time && <span>· {slip.incident_time}</span>}
                      <span className="font-bold text-[#C86D51]">+{slip.demerit_count} PTS</span>
                    </div>
                    <div className="font-athletic text-lg font-bold uppercase text-[#F5F2EB]">
                      {slip.patronDisplayName} · Issued by {slip.issuerDisplayName}
                    </div>
                    <p className="text-xs text-[#9E8F82] font-mono-docket">
                      Signed: &ldquo;{slip.raw_signature}&rdquo;
                      {slip.image_dhash ? ` · dHash: ${slip.image_dhash}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
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
                    className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 font-mono-docket text-xs text-[#D6C7B8]"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteSlip(slip.id)}
                    aria-label="Delete slip"
                    className="rounded-lg border border-white/10 p-1.5 text-[#9E8F82] hover:text-rose-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Staff Alias Mapper + Roster Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="lg:col-span-7 rounded-2xl border border-[#B87333]/35 bg-[#1A1715] p-4 sm:p-6 space-y-5">
          <h2 className="font-athletic text-2xl font-bold uppercase tracking-wide text-[#F5F2EB] flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-[#B87333]" />
            <span>STAFF SIGNATURE ALIAS MAPPER</span>
          </h2>

          <form onSubmit={handleAddAlias} className="grid grid-cols-1 gap-2.5 sm:grid-cols-12">
            <div className="sm:col-span-6">
              <input
                type="text"
                required
                value={newAliasInput}
                onChange={(e) => setNewAliasInput(e.target.value)}
                placeholder='Alias (e.g. "the boss - aka sarah")'
                className="w-full rounded-xl border border-white/15 bg-[#121212] px-3.5 py-2 text-xs text-[#F5F2EB]"
              />
            </div>

            <div className="sm:col-span-4">
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                aria-label="Target staff member"
                className="w-full rounded-xl border border-white/15 bg-[#121212] px-3 py-2 text-xs text-[#F5F2EB]"
              >
                {staffMembers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.display_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-1 rounded-xl bg-[#B87333] px-3 py-2 font-athletic text-xs font-bold uppercase text-[#121212]"
              >
                <Plus className="h-4 w-4" />
                <span>Map</span>
              </button>
            </div>
          </form>

          <div className="space-y-2.5">
            {staffMembers.map((staff) => {
              const memberAliases = aliases.filter((a) => a.member_id === staff.id);
              return (
                <div
                  key={staff.id}
                  className="rounded-xl border border-white/10 bg-[#121212] p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-athletic text-lg font-bold uppercase text-[#F5F2EB]">
                      {staff.display_name}
                    </span>
                    <span className="font-mono-docket text-[11px] text-[#9E8F82]">
                      {memberAliases.length} aliases
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {memberAliases.map((aliasObj) => (
                      <span
                        key={aliasObj.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#B87333]/35 bg-[#1E1815] px-2.5 py-1 font-mono-docket text-xs text-[#E8B888]"
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

          <div className="rounded-xl border border-dashed border-[#B87333]/40 bg-[#121212]/80 p-3.5">
            <div className="flex items-center gap-2 font-mono-docket text-xs font-bold uppercase text-[#B87333] mb-2">
              <Sparkles className="h-4 w-4" />
              <span>Test Signature Resolver</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
              <input
                type="text"
                value={testSignature}
                onChange={(e) => setTestSignature(e.target.value)}
                className="flex-1 rounded-lg border border-white/15 bg-[#1A1715] px-3 py-1.5 font-mono-docket text-xs text-[#F5F2EB]"
              />
              <span className="font-mono-docket text-xs text-emerald-400 font-bold">
                → {testResolution.member ? testResolution.member.display_name : 'Unmapped'}
              </span>
            </div>
          </div>
        </section>

        {/* Roster Manager */}
        <section className="lg:col-span-5 rounded-2xl border border-white/10 bg-[#1A1715] p-4 sm:p-6 space-y-4">
          <h2 className="font-athletic text-2xl font-bold uppercase tracking-wide text-[#F5F2EB] flex items-center gap-2">
            <Users className="h-5 w-5 text-[#C86D51]" />
            <span>ROSTER (`members`)</span>
          </h2>

          <form onSubmit={handleAddMember} className="space-y-3 rounded-xl border border-white/10 bg-[#121212] p-3.5">
            <input
              type="text"
              required
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              placeholder="Display Name"
              className="w-full rounded-lg border border-white/15 bg-[#1A1715] px-3 py-2 text-xs text-[#F5F2EB]"
            />
            <div className="flex items-center justify-between gap-4">
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
                className="rounded-lg bg-[#B87333] px-3 py-1.5 font-athletic text-xs font-bold uppercase text-[#121212]"
              >
                Save
              </button>
            </div>
          </form>

          <div className="space-y-2">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-[#121212] px-3.5 py-2"
              >
                <span className="font-athletic text-base font-bold uppercase text-[#F5F2EB]">
                  {m.display_name}
                </span>
                <div className="flex items-center gap-1.5">
                  {m.is_patron && (
                    <span className="rounded bg-[#B87333]/20 px-2 py-0.5 font-mono-docket text-[10px] text-[#E8B888]">
                      PATRON
                    </span>
                  )}
                  {m.is_staff && (
                    <span className="rounded bg-[#C86D51]/20 px-2 py-0.5 font-mono-docket text-[10px] text-[#E08A4E]">
                      STAFF
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <SlipModalViewer slip={selectedSlip} onClose={() => setSelectedSlip(null)} />
    </div>
  );
};
