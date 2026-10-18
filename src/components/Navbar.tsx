import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
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
} from 'lucide-react';
import { useDemerits } from '../context/DemeritsContext';
import { ClaimProfileModal } from './ClaimProfileModal';
import { MichiganTeamBadge, TeamBadgeMeta } from './MichiganSportsGraphics';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const Navbar: React.FC = () => {
  const { demerits, currentMember, setIsProfileModalOpen } = useDemerits();
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

  const approvedSlips = demerits.filter((d) => d.status === 'approved' && Boolean(d.image_url));
  const totalDemeritPoints = approvedSlips.reduce((sum, s) => sum + s.demerit_count, 0);
  const pendingCount = demerits.filter((d) => d.status === 'pending').length;

  const navItems = [
    { to: '/', label: 'Scoreboard', icon: Trophy },
    { to: '/docket', label: 'Wall of Slips', icon: FileText },
    { to: '/submit', label: 'Drop A Slip', icon: Camera, highlight: true },
    { to: '/admin', label: 'Ref Booth', icon: ShieldAlert, badge: pendingCount },
  ];

  const tickerItems = [
    '🦌 COPPER ATHLETIC CLUB • MARSHALL, MI',
    '🍻 "A SPORTS BAR. NOT A GYM."',
    '🚨 HEAD REFEREE SARAH ("THE BOSS / BOSS LADY") IS 4-FOR-4 ON SLIPS ISSUED',
    '🏆 CO-LEADERS: RICK (3 PTS) & BURTIS (3 PTS)',
    '🏀 BAD BOYS TECH: DAVID LEE LOGGED AT 6:27 PM ("1 - SO FAR")',
    '🐙 RED WINGS PENALTY BOX: BURTIS CITED FOR NO-CALL / NO-SHOW',
    '🦁 LIONS COUNTRY: RICK CITED FOR TOO MANY SEAT MOVES + GIN & DIET COKE + THE HEADBAND',
    '⚡ RING OF HONOR LIVE LEADERBOARD • COPPERDEMERITS.COM',
  ];

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#B87333]/35 bg-[#0F0D0C]/95 backdrop-blur-md">
        {/* Animated ESPN / Fox Sports Detroit Style Ticker */}
        <div className="overflow-hidden border-b border-[#B87333]/25 bg-gradient-to-r from-[#1A120E] via-[#281A12] to-[#1A120E] py-1.5">
          <div className="animate-ticker flex items-center gap-8 text-[11px] font-mono-docket uppercase tracking-wider text-[#E8B888]">
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
          <NavLink to="/" className="group flex items-center gap-3">
            <img
              src="/brand/CopperLogo_Web.png"
              alt="Copper Athletic Club"
              className="h-10 sm:h-12 w-auto object-contain drop-shadow-[0_0_12px_rgba(184,115,51,0.4)] transition-transform duration-300 group-hover:scale-105"
            />
            <div className="border-l border-[#B87333]/35 pl-3">
              <span className="block font-athletic text-base sm:text-xl font-black tracking-wider uppercase text-[#F5F2EB] leading-none">
                RING OF <span className="text-[#B87333]">DEMERITS</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono-docket text-[10px] tracking-widest uppercase text-[#DFC15E] mt-0.5">
                <Flame className="h-3 w-3 text-[#C86D51]" />
                {totalDemeritPoints} PTS · {approvedSlips.length} SLIPS
              </span>
            </div>
          </NavLink>

          <div className="flex items-center gap-2">
            {!isStandalone && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#DFC15E] bg-gradient-to-r from-[#DFC15E] via-[#E8B888] to-[#B87333] px-2.5 sm:px-3 py-1.5 font-athletic text-xs font-black uppercase tracking-wider text-[#121212] shadow-[0_0_18px_rgba(223,193,94,0.45)] transition hover:brightness-110 active:scale-95 cursor-pointer animate-pulse"
                title="Install Copper Demerits App on Home Screen"
              >
                <Download className="h-3.5 w-3.5 stroke-[2.5]" />
                <span className="hidden xs:inline">Install App</span>
                <span className="xs:hidden">Install</span>
              </button>
            )}

            {/* Desktop Nav Links */}
            <nav className="hidden md:flex items-center gap-1.5">
              {navItems.map(({ to, label, icon: Icon, highlight, badge }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-athletic uppercase tracking-wider transition-all ${
                      highlight
                        ? isActive
                          ? 'bg-[#B87333] text-[#121212] font-bold shadow-[0_0_18px_rgba(184,115,51,0.5)] scale-105'
                          : 'border border-[#B87333]/60 bg-[#B87333]/20 text-[#E8B888] hover:bg-[#B87333] hover:text-[#121212] hover:scale-105'
                        : isActive
                        ? 'bg-white/10 text-[#F5F2EB] border border-[#B87333]/50 font-semibold'
                        : 'text-[#B5A99D] hover:bg-white/5 hover:text-[#F5F2EB]'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                  {typeof badge === 'number' && badge > 0 && (
                    <span className="ml-1 rounded-full bg-[#C86D51] px-1.5 py-0.2 text-[10px] font-mono-docket font-bold text-[#121212]">
                      {badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>

            {/* Claim / Login Bar Locker Pass Pill */}
            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 font-athletic text-xs sm:text-sm font-bold uppercase tracking-wider transition cursor-pointer ${
                currentMember
                  ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-200 hover:border-emerald-400'
                  : 'border-[#DFC15E]/50 bg-[#DFC15E]/15 text-[#DFC15E] hover:bg-[#DFC15E] hover:text-[#121212]'
              }`}
            >
              {currentMember ? (
                <>
                  <MichiganTeamBadge
                    iconType={
                      (currentMember.favorite_team as TeamBadgeMeta['iconType']) || 'lions'
                    }
                    size="sm"
                  />
                  <span className="max-w-[95px] truncate">{currentMember.display_name}</span>
                  <UserCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                </>
              ) : (
                <>
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Claim / Sign In</span>
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
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#DFC15E]/20 text-[#DFC15E] border border-[#DFC15E]/40">
                  <Smartphone className="h-4 w-4" />
                </div>
                <div className="min-w-0 text-xs">
                  <span className="block font-athletic font-bold uppercase tracking-wider text-[#DFC15E]">
                    Get The Official Backbar App
                  </span>
                  <p className="truncate text-[11px] text-[#E8B888]/80 font-mono-docket">
                    Install on your Home Screen for instant 1-tap live scoreboard &amp; demerit alerts.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="rounded-lg bg-[#DFC15E] px-3 py-1 text-xs font-athletic font-black uppercase tracking-wider text-[#121212] hover:bg-[#E8B888] shadow-[0_0_12px_rgba(223,193,94,0.4)] transition cursor-pointer"
                >
                  Install Now
                </button>
                <button
                  type="button"
                  onClick={handleDismissBanner}
                  className="rounded-md p-1 text-[#B5A99D] hover:bg-white/10 hover:text-[#F5F2EB] transition cursor-pointer"
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
        className="fixed bottom-0 inset-x-0 z-40 grid grid-cols-4 border-t border-[#B87333]/30 bg-[#14110F]/95 backdrop-blur-lg pb-[env(safe-area-inset-bottom)] md:hidden shadow-[0_-8px_25px_rgba(0,0,0,0.7)]"
      >
        {navItems.map(({ to, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] text-[11px] font-athletic uppercase tracking-wider transition-colors ${
                isActive
                  ? 'text-[#B87333] bg-[#B87333]/15 font-bold'
                  : 'text-[#9E8F82] active:bg-white/5'
              }`
            }
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
            {typeof badge === 'number' && badge > 0 && (
              <span className="absolute top-1.5 right-5 rounded-full bg-[#C86D51] px-1.5 text-[9px] font-bold text-[#121212]">
                {badge}
              </span>
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

            <div className="mt-5 pt-3 border-t border-[#B87333]/30 flex justify-end">
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
    </>
  );
};
