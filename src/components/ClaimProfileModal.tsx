import React, { useState, useEffect } from 'react';
import { useDemerits } from '../context/DemeritsContext';
import { MichiganTeamBadge, TeamBadgeMeta } from './MichiganSportsGraphics';
import { moderateTextInstant } from '../lib/moderation';
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
  Settings,
  Bell,
  Mail,
  Smartphone,
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
    updateMyProfile,
    requestNotificationVerification,
    verifyNotificationCode,
    logoutProfile,
  } = useDemerits();

  const [mode, setMode] = useState<'my-locker' | 'existing' | 'new'>('existing');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<'patron' | 'staff' | 'both'>('patron');
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [favoriteTeam, setFavoriteTeam] = useState<TeamBadgeMeta['iconType']>('lions');
  const [tagline, setTagline] = useState('');

  // Opt-In Notification State (My Locker)
  const [notifEmail, setNotifEmail] = useState('');
  const [notifPhone, setNotifPhone] = useState('');
  const [notifCarrier, setNotifCarrier] = useState('none');
  const [optInAccepted, setOptInAccepted] = useState(false);
  const [verificationCodeSent, setVerificationCodeSent] = useState(false);
  const [verificationCodeInput, setVerificationCodeInput] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isProfileModalOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
      if (currentMember) {
        setMode('my-locker');
        setSelectedMemberId(currentMember.id);
        setNewDisplayName(currentMember.display_name || '');
        setFavoriteTeam(
          (currentMember.favorite_team as TeamBadgeMeta['iconType']) || 'lions'
        );
        setTagline(currentMember.tagline || '');
        setNotifEmail(currentMember.notification_email || '');
        setNotifPhone(currentMember.notification_phone || '');
        setNotifCarrier(currentMember.notification_carrier || 'none');
        setOptInAccepted(Boolean(currentMember.notification_opt_in));
      } else {
        setMode('existing');
        const defaultTarget =
          members.find((m) => m.display_name === 'Rick') || members[0];
        if (defaultTarget) {
          setSelectedMemberId(defaultTarget.id);
          setFavoriteTeam(
            (defaultTarget.favorite_team as TeamBadgeMeta['iconType']) || 'lions'
          );
          setTagline(defaultTarget.tagline || '');
        }
      }
    }
  }, [isProfileModalOpen, currentMember, members]);

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

  const handleClaimOrSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanPin = pin.trim();
    if (cleanPin.length < 4 || cleanPin.length > 8) {
      setErrorMsg('Enter a 4 to 8 digit Bar PIN to claim or unlock your profile.');
      return;
    }

    if (mode === 'new' && !newDisplayName.trim()) {
      setErrorMsg('Enter your name or bar nickname.');
      return;
    }

    const modCheck = moderateTextInstant(`${newDisplayName} ${tagline}`);
    if (modCheck.flagged) {
      setErrorMsg(
        `Referee Whistle: Please keep names and taglines friendly, jovial, and profanity-free!`
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await claimOrLoginProfile({
        memberId: mode === 'existing' ? selectedMemberId : undefined,
        displayName: mode === 'new' ? newDisplayName.trim() : selectedMember?.display_name,
        pin: cleanPin,
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
        setMode('my-locker');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveMyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMember) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    if (pin.trim().length < 4 || pin.trim().length > 8) {
      setErrorMsg('Enter your current 4 to 8 digit Bar PIN to save profile changes.');
      return;
    }

    if (newPin.trim() && (newPin.trim().length < 4 || newPin.trim().length > 8)) {
      setErrorMsg('New Bar PIN must be between 4 and 8 digits.');
      return;
    }

    const modCheck = moderateTextInstant(`${newDisplayName} ${tagline}`);
    if (modCheck.flagged) {
      setErrorMsg(
        'Referee Whistle: Please keep your display name and bar tagline friendly and profanity-free!'
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await updateMyProfile({
        memberId: currentMember.id,
        currentPin: pin.trim(),
        newPin: newPin.trim() || undefined,
        displayName: newDisplayName.trim() || currentMember.display_name,
        tagline: tagline.trim(),
        favoriteTeam,
        notificationEmail: notifEmail.trim(),
        notificationPhone: notifPhone.trim(),
        notificationCarrier: notifCarrier,
        notificationOptIn: optInAccepted,
      });

      if (!res.ok) {
        setErrorMsg(res.error || 'Could not update profile.');
      } else {
        if (newPin.trim()) {
          setPin(newPin.trim());
          setNewPin('');
        }
        setSuccessMsg('Profile & Locker settings saved to Cloudflare D1!');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendVerificationCode = async () => {
    if (!currentMember) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    if (pin.trim().length < 4) {
      setErrorMsg('Enter your current 4–8 digit Bar PIN above first.');
      return;
    }
    if (!optInAccepted) {
      setErrorMsg('Please check the Opt-In Consent box before requesting a verification code.');
      return;
    }
    if (!notifEmail.trim() && (!notifPhone.trim() || notifCarrier === 'none')) {
      setErrorMsg(
        'Enter an email address (or a 10-digit phone number + mobile carrier) to receive your 6-digit verification code.'
      );
      return;
    }

    setSendingCode(true);
    try {
      const res = await requestNotificationVerification({
        memberId: currentMember.id,
        pin: pin.trim(),
        email: notifEmail.trim(),
        phone: notifPhone.trim(),
        carrier: notifCarrier,
        optInAccepted: true,
      });
      if (!res.ok) {
        setErrorMsg(res.error || 'Could not send verification code.');
      } else {
        setVerificationCodeSent(true);
        setSuccessMsg(res.message || '6-digit verification code sent!');
      }
    } finally {
      setSendingCode(false);
    }
  };

  const handleConfirmVerificationCode = async () => {
    if (!currentMember) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!verificationCodeInput.trim()) {
      setErrorMsg('Enter the 6-digit verification code.');
      return;
    }

    setVerifyingCode(true);
    try {
      const res = await verifyNotificationCode({
        memberId: currentMember.id,
        pin: pin.trim(),
        code: verificationCodeInput.trim(),
      });
      if (!res.ok) {
        setErrorMsg(res.error || 'Invalid verification code.');
      } else {
        setVerificationCodeSent(false);
        setVerificationCodeInput('');
        setSuccessMsg('Opt-In Notifications Verified & Enabled!');
      }
    } finally {
      setVerifyingCode(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Bar Locker Profile & Sign In"
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
                4–8 DIGIT PIN • BAR LOCKER &amp; PROFILE
              </span>
              <h2 className="font-athletic text-2xl sm:text-3xl font-black uppercase tracking-wide text-[#F5F2EB] leading-none">
                {mode === 'my-locker' ? (
                  <>
                    MY LOCKER <span className="text-[#B87333]">&amp; EDIT PROFILE</span>
                  </>
                ) : (
                  <>
                    CLAIM OR SIGN IN <span className="text-[#B87333]">TO PROFILE</span>
                  </>
                )}
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
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-athletic text-lg font-black uppercase text-white">
                    {currentMember.display_name}
                  </span>
                  <span className="rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 font-mono-docket text-[9px] font-bold uppercase text-emerald-300">
                    SIGNED IN
                  </span>
                  {currentMember.is_admin && (
                    <span className="rounded-full bg-[#DFC15E]/20 border border-[#DFC15E]/50 px-2 py-0.5 font-mono-docket text-[9px] font-bold uppercase text-[#DFC15E]">
                      SITE ADMIN
                    </span>
                  )}
                </div>
                <p className="font-mono-docket text-[11px] text-emerald-200/80">
                  {currentMember.is_admin
                    ? 'Site Administrator & Ring of Honor Co-Leader'
                    : currentMember.is_staff && currentMember.is_patron
                    ? 'Staff & Patron Hybrid'
                    : currentMember.is_staff
                    ? 'Official Bar Staff / Head Referee'
                    : 'Ring of Honor Patron'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                logoutProfile();
                setMode('existing');
                setPin('');
                setSuccessMsg(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-1.5 font-mono-docket text-xs font-bold text-rose-300 hover:bg-rose-500/25 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        )}

        {/* Mode Toggle Tabs */}
        <div
          className={`grid ${
            currentMember ? 'grid-cols-3' : 'grid-cols-2'
          } gap-2 rounded-2xl border border-white/10 bg-[#0D0B0A] p-1.5`}
        >
          {currentMember && (
            <button
              type="button"
              onClick={() => {
                setMode('my-locker');
                setErrorMsg(null);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 font-athletic text-xs sm:text-sm font-bold uppercase tracking-wider transition cursor-pointer ${
                mode === 'my-locker'
                  ? 'bg-[#B87333] text-[#121212] shadow-md'
                  : 'text-[#B5A99D] hover:text-white'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Edit My Profile</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setMode('existing');
              setErrorMsg(null);
            }}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 font-athletic text-xs sm:text-sm font-bold uppercase tracking-wider transition cursor-pointer ${
              mode === 'existing'
                ? 'bg-[#B87333] text-[#121212] shadow-md'
                : 'text-[#B5A99D] hover:text-white'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            <span>{currentMember ? 'Switch Profile' : 'Claim / Sign In'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('new');
              setNewDisplayName('');
              setTagline('');
              setErrorMsg(null);
            }}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 font-athletic text-xs sm:text-sm font-bold uppercase tracking-wider transition cursor-pointer ${
              mode === 'new'
                ? 'bg-[#B87333] text-[#121212] shadow-md'
                : 'text-[#B5A99D] hover:text-white'
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>New Patron</span>
          </button>
        </div>

        {/* MY LOCKER / EDIT PROFILE VIEW */}
        {mode === 'my-locker' && currentMember ? (
          <form onSubmit={handleSaveMyProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-mono-docket text-xs font-bold uppercase text-[#D6C7B8]">
                  DISPLAY NAME / BAR NICKNAME *
                </label>
                <input
                  type="text"
                  required
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0D0B0A] px-3.5 py-2.5 text-sm text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono-docket text-xs font-bold uppercase text-[#D6C7B8]">
                  FRIENDLY BAR TAGLINE / CHIRP
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Never ordering Gin & Diet Coke again!"
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0D0B0A] px-3.5 py-2.5 text-sm text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
                />
              </div>
            </div>

            {/* Team Emblem Picker */}
            <div>
              <label className="block font-mono-docket text-xs font-bold uppercase tracking-wider text-[#E8B888]">
                DETROIT / MICHIGAN TEAM EMBLEM
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

            {/* 4-8 Digit PIN Verification & Optional Change */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-mono-docket text-xs font-bold uppercase text-[#DFC15E]">
                  CURRENT 4–8 DIGIT BAR PIN (REQUIRED) *
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  minLength={4}
                  maxLength={8}
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter your 4–8 digit PIN"
                  className="mt-1.5 w-full rounded-xl border border-[#B87333]/50 bg-[#0D0B0A] px-3.5 py-2.5 font-mono-docket text-sm tracking-widest text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono-docket text-xs font-bold uppercase text-[#D6C7B8]">
                  NEW 4–8 DIGIT PIN (OPTIONAL)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  minLength={4}
                  maxLength={8}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="Leave blank to keep current PIN"
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0D0B0A] px-3.5 py-2.5 font-mono-docket text-sm tracking-widest text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
                />
              </div>
            </div>

            {/* Controlled Opt-In Email & Text Notification Box */}
            <div className="rounded-2xl border border-[#B87333]/35 bg-[#0E0C0B] p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-[#DFC15E]" />
                  <span className="font-athletic text-base font-bold uppercase tracking-wider text-[#F5F2EB]">
                    OPT-IN ALERTS (EMAIL &amp; CARRIER SMS)
                  </span>
                </div>
                {currentMember.notification_verified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-0.5 font-mono-docket text-[10px] font-bold uppercase text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified &amp; Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 font-mono-docket text-[10px] uppercase text-[#B5A99D]">
                    Not Verified Yet
                  </span>
                )}
              </div>

              <p className="font-mono-docket text-[11px] text-[#9E8F82]">
                100% private — your email and phone number are <strong>never</strong> shown to
                other users. Get notified when a slip is logged on your card
                {currentMember.is_admin
                  ? ' or when a blurred slip lands in your Admin Override Queue.'
                  : '.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="flex items-center gap-1 font-mono-docket text-[10px] uppercase text-[#D6C7B8]">
                    <Mail className="h-3 w-3 text-[#B87333]" />
                    <span>Email Address (Free via Resend)</span>
                  </label>
                  <input
                    type="email"
                    value={notifEmail}
                    onChange={(e) => setNotifEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-1 w-full rounded-xl border border-white/15 bg-[#151210] px-3 py-2 font-mono-docket text-xs text-white focus:border-[#B87333] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1 font-mono-docket text-[10px] uppercase text-[#D6C7B8]">
                    <Smartphone className="h-3 w-3 text-[#B87333]" />
                    <span>10-Digit Mobile + Carrier Gateway (Free)</span>
                  </label>
                  <div className="mt-1 flex gap-1.5">
                    <input
                      type="tel"
                      value={notifPhone}
                      onChange={(e) => setNotifPhone(e.target.value)}
                      placeholder="269-274-9665"
                      className="w-full rounded-xl border border-white/15 bg-[#151210] px-2.5 py-2 font-mono-docket text-xs text-white focus:border-[#B87333] focus:outline-none"
                    />
                    <select
                      value={notifCarrier}
                      onChange={(e) => setNotifCarrier(e.target.value)}
                      aria-label="Mobile Carrier for SMS Gateway"
                      className="rounded-xl border border-white/15 bg-[#151210] px-2 py-2 font-mono-docket text-[11px] text-[#E8B888]"
                    >
                      <option value="none">Email Only</option>
                      <option value="verizon">Verizon</option>
                      <option value="att">AT&amp;T</option>
                      <option value="tmobile">T-Mobile</option>
                      <option value="uscellular">US Cellular</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Explicit Opt-In Consent Checkbox */}
              <label className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-[#151210] p-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={optInAccepted}
                  onChange={(e) => setOptInAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#B87333]"
                />
                <span className="font-mono-docket text-[10px] leading-relaxed text-[#D6C7B8]">
                  <strong>Opt-In Notification Consent:</strong> I voluntarily agree to receive
                  automated Ring of Honor demerit &amp; moderation notifications at the email/phone
                  above. Standard carrier text rates may apply. I can uncheck this box to pause or
                  unsubscribe at any time.
                </span>
              </label>

              {/* Verification Code Trigger */}
              {optInAccepted && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSendVerificationCode}
                    disabled={sendingCode}
                    className="rounded-xl border border-[#DFC15E]/60 bg-[#DFC15E]/15 px-3 py-1.5 font-mono-docket text-xs font-bold text-[#DFC15E] hover:bg-[#DFC15E] hover:text-[#121212] transition cursor-pointer"
                  >
                    {sendingCode
                      ? 'Sending 6-Digit Code...'
                      : 'Send 6-Digit Verification Code'}
                  </button>

                  {verificationCodeSent && (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        maxLength={6}
                        value={verificationCodeInput}
                        onChange={(e) => setVerificationCodeInput(e.target.value)}
                        placeholder="6-digit code"
                        className="w-28 rounded-xl border border-[#DFC15E] bg-black px-2.5 py-1.5 font-mono-docket text-xs tracking-widest text-white"
                      />
                      <button
                        type="button"
                        onClick={handleConfirmVerificationCode}
                        disabled={verifyingCode}
                        className="rounded-xl bg-emerald-500 px-3 py-1.5 font-mono-docket text-xs font-bold text-black hover:bg-emerald-400 cursor-pointer"
                      >
                        {verifyingCode ? 'Checking...' : 'Verify'}
                      </button>
                    </div>
                  )}
                </div>
              )}
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
              <span>{submitting ? 'Saving Changes...' : 'Save My Profile & Preferences'}</span>
            </button>
          </form>
        ) : (
          /* CLAIM OR SIGN IN / NEW PATRON FORM */
          <form onSubmit={handleClaimOrSignIn} className="space-y-4">
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
                              {m.is_admin
                                ? 'Patron • Site Admin'
                                : m.is_staff && m.is_patron
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
                    ROLE AT THE BAR
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as 'patron' | 'staff' | 'both')}
                    aria-label="Role at the Bar"
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

            {/* 4-8 Digit Bar PIN + Friendly Tagline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-mono-docket text-xs font-bold uppercase text-[#DFC15E]">
                  {mode === 'existing' && isAlreadyClaimed
                    ? 'ENTER YOUR 4–8 DIGIT BAR PIN *'
                    : 'SET YOUR 4–8 DIGIT BAR PIN *'}
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  minLength={4}
                  maxLength={8}
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="4 to 8 digit PIN"
                  className="mt-1.5 w-full rounded-xl border border-[#B87333]/50 bg-[#0D0B0A] px-3.5 py-2.5 font-mono-docket text-base tracking-widest text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
                />
                <span className="mt-1 block font-mono-docket text-[10px] text-[#8E8074]">
                  {mode === 'existing' && isAlreadyClaimed
                    ? 'This profile is claimed. Enter your 4–8 digit PIN to sign in.'
                    : 'Choose a 4 to 8 digit PIN to unlock your card & edit profile settings.'}
                </span>
              </div>

              <div>
                <label className="block font-mono-docket text-xs font-bold uppercase text-[#D6C7B8]">
                  FRIENDLY BAR TAGLINE (OPTIONAL)
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Never ordering Gin & Diet Coke again"
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0D0B0A] px-3.5 py-2.5 text-sm text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
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
        )}

        {/* Fan Site Disclaimer */}
        <div className="border-t border-white/10 pt-3 text-center font-mono-docket text-[10px] text-[#8E8074]">
          🍻 <strong>Unofficial Patron-Run Fan Site for Good-Natured Fun Only</strong> — Not Owned
          by or Affiliated with Copper Athletic Club. Keep all banter friendly, jovial, and
          sports-bar clean!
        </div>
      </div>
    </div>
  );
};
