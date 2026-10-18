import React, { useState, useEffect } from 'react';
import { useDemerits } from '../context/DemeritsContext';
import { MichiganTeamBadge, TeamBadgeMeta } from './MichiganSportsGraphics';
import {
  X,
  KeyRound,
  ShieldCheck,
  UserCheck,
  Sparkles,
  LogOut,
  Plus,
  Lock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export const TEAM_CHOICES: {
  id: TeamBadgeMeta['iconType'];
  label: string;
  color: string;
}[] = [
  { id: 'lions', label: 'Detroit Lions', color: '#0076B6' },
  { id: 'red-wings', label: 'Detroit Red Wings', color: '#CE1126' },
  { id: 'pistons-bad-boys', label: 'Bad Boys Pistons', color: '#1D42BA' },
  { id: 'tigers', label: 'Detroit Tigers', color: '#FA4616' },
  { id: 'michigan', label: 'Michigan Wolverines', color: '#FFCB05' },
  { id: 'msu', label: 'Michigan State Spartans', color: '#18453B' },
];

export const ClaimProfileModal: React.FC = () => {
  const {
    members,
    currentMember,
    isProfileModalOpen,
    setIsProfileModalOpen,
    claimOrLoginProfile,
    logoutProfile,
  } = useDemerits();

  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<'patron' | 'staff' | 'both'>('patron');
  const [pin, setPin] = useState('');
  const [contact, setContact] = useState('');
  const [favoriteTeam, setFavoriteTeam] = useState<TeamBadgeMeta['iconType']>('lions');
  const [tagline, setTagline] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedMemberId && members.length > 0) {
      const defaultTarget =
        currentMember || members.find((m) => m.display_name === 'Rick') || members[0];
      if (defaultTarget) {
        setSelectedMemberId(defaultTarget.id);
        setFavoriteTeam(
          (defaultTarget.favorite_team as TeamBadgeMeta['iconType']) || 'lions'
        );
        setTagline(defaultTarget.tagline || '');
      }
    }
  }, [members, currentMember, selectedMemberId]);

  if (!isProfileModalOpen) return null;

  const selectedMember = members.find((m) => m.id === selectedMemberId) || null;
  const isAlreadyClaimed = Boolean(selectedMember?.is_claimed);

  const handleSelectMember = (id: string) => {
    setSelectedMemberId(id);
    setErrorMsg(null);
    setSuccessMsg(null);
    const m = members.find((mem) => mem.id === id);
    if (m) {
      setFavoriteTeam((m.favorite_team as TeamBadgeMeta['iconType']) || 'lions');
      setTagline(m.tagline || '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (pin.trim().length < 4) {
      setErrorMsg('Enter a 4-digit Bar PIN to claim or unlock your profile.');
      return;
    }

    if (mode === 'new' && !newDisplayName.trim()) {
      setErrorMsg('Enter your name or bar nickname.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await claimOrLoginProfile({
        memberId: mode === 'existing' ? selectedMemberId : undefined,
        displayName: mode === 'new' ? newDisplayName.trim() : selectedMember?.display_name,
        contact: contact.trim() || undefined,
        pin: pin.trim(),
        favoriteTeam,
        tagline: tagline.trim() || undefined,
        role: mode === 'new' ? newRole : undefined,
      });

      if (!res.ok) {
        setErrorMsg(res.error || 'Could not verify profile.');
      } else {
        setSuccessMsg(
          res.mode === 'logged-in'
            ? `Welcome back, ${res.member?.display_name}!`
            : `Profile claimed for ${res.member?.display_name}!`
        );
        setPin('');
        setTimeout(() => {
          setIsProfileModalOpen(false);
          setSuccessMsg(null);
        }, 900);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Claim or Login to Bar Profile"
    >
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl border-2 border-[#B87333]/60 bg-[#14110F] p-5 sm:p-6 shadow-[0_25px_80px_rgba(0,0,0,0.95)] space-y-5">
        {/* Top Bar */}
        <div className="flex items-start justify-between gap-3 border-b border-[#B87333]/25 pb-4">
          <div className="flex items-center gap-3">
            <img
              src="/brand/CopperLogo_Web.png"
              alt="Copper Athletic Club"
              className="h-11 w-auto object-contain"
            />
            <div>
              <span className="inline-flex items-center gap-1.5 font-mono-docket text-[10px] font-bold uppercase tracking-widest text-[#DFC15E]">
                <KeyRound className="h-3 w-3 text-[#B87333]" />
                CLOUDFLARE D1 BAR LOCKER PASS
              </span>
              <h2 className="font-athletic text-2xl sm:text-3xl font-black uppercase tracking-wide text-[#F5F2EB] leading-none">
                CLAIM OR SIGN IN <span className="text-[#B87333]">TO PROFILE</span>
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsProfileModalOpen(false)}
            className="rounded-xl border border-white/15 bg-white/5 p-2 text-[#B5A99D] hover:border-[#B87333] hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Active Session Banner if signed in */}
        {currentMember && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-3.5">
            <div className="flex items-center gap-3">
              <MichiganTeamBadge
                iconType={
                  (currentMember.favorite_team as TeamBadgeMeta['iconType']) || 'lions'
                }
                size="sm"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-athletic text-lg font-black uppercase text-white">
                    {currentMember.display_name}
                  </span>
                  <span className="rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 font-mono-docket text-[9px] font-bold uppercase text-emerald-300">
                    SIGNED IN
                  </span>
                </div>
                <p className="font-mono-docket text-[11px] text-emerald-200/80">
                  {currentMember.is_staff && currentMember.is_patron
                    ? 'Staff & Patron Hybrid'
                    : currentMember.is_staff
                    ? 'Official Bar Staff / Referee'
                    : 'Ring of Honor Patron'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                logoutProfile();
                setSuccessMsg(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-1.5 font-mono-docket text-xs font-bold text-rose-300 hover:bg-rose-500/25 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        )}

        {/* Mode Toggle: Existing Roster vs New Patron */}
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-[#0D0B0A] p-1.5">
          <button
            type="button"
            onClick={() => {
              setMode('existing');
              setErrorMsg(null);
            }}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 font-athletic text-sm font-bold uppercase tracking-wider transition cursor-pointer ${
              mode === 'existing'
                ? 'bg-[#B87333] text-[#121212] shadow-md'
                : 'text-[#B5A99D] hover:text-white'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            <span>Claim / Login Roster</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('new');
              setErrorMsg(null);
            }}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 font-athletic text-sm font-bold uppercase tracking-wider transition cursor-pointer ${
              mode === 'new'
                ? 'bg-[#B87333] text-[#121212] shadow-md'
                : 'text-[#B5A99D] hover:text-white'
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>New Bar Patron</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'existing' ? (
            <div className="space-y-2.5">
              <label className="block font-mono-docket text-xs font-bold uppercase tracking-wider text-[#E8B888]">
                1. SELECT YOUR STAFF OR PATRON ROSTER CARD
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {members.map((m) => {
                  const isSelected = m.id === selectedMemberId;
                  const teamIcon =
                    (m.favorite_team as TeamBadgeMeta['iconType']) ||
                    (m.display_name === 'Sarah'
                      ? 'pistons-bad-boys'
                      : m.display_name === 'Burtis'
                      ? 'red-wings'
                      : 'lions');
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelectMember(m.id)}
                      className={`flex items-center justify-between gap-2.5 rounded-2xl border p-3 text-left transition cursor-pointer ${
                        isSelected
                          ? 'border-[#B87333] bg-[#B87333]/20 shadow-[0_0_20px_rgba(184,115,51,0.25)]'
                          : 'border-white/10 bg-[#1B1714] hover:border-[#B87333]/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <MichiganTeamBadge iconType={teamIcon} size="sm" />
                        <div className="min-w-0">
                          <div className="font-athletic text-lg font-black uppercase text-[#F5F2EB] truncate">
                            {m.display_name}
                          </div>
                          <div className="font-mono-docket text-[10px] uppercase text-[#B5A99D]">
                            {m.is_staff && m.is_patron
                              ? 'Staff & Patron'
                              : m.is_staff
                              ? 'Head Ref / Staff'
                              : 'Patron'}
                          </div>
                        </div>
                      </div>

                      {m.is_claimed ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 font-mono-docket text-[9px] font-bold uppercase text-emerald-300 shrink-0">
                          <Lock className="h-2.5 w-2.5" />
                          Claimed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#DFC15E]/40 bg-[#DFC15E]/15 px-2 py-0.5 font-mono-docket text-[9px] font-bold uppercase text-[#DFC15E] shrink-0">
                          <Sparkles className="h-2.5 w-2.5" />
                          Unclaimed
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-mono-docket text-xs font-bold uppercase text-[#D6C7B8]">
                  YOUR NAME / BAR NICKNAME *
                </label>
                <input
                  type="text"
                  required
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="e.g. Big Dave, Mike, etc."
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0D0B0A] px-3.5 py-2.5 text-sm text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono-docket text-xs font-bold uppercase text-[#D6C7B8]">
                  ROLE AT COPPER AC
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'patron' | 'staff' | 'both')}
                  aria-label="Role at Copper AC"
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0D0B0A] px-3.5 py-2.5 font-mono-docket text-xs text-[#E8B888]"
                >
                  <option value="patron">Patron (Ring of Honor Contender)</option>
                  <option value="staff">Bar Staff / Referee</option>
                  <option value="both">Both Staff &amp; Patron (Burtis Mode)</option>
                </select>
              </div>
            </div>
          )}

          {/* Team Allegiance Picker */}
          <div>
            <label className="block font-mono-docket text-xs font-bold uppercase tracking-wider text-[#E8B888]">
              2. PICK YOUR DETROIT / MICHIGAN TEAM EMBLEM
            </label>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TEAM_CHOICES.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => setFavoriteTeam(team.id)}
                  className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition cursor-pointer ${
                    favoriteTeam === team.id
                      ? 'border-[#B87333] bg-[#B87333]/20 text-white font-bold'
                      : 'border-white/10 bg-[#0D0B0A] text-[#B5A99D] hover:border-white/25'
                  }`}
                >
                  <MichiganTeamBadge iconType={team.id} size="sm" />
                  <span className="font-athletic text-xs uppercase leading-tight">
                    {team.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 4-Digit Bar PIN + Optional Contact/Tagline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-mono-docket text-xs font-bold uppercase text-[#DFC15E]">
                {mode === 'existing' && isAlreadyClaimed
                  ? 'ENTER YOUR 4-DIGIT BAR PIN *'
                  : 'SET YOUR 4-DIGIT BAR PIN *'}
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="4-digit PIN (e.g. 3130)"
                className="mt-1.5 w-full rounded-xl border border-[#B87333]/50 bg-[#0D0B0A] px-3.5 py-2.5 font-mono-docket text-base tracking-widest text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
              />
              <span className="mt-1 block font-mono-docket text-[10px] text-[#8E8074]">
                {mode === 'existing' && isAlreadyClaimed
                  ? 'This profile is claimed. Enter your PIN to unlock.'
                  : 'Used to sign in from your phone before dropping slips.'}
              </span>
            </div>

            <div>
              <label className="block font-mono-docket text-xs font-bold uppercase text-[#D6C7B8]">
                BAR CHIRP / TAGLINE (OPTIONAL)
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Never ordering Gin & Diet Coke again"
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0D0B0A] px-3.5 py-2.5 text-sm text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
              />
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Phone or Email (optional recovery)"
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#0D0B0A] px-3 py-1.5 font-mono-docket text-xs text-[#B5A99D] focus:border-[#B87333] focus:outline-none"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/50 bg-rose-950/40 p-3 text-xs font-mono-docket text-rose-200">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-950/40 p-3 text-xs font-mono-docket text-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#B87333] to-[#C86D51] px-5 py-3.5 font-athletic text-lg font-black uppercase tracking-wider text-[#121212] shadow-[0_0_25px_rgba(184,115,51,0.45)] transition hover:brightness-110 disabled:opacity-50 cursor-pointer"
          >
            <ShieldCheck className="h-5 w-5" />
            <span>
              {submitting
                ? 'Verifying with Cloudflare D1...'
                : mode === 'new'
                ? 'Create & Claim Bar Profile'
                : isAlreadyClaimed
                ? `Sign In as ${selectedMember?.display_name || 'Member'}`
                : `Claim ${selectedMember?.display_name || 'Profile'} & Sign In`}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};
