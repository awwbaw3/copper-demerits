import React, { useEffect, useState, useMemo } from 'react';
import { NavLink, Link } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  Trophy,
  FileText,
  Camera,
  ShieldAlert,
  Flame,
  Download,
  UserCheck,
  KeyRound,
  Smartphone,
  Share2,
  PlusSquare,
  X,
  QrCode,
  Copy,
  Check,
  HelpCircle,
} from 'lucide-react';
import { useDemerits } from '../context/DemeritsContext';
import { ClaimProfileModal } from './ClaimProfileModal';
import { MichiganTeamBadge, TeamBadgeMeta } from './MichiganSportsGraphics';
import { PwaTooltip } from './PwaTooltip';
import { maskSensitiveInfraction } from '../lib/moderation';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
  badge?: number;
}

export const Navbar: React.FC = () => {
  const {
    demerits,
    currentMember,
    setIsProfileModalOpen,
    computeStandings,
    isAdminOrStaff,
  } = useDemerits();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://')
    );
  });
  const [showInstallGuideModal, setShowInstallGuideModal] = useState<boolean>(false);
  const [showQuickQrModal, setShowQuickQrModal] = useState<boolean>(false);
  const [quickQrDataUrl, setQuickQrDataUrl] = useState<string>('');
  const [copiedQuickLink, setCopiedQuickLink] = useState<boolean>(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState<boolean>(() => {
    try {
      const dismissedUntil = localStorage.getItem('pwa_prompt_dismissed_until');
      return Boolean(dismissedUntil && Number(dismissedUntil) > Date.now());
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(Boolean(standalone));
    };

    checkStandalone();

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      setShowInstallGuideModal(false);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsStandalone(true);
        setDeferredPrompt(null);
      }
    } else {
      setShowInstallGuideModal(true);
    }
  };

  const handleDismissBanner = () => {
    setIsBannerDismissed(true);
    try {
      localStorage.setItem('pwa_prompt_dismissed_until', String(Date.now() + 1000 * 60 * 60 * 24 * 3));
    } catch {
      // Ignore
    }
  };

  const approvedSlips = useMemo(
    () => demerits.filter((d) => d.status === 'approved' && Boolean(d.image_url)),
    [demerits]
  );
  const totalDemeritPoints = useMemo(
    () => approvedSlips.reduce((sum, s) => sum + s.demerit_count, 0),
    [approvedSlips]
  );
  const pendingCount = useMemo(
    () => demerits.filter((d) => d.status === 'pending').length,
    [demerits]
  );

  const desktopNavItems = useMemo((): NavItem[] => {
    const items: NavItem[] = [
      { to: '/', label: 'Scoreboard', icon: Trophy },
      { to: '/docket', label: 'Wall of Slips', icon: FileText },
      { to: '/submit', label: 'Drop A Slip', icon: Camera, highlight: true },
      { to: '/share', label: 'Share QR', icon: QrCode },
      { to: '/about', label: 'About & Help', icon: HelpCircle },
    ];
    if (isAdminOrStaff) {
      items.push({ to: '/admin', label: 'Ref Booth', icon: ShieldAlert, badge: pendingCount });
    }
    return items;
  }, [isAdminOrStaff, pendingCount]);

  const mobileNavItems = useMemo((): NavItem[] => {
    const items: NavItem[] = [
      { to: '/', label: 'Scoreboard', icon: Trophy },
      { to: '/docket', label: 'Wall of Slips', icon: FileText },
      { to: '/submit', label: 'Drop Slip', icon: Camera, highlight: true },
      { to: '/share', label: 'Share QR', icon: QrCode },
    ];
    if (isAdminOrStaff) {
      items.push({ to: '/admin', label: 'Ref Booth', icon: ShieldAlert, badge: pendingCount });
    }
    return items;
  }, [isAdminOrStaff, pendingCount]);

  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://copperdemerits.com';
    QRCode.toDataURL(origin, {
      width: 440,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#121212',
        light: '#FFFFFF',
      },
    })
      .then((url) => setQuickQrDataUrl(url))
      .catch(() => {});
  }, []);

  const handleQuickShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.origin : 'https://copperdemerits.com';
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Copper Demerits — Ring of Honor',
          text: 'Scan to check the live backbar demerit standings, top infractions, and drop slips at Copper Athletic Club!',
          url,
        });
      } catch {
        handleQuickCopy();
      }
    } else {
      handleQuickCopy();
    }
  };

  const handleQuickCopy = async () => {
    const url = typeof window !== 'undefined' ? window.location.origin : 'https://copperdemerits.com';
    try {
      await navigator.clipboard.writeText(url);
      setCopiedQuickLink(true);
      setTimeout(() => setCopiedQuickLink(false), 2500);
    } catch {
      window.prompt('Copy this link:', url);
    }
  };

  // Pure Leaderboard Updates only: Leaders, Points, Citations, and Infraction Calls (No venue or cloudflare mentions)
  const tickerItems = useMemo(() => {
    const items: string[] = [];
    const { patronStandings } = computeStandings('all-time');

    if (patronStandings && patronStandings.length > 0) {
      // 1. Leaderboard Leaders
      const topPts = patronStandings[0]?.totalDemerits || 0;
      const leaders = patronStandings.filter((p) => p.totalDemerits === topPts);
      if (leaders.length > 1) {
        items.push(
          `🏆 LEADERBOARD CO-LEADERS: ${leaders
            .map((l) => `${l.displayName.toUpperCase()} (${l.totalDemerits} PTS)`)
            .join(' & ')}`
        );
      } else if (leaders.length === 1) {
        items.push(
          `👑 LEADERBOARD #1: ${leaders[0].displayName.toUpperCase()} (${leaders[0].totalDemerits} PTS, ${leaders[0].slipCount} SLIP${leaders[0].slipCount === 1 ? '' : 'S'})`
        );
      }

      // 2. Podium standings
      const podium = patronStandings
        .slice(0, 4)
        .map((p, idx) => `#${idx + 1} ${p.displayName.toUpperCase()} (${p.totalDemerits} PTS)`)
        .join(' • ');
      items.push(`📊 RING OF HONOR STANDINGS: ${podium}`);
    }

    // 3. Demerit totals
    items.push(`🔥 TOTAL ACTIVE DEMERITS: ${totalDemeritPoints} PTS ACROSS ${approvedSlips.length} VERIFIED SLIPS`);

    // 4. Referee Calls & Infraction Records
    items.push(`🚨 HEAD REFEREE REVIEW: SARAH ("THE BOSS") HAS ${approvedSlips.length}-FOR-${approvedSlips.length} SLIPS SUSTAINED (100% CONVICTION RATE)`);

    // 5. Individual Slip Infractions & Citation Highlights
    approvedSlips.forEach((slip) => {
      const name = (slip.patronDisplayName || slip.raw_student || 'PATRON').toUpperCase();
      const pts = slip.demerit_count;
      const infractions = slip.infractions?.filter(Boolean).map((inf) => maskSensitiveInfraction(inf)).slice(0, 2).join(' + ').toUpperCase();
      const timeStr = slip.incident_time ? ` AT ${slip.incident_time}` : '';
      if (name && infractions) {
        items.push(`📋 CITATION${timeStr}: ${name} (${pts} PT${pts === 1 ? '' : 'S'}) FOR ${infractions}`);
      }
    });

    if (pendingCount > 0 && isAdminOrStaff) {
      items.push(`⚖️ REF BOOTH ALERT: ${pendingCount} CITATION${pendingCount === 1 ? '' : 'S'} PENDING OFFICIAL REVIEW`);
    }

    if (items.length === 0) {
      items.push('🏆 RING OF HONOR LEADERBOARD LIVE UPDATES', '⚡ LIVE DEMERIT FOUL CALLS & STANDINGS');
    }

    return items;
  }, [computeStandings, approvedSlips, totalDemeritPoints, pendingCount, isAdminOrStaff]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#B87333]/35 bg-[#0F0D0C]/95 backdrop-blur-md pt-[env(safe-area-inset-top,0px)] pr-[env(safe-area-inset-right,0px)] pl-[env(safe-area-inset-left,0px)]">
        {/* Animated ESPN / Fox Sports Detroit Style Ticker */}
        <div className="overflow-hidden border-b border-[#B87333]/25 bg-gradient-to-r from-[#1A120E] via-[#281A12] to-[#1A120E] py-1.5">
          <div className="animate-ticker flex items-center gap-8 text-xs font-sans font-bold uppercase tracking-wider text-[#E8B888]">
            {[...tickerItems, ...tickerItems].map((item, idx) => (
              <span key={idx} className="inline-flex items-center gap-2 whitespace-nowrap">
                <span>{item}</span>
                <span className="text-[#B87333]/50">///</span>
              </span>
            ))}
          </div>
        </div>

        {/* Main Header with Official CopperAC Stag Logo */}
        <div className="mx-auto flex max-w-6xl items-center justify-between px-3 sm:px-4 py-2.5">
          <NavLink to="/" className="group flex items-center gap-2.5 sm:gap-3 shrink-0">
            <img
              src="/brand/CopperLogo_Web.png"
              alt="Copper Athletic Club"
              className="h-10 sm:h-12 w-auto object-contain drop-shadow-[0_0_12px_rgba(184,115,51,0.4)] transition-transform duration-300 group-hover:scale-105"
            />
            <div className="border-l border-[#B87333]/35 pl-2.5 sm:pl-3">
              <div className="flex items-center gap-1.5">
                <span className="block font-athletic text-base sm:text-xl font-black tracking-wider uppercase text-[#F5F2EB] leading-none">
                  RING OF <span className="text-[#B87333]">DEMERITS</span>
                </span>
                <span className="hidden sm:inline-block rounded border border-[#B87333]/40 bg-[#161210] px-1 py-0.2 font-mono-docket text-[9px] font-bold text-[#DFC15E]">
                  v1.6.20
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 font-sans font-bold text-[11px] tracking-wide uppercase text-[#DFC15E] mt-0.5">
                <Flame className="h-3 w-3 text-[#C86D51]" />
                {totalDemeritPoints} PTS · {approvedSlips.length} SLIPS
              </span>
            </div>
          </NavLink>

          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Prominent Instant Backbar QR Code Button in Header */}
            <PwaTooltip
              pwaTag="PWA SHARING"
              content="Display the high-res backbar QR code to pass around the bar or print out as a table tent poster."
            >
              <button
                type="button"
                onClick={() => setShowQuickQrModal(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border min-h-[44px] px-3 sm:px-3.5 py-2 font-sans text-xs sm:text-sm font-bold tracking-normal transition-all active:scale-95 touch-manipulation cursor-pointer select-none border-[#DFC15E] bg-gradient-to-r from-[#DFC15E]/20 via-[#B87333]/30 to-[#DFC15E]/20 text-[#DFC15E] hover:bg-[#DFC15E] hover:text-[#121212] shadow-[0_0_14px_rgba(223,193,94,0.3)]"
                title="Open Backbar QR Code to Scan & Share"
              >
                <QrCode className="h-4 w-4 stroke-[2.2] shrink-0" />
                <span className="hidden sm:inline font-bold">Share QR</span>
                <span className="sm:hidden font-extrabold">QR Code</span>
              </button>
            </PwaTooltip>

            {/* Mobile About & Help Quick Link */}
            <NavLink
              to="/about"
              className={({ isActive }) =>
                `flex md:hidden items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border transition-all active:scale-95 touch-manipulation cursor-pointer ${
                  isActive
                    ? 'border-[#DFC15E] bg-[#DFC15E]/20 text-[#DFC15E]'
                    : 'border-white/15 bg-white/5 text-[#D6C7B8] hover:text-[#DFC15E] hover:border-[#DFC15E]/40'
                }`
              }
              title="About, PWA Features & What's New"
              aria-label="About and Help Guide"
            >
              <HelpCircle className="h-4 w-4" />
            </NavLink>

            {/* Desktop Nav Links */}
            <nav className="hidden md:flex items-center gap-1.5">
              {desktopNavItems.map(({ to, label, icon: Icon, highlight, badge }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `relative flex items-center gap-2 rounded-xl min-h-[44px] px-3.5 py-2 text-sm font-sans font-bold uppercase tracking-wide transition-all ${
                      highlight
                        ? isActive
                          ? 'bg-[#B87333] text-[#121212] font-black shadow-[0_0_18px_rgba(184,115,51,0.5)] scale-105'
                          : 'border border-[#B87333]/60 bg-[#B87333]/20 text-[#E8B888] hover:bg-[#B87333] hover:text-[#121212] hover:scale-105'
                        : isActive
                        ? 'bg-white/10 text-[#F5F2EB] border border-[#B87333]/50 font-bold'
                        : 'text-[#B5A99D] hover:bg-white/5 hover:text-[#F5F2EB]'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{label}</span>
                  {typeof badge === 'number' && badge > 0 && (
                    <span className="ml-1 rounded-full bg-[#C86D51] px-1.5 py-0.2 text-[10px] font-sans font-black text-[#121212]">
                      {badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>

            {/* Claim / Login Bar Locker Pass Pill - Safe Zoned 44px+ for iPhone & High Legibility Font */}
            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              className={`inline-flex items-center justify-center gap-2 rounded-xl border min-h-[44px] px-3.5 sm:px-4 py-2 font-sans text-xs sm:text-sm font-bold tracking-normal transition-all active:scale-95 touch-manipulation cursor-pointer select-none shadow-md ${
                currentMember
                  ? 'border-emerald-500/60 bg-emerald-950/70 text-emerald-100 hover:border-emerald-400 hover:bg-emerald-900/60 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                  : 'border-[#DFC15E] bg-gradient-to-r from-[#DFC15E] via-[#E8B888] to-[#DFC15E] text-[#121212] hover:brightness-110 active:brightness-95 shadow-[0_0_16px_rgba(223,193,94,0.4)]'
              }`}
              title={currentMember ? 'Open My Locker' : 'Sign In or Claim Your Profile'}
            >
              {currentMember ? (
                <>
                  <MichiganTeamBadge
                    iconType={
                      (currentMember.favorite_team as TeamBadgeMeta['iconType']) || 'lions'
                    }
                    size="sm"
                  />
                  <span className="max-w-[105px] truncate font-sans font-extrabold text-xs sm:text-sm">{currentMember.display_name}</span>
                  <UserCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4 shrink-0 stroke-[2.5]" />
                  <span className="font-sans font-black text-xs sm:text-sm tracking-tight whitespace-nowrap">Sign In / Claim</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Prominent PWA Install Callout Banner */}
        {!isStandalone && !isBannerDismissed && (
          <div className="relative border-t border-[#DFC15E]/40 bg-gradient-to-r from-[#2B1A12] via-[#1A1411] to-[#2B1A12] px-3 sm:px-4 py-2 sm:py-2.5 shadow-md">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#DFC15E]/20 text-[#DFC15E] border border-[#DFC15E]/40">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <span className="block font-sans font-black text-xs uppercase tracking-tight text-[#DFC15E]">
                    Get The Official Backbar App
                  </span>
                  <p className="truncate text-[11px] text-[#E8B888] font-mono-docket">
                    Install for instant 1-tap live scoreboard &amp; demerit alerts.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="rounded-xl bg-[#DFC15E] px-3.5 py-2 min-h-[44px] text-xs font-sans font-black uppercase tracking-tight text-[#121212] hover:bg-[#E8B888] shadow-[0_0_12px_rgba(223,193,94,0.4)] active:scale-95 touch-manipulation transition cursor-pointer"
                >
                  Install Now
                </button>
                <button
                  type="button"
                  onClick={handleDismissBanner}
                  aria-label="Dismiss install banner"
                  className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl text-[#D6C7B8] hover:bg-white/10 hover:text-[#F5F2EB] active:scale-95 touch-manipulation transition cursor-pointer"
                  title="Dismiss banner"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className={`fixed bottom-0 inset-x-0 z-40 grid ${
          mobileNavItems.length === 5 ? 'grid-cols-5' : 'grid-cols-4'
        } border-t border-[#B87333]/40 bg-[#120F0D]/95 backdrop-blur-xl pt-1 pb-[max(env(safe-area-inset-bottom,0px),8px)] pr-[env(safe-area-inset-right,0px)] pl-[env(safe-area-inset-left,0px)] md:hidden shadow-[0_-10px_30px_rgba(0,0,0,0.85)]`}
      >
        {mobileNavItems.map(({ to, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-1 py-1.5 min-h-[58px] text-[11px] font-sans font-bold tracking-tight transition-all active:scale-90 touch-manipulation cursor-pointer select-none ${
                isActive
                  ? 'text-[#DFC15E] font-black'
                  : 'text-[#D6C7B8] hover:text-white active:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`flex items-center justify-center h-8 w-12 rounded-full transition-all ${
                    isActive
                      ? 'bg-[#DFC15E]/20 border border-[#DFC15E]/50 shadow-[0_0_12px_rgba(223,193,94,0.3)]'
                      : ''
                  }`}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
                </div>
                <span className="leading-tight truncate max-w-full px-0.5">{label}</span>
                {typeof badge === 'number' && badge > 0 && (
                  <span className="absolute top-1 right-2 rounded-full bg-[#C86D51] px-1.5 py-0.2 text-[9px] font-sans font-black text-[#121212] shadow-md">
                    {badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* PWA Install Guide Modal */}
      {showInstallGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="relative w-full max-w-md rounded-2xl border-2 border-[#DFC15E] bg-[#1A1411] p-5 sm:p-6 shadow-[0_0_50px_rgba(223,193,94,0.25)] text-[#F5F2EB]">
            <button
              type="button"
              onClick={() => setShowInstallGuideModal(false)}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-[#B5A99D] hover:bg-white/10 hover:text-white transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#B87333]/30 pb-3 mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#DFC15E]/20 text-[#DFC15E] border border-[#DFC15E]/40">
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-athletic text-lg font-black uppercase tracking-wider text-[#DFC15E]">
                  Install Backbar App
                </h3>
                <p className="text-xs text-[#E8B888] font-mono-docket">
                  Add Copper Demerits to your Home Screen
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs font-sans">
              {/* iOS Safari */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 space-y-1.5">
                <div className="flex items-center gap-2 font-athletic font-bold text-sm uppercase text-[#DFC15E]">
                  <Share2 className="h-4 w-4 text-[#DFC15E]" />
                  <span>iPhone / iPad (Safari)</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[#E5DCD3] text-[11px] leading-relaxed">
                  <li>Tap the <span className="font-semibold text-white">Share</span> button at the bottom of Safari (<Share2 className="inline h-3 w-3 mx-0.5 text-[#DFC15E]" />).</li>
                  <li>Scroll down and tap <span className="font-semibold text-white">"Add to Home Screen"</span> (<PlusSquare className="inline h-3 w-3 mx-0.5 text-[#DFC15E]" />).</li>
                  <li>Tap <span className="font-semibold text-white">Add</span> in the top-right corner.</li>
                </ol>
              </div>

              {/* Android Chrome */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 space-y-1.5">
                <div className="flex items-center gap-2 font-athletic font-bold text-sm uppercase text-[#DFC15E]">
                  <Download className="h-4 w-4 text-[#DFC15E]" />
                  <span>Android (Chrome)</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[#E5DCD3] text-[11px] leading-relaxed">
                  <li>Tap the three dots menu (<span className="font-semibold text-white">⋮</span>) at the top right of Chrome.</li>
                  <li>Tap <span className="font-semibold text-white">"Install app"</span> or <span className="font-semibold text-white">"Add to Home Screen"</span>.</li>
                  <li>Follow the prompt to install.</li>
                </ol>
              </div>

              {/* Desktop (Chrome / Edge / Brave) */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 space-y-1.5">
                <div className="flex items-center gap-2 font-athletic font-bold text-sm uppercase text-[#DFC15E]">
                  <Download className="h-4 w-4 text-[#DFC15E]" />
                  <span>Desktop (Chrome / Edge)</span>
                </div>
                <p className="text-[#E5DCD3] text-[11px] leading-relaxed">
                  Click the install icon (<span className="font-semibold text-white">⊕</span>) in your browser address bar to install Copper Demerits as a standalone desktop app.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#B87333]/30 flex items-center justify-between">
              <Link
                to="/share"
                onClick={() => setShowInstallGuideModal(false)}
                className="inline-flex items-center gap-1.5 font-athletic text-xs font-bold uppercase tracking-wider text-[#DFC15E] hover:text-[#E8B888] transition cursor-pointer"
              >
                <QrCode className="h-4 w-4" />
                <span>Backbar QR Poster →</span>
              </Link>
              <button
                type="button"
                onClick={() => setShowInstallGuideModal(false)}
                className="rounded-xl bg-[#DFC15E] px-4 py-2 font-athletic text-xs font-black uppercase tracking-wider text-[#121212] hover:bg-[#E8B888] transition cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Claim / Login Modal */}
      <ClaimProfileModal />

      {/* Instant Quick QR Modal */}
      {showQuickQrModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-md pt-[env(safe-area-inset-top,12px)] pb-[env(safe-area-inset-bottom,12px)] pr-[env(safe-area-inset-right,12px)] pl-[env(safe-area-inset-left,12px)]"
          role="dialog"
          aria-modal="true"
          aria-label="Backbar App QR Code"
        >
          <div className="relative w-full max-w-sm rounded-3xl border-2 border-[#B87333]/60 bg-[#14110F] p-5 sm:p-6 shadow-[0_25px_80px_rgba(0,0,0,0.95)] text-center space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <img
                  src="/brand/CopperLogo_Web.png"
                  alt="Copper Athletic Club"
                  className="h-9 w-auto object-contain"
                />
                <div className="text-left">
                  <span className="block font-mono-docket text-[10px] font-bold uppercase tracking-widest text-[#DFC15E]">
                    BACKBAR QR CODE
                  </span>
                  <h3 className="font-sans font-black text-base uppercase text-[#F5F2EB] leading-none">
                    SCAN WITH CAMERA
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickQrModal(false)}
                aria-label="Close QR modal"
                className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border border-white/15 bg-white/5 p-2 text-[#B5A99D] hover:border-[#B87333] hover:text-white cursor-pointer touch-manipulation active:scale-95"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* QR Code Container */}
            <div className="mx-auto rounded-2xl bg-white p-3 sm:p-3.5 shadow-2xl inline-block border-2 border-[#B87333]/40 max-w-full">
              {quickQrDataUrl ? (
                <img
                  src={quickQrDataUrl}
                  alt="Scan to open Copper Demerits"
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain mx-auto"
                />
              ) : (
                <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center font-mono-docket text-xs text-[#121212]">
                  Generating QR...
                </div>
              )}
            </div>

            <div>
              <p className="font-sans font-extrabold text-sm sm:text-base text-[#DFC15E]">
                copperdemerits.com
              </p>
              <p className="font-mono-docket text-xs text-[#D6C7B8] mt-1 leading-snug">
                Point any phone camera to view live scoreboard &amp; drop demerits!
              </p>
            </div>

            {/* 1-Tap Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleQuickShare}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#B87333] to-[#C86D51] py-3 px-3 min-h-[48px] font-sans font-bold text-xs uppercase tracking-tight text-[#121212] hover:brightness-110 active:scale-95 touch-manipulation cursor-pointer shadow-md"
              >
                <Share2 className="h-4 w-4 shrink-0" />
                <span>Text / Share</span>
              </button>

              <button
                type="button"
                onClick={handleQuickCopy}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/5 py-3 px-3 min-h-[48px] font-sans font-bold text-xs uppercase tracking-tight text-[#F5F2EB] hover:bg-white/10 active:scale-95 touch-manipulation cursor-pointer"
              >
                {copiedQuickLink ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span className="text-emerald-300">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 shrink-0 text-[#DFC15E]" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>

            {/* Link to Full Print / Tabletop Placard Page */}
            <div className="border-t border-white/10 pt-3">
              <Link
                to="/share"
                onClick={() => setShowQuickQrModal(false)}
                className="inline-flex items-center justify-center min-h-[44px] gap-1.5 font-sans font-bold text-xs text-[#DFC15E] hover:text-[#E8B888] underline decoration-[#DFC15E]/40 touch-manipulation active:scale-95"
              >
                <QrCode className="h-4 w-4" />
                <span>Open Printable Tabletop Placards &amp; Flyers (/share) →</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
