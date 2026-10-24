import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDemerits } from '../context/DemeritsContext';
import { MichiganTeamBadge, TeamBadgeMeta } from './MichiganSportsGraphics';
import { moderateTextInstant } from '../lib/moderation';
import {
  NotificationPreferences,
  NotificationChannelPreference,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from '../types/demerits';
import {
  X,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
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
  Tag,
  Trash2,
  Crown,
  TrendingDown,
  FileText,
  Megaphone,
  Beer,
  GitMerge,
} from 'lucide-react';

const NOTIFICATION_CHANNELS: {
  key: keyof NotificationPreferences;
  title: string;
  badge: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    key: 'leader_crowned',
    title: 'Crown: #1 Demerit Leader',
    badge: 'LEADERBOARD',
    description: 'Instant alert when you take over 1st place on the Copper Demerit Leaderboard.',
    icon: Crown,
  },
  {
    key: 'leader_dethroned',
    title: 'Dethroned: Lost #1 Rank',
    badge: 'RANK DROP',
    description: 'Alert when another patron knocks you out of the #1 demerit position.',
    icon: TrendingDown,
  },
  {
    key: 'slip_cited',
    title: 'Citation: New Slip Cited to Me',
    badge: 'CITATION',
    description: 'Instant notification whenever a demerit slip cites your name or nickname.',
    icon: FileText,
  },
  {
    key: 'ref_override',
    title: 'Ref Whistle: Review Overrides',
    badge: 'DECISION',
    description: 'Alert when an official review approves, unblurs, or dismisses your slip.',
    icon: Megaphone,
  },
  {
    key: 'friday_digest',
    title: 'Happy Hour: Friday Night Docket',
    badge: 'WEEKLY 5 PM',
    description: 'Weekly Friday 5:00 PM EST happy hour summary of podium standings & top offenses.',
    icon: Beer,
  },
];

