import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDemerits } from '../context/DemeritsContext';
import { EnrichedDemeritSlip } from '../types/demerits';
import { SlipModalViewer } from '../components/SlipModalViewer';
import {
  Trophy,
  Flame,
  Shield,
  Calendar,
  Camera,
  ChevronRight,
  AlertTriangle,
  Award,
  Scale,
  FileText,
  UserX,
} from 'lucide-react';

export const LeaderboardPage: React.FC = () => {
  const { computeStandings, demerits } = useDemerits();
  const [timeframe, setTimeframe] = useState<'all-time' | '2026-10' | '2026-09'>('all-time');
  const [selectedSlip, setSelectedSlip] = useState<EnrichedDemeritSlip | null>(null);

  const { patronStandings, anonymousStanding, enforcerStandings } = useMemo(
    () => computeStandings(timeframe === 'all-time' ? null : timeframe),
    [computeStandings, timeframe]
  );

  const filteredSlipsCount = useMemo(() => {
    return demerits.filter((s) => {
      if (s.status !== 'approved') return false;
      if (timeframe !== 'all-time') return s.incident_date.startsWith(timeframe);
      return true;
    }).length;
  }, [demerits, timeframe]);

  const totalDemeritsInPeriod = useMemo(() => {
    return (
      patronStandings.reduce((acc, p) => acc + p.totalDemerits, 0) +
      (anonymousStanding?.totalDemerits || 0)
    );
  }, [patronStandings, anonymousStanding]);

  const topEnforcer = enforcerStandings[0] || null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-10">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-[#B87333]/40 bg-gradient-to-br from-[#231914] via-[#171412] to-[#121212] p-6 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.75)]">
        <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-[#B87333]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-52 w-52 rounded-full bg-[#C86D51]/10 blur-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#B87333]/40 bg-[#B87333]/15 px-3.5 py-1 text-xs font-mono-docket uppercase tracking-widest text-[#E8B888]">
              <Trophy className="h-3.5 w-3.5 text-[#B87333]" />
              <span>COPPER ATHLETIC CLUB · RING OF HONOR</span>
            </div>

            <h1 className="font-athletic text-4xl sm:text-5xl lg:text-6xl font-extrabold uppercase tracking-tight text-[#F5F2EB] leading-[1.03]">
              THE <span className="text-[#B87333]">DEMERIT</span> STANDINGS
            </h1>

            <p className="text-sm sm:text-base text-[#C4B8AC] leading-relaxed">
              Where Marshall&rsquo;s finest patrons wear their citations like championship banners.
              Got handed a yellow slip across the bar? Log it into the Ring of Honor — staff
              signatures automatically normalize to the enforcer on duty.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/submit"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#B87333] to-[#C86D51] px-5 py-3 font-athletic text-base font-bold uppercase tracking-wider text-[#121212] shadow-[0_0_25px_rgba(184,115,51,0.45)] transition hover:brightness-110"
              >
                <Camera className="h-4 w-4" />
                <span>Log Your Slip</span>
              </Link>
              <Link
                to="/docket"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 font-athletic text-base font-semibold uppercase tracking-wider text-[#F5F2EB] transition hover:border-[#B87333] hover:bg-white/10"
              >
                <FileText className="h-4 w-4 text-[#B87333]" />
                <span>View Full Docket</span>
              </Link>
            </div>
          </div>

          {/* Summary Stat Scoreboard */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3 shrink-0">
            <div className="rounded-xl border border-[#B87333]/30 bg-[#14110F]/90 p-4 text-center">
              <span className="block font-mono-docket text-[10px] uppercase tracking-widest text-[#9E8F82]">
                TOTAL DEMERITS
              </span>
              <span className="mt-1 block font-display-tall text-4xl sm:text-5xl font-bold text-[#B87333]">
                {totalDemeritsInPeriod}
              </span>
              <span className="font-mono-docket text-[10px] text-[#7D7065]">
                {filteredSlipsCount} Verified Slips
              </span>
            </div>

            <div className="rounded-xl border border-[#C86D51]/30 bg-[#14110F]/90 p-4 text-center">
              <span className="block font-mono-docket text-[10px] uppercase tracking-widest text-[#9E8F82]">
                #1 RING LEADER
              </span>
              <span className="mt-1 block font-athletic text-2xl sm:text-3xl font-bold uppercase text-[#F5F2EB] truncate">
                {patronStandings[0]?.displayName || 'TBD'}
              </span>
              <span className="font-mono-docket text-[11px] text-[#E08A4E]">
                {patronStandings[0]?.totalDemerits || 0} Demerits (Net{' '}
                {(patronStandings[0]?.netScore ?? 0) >= 0
                  ? `+${patronStandings[0]?.netScore ?? 0}`
                  : patronStandings[0]?.netScore}
                )
              </span>
            </div>

            {topEnforcer && (
              <div className="col-span-2 sm:col-span-1 lg:col-span-2 rounded-xl border border-white/10 bg-[#14110F]/90 px-4 py-3 flex items-center justify-between gap-3">
                <div className="text-left">
                  <span className="block font-mono-docket text-[10px] uppercase tracking-widest text-[#9E8F82]">
                    TOP STAFF ENFORCER
                  </span>
                  <span className="font-athletic text-lg font-bold uppercase text-[#F5F2EB]">
                    {topEnforcer.member.display_name}
                  </span>
                </div>
                <span className="rounded-lg bg-[#C86D51]/20 border border-[#C86D51]/40 px-2.5 py-1 font-mono-docket text-xs font-bold text-[#E8B888]">
                  {topEnforcer.issuedDemerits} PTS ISSUED
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Timeframe Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="font-athletic text-2xl sm:text-3xl font-bold uppercase tracking-wide text-[#F5F2EB] flex items-center gap-2.5">
            <Flame className="h-6 w-6 text-[#B87333]" />
            <span>PATRON RING OF HONOR STANDINGS</span>
          </h2>
          <p className="text-xs font-mono-docket text-[#9E8F82]">
            Net Score = Demerits Received (&ldquo;Patron Heat&rdquo;) minus Demerits Issued as Staff
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-[#B87333]/30 bg-[#1A1614] p-1 self-start sm:self-auto">
          {[
            { id: 'all-time', label: 'All-Time Standings' },
            { id: '2026-10', label: 'Oct 2026 (Current Month)' },
            { id: '2026-09', label: 'Sep 2026' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTimeframe(tab.id as typeof timeframe)}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-athletic uppercase tracking-wider transition ${
                timeframe === tab.id
                  ? 'bg-[#B87333] text-[#121212] font-bold shadow'
                  : 'text-[#B5A99D] hover:text-white'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Patron Standings Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {patronStandings.map((patron, index) => {
          const rank = index + 1;
          const isLeader = rank === 1 && patron.totalDemerits > 0;

          return (
            <div
              key={patron.memberId || patron.displayName}
              className={`group relative flex flex-col justify-between rounded-2xl border p-6 transition-all ${
                isLeader
                  ? 'border-[#B87333] bg-gradient-to-b from-[#251C16] to-[#171412] shadow-[0_12px_40px_rgba(184,115,51,0.2)]'
                  : 'border-white/10 bg-[#1A1715] hover:border-[#B87333]/50'
              }`}
            >
              {/* Top Row: Rank + Name + Badges */}
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-display-tall text-3xl font-bold ${
                        isLeader
                          ? 'bg-gradient-to-br from-[#B87333] to-[#C86D51] text-[#121212] shadow-[0_0_20px_rgba(184,115,51,0.5)]'
                          : 'border border-white/15 bg-[#121212] text-[#D6C7B8]'
                      }`}
                    >
                      #{rank}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-athletic text-2xl sm:text-3xl font-bold uppercase tracking-wide text-[#F5F2EB]">
                          {patron.displayName}
                        </h3>
                        {isLeader && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#B87333]/25 border border-[#B87333] px-2.5 py-0.5 font-mono-docket text-[10px] font-bold uppercase text-[#E8B888]">
                            <Trophy className="h-3 w-3 text-[#B87333]" />
                            Ring Leader
                          </span>
                        )}
                        {patron.isStaff && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#C86D51]/20 border border-[#C86D51]/40 px-2.5 py-0.5 font-mono-docket text-[10px] font-bold uppercase text-[#E08A4E]">
                            <Shield className="h-3 w-3" />
                            Staff &amp; Patron Dual-Threat
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 font-mono-docket text-xs text-[#9E8F82]">
                        {patron.slipCount} {patron.slipCount === 1 ? 'Slip' : 'Slips'} Logged
                        {patron.latestIncidentDate
                          ? ` · Last Cited: ${patron.latestIncidentDate}`
                          : ' · Clean Record in Period'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Score Metrics Strip: Total Demerits | Issued as Staff | Net Score */}
                <div className="mt-5 grid grid-cols-3 gap-2.5 rounded-xl border border-white/10 bg-[#121212]/90 p-3.5">
                  <div>
                    <span className="block font-mono-docket text-[10px] uppercase tracking-wider text-[#9E8F82]">
                      TOTAL DEMERITS
                    </span>
                    <span className="mt-0.5 block font-display-tall text-3xl sm:text-4xl font-bold text-[#B87333]">
                      {patron.totalDemerits}
                    </span>
                    <span className="font-mono-docket text-[10px] text-[#7D7065]">
                      {patron.slipCount} {patron.slipCount === 1 ? 'slip' : 'slips'} received
                    </span>
                  </div>

                  <div className="border-x border-white/10 px-3">
                    <span className="block font-mono-docket text-[10px] uppercase tracking-wider text-[#9E8F82]">
                      ISSUED (STAFF)
                    </span>
                    <span className="mt-0.5 block font-display-tall text-3xl sm:text-4xl font-bold text-[#C4B8AC]">
                      {patron.issuedDemerits}
                    </span>
                    <span className="font-mono-docket text-[10px] text-[#7D7065]">
                      {patron.isStaff
                        ? `${patron.issuedSlipCount} handed out`
                        : 'Patron only'}
                    </span>
                  </div>

                  <div className="pl-1">
                    <span className="flex items-center gap-1 font-mono-docket text-[10px] uppercase tracking-wider text-[#E08A4E]">
                      <Scale className="h-3 w-3" />
                      NET SCORE
                    </span>
                    <span
                      className={`mt-0.5 block font-display-tall text-3xl sm:text-4xl font-bold ${
                        patron.netScore > 0
                          ? 'text-[#E08A4E]'
                          : patron.netScore < 0
                          ? 'text-emerald-400'
                          : 'text-[#9E8F82]'
                      }`}
                    >
                      {patron.netScore > 0 ? `+${patron.netScore}` : patron.netScore}
                    </span>
                    <span className="font-mono-docket text-[10px] text-[#7D7065]">
                      Received − Issued
                    </span>
                  </div>
                </div>

                {/* Itemized Infractions Chips */}
                <div className="mt-4">
                  <span className="block font-mono-docket text-[10px] uppercase tracking-widest text-[#9E8F82] mb-2">
                    NOTABLE INFRACTIONS ON RECORD:
                  </span>
                  {patron.recentInfractions.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {patron.recentInfractions.map((inf, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#B87333]/30 bg-[#B87333]/10 px-2.5 py-1 text-xs font-medium text-[#F5F2EB]"
                        >
                          <AlertTriangle className="h-3 w-3 text-[#C86D51]" />
                          {inf}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs italic text-[#7D7065]">
                      No infractions logged during this timeframe.
                    </p>
                  )}
                </div>
              </div>

              {/* Recent Slips Drawer / Modal Trigger */}
              {patron.slips.length > 0 && (
                <div className="mt-5 border-t border-white/10 pt-4">
                  <span className="block font-mono-docket text-[10px] uppercase tracking-wider text-[#9E8F82] mb-2">
                    CLICK A SLIP TO INSPECT OFFICIAL CITATION:
                  </span>
                  <div className="space-y-2">
                    {patron.slips.map((slip) => (
                      <button
                        key={slip.id}
                        type="button"
                        onClick={() => setSelectedSlip(slip)}
                        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#121212] px-3.5 py-2.5 text-left transition hover:border-[#B87333] hover:bg-[#1E1916]"
                      >
                        <div className="min-w-0 pr-3">
                          <div className="flex items-center gap-2 font-mono-docket text-xs text-[#E8B888]">
                            <span>{slip.incident_date}</span>
                            {slip.incident_time && <span>· {slip.incident_time}</span>}
                            <span>· Issued by {slip.issuerDisplayName}</span>
                          </div>
                          <p className="truncate text-xs text-[#C4B8AC] mt-0.5">
                            {slip.infractions.join(' • ')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="rounded bg-[#C86D51]/20 border border-[#C86D51]/40 px-2 py-0.5 font-mono-docket text-xs font-bold text-[#E08A4E]">
                            +{slip.demerit_count}
                          </span>
                          <ChevronRight className="h-4 w-4 text-[#B87333]" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Anonymous Patron / Unclaimed Citations Card */}
        {anonymousStanding && (
          <div className="flex flex-col justify-between rounded-2xl border border-dashed border-[#B87333]/40 bg-[#171412]/90 p-6">
            <div>
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#B87333]/40 bg-[#B87333]/10 text-[#E08A4E]">
                  <UserX className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-athletic text-2xl font-bold uppercase tracking-wide text-[#F5F2EB]">
                      {anonymousStanding.displayName}
                    </h3>
                    <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-mono-docket text-[10px] uppercase text-[#C4B8AC]">
                      Unclaimed / John Doe
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono-docket text-xs text-[#9E8F82]">
                    {anonymousStanding.slipCount}{' '}
                    {anonymousStanding.slipCount === 1 ? 'Slip' : 'Slips'} Logged · Last Cited:{' '}
                    {anonymousStanding.latestIncidentDate}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-[#121212] p-3.5">
                <div>
                  <span className="block font-mono-docket text-[10px] uppercase text-[#9E8F82]">
                    UNCLAIMED DEMERITS
                  </span>
                  <span className="mt-0.5 block font-display-tall text-3xl font-bold text-[#B87333]">
                    {anonymousStanding.totalDemerits}
                  </span>
                </div>
                <div>
                  <span className="block font-mono-docket text-[10px] uppercase text-[#9E8F82]">
                    NET SCORE
                  </span>
                  <span className="mt-0.5 block font-display-tall text-3xl font-bold text-[#E08A4E]">
                    +{anonymousStanding.netScore}
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <span className="block font-mono-docket text-[10px] uppercase tracking-widest text-[#9E8F82] mb-2">
                  CITED OFFENSES:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {anonymousStanding.recentInfractions.map((inf, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-[#F5F2EB]"
                    >
                      <AlertTriangle className="h-3 w-3 text-[#B87333]" />
                      {inf}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-white/10 pt-4 space-y-2">
              {anonymousStanding.slips.map((slip) => (
                <button
                  key={slip.id}
                  type="button"
                  onClick={() => setSelectedSlip(slip)}
                  className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#121212] px-3.5 py-2.5 text-left transition hover:border-[#B87333]"
                >
                  <div>
                    <div className="font-mono-docket text-xs text-[#E8B888]">
                      {slip.incident_date} · Issued by {slip.issuerDisplayName}
                    </div>
                    <p className="text-xs text-[#C4B8AC] mt-0.5">
                      {slip.infractions.join(' • ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-[#C86D51]/20 px-2 py-0.5 font-mono-docket text-xs font-bold text-[#E08A4E]">
                      +{slip.demerit_count}
                    </span>
                    <ChevronRight className="h-4 w-4 text-[#B87333]" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Staff Enforcers Section */}
      <section className="rounded-2xl border border-white/10 bg-[#171412] p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4 mb-6">
          <div>
            <h2 className="font-athletic text-2xl font-bold uppercase tracking-wide text-[#F5F2EB] flex items-center gap-2">
              <Award className="h-5 w-5 text-[#C86D51]" />
              <span>THE ENFORCERS · STAFF ISSUER LEADERBOARD</span>
            </h2>
            <p className="text-xs font-mono-docket text-[#9E8F82]">
              Handwritten slip signatures automatically resolve to canonical Copper Athletic Club staff
            </p>
          </div>
          <Link
            to="/admin"
            className="text-xs font-mono-docket text-[#E08A4E] hover:underline"
          >
            Manage Signature Aliases →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {enforcerStandings.map((enforcer, i) => (
            <div
              key={enforcer.member.id}
              className="rounded-xl border border-white/10 bg-[#121212] p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono-docket text-xs font-bold text-[#B87333]">
                    ENFORCER #{i + 1}
                  </span>
                  {enforcer.member.is_patron && (
                    <span className="rounded bg-white/10 px-2 py-0.5 font-mono-docket text-[10px] text-[#D6C7B8]">
                      ALSO PATRON
                    </span>
                  )}
                </div>
                <h3 className="mt-1 font-athletic text-2xl font-bold uppercase text-[#F5F2EB]">
                  {enforcer.member.display_name}
                </h3>

                <div className="mt-3">
                  <span className="block font-mono-docket text-[10px] uppercase text-[#9E8F82] mb-1">
                    KNOWN SLIP SIGNATURES:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {enforcer.aliases.map((alias) => (
                      <span
                        key={alias}
                        className="rounded border border-[#B87333]/30 bg-[#B87333]/10 px-2 py-0.5 font-mono-docket text-[10px] text-[#E8B888]"
                      >
                        &ldquo;{alias}&rdquo;
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-baseline justify-between border-t border-white/10 pt-3">
                <div>
                  <span className="block font-mono-docket text-[10px] text-[#9E8F82]">
                    SLIPS WRITTEN
                  </span>
                  <span className="font-mono-docket text-sm font-bold text-[#F5F2EB]">
                    {enforcer.issuedSlipCount}
                  </span>
                </div>
                <div className="text-right">
                  <span className="block font-mono-docket text-[10px] text-[#9E8F82]">
                    DEMERITS HANDED OUT
                  </span>
                  <span className="font-display-tall text-3xl font-bold text-[#C86D51]">
                    {enforcer.issuedDemerits}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <SlipModalViewer slip={selectedSlip} onClose={() => setSelectedSlip(null)} />
    </div>
  );
};
