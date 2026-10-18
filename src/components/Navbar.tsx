import React from 'react';
import { NavLink } from 'react-router-dom';
import { Trophy, FileText, Camera, ShieldAlert, Flame } from 'lucide-react';
import { useDemerits } from '../context/DemeritsContext';

export const Navbar: React.FC = () => {
  const { demerits } = useDemerits();

  const approvedSlips = demerits.filter((d) => d.status === 'approved');
  const totalDemeritPoints = approvedSlips.reduce((sum, s) => sum + s.demerit_count, 0);
  const pendingCount = demerits.filter((d) => d.status === 'pending').length;

  const navItems = [
    { to: '/', label: 'Leaderboard', icon: Trophy },
    { to: '/docket', label: 'The Docket', icon: FileText },
    { to: '/submit', label: 'Ring of Honor', icon: Camera, highlight: true },
    { to: '/admin', label: 'Moderation', icon: ShieldAlert, badge: pendingCount },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[#B87333]/30 bg-[#121212]/95 backdrop-blur-md">
      {/* Top Club Banner */}
      <div className="border-b border-white/5 bg-gradient-to-r from-[#1A1412] via-[#261B15] to-[#1A1412] px-4 py-1.5">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 text-[11px] font-medium tracking-wider uppercase text-[#D6C7B8]">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-[#B87333] animate-pulse" />
            <span className="font-mono-docket text-[#B87333] font-bold">COPPER ATHLETIC CLUB</span>
            <span className="hidden sm:inline text-white/30">|</span>
            <span className="hidden sm:inline text-[#A3968A]">
              MARSHALL, MI · &ldquo;A SPORTS BAR. NOT A GYM.&rdquo;
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono-docket">
            <span className="flex items-center gap-1 text-[#E08A4E]">
              <Flame className="h-3.5 w-3.5 text-[#C86D51]" />
              {totalDemeritPoints} DEMERITS ON THE BOARD
            </span>
            <span className="text-white/20">·</span>
            <span className="text-[#A3968A]">{approvedSlips.length} OFFICIAL SLIPS</span>
          </div>
        </div>
      </div>

      {/* Main Nav */}
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
        <NavLink to="/" className="group flex items-center gap-3.5">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-lg border-2 border-[#B87333] bg-gradient-to-br from-[#B87333]/30 via-[#1D1714] to-[#121212] shadow-[0_0_20px_rgba(184,115,51,0.25)] transition-transform group-hover:scale-105">
            <span className="font-display-tall text-2xl font-bold tracking-wider text-[#F5F2EB]">
              CAC
            </span>
            <span className="absolute -bottom-1 -right-1 rounded bg-[#C86D51] px-1 text-[9px] font-bold uppercase leading-tight text-[#121212]">
              ROH
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-athletic text-xl sm:text-2xl font-bold tracking-wider uppercase text-[#F5F2EB]">
                COPPER <span className="text-[#B87333]">DEMERITS</span>
              </span>
            </div>
            <p className="text-[11px] font-mono-docket tracking-widest uppercase text-[#9E8F82]">
              Official Ring of Honor Ledger
            </p>
          </div>
        </NavLink>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1.5">
          {navItems.map(({ to, label, icon: Icon, highlight, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-athletic uppercase tracking-wider transition-all ${
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

      {/* Mobile Navigation Bar */}
      <nav className="grid grid-cols-4 border-t border-white/10 bg-[#161311] md:hidden">
        {navItems.map(({ to, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-athletic uppercase tracking-wider transition-colors ${
                isActive
                  ? 'text-[#B87333] bg-[#B87333]/10 border-t-2 border-[#B87333]'
                  : 'text-[#9E8F82] hover:text-[#F5F2EB]'
              }`
            }
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
            {typeof badge === 'number' && badge > 0 && (
              <span className="absolute top-1.5 right-4 rounded-full bg-[#C86D51] px-1.5 text-[9px] font-bold text-[#121212]">
                {badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </header>
  );
};