const CHANNEL_OPTIONS: { id: NotificationChannelPreference; label: string }[] = [
  { id: 'none', label: 'Off' },
  { id: 'email', label: 'Email' },
  { id: 'text', label: 'Text' },
  { id: 'both', label: 'Both' },
];

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
    aliases,
    currentMember,
    isAdminOrStaff,
    activePin,
    isProfileModalOpen,
    setIsProfileModalOpen,
    claimOrLoginProfile,
    updateMyProfile,
    addStaffAlias,
    deleteStaffAlias,
    requestNotificationVerification,
    verifyNotificationCode,
    logoutProfile,
    mergeProfiles,
  } = useDemerits();

  const [mode, setMode] = useState<'my-locker' | 'login' | 'claim' | 'new'>('login');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [claimEmail, setClaimEmail] = useState('');
  const [claimPhone, setClaimPhone] = useState('');
  const [unclaimedSearch, setUnclaimedSearch] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<'patron' | 'staff' | 'both'>('patron');
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [favoriteTeam, setFavoriteTeam] = useState<TeamBadgeMeta['iconType']>('lions');
  const [tagline, setTagline] = useState('');

  // Self-Service Nickname / Slip Alias State (My Locker)
  const [nicknameInput, setNicknameInput] = useState('');
  const [addingNickname, setAddingNickname] = useState(false);

  // Self-Service Profile Merge State (My Locker)
  const [mergeSourceId, setMergeSourceId] = useState<string>('');
  const [mergeSourcePin, setMergeSourcePin] = useState<string>('');
  const [mergingProfile, setMergingProfile] = useState<boolean>(false);
  const [mergeFeedback, setMergeFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  // Opt-In Notification State (My Locker)
  const [notifEmail, setNotifEmail] = useState('');
  const [notifPhone, setNotifPhone] = useState('');
  const [notifCarrier, setNotifCarrier] = useState('none');
  const [optInAccepted, setOptInAccepted] = useState(false);
  const [notifPreferences, setNotifPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );
  const [verificationCodeSent, setVerificationCodeSent] = useState(false);
  const [verificationCodeInput, setVerificationCodeInput] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handlePreferenceChange = (
    key: keyof NotificationPreferences,
    value: NotificationChannelPreference
  ) => {
    setNotifPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
    if (value !== 'none') {
      setOptInAccepted(true);
    }
  };

  // Only show UNCLAIMED profiles in the claimable list — once claimed, they never appear here
  const unclaimedMembers = members.filter((m) => !m.is_claimed);
  const filteredUnclaimedMembers = unclaimedMembers.filter((m) =>
    m.display_name.toLowerCase().includes(unclaimedSearch.trim().toLowerCase())
  );

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
        setNotifPreferences(
          currentMember.notification_preferences || DEFAULT_NOTIFICATION_PREFERENCES
        );
        if (activePin) {
          setPin(activePin);
        }
      } else {
        setMode('login');
        setNotifPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
        const firstUnclaimed = members.find((m) => !m.is_claimed);
        if (firstUnclaimed) {
          setSelectedMemberId(firstUnclaimed.id);
          setFavoriteTeam(
            (firstUnclaimed.favorite_team as TeamBadgeMeta['iconType']) || 'lions'
          );
          setTagline(firstUnclaimed.tagline || '');
        } else {
          setSelectedMemberId('');
        }
      }
    }
  }, [isProfileModalOpen, currentMember, members, activePin]);

  if (!isProfileModalOpen) return null;

  const selectedMember = unclaimedMembers.find((m) => m.id === selectedMemberId) || null;

  const handleSelectMember = (id: string) => {
    setSelectedMemberId(id);
    setErrorMsg(null);
    setSuccessMsg(null);
    const m = unclaimedMembers.find((mem) => mem.id === id);
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
      setErrorMsg('Enter a 4 to 8 digit Bar PIN.');
      return;
    }

    // 1. Returning User Sign-In via Email or 10-Digit Phone + PIN
    if (mode === 'login') {
      if (!loginIdentifier.trim()) {
        setErrorMsg('Enter your Email Address or 10-Digit Phone Number to sign in.');
        return;
      }

      setSubmitting(true);
      try {
        const res = await claimOrLoginProfile({
          action: 'login',
          loginIdentifier: loginIdentifier.trim(),
          pin: cleanPin,
        });

        if (!res.ok) {
          setErrorMsg(res.error || 'Could not sign in with that email/phone and PIN.');
        } else {
          setSuccessMsg(`Welcome back, ${res.member?.display_name}!`);
          setMode('my-locker');
        }
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // 2. Claiming an Unclaimed Profile or Creating a New Profile — Require Email OR Phone
    const cleanEmail = claimEmail.trim().toLowerCase();
    const rawDigits = claimPhone.replace(/\D/g, '');
    const cleanPhone =
      rawDigits.length === 11 && rawDigits.startsWith('1') ? rawDigits.slice(1) : rawDigits;

    if (!cleanEmail && !cleanPhone) {
      setErrorMsg(
        'Please enter either your Email Address or your 10-Digit Phone Number to claim your profile (you will use it with your PIN to sign in next time).'
      );
      return;
    }

    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (cleanPhone && cleanPhone.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit phone number (e.g. 269-274-9665).');
      return;
    }

    if (mode === 'claim' && !selectedMember) {
      setErrorMsg('Select your unclaimed name from the list above (or switch to New Profile).');
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
        action: mode === 'new' ? 'new' : 'claim',
        memberId: mode === 'claim' ? selectedMemberId : undefined,
        displayName: mode === 'new' ? newDisplayName.trim() : selectedMember?.display_name,
        email: cleanEmail || undefined,
        phone: cleanPhone || undefined,
        pin: cleanPin,
        favoriteTeam,
        tagline: tagline.trim() || undefined,
        role: mode === 'new' ? newRole : undefined,
        notificationPreferences: notifPreferences,
      });

      if (!res.ok) {
        setErrorMsg(res.error || 'Could not claim profile.');
      } else {
        setSuccessMsg(`Profile claimed for ${res.member?.display_name}!`);
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

    const cleanEmail = notifEmail.trim().toLowerCase();
    const rawDigits = notifPhone.replace(/\D/g, '');
    const cleanPhone =
      rawDigits.length === 11 && rawDigits.startsWith('1') ? rawDigits.slice(1) : rawDigits;

    if (!cleanEmail && cleanPhone.length !== 10) {
      setErrorMsg(
        'Please keep at least a valid Email Address or 10-Digit Phone Number on your profile so you can sign in with your PIN.'
      );
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
        notificationPreferences: notifPreferences,
      });

      if (!res.ok) {
        setErrorMsg(res.error || 'Could not update profile.');
      } else {
        if (newPin.trim()) {
          setPin(newPin.trim());
          setNewPin('');
        }
        setSuccessMsg('Profile & Locker settings saved successfully!');
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

  const myAliases = currentMember
    ? aliases.filter((a) => a.member_id === currentMember.id)
    : [];

  const handleAddMyNickname = async () => {
    if (!currentMember) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmed = nicknameInput.trim();
    if (!trimmed) {
      setErrorMsg('Enter a nickname or slip alias to link to your profile.');
      return;
    }

    const modCheck = moderateTextInstant(trimmed);
    if (modCheck.flagged) {
      setErrorMsg(
        'Referee Whistle: Nicknames must stay friendly, jovial, and free of profanity or name-calling!'
      );
      return;
    }

    setAddingNickname(true);
    try {
      const res = await addStaffAlias(trimmed, currentMember.id);
      if (!res.ok) {
        setErrorMsg(res.error || 'Could not add nickname.');
      } else {
        setNicknameInput('');
        setSuccessMsg(
          `Nickname "${trimmed}" linked! Any demerit slip written with "${trimmed}" now merges directly into ${currentMember.display_name}'s stats.`
        );
      }
    } finally {
      setAddingNickname(false);
    }
  };

  const handleDeleteMyNickname = async (aliasId: string, aliasText: string) => {
    if (!currentMember) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    await deleteStaffAlias(aliasId);
    setSuccessMsg(`Removed nickname "${aliasText}" from your profile.`);
  };

  const otherMembersForMerge = currentMember
    ? members.filter((m) => m.id !== currentMember.id)
    : [];

  const handleMergeProfiles = async () => {
    if (!currentMember || !mergeSourceId) return;
    const sourceMember = members.find((m) => m.id === mergeSourceId);
    if (!sourceMember) return;

    if (sourceMember.is_claimed && !mergeSourcePin.trim()) {
      setMergeFeedback({
        type: 'err',
        msg: `"${sourceMember.display_name}" is already claimed. Please enter that profile's Bar PIN to confirm ownership and merge accounts.`,
      });
      return;
    }

    if (!pin.trim()) {
      setMergeFeedback({
        type: 'err',
        msg: 'Please enter your current Bar PIN below before merging profiles.',
      });
      return;
    }

    setMergingProfile(true);
    setMergeFeedback(null);
    try {
      const res = await mergeProfiles({
        sourceMemberId: mergeSourceId,
        targetMemberId: currentMember.id,
        sourcePin: mergeSourcePin.trim() || undefined,
      });

      if (!res.ok) {
        setMergeFeedback({ type: 'err', msg: res.error || 'Failed to merge profiles.' });
      } else {
        setMergeFeedback({
          type: 'ok',
          msg: res.message || `Successfully merged "${sourceMember.display_name}" into your locker!`,
        });
        setMergeSourceId('');
        setMergeSourcePin('');
      }
    } catch (err) {
      setMergeFeedback({
        type: 'err',
        msg: err instanceof Error ? err.message : 'Error merging profiles.',
      });
    } finally {
      setMergingProfile(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-md pt-[env(safe-area-inset-top,12px)] pb-[env(safe-area-inset-bottom,12px)] pr-[env(safe-area-inset-right,12px)] pl-[env(safe-area-inset-left,12px)]"
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
            aria-label="Close modal"
            className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border border-white/15 bg-white/5 p-2 text-[#B5A99D] hover:border-[#B87333] hover:text-white cursor-pointer touch-manipulation active:scale-95"
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

            <div className="flex items-center gap-2">
              {isAdminOrStaff && (
                <Link
                  to="/admin"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#B87333]/50 bg-[#B87333]/20 px-3 py-2 min-h-[44px] touch-manipulation active:scale-95 font-sans font-bold text-xs text-[#DFC15E] hover:bg-[#B87333]/30 cursor-pointer"
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>Ref Booth</span>
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  logoutProfile();
                  setMode('login');
                  setPin('');
                  setSuccessMsg(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-2 min-h-[44px] touch-manipulation active:scale-95 font-sans font-bold text-xs text-rose-300 hover:bg-rose-500/25 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}

        {/* Mode Toggle Tabs */}
        <div
          className={`grid ${
            currentMember ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'
          } gap-2 rounded-2xl border border-white/10 bg-[#0D0B0A] p-1.5`}
        >
          {currentMember && (
            <button
              type="button"
              onClick={() => {
                setMode('my-locker');
                setErrorMsg(null);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 min-h-[44px] touch-manipulation active:scale-95 font-sans text-xs sm:text-sm font-extrabold uppercase tracking-tight transition cursor-pointer ${
                mode === 'my-locker'
                  ? 'bg-[#B87333] text-[#121212] shadow-md'
                  : 'text-[#B5A99D] hover:text-white'
              }`}
            >
              <Settings className="h-4 w-4 shrink-0" />
              <span>Edit My Profile</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 min-h-[44px] touch-manipulation active:scale-95 font-sans text-xs sm:text-sm font-extrabold uppercase tracking-tight transition cursor-pointer ${
              mode === 'login'
                ? 'bg-[#B87333] text-[#121212] shadow-md'
                : 'text-[#B5A99D] hover:text-white'
            }`}
          >
            <KeyRound className="h-4 w-4 shrink-0" />
            <span>{currentMember ? 'Switch Account' : 'Sign In'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('claim');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 min-h-[44px] touch-manipulation active:scale-95 font-sans text-xs sm:text-sm font-extrabold uppercase tracking-tight transition cursor-pointer ${
              mode === 'claim'
                ? 'bg-[#B87333] text-[#121212] shadow-md'
                : 'text-[#B5A99D] hover:text-white'
            }`}
          >
            <UserCheck className="h-4 w-4 shrink-0" />
            <span>Claim Name ({unclaimedMembers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('new');
              setNewDisplayName('');
              setTagline('');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 min-h-[44px] touch-manipulation active:scale-95 font-sans text-xs sm:text-sm font-extrabold uppercase tracking-tight transition cursor-pointer ${
              mode === 'new'
                ? 'bg-[#B87333] text-[#121212] shadow-md'
                : 'text-[#B5A99D] hover:text-white'
            }`}
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>New Profile</span>
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
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0D0B0A] px-3.5 py-2.5 text-base sm:text-sm min-h-[44px] text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
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
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0D0B0A] px-3.5 py-2.5 text-base sm:text-sm min-h-[44px] text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
                />
              </div>
            </div>

            {/* Self-Service Bar Nicknames & Slip Aliases (Auto-Merges Slip Stats) */}
            <div className="rounded-2xl border border-[#B87333]/35 bg-[#0E0C0B] p-4 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-[#DFC15E]" />
                  <span className="font-athletic text-base font-bold uppercase tracking-wider text-[#F5F2EB]">
                    MY BAR NICKNAMES &amp; SLIP ALIASES
                  </span>
                </div>
                <span className="rounded-full bg-[#B87333]/20 border border-[#B87333]/40 px-2.5 py-0.5 font-mono-docket text-[10px] font-bold uppercase text-[#E8B888]">
                  Claimed Profile &amp; Admin Only
                </span>
              </div>

              <p className="font-mono-docket text-[11px] text-[#9E8F82]">
                Add any friendly bar nicknames people write on physical slips for you (e.g.{' '}
                <span className="text-[#DFC15E]">
                  &ldquo;Ricky&rdquo;, &ldquo;Headband Rick&rdquo;, &ldquo;Big Burt&rdquo;, &ldquo;Dave&rdquo;
                </span>
                ). When a slip is written with one of your nicknames, its demerit points and stats{' '}
                <strong className="text-[#F5F2EB]">automatically merge into your profile</strong>!
              </p>

              {/* Existing Nickname Pills */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {myAliases.length === 0 ? (
                  <span className="font-mono-docket text-[11px] italic text-[#8E8074]">
                    No extra slip nicknames added yet.
                  </span>
                ) : (
                  myAliases.map((a) => (
                    <span
                      key={a.id}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#B87333]/40 bg-[#181411] px-2.5 py-1 font-mono-docket text-xs text-[#F5F2EB]"
                    >
                      <span className="text-[#DFC15E]">&ldquo;{a.alias}&rdquo;</span>
                      <span className="text-[10px] text-[#8E8074]">
                        &rarr; {currentMember.display_name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteMyNickname(a.id, a.alias)}
                        title={`Remove "${a.alias}" nickname`}
                        aria-label={`Remove "${a.alias}" nickname`}
                        className="ml-0.5 flex h-7 w-7 items-center justify-center rounded-lg text-[#8E8074] hover:bg-rose-500/20 hover:text-rose-300 cursor-pointer touch-manipulation active:scale-95"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Add New Bar-Friendly Nickname Input */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <input
                  type="text"
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddMyNickname();
                    }
                  }}
                  placeholder="Add a bar-friendly slip nickname (e.g. Ricky, Big Dave)..."
                  className="flex-1 rounded-xl border border-white/15 bg-[#151210] px-3.5 py-2.5 font-mono-docket text-base sm:text-xs min-h-[44px] text-white focus:border-[#B87333] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddMyNickname}
                  disabled={addingNickname}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#B87333]/60 bg-[#B87333]/20 px-4 py-2.5 min-h-[44px] touch-manipulation active:scale-95 font-athletic text-xs font-bold uppercase tracking-wider text-[#E8B888] hover:bg-[#B87333] hover:text-[#121212] transition disabled:opacity-50 cursor-pointer shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  <span>{addingNickname ? 'Linking...' : 'Add Nickname'}</span>
                </button>
              </div>
            </div>

            {/* Merge Another Profile or Unclaimed Name */}
            <div className="rounded-2xl border border-[#DFC15E]/35 bg-[#0E0C0B] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <GitMerge className="h-4 w-4 text-[#DFC15E]" />
                  <span className="font-athletic text-base font-bold uppercase tracking-wider text-[#F5F2EB]">
                    MERGE PROFILES / ABSORB UNCLAIMED NAME
                  </span>
                </div>
                <span className="rounded-full bg-[#DFC15E]/15 border border-[#DFC15E]/40 px-2.5 py-0.5 font-mono-docket text-[10px] font-bold uppercase text-[#DFC15E]">
                  Unified Locker
                </span>
              </div>

              <p className="font-mono-docket text-[11px] text-[#9E8F82]">
                Were you cited under a different name on the scoreboard or do you have a duplicate profile (e.g. Ziggie &amp; David Lee)? Merge that profile into your locker. All citations and stats transfer to you, and the merged name automatically becomes your slip alias.
              </p>

              {mergeFeedback && (
                <div
                  className={`rounded-xl border px-3 py-2 font-mono-docket text-xs ${
                    mergeFeedback.type === 'ok'
                      ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                      : 'border-rose-500/40 bg-rose-950/40 text-rose-300'
                  }`}
                >
                  {mergeFeedback.msg}
                </div>
              )}

              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={mergeSourceId}
                    onChange={(e) => setMergeSourceId(e.target.value)}
                    aria-label="Select profile to merge"
                    className="flex-1 rounded-xl border border-white/15 bg-[#151210] px-3.5 py-2.5 font-mono-docket text-base sm:text-xs min-h-[44px] text-white focus:border-[#DFC15E] focus:outline-none"
                  >
                    <option value="">Select profile to absorb into your locker...</option>
                    {otherMembersForMerge.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.display_name} {m.is_claimed ? '(Claimed Profile)' : '(Unclaimed Profile)'}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleMergeProfiles}
                    disabled={!mergeSourceId || mergingProfile}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#DFC15E] bg-gradient-to-r from-[#DFC15E] to-[#B87333] px-4 py-2.5 min-h-[44px] touch-manipulation active:scale-95 font-athletic text-xs font-bold uppercase tracking-wider text-[#121212] hover:brightness-110 transition disabled:opacity-40 cursor-pointer shrink-0"
                  >
                    <GitMerge className="h-4 w-4" />
                    <span>{mergingProfile ? 'Merging...' : 'Merge Into Locker'}</span>
                  </button>
                </div>

                {mergeSourceId && members.find((m) => m.id === mergeSourceId)?.is_claimed && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-1.5">
                    <span className="font-mono-docket text-[10px] font-bold uppercase text-amber-300">
                      🔐 Other Profile's Bar PIN Required
                    </span>
                    <input
                      type="password"
                      inputMode="numeric"
                      value={mergeSourcePin}
                      onChange={(e) => setMergeSourcePin(e.target.value)}
                      placeholder="Enter other profile's 4–8 digit PIN"
                      className="w-full rounded-xl border border-white/15 bg-[#0D0B0A] px-3 py-2 font-mono-docket text-base sm:text-xs min-h-[44px] text-[#F5F2EB] focus:border-[#DFC15E]"
                    />
                    <p className="font-mono-docket text-[10px] text-[#A8988B]">
                      To prevent hostile account takeovers, merging an already-claimed profile requires entering its PIN to verify you own both accounts.
                    </p>
                  </div>
                )}
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
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 min-h-[44px] touch-manipulation active:scale-95 text-left transition cursor-pointer ${
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
                  className="mt-1.5 w-full rounded-xl border border-[#B87333]/50 bg-[#0D0B0A] px-3.5 py-2.5 font-mono-docket text-base sm:text-sm min-h-[44px] tracking-widest text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
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
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0D0B0A] px-3.5 py-2.5 font-mono-docket text-base sm:text-sm min-h-[44px] tracking-widest text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
                />
              </div>
            </div>

            {/* Login & Opt-In Email / Phone Box */}
            <div className="rounded-2xl border border-[#B87333]/35 bg-[#0E0C0B] p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-[#DFC15E]" />
                  <span className="font-athletic text-base font-bold uppercase tracking-wider text-[#F5F2EB]">
                    SIGN-IN CONTACT &amp; OPT-IN ALERTS (EMAIL / PHONE)
                  </span>
                </div>
                {currentMember.notification_verified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-0.5 font-mono-docket text-[10px] font-bold uppercase text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified &amp; Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 font-mono-docket text-[10px] uppercase text-[#B5A99D]">
                    Private Login Contact
                  </span>
                )}
              </div>

              <p className="font-mono-docket text-[11px] text-[#9E8F82]">
                100% private — your email and phone number are <strong>never</strong> shown to
                other users. Keep at least one on file so you can sign in from any device with your
                PIN!
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="flex items-center gap-1 font-mono-docket text-[10px] uppercase text-[#D6C7B8]">
                    <Mail className="h-3 w-3 text-[#B87333]" />
                    <span>Email Address (Sign-In &amp; Alerts)</span>
                  </label>
                  <input
                    type="email"
                    value={notifEmail}
                    onChange={(e) => setNotifEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-1 w-full rounded-xl border border-white/15 bg-[#151210] px-3.5 py-2.5 font-mono-docket text-base sm:text-xs min-h-[44px] text-white focus:border-[#B87333] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1 font-mono-docket text-[10px] uppercase text-[#D6C7B8]">
                    <Smartphone className="h-3 w-3 text-[#B87333]" />
                    <span>10-Digit Mobile + Carrier Gateway</span>
                  </label>
                  <div className="mt-1 flex gap-1.5">
                    <input
                      type="tel"
                      value={notifPhone}
                      onChange={(e) => setNotifPhone(e.target.value)}
                      placeholder="269-274-9665"
                      className="w-full rounded-xl border border-white/15 bg-[#151210] px-3.5 py-2.5 font-mono-docket text-base sm:text-xs min-h-[44px] text-white focus:border-[#B87333] focus:outline-none"
                    />
                    <select
                      value={notifCarrier}
                      onChange={(e) => setNotifCarrier(e.target.value)}
                      aria-label="Mobile Carrier for SMS Gateway"
                      className="rounded-xl border border-white/15 bg-[#151210] px-2.5 py-2.5 font-mono-docket text-base sm:text-[11px] min-h-[44px] text-[#E8B888]"
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
                    className="rounded-xl border border-[#DFC15E]/60 bg-[#DFC15E]/15 px-3.5 py-2 min-h-[44px] touch-manipulation active:scale-95 font-mono-docket text-xs font-bold text-[#DFC15E] hover:bg-[#DFC15E] hover:text-[#121212] transition cursor-pointer"
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
                        className="w-32 rounded-xl border border-[#DFC15E] bg-black px-3 py-2 font-mono-docket text-base sm:text-xs min-h-[44px] tracking-widest text-white"
                      />
                      <button
                        type="button"
                        onClick={handleConfirmVerificationCode}
                        disabled={verifyingCode}
                        className="rounded-xl bg-emerald-500 px-3.5 py-2 min-h-[44px] touch-manipulation active:scale-95 font-mono-docket text-xs font-bold text-black hover:bg-emerald-400 cursor-pointer"
                      >
                        {verifyingCode ? 'Checking...' : 'Verify'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Granular Notification Channels Selector Matrix */}
              <div className="rounded-xl border border-white/10 bg-[#120F0D] p-3 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2">
                  <div>
                    <div className="flex items-center gap-1.5 font-athletic text-sm font-bold uppercase tracking-wider text-[#F5F2EB]">
                      <Bell className="h-3.5 w-3.5 text-[#DFC15E]" />
                      <span>Custom Notification Channels</span>
                    </div>
                    <p className="font-mono-docket text-[10px] text-[#9E8F82]">
                      All notifications are <strong>Off by default</strong>. Choose Email, Text, or Both for each event.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setNotifPreferences(DEFAULT_NOTIFICATION_PREFERENCES)}
                      className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 min-h-[36px] touch-manipulation active:scale-95 font-mono-docket text-[10px] text-[#B5A99D] hover:bg-white/10 hover:text-white transition cursor-pointer"
                    >
                      Mute All
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNotifPreferences({
                          leader_crowned: 'both',
                          leader_dethroned: 'both',
                          slip_cited: 'both',
                          ref_override: 'both',
                          friday_digest: 'both',
                        });
                        setOptInAccepted(true);
                      }}
                      className="rounded-lg border border-[#B87333]/40 bg-[#B87333]/15 px-3 py-1.5 min-h-[36px] touch-manipulation active:scale-95 font-mono-docket text-[10px] font-bold text-[#DFC15E] hover:bg-[#B87333]/30 transition cursor-pointer"
                    >
                      Enable All (Both)
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {NOTIFICATION_CHANNELS.map(({ key, title, badge, description, icon: Icon }) => {
                    const currentPref = notifPreferences[key] || 'none';
                    const needsEmail =
                      (currentPref === 'email' || currentPref === 'both') && !notifEmail.trim();
                    const needsText =
                      (currentPref === 'text' || currentPref === 'both') &&
                      (!notifPhone.trim() || notifCarrier === 'none');

                    return (
                      <div
                        key={key}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border p-2.5 transition ${
                          currentPref !== 'none'
                            ? 'border-[#B87333]/40 bg-[#171310]'
                            : 'border-white/5 bg-[#141110] hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs ${
                              currentPref !== 'none'
                                ? 'border-[#B87333] bg-[#B87333]/20 text-[#DFC15E]'
                                : 'border-white/10 bg-[#1F1B18] text-[#8E8074]'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-athletic text-xs font-bold uppercase tracking-wider text-[#F5F2EB]">
                                {title}
                              </span>
                              <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono-docket text-[9px] uppercase tracking-wider text-[#B5A99D]">
                                {badge}
                              </span>
                            </div>
                            <p className="font-mono-docket text-[10px] text-[#A8988B] leading-tight mt-0.5">
                              {description}
                            </p>
                            {(needsEmail || needsText) && (
                              <div className="mt-1 flex flex-wrap gap-1 font-mono-docket text-[9px] text-amber-300">
                                {needsEmail && <span>⚠️ Needs Email address above</span>}
                                {needsEmail && needsText && <span>•</span>}
                                {needsText && <span>⚠️ Needs 10-Digit Mobile + Carrier</span>}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                          {CHANNEL_OPTIONS.map((opt) => {
                            const isSelected = currentPref === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => handlePreferenceChange(key, opt.id)}
                                className={`rounded-lg px-2.5 py-1.5 min-h-[36px] touch-manipulation active:scale-95 font-mono-docket text-[10px] font-bold uppercase transition cursor-pointer ${
                                  isSelected
                                    ? opt.id === 'none'
                                      ? 'bg-white/20 text-white border border-white/40 shadow-sm'
                                      : 'bg-[#B87333] text-[#121212] border border-[#DFC15E] shadow-[0_0_10px_rgba(184,115,51,0.5)]'
                                    : 'bg-white/5 text-[#8E8074] border border-transparent hover:bg-white/10 hover:text-white'
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
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
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#B87333] to-[#C86D51] px-5 py-3.5 min-h-[48px] touch-manipulation active:scale-[0.98] font-sans text-sm sm:text-base font-black uppercase tracking-tight text-[#121212] shadow-[0_0_25px_rgba(184,115,51,0.45)] transition hover:brightness-110 disabled:opacity-50 cursor-pointer"
            >
              <ShieldCheck className="h-5 w-5" />
              <span>{submitting ? 'Saving Changes...' : 'Save My Profile & Preferences'}</span>
            </button>
          </form>
        ) : mode === 'login' ? (
          /* RETURNING USER SIGN IN: EMAIL OR 10-DIGIT PHONE + PIN */
          <form onSubmit={handleClaimOrSignIn} className="space-y-4">
            <div className="rounded-2xl border border-[#B87333]/35 bg-[#0E0C0B] p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-[#DFC15E]" />
                <span className="font-athletic text-lg font-bold uppercase tracking-wider text-[#F5F2EB]">
                  RETURNING PATRON &amp; STAFF SIGN IN
                </span>
              </div>
              <p className="font-mono-docket text-xs text-[#B5A99D]">
                Already claimed your profile? Enter the <strong>Email Address</strong> or{' '}
                <strong>10-Digit Phone Number</strong> you used when claiming along with your{' '}
                <strong>4–8 Digit Bar PIN</strong>.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-mono-docket text-xs font-bold uppercase text-[#E8B888]">
                    EMAIL ADDRESS OR 10-DIGIT PHONE *
                  </label>
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="you@example.com or 269-274-9665"
                    className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#151210] px-3.5 py-2.5 font-mono-docket text-base sm:text-sm min-h-[44px] text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-mono-docket text-xs font-bold uppercase text-[#DFC15E]">
                    YOUR 4–8 DIGIT BAR PIN *
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
                    className="mt-1.5 w-full rounded-xl border border-[#B87333]/50 bg-[#151210] px-3.5 py-2.5 font-mono-docket text-base sm:text-sm min-h-[44px] tracking-widest text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
                  />
                </div>
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
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#B87333] to-[#C86D51] px-5 py-3.5 min-h-[48px] touch-manipulation active:scale-[0.98] font-sans text-sm sm:text-base font-black uppercase tracking-tight text-[#121212] shadow-[0_0_25px_rgba(184,115,51,0.45)] transition hover:brightness-110 disabled:opacity-50 cursor-pointer"
            >
              <ShieldCheck className="h-5 w-5" />
              <span>{submitting ? 'Signing In...' : 'Sign In to My Locker'}</span>
            </button>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#0D0B0A] px-3.5 py-2.5 font-mono-docket text-xs text-[#B5A99D]">
              <span>Haven&apos;t claimed your name on the board yet?</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('claim');
                    setErrorMsg(null);
                  }}
                  className="font-bold text-[#DFC15E] underline hover:text-white cursor-pointer"
                >
                  Claim Unclaimed Name ({unclaimedMembers.length})
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => {
                    setMode('new');
                    setErrorMsg(null);
                  }}
                  className="font-bold text-[#E8B888] underline hover:text-white cursor-pointer"
                >
                  Create New Profile
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* CLAIM AN UNCLAIMED ROSTER CARD OR CREATE A NEW PROFILE */
          <form onSubmit={handleClaimOrSignIn} className="space-y-4">
            {mode === 'claim' ? (
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="block font-mono-docket text-xs font-bold uppercase tracking-wider text-[#E8B888]">
                    1. CHOOSE YOUR UNCLAIMED NAME ({unclaimedMembers.length} AVAILABLE)
                  </label>
                  <span className="font-mono-docket text-[10px] text-[#9E8F82]">
                    Already-claimed profiles are hidden &amp; protected
                  </span>
                </div>

                {unclaimedMembers.length > 4 && (
                  <input
                    type="text"
                    value={unclaimedSearch}
                    onChange={(e) => setUnclaimedSearch(e.target.value)}
                    placeholder="Filter unclaimed names..."
                    className="w-full rounded-xl border border-white/15 bg-[#0D0B0A] px-3.5 py-2.5 font-mono-docket text-base sm:text-xs min-h-[44px] text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
                  />
                )}

                {filteredUnclaimedMembers.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-[#0D0B0A] p-4 text-center font-mono-docket text-xs text-[#B5A99D]">
                    No unclaimed names match your search.{' '}
                    <button
                      type="button"
                      onClick={() => setMode('new')}
                      className="font-bold text-[#DFC15E] underline cursor-pointer"
                    >
                      Create a New Profile instead
                    </button>
                    .
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                    {filteredUnclaimedMembers.map((m) => {
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
                          className={`flex items-center justify-between gap-2.5 rounded-2xl border p-3 min-h-[52px] touch-manipulation active:scale-[0.98] text-left transition cursor-pointer ${
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

                          <span className="inline-flex items-center gap-1 rounded-full border border-[#DFC15E]/40 bg-[#DFC15E]/15 px-2 py-0.5 font-mono-docket text-[9px] font-bold uppercase text-[#DFC15E] shrink-0">
                            <Sparkles className="h-2.5 w-2.5" />
                            Unclaimed
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono-docket text-xs font-bold uppercase text-[#D6C7B8]">
                    1. YOUR NAME / BAR NICKNAME *
                  </label>
                  <input
                    type="text"
                    required
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder="e.g. Big Dave, Mike, etc."
                    className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0D0B0A] px-3.5 py-2.5 text-base sm:text-sm min-h-[44px] text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
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
                    className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0D0B0A] px-3.5 py-2.5 font-mono-docket text-base sm:text-xs min-h-[44px] text-[#E8B888]"
                  >
                    <option value="patron">Patron (Ring of Honor Contender)</option>
                    <option value="staff">Bar Staff / Referee</option>
                    <option value="both">Both Staff &amp; Patron (Burtis Mode)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Required Email OR Phone to Claim & Sign In Later */}
            <div className="rounded-2xl border border-[#B87333]/35 bg-[#0E0C0B] p-3.5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="block font-mono-docket text-xs font-bold uppercase tracking-wider text-[#DFC15E]">
                  2. YOUR SIGN-IN EMAIL OR 10-DIGIT PHONE (ENTER AT LEAST ONE) *
                </label>
                <span className="font-mono-docket text-[10px] text-[#9E8F82]">
                  100% Private • Used to sign in with your PIN
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1 font-mono-docket text-[10px] uppercase text-[#D6C7B8]">
                    <Mail className="h-3 w-3 text-[#B87333]" />
                    <span>Email Address</span>
                  </label>
                  <input
                    type="email"
                    value={claimEmail}
                    onChange={(e) => setClaimEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-1 w-full rounded-xl border border-white/15 bg-[#151210] px-3.5 py-2.5 font-mono-docket text-base sm:text-xs min-h-[44px] text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1 font-mono-docket text-[10px] uppercase text-[#D6C7B8]">
                    <Smartphone className="h-3 w-3 text-[#B87333]" />
                    <span>10-Digit Mobile Phone</span>
                  </label>
                  <input
                    type="tel"
                    value={claimPhone}
                    onChange={(e) => setClaimPhone(e.target.value)}
                    placeholder="269-274-9665"
                    className="mt-1 w-full rounded-xl border border-white/15 bg-[#151210] px-3.5 py-2.5 font-mono-docket text-base sm:text-xs min-h-[44px] text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Team Allegiance Picker */}
            <div>
              <label className="block font-mono-docket text-xs font-bold uppercase tracking-wider text-[#E8B888]">
                3. PICK YOUR DETROIT / MICHIGAN TEAM EMBLEM
              </label>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TEAM_CHOICES.map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => setFavoriteTeam(team.id)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 min-h-[44px] touch-manipulation active:scale-95 text-left transition cursor-pointer ${
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
                  4. CREATE YOUR 4–8 DIGIT BAR PIN *
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
                  className="mt-1.5 w-full rounded-xl border border-[#B87333]/50 bg-[#0D0B0A] px-3.5 py-2.5 font-mono-docket text-base min-h-[44px] tracking-widest text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
                />
                <span className="mt-1 block font-mono-docket text-[10px] text-[#8E8074]">
                  Once claimed, your name is removed from the unclaimed list and locked to your
                  email/phone + PIN.
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
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0D0B0A] px-3.5 py-2.5 text-base sm:text-sm min-h-[44px] text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
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
              disabled={submitting || (mode === 'claim' && !selectedMember)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#B87333] to-[#C86D51] px-5 py-3.5 min-h-[48px] touch-manipulation active:scale-[0.98] font-sans text-sm sm:text-base font-black uppercase tracking-tight text-[#121212] shadow-[0_0_25px_rgba(184,115,51,0.45)] transition hover:brightness-110 disabled:opacity-50 cursor-pointer"
            >
              <ShieldCheck className="h-5 w-5" />
              <span>
                {submitting
                  ? 'Saving Profile...'
                  : mode === 'new'
                  ? 'Create & Claim Bar Profile'
                  : `Claim ${selectedMember?.display_name || 'Profile'} & Lock With PIN`}
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
