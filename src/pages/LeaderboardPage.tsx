import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  Flame,
  Camera,
  Calendar,
  Award,
  Eye,
  X,
  QrCode,
} from 'lucide-react';
import { useDemerits } from '../context/DemeritsContext';
import {
  EnrichedDemeritSlip,
  Member,
  PeriodMode,
} from '../types/demerits';
import { SlipModalViewer } from '../components/SlipModalViewer';
import {
  MichiganTeamEmblem,
  CopperMugMeter,
  DetroitSportsBannerStrip,
  getMichiganTeamMetaForType,
} from '../components/MichiganSportsGraphics';
import { normalizeSlipDemeritItems } from '../lib/defaultData';
import { PwaHelpIcon } from '../components/PwaTooltip';

function memberRecordTagline(members: Member[], memberId: string | null, fallback: string): string {
  if (!memberId) return fallback;
  const found = members.find((m) => m.id === memberId);
  if (found?.tagline && found.tagline.trim()) {
    return `"${found.tagline.trim().toUpperCase()}"`;
  }
  return fallback;
}

export const LeaderboardPage: React.FC = () => {
  const { computeStandings, loading, members, currentMember, setIsProfileModalOpen } = useDemerits();

  const [periodKey, setPeriodKey] = useState<PeriodMode>('all-time');
  const [customStartDate, setCustomStartDate] = useState<string>('2026-10-01');
  const [customEndDate, setCustomEndDate] = useState<string>('2026-10-31');
  const [selectedDemeritType, setSelectedDemeritType] = useState<string | null>(null);
  const [activeSlipModal, setActiveSlipModal] = useState<EnrichedDemeritSlip | null>(null);

  const { patronStandings, typeSummaries, periodSlips } = computeStandings({
    mode: periodKey,
    startDate: periodKey === 'custom' ? customStartDate : undefined,
    endDate: periodKey === 'custom' ? customEndDate : undefined,
    demeritType: selectedDemeritType,
  });

  // Compute total points per demerit type across the selected period
  const typeCounts: Record<string, number> = {};
  for (const t of typeSummaries) {
    typeCounts[t.type] = t.totalPoints;
  }

  const totalPeriodPoints = periodSlips.reduce((sum, s) => sum + s.demerit_count, 0);
  const activeRankings = patronStandings.filter((p) => p.totalDemerits > 0 || !selectedDemeritType);

  const periodOptions: { key: PeriodMode; label: string }[] = [
    { key: 'all-time', label: 'All-Time' },
    { key: 'this-month', label: 'This Month' },
    { key: 'this-week', label: 'This Week' },
    { key: 'today', label: 'Today' },
    { key: 'custom', label: 'Custom Dates' },
  ];

  const getPlayerTheme = (name: string, index: number) => {
    const lower = name.toLowerCase();
    if (lower.includes('rick')) {
      return {
        teamTag: 'LIONS / WOLVERINES / TIGERS TRIFECTA',
        nickname: '"THE SEAT-HOPPING HEADBAND"',
        cardBg: 'from-[#00274C]/65 via-[#1B1613] to-[#121212]',
        border: 'border-[#FFCB05]/60 shadow-[0_0_30px_rgba(255,203,5,0.2)]',
        badgeBg: 'bg-[#FFCB05] text-[#00274C]',
        rankIcon: '👑 CO-#1 LEADER',
      };
    }
    if (lower.includes('burtis')) {
      return {
        teamTag: 'RED WINGS BOX + BAD BOYS DOUBLE TECH',
        nickname: '"NO-SHOW & UNBOTHERED"',
        cardBg: 'from-[#CE1126]/55 via-[#1B1613] to-[#121212]',
        border: 'border-[#CE1126]/65 shadow-[0_0_30px_rgba(206,17,38,0.25)]',
        badgeBg: 'bg-[#CE1126] text-white',
        rankIcon: '🚨 CO-#1 LEADER',
      };
    }
    if (lower.includes('david')) {
      return {
        teamTag: 'DETROIT BAD BOYS TECHNICAL FOUL',
        nickname: '"1 DEMERIT — SO FAR"',
        cardBg: 'from-[#1D42BA]/55 via-[#1B1613] to-[#121212]',
        border: 'border-[#3B82F6]/60 shadow-[0_0_25px_rgba(29,66,186,0.25)]',
        badgeBg: 'bg-[#1D42BA] text-white',
        rankIcon: `#${index + 1} IN THE BOX`,
      };
    }
    return {
      teamTag: 'MARSHALL SPORTS LOUNGE ROSTER',
      nickname: '"CLEAN SHEET"',
      cardBg: 'from-[#18453B]/45 via-[#1B1613] to-[#121212]',
      border: 'border-[#B87333]/35',
      badgeBg: 'bg-[#B87333] text-[#121212]',
      rankIcon: `#${index + 1}`,
    };
  };

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 pt-4 sm:pt-6 pb-14 space-y-8">
      {/* 1. HERO SCOREBOARD BANNER — Matches copperac.com Memorabilia Brick Wall */}
      <section className="relative overflow-hidden rounded-3xl border-2 border-[#B87333]/50 bg-[#121212] shadow-[0_20px_60px_rgba(0,0,0,0.85)]">
        {/* Authentic Copper Athletic Club Brick Memorabilia Wall Background */}
        <div className="absolute inset-0">
          <img
            src="/brand/CAC_Homepage_Wall.jpg"
            alt="Copper Athletic Club Detroit Memorabilia Wall"
            className="h-full w-full object-cover object-center opacity-30 scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/80 to-[#121212]/55" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#121212]/90 via-transparent to-[#121212]/90" />
        </div>

        <div className="relative z-10 p-5 sm:p-8">
          {/* Top Brand + Jumbotron Header */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-5">
              <div className="relative shrink-0 rounded-2xl border-2 border-[#B87333]/60 bg-[#0E0C0B]/90 p-3.5 shadow-[0_0_30px_rgba(184,115,51,0.35)] animate-float-badge">
                <img
                  src="/brand/CopperLogo_Web.png"
                  alt="Copper Athletic Club Logo"
                  className="h-16 sm:h-20 w-auto object-contain"
                />
              </div>
              <div>
                <h1 className="font-display-tall text-4xl sm:text-6xl font-black uppercase tracking-wider text-[#F5F2EB] leading-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
                  THE PENALTY <span className="text-[#B87333]">BOX</span>
                </h1>
              </div>
            </div>

            {/* Big Glowing Jumbotron Score Counter - Responsive Mobile Grid */}
            <div className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 rounded-2xl border-2 border-[#B87333]/50 bg-[#0D0B0A]/95 p-3 sm:px-6 sm:py-3.5 shadow-[inset_0_0_25px_rgba(184,115,51,0.2)]">
              {/* Score Digits (2 columns on mobile) */}
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-4">
                <div className="text-center px-2 py-2 sm:py-0 rounded-xl bg-white/5 sm:bg-transparent">
                  <span className="block font-display-tall text-4xl sm:text-5xl font-black text-[#E8B888] leading-none">
                    {totalPeriodPoints}
                  </span>
                  <span className="text-[10px] font-mono-docket uppercase tracking-widest text-[#D6C7B8]">
                    DEMERIT PTS
                  </span>
                </div>
                <div className="hidden sm:block h-10 w-px bg-[#B87333]/30" />
                <div className="text-center px-2 py-2 sm:py-0 rounded-xl bg-white/5 sm:bg-transparent">
                  <span className="block font-display-tall text-4xl sm:text-5xl font-black text-[#F5F2EB] leading-none">
                    {periodSlips.length}
                  </span>
                  <span className="text-[10px] font-mono-docket uppercase tracking-widest text-[#D6C7B8]">
                    SLIPS ON WALL
                  </span>
                </div>
              </div>

              <div className="hidden sm:block h-10 w-px bg-[#B87333]/30" />

              {/* Action Buttons (2 columns on mobile, min-h-[48px] touch targets) */}
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
                <Link
                  to="/submit"
                  className="group flex flex-col items-center justify-center min-h-[48px] rounded-xl bg-gradient-to-b from-[#E08A4E] to-[#B87333] px-3 sm:px-4 py-2 text-[#121212] font-sans font-black uppercase tracking-tight shadow-[0_0_20px_rgba(184,115,51,0.5)] active:scale-95 touch-manipulation transition"
                >
                  <Camera className="h-5 w-5 mb-0.5" />
                  <span className="text-xs leading-none">ADD DEMERIT</span>
                </Link>
                <div className="hidden sm:block h-10 w-px bg-[#B87333]/30" />
                <Link
                  to="/share"
                  className="group flex flex-col items-center justify-center min-h-[48px] rounded-xl border border-[#DFC15E]/60 bg-[#DFC15E]/15 px-3 py-2 text-[#DFC15E] font-sans font-extrabold uppercase tracking-tight hover:bg-[#DFC15E] hover:text-[#121212] active:scale-95 touch-manipulation transition"
                  title="Share Scoreboard & Backbar QR Code"
                >
                  <QrCode className="h-5 w-5 mb-0.5" />
                  <span className="text-xs leading-none">SHARE QR</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Period Selector Pills */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 mr-1 text-xs font-sans font-bold uppercase tracking-wider text-[#DFC15E]">
                <Calendar className="h-4 w-4" />
                Season / Period:
              </span>
              <PwaHelpIcon
                tag="OFFLINE READY"
                content="Standings for all periods are cached locally in your browser so you can switch dates instantly without waiting."
              />
              <div className="flex flex-wrap items-center gap-1.5">
                {periodOptions.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setPeriodKey(opt.key)}
                    className={`rounded-xl px-3.5 py-2 min-h-[44px] font-sans text-xs font-bold uppercase tracking-tight transition-all cursor-pointer touch-manipulation active:scale-95 ${
                      periodKey === opt.key
                        ? 'bg-[#B87333] text-[#121212] font-black shadow-[0_0_15px_rgba(184,115,51,0.5)] scale-105'
                        : 'bg-white/5 text-[#D6C7B8] border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {selectedDemeritType && (
              <button
                type="button"
                onClick={() => setSelectedDemeritType(null)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E8B888] bg-[#B87333]/25 px-3.5 py-2 min-h-[44px] text-xs font-mono-docket text-[#E8B888] hover:bg-[#B87333]/40 cursor-pointer touch-manipulation active:scale-95"
              >
                <span>Filter: {selectedDemeritType}</span>
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {periodKey === 'custom' && (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-[#B87333]/30 bg-black/50 p-3 sm:p-4">
              <label className="flex items-center gap-2 text-xs font-mono-docket text-[#D6C7B8]">
                <span>FROM:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="rounded-xl border border-[#B87333]/40 bg-[#181412] px-3 py-2 min-h-[44px] text-base sm:text-xs text-white"
                />
              </label>
              <label className="flex items-center gap-2 text-xs font-mono-docket text-[#D6C7B8]">
                <span>TO:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="rounded-xl border border-[#B87333]/40 bg-[#181412] px-3 py-2 min-h-[44px] text-base sm:text-xs text-white"
                />
              </label>
            </div>
          )}
        </div>
      </section>

      {/* 2. INDIVIDUAL LEADERBOARD — SHOWCASED AT THE TOP */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Trophy className="h-6 w-6 text-[#DFC15E]" />
            <h2 className="font-display-tall text-3xl sm:text-4xl uppercase tracking-wider text-[#F5F2EB]">
              INDIVIDUAL <span className="text-[#B87333]">LEADERBOARD</span>
            </h2>
            <span className="hidden sm:inline-block rounded-full bg-[#B87333]/20 border border-[#B87333]/40 px-2.5 py-0.5 font-mono-docket text-[10px] font-bold uppercase text-[#DFC15E]">
              RING OF HONOR
            </span>
          </div>
          <span className="text-xs font-mono-docket uppercase text-[#9E8F82]">
            Tap any slip or badge to inspect photo
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-72 rounded-3xl border border-white/10 bg-[#1A1614] animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {activeRankings.map((patron, idx) => {
              const theme = getPlayerTheme(patron.displayName, idx);
              const allItems = patron.slips.flatMap((s) =>
                normalizeSlipDemeritItems(s).map((item) => ({
                  ...item,
                  slip: s,
                }))
              );

              return (
                <div
                  key={patron.memberId}
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border-2 bg-gradient-to-b ${theme.cardBg} ${theme.border} p-5 transition-all duration-300 hover:-translate-y-1.5`}
                >
                  {/* Top Rank Ribbon + Big Score */}
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-block rounded-lg px-2.5 py-0.5 font-athletic text-xs font-black uppercase tracking-wider ${theme.badgeBg}`}
                          >
                            {theme.rankIcon}
                          </span>
                          {(() => {
                            const memberRecord = members.find((m) => m.id === patron.memberId);
                            const isMe = currentMember?.id === patron.memberId;
                            return (
                              <button
                                type="button"
                                onClick={() => setIsProfileModalOpen(true)}
                                className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 min-h-[40px] font-sans text-xs font-bold uppercase transition cursor-pointer touch-manipulation active:scale-95 ${
                                  isMe
                                    ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                                    : memberRecord?.is_claimed
                                    ? 'border-white/20 bg-black/50 text-[#D6C7B8] hover:border-[#B87333]'
                                    : 'border-[#DFC15E]/60 bg-[#DFC15E]/15 text-[#DFC15E] hover:bg-[#DFC15E] hover:text-[#121212]'
                                }`}
                              >
                                {isMe
                                  ? '✓ YOUR CARD'
                                  : memberRecord?.is_claimed
                                  ? '🔒 CLAIMED'
                                  : '⚡ CLAIM PROFILE'}
                              </button>
                            );
                          })()}
                        </div>
                        <h3 className="mt-2 font-display-tall text-4xl sm:text-5xl font-black uppercase tracking-wider text-[#F5F2EB] leading-none">
                          {patron.displayName}
                        </h3>
                        <p className="font-mono-docket text-xs font-bold text-[#DFC15E] mt-0.5">
                          {memberRecordTagline(members, patron.memberId, theme.nickname)}
                        </p>
                      </div>

                      {/* Jumbotron Digit Box */}
                      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-[#B87333]/60 bg-[#0D0B0A]/90 px-4 py-2.5 shadow-inner">
                        <span className="font-display-tall text-5xl font-black leading-none text-[#E8B888]">
                          {patron.totalDemerits}
                        </span>
                        <span className="text-[9px] font-mono-docket uppercase tracking-widest text-[#D6C7B8]">
                          DEMERITS
                        </span>
                      </div>
                    </div>

                    {/* Visual Copper Moscow Mule Mug Counter */}
                    <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-3.5 py-2.5">
                      <CopperMugMeter points={patron.totalDemerits} maxPoints={4} />
                      <div className="text-right font-mono-docket text-[10px] text-[#D6C7B8]">
                        <div>{patron.slipCount} SLIP{patron.slipCount === 1 ? '' : 'S'}</div>
                        <div className="text-[#E8B888] font-bold">{patron.offenseCount} FOUL TYPES</div>
                      </div>
                    </div>

                    {/* Graphical Team Penalty Badges */}
                    <div className="mt-4 space-y-2">
                      {allItems.map((item, i) => {
                        const meta = getMichiganTeamMetaForType(item.type, item.description);
                        return (
                          <button
                            key={`${item.slip.id}-${i}`}
                            type="button"
                            onClick={() => setActiveSlipModal(item.slip)}
                            className={`w-full flex items-center justify-between gap-2.5 rounded-2xl border bg-gradient-to-r ${meta.bgGradient} ${meta.borderGlow} p-2.5 min-h-[48px] text-left transition hover:scale-[1.02] active:scale-98 touch-manipulation cursor-pointer`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <MichiganTeamEmblem iconType={meta.iconType} size="sm" />
                              <div className="min-w-0">
                                <span className="block font-sans text-xs font-black uppercase tracking-wider text-[#E8B888] truncate">
                                  {meta.shortTitle}
                                </span>
                                <span className="block font-handwriting text-base text-[#F5F2EB] leading-tight truncate">
                                  “{item.description}”
                                </span>
                              </div>
                            </div>
                            <span className="shrink-0 rounded-xl bg-black/60 border border-white/15 px-2.5 py-1 font-display-tall text-xl font-black text-[#DFC15E]">
                              +{item.points}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Physical Slip Photo Strip */}
                  <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {patron.slips.map((slip) => (
                        <button
                          key={slip.id}
                          type="button"
                          onClick={() => setActiveSlipModal(slip)}
                          className="group/thumb relative h-12 w-16 min-h-[44px] overflow-hidden rounded-xl border border-[#B87333]/60 bg-black shadow hover:scale-110 active:scale-95 touch-manipulation transition cursor-pointer"
                          aria-label={`View ${patron.displayName}'s ${slip.incident_time || ''} slip`}
                          title={`View ${patron.displayName}'s ${slip.incident_time || ''} slip`}
                        >
                          <img
                            src={slip.image_url || '/slips/20261017_211324.jpg'}
                            alt={slip.patronDisplayName || slip.raw_student}
                            className="h-full w-full object-cover"
                          />
                          <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[9px] font-mono-docket text-center text-[#E8B888]">
                            {slip.incident_time?.slice(0, 5) || 'SLIP'}
                          </span>
                        </button>
                      ))}
                    </div>
                    {patron.slips[0] && (
                      <button
                        type="button"
                        onClick={() => setActiveSlipModal(patron.slips[0])}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#B87333]/50 bg-[#B87333]/15 px-3.5 py-2 min-h-[44px] font-sans font-bold text-xs uppercase tracking-tight text-[#E8B888] hover:bg-[#B87333] hover:text-[#121212] active:scale-95 touch-manipulation transition cursor-pointer"
                      >
                        <Eye className="h-4 w-4" />
                        <span>Inspect Slip</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. DEMERIT CATEGORIES & MICHIGAN SPORTS TEAMS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-athletic text-base sm:text-lg font-bold uppercase tracking-wider text-[#F5F2EB]">
            DEMERIT CATEGORIES &amp; TEAM FOULS
          </span>
          <span className="text-xs font-mono-docket text-[#9E8F82]">
            Tap any category to filter standings
          </span>
        </div>
        <DetroitSportsBannerStrip
          activeFilter={selectedDemeritType}
          onSelectType={setSelectedDemeritType}
          typeCounts={typeCounts}
        />
      </section>

      {/* 4. HEAD REFEREE SPOTLIGHT — SARAH ("THE BOSS / BOSS LADY") + DETROIT LIONS HELMET BACKBAR */}
      <section className="relative overflow-hidden rounded-3xl border-2 border-[#DFC15E]/50 bg-[#14110F] shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
          {/* Actual Copper Athletic Club Backbar Photo (Detroit Lions Helmet + Copper Mugs) */}
          <div className="relative h-64 lg:h-full lg:col-span-5 overflow-hidden">
            <img
              src="/brand/CAC_Homepage_About.jpg"
              alt="Detroit Lions Helmet & Copper Mugs at Copper Athletic Club"
              className="h-full w-full object-cover object-center transition-transform duration-700 hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-transparent via-[#14110F]/40 to-[#14110F]" />
          </div>

          {/* Referee Stats & Signature Stamps */}
          <div className="p-5 sm:p-7 lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DFC15E]/20 border border-[#DFC15E]/50 px-3 py-0.5 text-[11px] font-mono-docket font-bold uppercase tracking-wider text-[#DFC15E]">
                  <Award className="h-3.5 w-3.5" />
                  HEAD REFEREE OF THE HOUSE • 100% OF CITATIONS
                </span>
                <h2 className="mt-1.5 font-display-tall text-3xl sm:text-5xl font-black uppercase tracking-wider text-[#F5F2EB] leading-none">
                  SARAH <span className="text-[#B87333]">“THE BOSS LADY”</span>
                </h2>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-[#DFC15E]/40 bg-black/50 px-4 py-2">
                <div className="text-center">
                  <span className="block font-display-tall text-3xl font-black text-[#DFC15E] leading-none">
                    4 / 4
                  </span>
                  <span className="text-[9px] font-mono-docket uppercase text-[#A3968A]">
                    SLIPS ISSUED
                  </span>
                </div>
                <div className="h-8 w-px bg-white/15" />
                <div className="text-center">
                  <span className="block font-display-tall text-3xl font-black text-[#E8B888] leading-none">
                    7 PTS
                  </span>
                  <span className="text-[9px] font-mono-docket uppercase text-[#A3968A]">
                    HANDED OUT
                  </span>
                </div>
              </div>
            </div>

            {/* Sarah's 4 Official Handwritten Signature Stamps */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              {[
                { sig: '“The Boss Lady”', victim: 'David Lee (6:27 PM)', pts: '+1 PT' },
                { sig: '“YOUR BOSS!”', victim: 'Burtis (8:50 PM)', pts: '+1 PT' },
                { sig: '“Cursive Signature”', victim: 'Burtis (8:56 PM)', pts: '+2 PTS' },
                { sig: '“The Boss - AKA Sarah”', victim: 'Rick (9:09 PM)', pts: '+3 PTS' },
              ].map((stamp, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-[#B87333]/40 bg-[#1C1613]/90 p-3 text-center shadow-inner hover:border-[#DFC15E] transition"
                >
                  <span className="inline-block rounded bg-[#B87333]/25 px-1.5 py-0.5 font-mono-docket text-[9px] font-bold text-[#E8B888]">
                    {stamp.pts}
                  </span>
                  <p className="mt-1 font-handwriting text-lg font-bold text-[#DFC15E] leading-tight">
                    {stamp.sig}
                  </p>
                  <p className="mt-0.5 font-mono-docket text-[10px] text-[#A3968A]">
                    → {stamp.victim}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. FRAMED ON THE BRICK WALL — VISUAL SLIP GALLERY */}
      <section className="relative overflow-hidden rounded-3xl border-2 border-[#B87333]/40 bg-[#121212] p-5 sm:p-7 shadow-2xl">
        {/* Subtle Brick Wall Texture */}
        <div className="absolute inset-0">
          <img
            src="/brand/CAC_Homepage_Wall.jpg"
            alt="Brick Wall"
            className="h-full w-full object-cover opacity-15"
          />
          <div className="absolute inset-0 bg-[#121212]/80" />
        </div>

        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2.5">
              <Flame className="h-6 w-6 text-[#C86D51]" />
              <h2 className="font-display-tall text-3xl sm:text-4xl uppercase tracking-wider text-[#F5F2EB]">
                FRAMED ON THE <span className="text-[#B87333]">BRICK WALL</span>
              </h2>
            </div>
            <Link
              to="/docket"
              className="rounded-xl border border-[#B87333]/50 bg-[#B87333]/15 px-3.5 py-1.5 font-athletic text-xs uppercase tracking-wider text-[#E8B888] hover:bg-[#B87333] hover:text-[#121212] transition"
            >
              Open Full Wall of Slips →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {periodSlips.map((slip, idx) => {
              const items = normalizeSlipDemeritItems(slip);
              const primaryMeta = getMichiganTeamMetaForType(
                items[0]?.type || '',
                items[0]?.description || ''
              );
              const tiltClass =
                idx % 2 === 0
                  ? 'sm:-rotate-1 hover:rotate-0'
                  : 'sm:rotate-1 hover:rotate-0';

              return (
                <div
                  key={slip.id}
                  onClick={() => setActiveSlipModal(slip)}
                  className={`group cursor-pointer rounded-2xl border-4 border-[#2A211B] bg-[#181412] p-3 shadow-[0_14px_30px_rgba(0,0,0,0.85)] transition-all duration-300 hover:scale-[1.03] hover:border-[#B87333] ${tiltClass}`}
                >
                  {/* Framed Slip Photo */}
                  <div className="relative h-48 w-full overflow-hidden rounded-xl border border-white/15 bg-black">
                    <img
                      src={slip.image_url || '/slips/20261017_211324.jpg'}
                      alt={`Demerit Slip for ${slip.patronDisplayName || slip.raw_student}`}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30" />

                    {/* Top Left Time Badge */}
                    <span className="absolute top-2.5 left-2.5 rounded-lg bg-black/80 border border-white/15 px-2 py-0.5 font-mono-docket text-[10px] font-bold text-[#DFC15E]">
                      {slip.incident_time ? slip.incident_time.slice(0, 5) : 'SLIP'}
                    </span>

                    {/* Top Right Points Stamp */}
                    <span className="absolute top-2 right-2 rounded-xl bg-[#C86D51] px-2.5 py-0.5 font-display-tall text-2xl font-black text-[#121212] shadow-lg">
                      +{slip.demerit_count}
                    </span>

                    {/* Bottom Patron Name */}
                    <div className="absolute bottom-2 left-2.5 right-2.5 flex items-end justify-between">
                      <div>
                        <span className="block font-display-tall text-2xl font-black uppercase text-white leading-none">
                          {slip.patronDisplayName}
                        </span>
                        <span className="text-[10px] font-mono-docket text-[#E8B888]">
                          {slip.location_area}
                        </span>
                      </div>
                      <MichiganTeamEmblem iconType={primaryMeta.iconType} size="sm" />
                    </div>
                  </div>

                  {/* Minimal Handwritten Quote + Signature */}
                  <div className="mt-3 space-y-1.5 px-1">
                    <p className="font-handwriting text-lg text-[#F5F2EB] leading-snug line-clamp-2">
                      “{slip.infractions.join(' • ')}”
                    </p>
                    <div className="flex items-center justify-between text-[10px] font-mono-docket text-[#9E8F82] pt-1 border-t border-white/10">
                      <span>REF: {slip.issuerDisplayName.toUpperCase()}</span>
                      <span className="text-[#DFC15E]">{slip.raw_signature}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Slip Photo Modal Viewer */}
      <SlipModalViewer slip={activeSlipModal} onClose={() => setActiveSlipModal(null)} />
    </div>
  );
};
