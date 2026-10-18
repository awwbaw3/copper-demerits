import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Trophy, FileText, Camera, ShieldAlert, Flame, Download } from 'lucide-react';
import { useDemerits } from '../context/DemeritsContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const Navbar: React.FC = () => {
  const { demerits } = useDemerits();
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
    { to: '/', label: 'Standings', icon: Trophy },
    { to: '/docket', label: 'The Docket', icon: FileText },
    { to: '/submit', label: 'Log Slip', icon: Camera, highlight: true },
    { to: '/admin', label: 'Admin', icon: ShieldAlert, badge: pendingCount },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#B87333]/30 bg-[#121212]/95 backdrop-blur-md">
        {/* Top Club Status Strip */}
        <div className="border-b border-white/5 bg-gradient-to-r from-[#1A1412] via-[#261B15] to-[#1A1412] px-3 sm:px-4 py-1.5">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 text-[10px] sm:text-[11px] font-mono-docket uppercase tracking-wider text-[#D6C7B8]">
            <div className="flex items-center gap-2 truncate">
              <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-[#B87333]" />
              <span className="font-bold text-[#B87333]">COPPER ATHLETIC CLUB</span>
              <span className="hidden sm:inline text-white/25">·</span>
              <span className="hidden sm:inline text-[#A3968A]">RING OF HONOR</span>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="flex items-center gap-1 text-[#E08A4E]">
                <Flame className="h-3 w-3 text-[#C86D51]" />
                {totalDemeritPoints} PTS
              </span>
              <span className="text-white/20">·</span>
              <span className="text-[#A3968A]">
                {approvedSlips.length} UNIQUE SLIPS (4 CAPTURES)
              </span>
            </div>
          </div>
        </div>

        {/* Main Header */}
        <div className="mx-auto flex max-w-6xl items-center justify-between px-3 sm:px-4 py-3">
          <NavLink to="/" className="group flex items-center gap-3">
            <div className="relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl border-2 border-[#B87333] bg-gradient-to-br from-[#B87333]/30 via-[#1D1714] to-[#121212] shadow-[0_0_16px_rgba(184,115,51,0.25)]">
              <span className="font-display-tall text-xl sm:text-2xl font-bold tracking-wider text-[#F5F2EB]">
                CAC
              </span>
            </div>
            <div>
              <span className="block font-athletic text-lg sm:text-2xl font-bold tracking-wider uppercase text-[#F5F2EB] leading-none">
                COPPER <span className="text-[#B87333]">DEMERITS</span>
              </span>
              <span className="block font-mono-docket text-[10px] tracking-widest uppercase text-[#9E8F82] mt-0.5">
                Ring of Honor PWA
              </span>
            </div>
          </NavLink>

          <div className="flex items-center gap-2">
            {deferredPrompt && (
              <button
                type="button"
                onClick={handleInstallPwa}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#B87333] bg-[#B87333]/20 px-3 py-1.5 font-athletic text-xs font-bold uppercase tracking-wider text-[#E8B888] transition hover:bg-[#B87333] hover:text-[#121212]"
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
                    `relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-athletic uppercase tracking-wider transition-all ${
                      highlight
                        ? isActive
                          ? 'bg-[#B87333] text-[#121212] font-bold shadow-[0_0_18px_rgba(184,115,51,0.5)]'
                          : 'border border-[#B87333]/60 bg-[#B87333]/15 text-[#E8B888] hover:bg-[#B87333] hover:text-[#121212]'
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
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Navigation Bar (PWA Thumb Zone) */}
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
    </>
  );
};
