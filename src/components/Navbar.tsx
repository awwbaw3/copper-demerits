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

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPwa = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
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
    '⚡ CLOUDFLARE D1 + R2 EDGE BACKEND LIVE ON COPPERDEMERITS.COM',
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
            {deferredPrompt && (
              <button
                type="button"
                onClick={handleInstallPwa}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-[#B87333] bg-[#B87333]/20 px-3 py-1.5 font-athletic text-xs font-bold uppercase tracking-wider text-[#E8B888] transition hover:bg-[#B87333] hover:text-[#121212] cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Install App</span>
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

      {/* Claim / Login Modal */}
      <ClaimProfileModal />
    </>
  );
};
