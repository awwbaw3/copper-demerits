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
  EyeOff,
  CheckCircle2,
  Database,
  Fingerprint,
  Lock,
  Beer,
  Send,
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const {
    members,
    aliases,
    demerits,
    isSupabaseConnected,
    currentMember,
    isAdminOrStaff,
    setIsProfileModalOpen,
    resolveStaffSignature,
    resolvePatronNickname,
    deleteSlip,
    updateSlipAssignment,
    addStaffAlias,
    deleteStaffAlias,
    rerunAliasNormalization,
    addOrUpdateMember,
    deduplicateExistingSlips,
    adminOverrideSlip,
    sendFridayDigestTest,
  } = useDemerits();

  const [selectedSlip, setSelectedSlip] = useState<EnrichedDemeritSlip | null>(null);
  const [sendingDigestTest, setSendingDigestTest] = useState(false);

  // Alias Mapper State
  const [newAliasInput, setNewAliasInput] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    () => members.find((m) => m.is_staff)?.id || members[0]?.id || ''
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
  const queuedOrBlurredSlips = demerits.filter(
    (s) => s.status === 'pending' || s.is_blurred
  );

  if (!isAdminOrStaff) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-3xl border-2 border-[#B87333]/50 bg-[#171311] p-6 sm:p-10 text-center space-y-5 shadow-[0_20px_50px_rgba(0,0,0,0.85)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#DFC15E]/40 bg-[#DFC15E]/15 text-[#DFC15E]">
            <Lock className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <span className="font-mono-docket text-xs font-bold uppercase tracking-widest text-[#DFC15E]">
              🦓 OFFICIAL REFEREE BOOTH ACCESS ONLY
            </span>
            <h1 className="font-athletic text-3xl sm:text-5xl font-black uppercase tracking-wide text-[#F5F2EB]">
              ADMIN &amp; REFEREE SIGN-IN REQUIRED
            </h1>
            <p className="mx-auto max-w-xl text-xs sm:text-sm text-[#D6C7B8]">
              Only the Site Administrator (<strong className="text-white">Rick</strong>) or Official
              Bar Referee (<strong className="text-white">Sarah</strong>) signed in with their 4–8
              digit Bar PIN can access the Ref Booth, override auto-blurred slips, or manage
              aliases.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#DFC15E] to-[#B87333] px-6 py-3.5 min-h-[48px] touch-manipulation active:scale-95 font-athletic text-lg font-black uppercase tracking-wider text-[#121212] shadow-[0_0_25px_rgba(223,193,94,0.35)] hover:brightness-110 cursor-pointer"
            >
              <KeyRound className="h-5 w-5" />
              <span>Sign In as Rick (Admin) or Sarah (Ref)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

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
    try {
      await addOrUpdateMember(newMemberName, newMemberIsPatron, newMemberIsStaff);
      setFeedback({
        type: 'ok',
        msg: `Added "${newMemberName.trim()}" to bar roster.`,
      });
      setNewMemberName('');
    } catch (err) {
      setFeedback({
        type: 'err',
        msg: err instanceof Error ? err.message : 'Name blocked by Referee filter.',
      });
    }
  };

  const handleOverrideSlip = async (
    slipId: string,
    action: 'approve_unblur' | 'approve_keep_blurred' | 'reject'
  ) => {
    const res = await adminOverrideSlip(slipId, action);
    if (res.ok) {
      setFeedback({
        type: 'ok',
        msg:
          action === 'reject'
            ? 'Slip rejected and hidden from public docket.'
            : action === 'approve_keep_blurred'
            ? 'Slip approved with Referee Blur kept active.'
            : 'Admin Override complete: Slip unblurred and approved for the public docket!',
      });
    } else {
      setFeedback({
        type: 'err',
        msg: res.error || 'Could not override slip.',
      });
    }
  };

  const handleSendFridayDigestTest = async () => {
    setSendingDigestTest(true);
    try {
      const res = await sendFridayDigestTest();
      if (res.ok) {
        setFeedback({
          type: 'ok',
          msg: `✓ ${res.message || 'Friday Docket test triggered!'} (Podium #1: ${res.preview?.topLeader || 'None'})`,
        });
      } else {
        setFeedback({
          type: 'err',
          msg: res.error || 'Could not send test Friday Docket.',
        });
      }
    } finally {
      setSendingDigestTest(false);
    }
  };

  const staffRes = resolveStaffSignature(testSignature);
  const patronRes = resolvePatronNickname(testSignature);
  const testResolution = staffRes.member ? staffRes : patronRes;

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-5 sm:py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#B87333]/30 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#B87333]/40 bg-[#B87333]/10 px-3 py-1 text-[11px] font-mono-docket uppercase tracking-widest text-[#E8B888]">
            <ShieldAlert className="h-3.5 w-3.5 text-[#B87333]" />
            <span>
              SIGNED IN AS {currentMember?.display_name.toUpperCase()} (
              {currentMember?.is_admin ? 'SITE ADMIN' : 'BAR REFEREE'})
            </span>
          </div>
          <h1 className="mt-2 font-athletic text-3xl sm:text-5xl font-extrabold uppercase tracking-wide text-[#F5F2EB]">
            REFEREE <span className="text-[#B87333]">BOOTH &amp; OVERRIDE QUEUE</span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#1A1715] px-3 py-2 font-mono-docket text-xs text-[#C4B8AC]">
            <Database className="h-3.5 w-3.5 text-[#B87333]" />
            {isSupabaseConnected ? 'Cloud Database & AI Live' : 'Local Storage'}
          </span>

          <button
            type="button"
            onClick={handleDeduplicate}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#B87333] bg-[#B87333]/20 px-3.5 py-2.5 min-h-[44px] touch-manipulation active:scale-95 font-mono-docket text-xs font-bold text-[#E8B888] transition hover:bg-[#B87333] hover:text-[#121212] cursor-pointer"
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

      {/* Friday Night Docket & Dispatcher Info */}
      <section className="rounded-2xl border border-white/10 bg-[#141110] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Beer className="h-4 w-4 text-[#DFC15E]" />
            <span className="font-athletic text-base sm:text-lg font-bold uppercase tracking-wider text-[#F5F2EB]">
              FRIDAY NIGHT DOCKET DISPATCHER (AUTOMATED CRON)
            </span>
            <span className="rounded-full bg-emerald-500/15 border border-emerald-400/40 px-2.5 py-0.5 font-mono-docket text-[10px] font-bold uppercase text-emerald-300">
              Fridays @ 5:00 PM EST
            </span>
          </div>
          <p className="font-mono-docket text-xs text-[#A8988B]">
            Automatically summarizes podium standings, weekly demerits, and top offenses to opted-in patrons via their chosen channel (Email, SMS, or Both). Patrons configure preferences in their locker.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSendFridayDigestTest}
          disabled={sendingDigestTest}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#DFC15E] bg-gradient-to-r from-[#DFC15E]/20 to-[#B87333]/30 px-4 py-2.5 min-h-[44px] touch-manipulation active:scale-95 font-mono-docket text-xs font-bold text-[#DFC15E] transition hover:brightness-125 disabled:opacity-50 shrink-0 cursor-pointer"
        >
          <Send className="h-3.5 w-3.5" />
          <span>{sendingDigestTest ? 'Dispatching Test...' : 'Send Test Friday Docket'}</span>
        </button>
      </section>

      {/* AI Referee Auto-Blur & Pending Override Queue */}
      <section className="rounded-2xl border-2 border-amber-500/40 bg-amber-950/15 p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/25 pb-3">
          <div>
            <span className="font-mono-docket text-[10px] font-bold uppercase tracking-widest text-amber-300">
              🦓 REAL-TIME REFEREE MONITOR · AUTO-BLUR &amp; ADMIN OVERRIDE
            </span>
            <h2 className="font-athletic text-xl sm:text-2xl font-bold uppercase text-[#F5F2EB]">
              FLAGGED / BLURRED SLIPS QUEUE ({queuedOrBlurredSlips.length})
            </h2>
          </div>
          <span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1 font-mono-docket text-[11px] font-bold text-amber-200">
            Zero-Cost Workers AI + Referee Filter Active
          </span>
        </div>

        {queuedOrBlurredSlips.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#121212] p-5 text-center">
            <p className="font-mono-docket text-xs text-emerald-300">
              ✓ No blurred or pending slips in the Referee Queue! All active slips are clean and
              jovial.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {queuedOrBlurredSlips.map((slip) => (
              <div
                key={slip.id}
                className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-xl border border-amber-500/40 bg-[#121212] p-4"
              >
                <div className="flex items-center gap-3.5">
                  {slip.image_url && (
                    <img
                      src={slip.image_url}
                      alt={`Queued slip for ${slip.patronDisplayName}`}
                      className={`h-16 w-16 shrink-0 rounded-lg border border-amber-400/50 object-cover bg-black ${
                        slip.is_blurred ? 'blur-[2px]' : ''
                      }`}
                    />
                  )}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 font-mono-docket text-xs">
                      <span className="rounded bg-amber-500/20 px-2 py-0.5 font-bold uppercase text-amber-300">
                        STATUS: {slip.status.toUpperCase()}
                      </span>
                      {slip.is_blurred && (
                        <span className="rounded bg-rose-500/20 px-2 py-0.5 font-bold uppercase text-rose-300">
                          AUTO-BLURRED
                        </span>
                      )}
                      <span className="text-[#E8B888]">{slip.incident_date}</span>
                    </div>
                    <div className="font-athletic text-lg font-bold uppercase text-white">
                      {slip.patronDisplayName} · {slip.infractions.join(' · ')}
                    </div>
                    {slip.moderation_flag_reason && (
                      <p className="font-mono-docket text-[11px] text-amber-300">
                        Ref Note: {slip.moderation_flag_reason}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOverrideSlip(slip.id, 'approve_unblur')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2.5 min-h-[44px] touch-manipulation active:scale-95 font-mono-docket text-xs font-bold text-[#121212] hover:brightness-110 cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Approve &amp; Unblur (Override)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOverrideSlip(slip.id, 'approve_keep_blurred')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/50 bg-amber-500/20 px-3.5 py-2.5 min-h-[44px] touch-manipulation active:scale-95 font-mono-docket text-xs font-bold text-amber-200 hover:bg-amber-500/30 cursor-pointer"
                  >
                    <EyeOff className="h-4 w-4" />
                    <span>Approve (Keep Blurred)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteSlip(slip.id)}
                    className="inline-flex items-center gap-1 rounded-xl border border-rose-500/40 bg-rose-950/40 px-3.5 py-2.5 min-h-[44px] touch-manipulation active:scale-95 font-mono-docket text-xs font-bold text-rose-300 hover:bg-rose-900/50 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Eject Slip</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Uploaded Slips Queue */}
      <section className="rounded-2xl border border-white/10 bg-[#1A1715] p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="font-athletic text-xl sm:text-2xl font-bold uppercase text-[#F5F2EB]">
            ALL UPLOADED SLIP PHOTOS ({demerits.length})
          </h2>
          <button
            type="button"
            onClick={handleRerunNormalization}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#B87333]/50 bg-[#B87333]/15 px-3.5 py-2 min-h-[44px] touch-manipulation active:scale-95 font-mono-docket text-xs font-bold text-[#E8B888] cursor-pointer"
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
                      className={`h-16 w-16 shrink-0 rounded-lg border border-[#B87333]/40 object-cover bg-black ${
                        slip.is_blurred ? 'blur-[2px]' : ''
                      }`}
                    />
                  )}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 font-mono-docket text-xs text-[#E8B888]">
                      <span>{slip.incident_date}</span>
                      {slip.incident_time && <span>· {slip.incident_time}</span>}
                      <span className="font-bold text-[#C86D51]">+{slip.demerit_count} PTS</span>
                      {slip.is_blurred && (
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                          BLURRED
                        </span>
                      )}
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
                    className="rounded-xl border border-white/15 bg-[#1A1715] px-3 py-2 font-mono-docket text-base sm:text-xs min-h-[44px] text-[#F5F2EB]"
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
                    className="rounded-xl border border-white/15 bg-[#1A1715] px-3 py-2 font-mono-docket text-base sm:text-xs min-h-[44px] text-[#F5F2EB]"
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
                    onClick={() =>
                      handleOverrideSlip(
                        slip.id,
                        slip.is_blurred ? 'approve_unblur' : 'approve_keep_blurred'
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 min-h-[44px] touch-manipulation active:scale-95 font-mono-docket text-xs text-amber-200 hover:bg-amber-500/20 cursor-pointer"
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                    <span>{slip.is_blurred ? 'Unblur' : 'Blur'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedSlip(slip)}
                    className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 min-h-[44px] touch-manipulation active:scale-95 font-mono-docket text-xs text-[#D6C7B8] cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteSlip(slip.id)}
                    aria-label="Delete slip"
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 p-2 text-[#9E8F82] hover:text-rose-400 touch-manipulation active:scale-95 cursor-pointer"
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
          <div>
            <h2 className="font-athletic text-2xl font-bold uppercase tracking-wide text-[#F5F2EB] flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-[#B87333]" />
              <span>PATRON NICKNAME &amp; STAFF ALIAS MAPPER</span>
            </h2>
            <p className="mt-1 font-mono-docket text-[11px] text-[#9E8F82]">
              Only Admins and signed-in Claimed Profiles can adjust nicknames. Any slip written with a mapped nickname automatically merges its points and stats into that profile.
            </p>
          </div>

          <form onSubmit={handleAddAlias} className="grid grid-cols-1 gap-2.5 sm:grid-cols-12">
            <div className="sm:col-span-6">
              <input
                type="text"
                required
                value={newAliasInput}
                onChange={(e) => setNewAliasInput(e.target.value)}
                placeholder='Friendly nickname/alias (e.g. "ricky", "big burt", "the boss")'
                className="w-full rounded-xl border border-white/15 bg-[#121212] px-3.5 py-2.5 font-mono-docket text-base sm:text-xs min-h-[44px] text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-4">
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                aria-label="Target member profile"
                className="w-full rounded-xl border border-white/15 bg-[#121212] px-3.5 py-2.5 font-mono-docket text-base sm:text-xs min-h-[44px] text-[#F5F2EB]"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name} ({m.is_staff && m.is_patron ? 'Staff & Patron' : m.is_staff ? 'Staff' : 'Patron'})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-1 rounded-xl bg-[#B87333] px-3 py-2.5 min-h-[44px] touch-manipulation active:scale-95 font-athletic text-xs font-bold uppercase text-[#121212] cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Map</span>
              </button>
            </div>
          </form>

          <div className="space-y-2.5">
            {members.map((member) => {
              const memberAliases = aliases.filter((a) => a.member_id === member.id);
              return (
                <div
                  key={member.id}
                  className="rounded-xl border border-white/10 bg-[#121212] p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-athletic text-lg font-bold uppercase text-[#F5F2EB]">
                        {member.display_name}
                      </span>
                      <span className="rounded bg-white/5 px-2 py-0.5 font-mono-docket text-[10px] uppercase text-[#B5A99D]">
                        {member.is_staff && member.is_patron
                          ? 'Staff & Patron'
                          : member.is_staff
                          ? 'Staff'
                          : 'Patron'}
                      </span>
                    </div>
                    <span className="font-mono-docket text-[11px] text-[#9E8F82]">
                      {memberAliases.length} {memberAliases.length === 1 ? 'nickname' : 'nicknames'}
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
                          className="flex h-7 w-7 items-center justify-center rounded text-[#9E8F82] hover:bg-rose-500/20 hover:text-rose-400 touch-manipulation active:scale-95 cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
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
              <span>Test Signature / Nickname Resolver</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
              <input
                type="text"
                value={testSignature}
                onChange={(e) => setTestSignature(e.target.value)}
                className="flex-1 rounded-xl border border-white/15 bg-[#1A1715] px-3.5 py-2.5 font-mono-docket text-base sm:text-xs min-h-[44px] text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
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
              placeholder="Friendly Display Name"
              className="w-full rounded-xl border border-white/15 bg-[#1A1715] px-3.5 py-2.5 font-mono-docket text-base sm:text-xs min-h-[44px] text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
            />
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-xs font-mono-docket text-[#D6C7B8]">
                <label className="flex items-center gap-1.5 py-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newMemberIsPatron}
                    onChange={(e) => setNewMemberIsPatron(e.target.checked)}
                    className="accent-[#B87333]"
                  />
                  <span>Patron</span>
                </label>
                <label className="flex items-center gap-1.5 py-1 cursor-pointer">
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
                className="rounded-xl bg-[#B87333] px-4 py-2 min-h-[44px] touch-manipulation active:scale-95 font-athletic text-xs font-bold uppercase text-[#121212] cursor-pointer"
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
                  {m.is_admin && (
                    <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono-docket text-[10px] font-bold text-amber-300">
                      ADMIN
                    </span>
                  )}
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
