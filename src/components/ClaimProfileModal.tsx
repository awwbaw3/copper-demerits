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
  Unlock,
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
  Eye,
  EyeOff,
  RotateCcw,
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
    profileModalIntent,
    claimOrLoginProfile,
    resetProfilePin,
    updateMyProfile,
    addStaffAlias,
    deleteStaffAlias,
    requestNotificationVerification,
    verifyNotificationCode,
    logoutProfile,
    mergeProfiles,
  } = useDemerits();

  const [mode, setMode] = useState<'my-locker' | 'login' | 'claim' | 'new' | 'reset-pin'>('login');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [claimEmail, setClaimEmail] = useState('');
  const [claimPhone, setClaimPhone] = useState('');
  const [unclaimedSearch, setUnclaimedSearch] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<'patron' | 'staff' | 'both'>('patron');
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [favoriteTeam, setFavoriteTeam] = useState<TeamBadgeMeta['iconType']>('lions');
  const [tagline, setTagline] = useState('');

  // Self-Service Reset PIN State
  const [resetMemberId, setResetMemberId] = useState<string>('');
  const [resetIdentifier, setResetIdentifier] = useState<string>('');
  const [resetContactVerify, setResetContactVerify] = useState<string>('');
  const [resetNewPin, setResetNewPin] = useState<string>('');

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

  const unclaimedMembers = members.filter((m) => !m.is_claimed);
  const claimedMembers = members.filter((m) => Boolean(m.is_claimed));
  const filteredUnclaimedMembers = unclaimedMembers.filter((m) =>
    m.display_name.toLowerCase().includes(unclaimedSearch.trim().toLowerCase())
  );

  useEffect(() => {
    if (isProfileModalOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);

      if (currentMember && (!profileModalIntent?.mode || profileModalIntent.mode === 'my-locker')) {
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
        return;
      }

      // Handle explicit intent when opening modal from a card or quick button
      if (profileModalIntent) {
        const targetMember = profileModalIntent.memberId
          ? members.find((m) => m.id === profileModalIntent.memberId)
          : undefined;

        if (profileModalIntent.mode === 'claim') {
          setMode('claim');
          if (targetMember && !targetMember.is_claimed) {
            setSelectedMemberId(targetMember.id);
            setFavoriteTeam(
              (targetMember.favorite_team as TeamBadgeMeta['iconType']) || 'lions'
            );
            setTagline(targetMember.tagline || '');
          } else if (unclaimedMembers[0]) {
            setSelectedMemberId(unclaimedMembers[0].id);
          }
          return;
        }

        if (profileModalIntent.mode === 'login') {
          setMode('login');
          if (targetMember) {
            if (!targetMember.is_claimed) {
              setMode('claim');
              setSelectedMemberId(targetMember.id);
            } else {
              setLoginIdentifier(targetMember.display_name);
              setResetMemberId(targetMember.id);
            }
          }
          return;
        }

        if (profileModalIntent.mode === 'reset-pin') {
          setMode('reset-pin');
          if (targetMember) {
            setResetMemberId(targetMember.id);
            setResetIdentifier(targetMember.display_name);
          }
          return;
        }

        if (profileModalIntent.mode === 'new') {
          setMode('new');
          return;
        }
      }

      // Default when signed out
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
  }, [isProfileModalOpen, currentMember, members, activePin, profileModalIntent]);

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

    // 1. Returning User Sign-In via Name, Nickname, Email, or 10-Digit Phone + PIN
    if (mode === 'login') {
      if (!loginIdentifier.trim()) {
        setErrorMsg('Enter your Name, Bar Nickname, Phone Number, or Email to sign in.');
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
          // If the user entered an UNCLAIMED profile name on the Sign In tab, automatically switch them to Claim mode!
          if (res.needsClaim && res.unclaimedMember) {
            setMode('claim');
            setSelectedMemberId(res.unclaimedMember.id);
            setFavoriteTeam(
              (res.unclaimedMember.favorite_team as TeamBadgeMeta['iconType']) || 'lions'
            );
            setTagline(res.unclaimedMember.tagline || '');
            setSuccessMsg(
              `Almost there! "${res.unclaimedMember.display_name}" hasn't been claimed yet — just enter your 10-digit phone or email below to claim it with your PIN!`
            );
            return;
          }

          if (res.matchedMemberId) {
            setResetMemberId(res.matchedMemberId);
            setResetIdentifier(res.matchedMemberName || loginIdentifier.trim());
          }
          setErrorMsg(res.error || 'Could not sign in with that identifier and PIN.');
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
        'Please enter either your 10-Digit Phone Number OR your Email Address to claim your profile (you can use it to sign in or reset your PIN later).'
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
      setErrorMsg('Tap your unclaimed name from the list above (or tap "+ New Name" if your slip isn\'t uploaded yet).');
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

  const handleSelfServiceResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!resetMemberId && !resetIdentifier.trim()) {
      setErrorMsg('Select your name from the roster or enter your Name / Phone / Email.');
      return;
    }
    if (!resetContactVerify.trim()) {
      setErrorMsg('Enter the 10-digit phone number (or last 4 digits) or email address on your profile to verify it is you.');
      return;
    }
    const cleanNewPin = resetNewPin.trim();
    if (cleanNewPin.length < 4 || cleanNewPin.length > 8) {
      setErrorMsg('Your new Bar PIN must be between 4 and 8 digits.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await resetProfilePin({
        memberId: resetMemberId || undefined,
        identifier: resetIdentifier.trim() || undefined,
        contactVerify: resetContactVerify.trim(),
        newPin: cleanNewPin,
      });

      if (!res.ok) {
        setErrorMsg(res.error || 'Could not reset PIN.');
      } else {
        setPin(cleanNewPin);
        setResetNewPin('');
        setResetContactVerify('');
        setSuccessMsg(`PIN reset complete! You are now signed in as ${res.member?.display_name}.`);
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
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl border-2 border-[#B87333]/60 bg-[#14110F] p-4 sm:p-6 shadow-[0_25px_80px_rgba(0,0,0,0.95)] space-y-4">
        {/* Top Bar */}
        <div className="flex items-start justify-between gap-3 border-b border-[#B87333]/25 pb-3.5">
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
                ) : mode === 'reset-pin' ? (
                  <>
                    RESET YOUR <span className="text-[#DFC15E]">4–8 DIGIT BAR PIN</span>
                  </>
                ) : mode === 'claim' || mode === 'new' ? (
                  <>
                    FIRST TIME? <span className="text-[#DFC15E]">CLAIM YOUR NAME</span>
                  </>
                ) : (
                  <>
                    SIGN IN <span className="text-[#B87333]">TO YOUR LOCKER</span>
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
          } gap-1.5 rounded-2xl border border-white/10 bg-[#0D0B0A] p-1.5`}
        >
          {currentMember && (
            <button
              type="button"
              onClick={() => {
                setMode('my-locker');
                setErrorMsg(null);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 min-h-[44px] touch-manipulation active:scale-95 font-sans text-xs font-extrabold uppercase tracking-tight transition cursor-pointer ${
                mode === 'my-locker'
                  ? 'bg-[#B87333] text-[#121212] shadow-md'
                  : 'text-[#B5A99D] hover:text-white'
              }`}
            >
              <Settings className="h-3.5 w-3.5 shrink-0" />
              <span>My Locker</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setMode('claim');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 min-h-[44px] touch-manipulation active:scale-95 font-sans text-xs font-extrabold uppercase tracking-tight transition cursor-pointer ${
              mode === 'claim' || mode === 'new'
                ? 'bg-[#DFC15E] text-[#121212] shadow-md'
                : 'text-[#B5A99D] hover:text-white'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span>First Time? Claim ({unclaimedMembers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 min-h-[44px] touch-manipulation active:scale-95 font-sans text-xs font-extrabold uppercase tracking-tight transition cursor-pointer ${
              mode === 'login'
                ? 'bg-[#B87333] text-[#121212] shadow-md'
                : 'text-[#B5A99D] hover:text-white'
            }`}
          >
            <KeyRound className="h-3.5 w-3.5 shrink-0" />
            <span>{currentMember ? 'Switch Account' : 'Sign In'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('reset-pin');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 min-h-[44px] touch-manipulation active:scale-95 font-sans text-xs font-extrabold uppercase tracking-tight transition cursor-pointer ${
              mode === 'reset-pin'
                ? 'bg-[#C86D51] text-[#121212] shadow-md'
                : 'text-[#B5A99D] hover:text-white'
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0" />
            <span>Reset PIN</span>
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
                  &ldquo;Ricky&rdquo;, &ldquo;Thomas Lopez&rdquo;, &ldquo;Tommy Tacos&rdquo;, &ldquo;Big Burt&rdquo;
                </span>
                ). You can also use any of your nicknames to sign in!
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
                  placeholder="Add your real name or bar nickname (e.g. Thomas Lopez)..."
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
                Were you cited under a different name on the scoreboard or do you have a duplicate profile? Merge that profile into your locker. All citations and stats transfer to you, and the merged name automatically becomes your slip alias.
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
                      🔐 Other Profile&apos;s Bar PIN Required
                    </span>
                    <input
                      type={showPin ? 'text' : 'password'}
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
                <div className="flex items-center justify-between">
                  <label className="block font-mono-docket text-xs font-bold uppercase text-[#DFC15E]">
                    CURRENT 4–8 DIGIT PIN *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPin((p) => !p)}
                    className="font-mono-docket text-[10px] text-[#E8B888] hover:text-white cursor-pointer"
                  >
                    {showPin ? 'Hide PIN' : 'Show PIN'}
                  </button>
                </div>
                <input
                  type={showPin ? 'text' : 'password'}
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
                  type={showPin ? 'text' : 'password'}
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
                other users. Keep at least one on file so you can sign in or reset your PIN from any device!
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
        ) : mode === 'reset-pin' ? (
          /* SELF-SERVICE PIN RESET VIEW */
          <form onSubmit={handleSelfServiceResetPin} className="space-y-4">
            <div className="rounded-2xl border border-[#C86D51]/45 bg-[#0E0C0B] p-4 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Unlock className="h-4 w-4 text-[#DFC15E]" />
                  <span className="font-athletic text-lg font-bold uppercase tracking-wider text-[#F5F2EB]">
                    SELF-SERVICE PIN RESET &amp; UNLOCK
                  </span>
                </div>
                <span className="rounded-full bg-[#C86D51]/20 border border-[#C86D51]/40 px-2.5 py-0.5 font-mono-docket text-[10px] font-bold uppercase text-[#E08A4E]">
                  Instant Unlock
                </span>
              </div>

              <p className="font-mono-docket text-xs text-[#B5A99D]">
                Forgot your Bar PIN or locked out? Select your profile below, verify the{' '}
                <strong className="text-white">10-Digit Phone Number</strong> (or last 4 digits) or{' '}
                <strong className="text-white">Email Address</strong> on your account, and pick a new PIN!
              </p>

              {/* Step 1: Select Claimed Profile */}
              <div>
                <label className="block font-mono-docket text-xs font-bold uppercase text-[#E8B888]">
                  1. SELECT YOUR PROFILE FROM THE BAR ROSTER *
                </label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {claimedMembers.map((m) => {
                    const isSelected = resetMemberId === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setResetMemberId(m.id);
                          setResetIdentifier(m.display_name);
                          setErrorMsg(null);
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 min-h-[40px] font-athletic text-sm uppercase tracking-wider transition cursor-pointer ${
                          isSelected
                            ? 'border-[#DFC15E] bg-[#DFC15E]/20 text-white font-black shadow-[0_0_15px_rgba(223,193,94,0.25)]'
                            : 'border-white/15 bg-[#151210] text-[#D6C7B8] hover:border-[#B87333]/50 hover:text-white'
                        }`}
                      >
                        <span>{m.display_name}</span>
                        {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-[#DFC15E]" />}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  value={resetIdentifier}
                  onChange={(e) => {
                    setResetIdentifier(e.target.value);
                    const match = claimedMembers.find(
                      (m) => m.display_name.toLowerCase() === e.target.value.trim().toLowerCase()
                    );
                    if (match) setResetMemberId(match.id);
                  }}
                  placeholder="Or type your Name, Nickname (e.g. Thomas Lopez), Phone, or Email..."
                  className="mt-2 w-full rounded-xl border border-white/15 bg-[#151210] px-3.5 py-2.5 font-mono-docket text-base sm:text-xs min-h-[44px] text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
                />
              </div>

              {/* Step 2: Verify Phone or Email + New PIN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-mono-docket text-xs font-bold uppercase text-[#E8B888]">
                    2. VERIFY YOUR PHONE OR EMAIL *
                  </label>
                  <input
                    type="text"
                    required
                    value={resetContactVerify}
                    onChange={(e) => setResetContactVerify(e.target.value)}
                    placeholder="Phone (or last 4 digits) or Email"
                    className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#151210] px-3.5 py-2.5 font-mono-docket text-base sm:text-xs min-h-[44px] text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
                  />
                  <span className="mt-1 block font-mono-docket text-[10px] text-[#8E8074]">
                    Enter your 10-digit phone (or last 4 digits) or email used when claiming.
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="block font-mono-docket text-xs font-bold uppercase text-[#DFC15E]">
                      3. NEW 4–8 DIGIT BAR PIN *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPin((p) => !p)}
                      className="inline-flex items-center gap-1 font-mono-docket text-[10px] text-[#E8B888] hover:text-white cursor-pointer"
                    >
                      {showPin ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      <span>{showPin ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>
                  <input
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    minLength={4}
                    maxLength={8}
                    required
                    value={resetNewPin}
                    onChange={(e) => setResetNewPin(e.target.value)}
                    placeholder="Pick a new 4–8 digit PIN"
                    className="mt-1.5 w-full rounded-xl border border-[#DFC15E]/50 bg-[#151210] px-3.5 py-2.5 font-mono-docket text-base sm:text-xs min-h-[44px] tracking-widest text-[#F5F2EB] focus:border-[#DFC15E] focus:outline-none"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#151210] p-3 font-mono-docket text-[11px] text-[#D6C7B8]">
                🦓 <strong className="text-[#DFC15E]">Referee Assist at the Bar:</strong> Can&apos;t remember which phone or email was entered? Ask any Official Referee (<strong className="text-white">Sarah, Burtis, or Rick</strong>) to open the <strong>Ref Booth</strong> — they can reset your PIN and unlock your profile in 1 tap!
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
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#DFC15E] to-[#B87333] px-5 py-3.5 min-h-[48px] touch-manipulation active:scale-[0.98] font-sans text-sm sm:text-base font-black uppercase tracking-tight text-[#121212] shadow-[0_0_25px_rgba(223,193,94,0.35)] transition hover:brightness-110 disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className="h-5 w-5" />
              <span>{submitting ? 'Resetting PIN...' : 'Reset My PIN & Sign In'}</span>
            </button>
          </form>
        ) : mode === 'login' ? (
          /* RETURNING USER SIGN IN: NAME, NICKNAME, PHONE, OR EMAIL + PIN */
          <form onSubmit={handleClaimOrSignIn} className="space-y-4">
            <div className="rounded-2xl border border-[#B87333]/35 bg-[#0E0C0B] p-4 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-[#DFC15E]" />
                  <span className="font-athletic text-lg font-bold uppercase tracking-wider text-[#F5F2EB]">
                    QUICK SIGN IN (NAME, NICKNAME, PHONE, OR EMAIL)
                  </span>
                </div>
              </div>
              <p className="font-mono-docket text-xs text-[#B5A99D]">
                Tap your name below or enter your <strong>Display Name</strong>,{' '}
                <strong>Bar Nickname</strong> (e.g. Thomas Lopez / Beans),{' '}
                <strong>10-Digit Phone</strong>, or <strong>Email</strong> + your{' '}
                <strong>4–8 Digit Bar PIN</strong>.
              </p>

              {/* Quick-Tap Claimed Roster Chips */}
              {claimedMembers.length > 0 && (
                <div className="space-y-1.5">
                  <span className="block font-mono-docket text-[10px] font-bold uppercase tracking-wider text-[#9E8F82]">
                    QUICK-TAP YOUR CLAIMED NAME:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {claimedMembers.map((m) => {
                      const isSelected =
                        loginIdentifier.trim().toLowerCase() === m.display_name.toLowerCase();
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setLoginIdentifier(m.display_name);
                            setResetMemberId(m.id);
                            setErrorMsg(null);
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 min-h-[38px] font-athletic text-sm uppercase tracking-wider transition cursor-pointer ${
                            isSelected
                              ? 'border-[#DFC15E] bg-[#DFC15E]/20 text-white font-black shadow-[0_0_12px_rgba(223,193,94,0.25)]'
                              : 'border-white/15 bg-[#151210] text-[#D6C7B8] hover:border-[#B87333]/50 hover:text-white'
                          }`}
                        >
                          <span>{m.display_name}</span>
                          {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-[#DFC15E]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-mono-docket text-xs font-bold uppercase text-[#E8B888]">
                    NAME, NICKNAME, PHONE, OR EMAIL *
                  </label>
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="e.g. Beans, Thomas Lopez, or phone"
                    className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#151210] px-3.5 py-2.5 font-mono-docket text-base sm:text-sm min-h-[44px] text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="block font-mono-docket text-xs font-bold uppercase text-[#DFC15E]">
                      YOUR 4–8 DIGIT BAR PIN *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPin((p) => !p)}
                      className="inline-flex items-center gap-1 font-mono-docket text-[10px] text-[#E8B888] hover:text-white cursor-pointer"
                    >
                      {showPin ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      <span>{showPin ? 'Hide PIN' : 'Show PIN'}</span>
                    </button>
                  </div>
                  <input
                    type={showPin ? 'text' : 'password'}
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

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (loginIdentifier.trim()) {
                      setResetIdentifier(loginIdentifier.trim());
                    }
                    setMode('reset-pin');
                    setErrorMsg(null);
                  }}
                  className="inline-flex items-center gap-1.5 font-mono-docket text-xs font-bold text-[#DFC15E] hover:text-white underline cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Forgot or can&apos;t figure out your PIN? Tap here to Reset PIN &rarr;</span>
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="space-y-2 rounded-xl border border-rose-500/50 bg-rose-950/40 p-3 text-xs font-mono-docket text-rose-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (loginIdentifier.trim()) {
                        setResetIdentifier(loginIdentifier.trim());
                      }
                      setMode('reset-pin');
                      setErrorMsg(null);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#DFC15E]/60 bg-[#DFC15E]/20 px-3 py-1.5 font-mono-docket text-xs font-bold text-[#DFC15E] hover:bg-[#DFC15E] hover:text-[#121212] cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset My PIN Now</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('claim');
                      setErrorMsg(null);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 font-mono-docket text-xs font-bold text-white hover:bg-white/20 cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-[#DFC15E]" />
                    <span>First Time? Claim Unclaimed Name</span>
                  </button>
                </div>
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

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#DFC15E]/30 bg-[#DFC15E]/10 px-3.5 py-2.5 font-mono-docket text-xs text-[#F5F2EB]">
              <span>Got your first demerit and haven&apos;t set a PIN yet?</span>
              <button
                type="button"
                onClick={() => {
                  setMode('claim');
                  setErrorMsg(null);
                }}
                className="font-bold text-[#DFC15E] underline hover:text-white cursor-pointer"
              >
                Tap Here to Claim Your Name ({unclaimedMembers.length}) &rarr;
              </button>
            </div>
          </form>
        ) : (
          /* FIRST TIME CLAIMING AN UNCLAIMED ROSTER CARD OR CREATING A NEW PROFILE */
          <form onSubmit={handleClaimOrSignIn} className="space-y-4">
            {successMsg && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-950/40 p-3 text-xs font-mono-docket text-emerald-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="rounded-2xl border border-[#DFC15E]/40 bg-[#0E0C0B] p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono-docket text-[10px] font-bold uppercase tracking-widest text-[#DFC15E]">
                    ⚡ FIRST-TIME DEMERIT ONBOARDING (3 EASY STEPS)
                  </span>
                  <h3 className="font-athletic text-lg font-bold uppercase text-[#F5F2EB]">
                    {mode === 'claim'
                      ? `1. TAP YOUR NAME ON THE BOARD (${unclaimedMembers.length} UNCLAIMED)`
                      : '1. ENTER YOUR NAME OR BAR NICKNAME'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'claim' ? 'new' : 'claim');
                    setErrorMsg(null);
                  }}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 font-mono-docket text-[11px] font-bold text-[#DFC15E] hover:bg-white/10 cursor-pointer"
                >
                  {mode === 'claim' ? "+ Don't see your name? Create New" : '← Back to Unclaimed Names'}
                </button>
              </div>

              {mode === 'claim' ? (
                <div className="space-y-2.5">
                  {unclaimedMembers.length > 4 && (
                    <input
                      type="text"
                      value={unclaimedSearch}
                      onChange={(e) => setUnclaimedSearch(e.target.value)}
                      placeholder="Search unclaimed names..."
                      className="w-full rounded-xl border border-white/15 bg-[#151210] px-3.5 py-2 font-mono-docket text-base sm:text-xs min-h-[42px] text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
                    />
                  )}

                  {filteredUnclaimedMembers.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-[#151210] p-4 text-center font-mono-docket text-xs text-[#B5A99D] space-y-2">
                      <p>
                        Don&apos;t see your name in the unclaimed list? It may already be claimed, or your first slip hasn&apos;t been scanned yet!
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setMode('new')}
                          className="rounded-xl bg-[#DFC15E] px-3.5 py-2 font-mono-docket text-xs font-bold text-[#121212] cursor-pointer"
                        >
                          + Create New Profile
                        </button>
                        <button
                          type="button"
                          onClick={() => setMode('login')}
                          className="rounded-xl border border-white/20 bg-white/5 px-3.5 py-2 font-mono-docket text-xs font-bold text-white cursor-pointer"
                        >
                          Already Claimed? Sign In
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {filteredUnclaimedMembers.map((m) => {
                        const isSelected = m.id === selectedMemberId;
                        const teamIcon =
                          (m.favorite_team as TeamBadgeMeta['iconType']) || 'lions';
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleSelectMember(m.id)}
                            className={`flex items-center justify-between gap-2.5 rounded-2xl border p-3 min-h-[52px] touch-manipulation active:scale-[0.98] text-left transition cursor-pointer ${
                              isSelected
                                ? 'border-[#DFC15E] bg-[#DFC15E]/20 shadow-[0_0_20px_rgba(223,193,94,0.25)]'
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

                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono-docket text-[9px] font-bold uppercase shrink-0 ${
                                isSelected
                                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                                  : 'border-[#DFC15E]/40 bg-[#DFC15E]/15 text-[#DFC15E]'
                              }`}
                            >
                              <Sparkles className="h-2.5 w-2.5" />
                              {isSelected ? 'Selected' : 'Tap to Claim'}
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
                      YOUR NAME / BAR NICKNAME *
                    </label>
                    <input
                      type="text"
                      required
                      value={newDisplayName}
                      onChange={(e) => setNewDisplayName(e.target.value)}
                      placeholder="e.g. Big Dave, Mike, etc."
                      className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#151210] px-3.5 py-2.5 text-base sm:text-sm min-h-[44px] text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
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
                      className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#151210] px-3.5 py-2.5 font-mono-docket text-base sm:text-xs min-h-[44px] text-[#E8B888]"
                    >
                      <option value="patron">Patron (Ring of Honor Contender)</option>
                      <option value="staff">Bar Staff / Referee</option>
                      <option value="both">Both Staff &amp; Patron (Burtis Mode)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Required Phone OR Email */}
            <div className="rounded-2xl border border-[#B87333]/35 bg-[#0E0C0B] p-3.5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="block font-mono-docket text-xs font-bold uppercase tracking-wider text-[#DFC15E]">
                  2. ENTER YOUR 10-DIGIT PHONE OR EMAIL (ONLY ONE REQUIRED) *
                </label>
                <span className="font-mono-docket text-[10px] text-[#9E8F82]">
                  100% Private • Used for PIN Reset
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1 font-mono-docket text-[10px] uppercase text-[#D6C7B8]">
                    <Smartphone className="h-3 w-3 text-[#B87333]" />
                    <span>10-Digit Mobile Phone (Fastest)</span>
                  </label>
                  <input
                    type="tel"
                    value={claimPhone}
                    onChange={(e) => setClaimPhone(e.target.value)}
                    placeholder="269-274-9665"
                    className="mt-1 w-full rounded-xl border border-white/15 bg-[#151210] px-3.5 py-2.5 font-mono-docket text-base sm:text-xs min-h-[44px] text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1 font-mono-docket text-[10px] uppercase text-[#D6C7B8]">
                    <Mail className="h-3 w-3 text-[#B87333]" />
                    <span>Or Email Address</span>
                  </label>
                  <input
                    type="email"
                    value={claimEmail}
                    onChange={(e) => setClaimEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-1 w-full rounded-xl border border-white/15 bg-[#151210] px-3.5 py-2.5 font-mono-docket text-base sm:text-xs min-h-[44px] text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: 4-8 Digit Bar PIN + Optional Team / Tagline */}
            <div className="rounded-2xl border border-[#B87333]/35 bg-[#0E0C0B] p-3.5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block font-mono-docket text-xs font-bold uppercase text-[#DFC15E]">
                      3. PICK A 4–8 DIGIT BAR PIN *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPin((p) => !p)}
                      className="inline-flex items-center gap-1 font-mono-docket text-[10px] text-[#E8B888] hover:text-white cursor-pointer"
                    >
                      {showPin ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      <span>{showPin ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>
                  <input
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    minLength={4}
                    maxLength={8}
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="e.g. 1234"
                    className="mt-1.5 w-full rounded-xl border border-[#DFC15E]/60 bg-[#151210] px-3.5 py-2.5 font-mono-docket text-base min-h-[44px] tracking-widest text-[#F5F2EB] focus:border-[#DFC15E] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-mono-docket text-xs font-bold uppercase text-[#D6C7B8]">
                    BAR TAGLINE / CHIRP (OPTIONAL)
                  </label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="e.g. Put it on Burtis's tab!"
                    className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#151210] px-3.5 py-2.5 text-base sm:text-sm min-h-[44px] text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono-docket text-[11px] font-bold uppercase tracking-wider text-[#E8B888]">
                  PICK YOUR DETROIT / MICHIGAN TEAM EMBLEM
                </label>
                <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {TEAM_CHOICES.map((team) => (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => setFavoriteTeam(team.id)}
                      className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 min-h-[40px] touch-manipulation active:scale-95 text-left transition cursor-pointer ${
                        favoriteTeam === team.id
                          ? 'border-[#B87333] bg-[#B87333]/20 text-white font-bold'
                          : 'border-white/10 bg-[#151210] text-[#B5A99D] hover:border-white/25'
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
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/50 bg-rose-950/40 p-3 text-xs font-mono-docket text-rose-200">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || (mode === 'claim' && !selectedMember)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#DFC15E] to-[#B87333] px-5 py-3.5 min-h-[48px] touch-manipulation active:scale-[0.98] font-sans text-sm sm:text-base font-black uppercase tracking-tight text-[#121212] shadow-[0_0_25px_rgba(223,193,94,0.35)] transition hover:brightness-110 disabled:opacity-50 cursor-pointer"
            >
              <UserCheck className="h-5 w-5" />
              <span>
                {submitting
                  ? 'Claiming Profile...'
                  : mode === 'new'
                  ? 'Create & Claim My Bar Profile'
                  : `Claim ${selectedMember?.display_name || 'My Name'} & Sign In`}
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
