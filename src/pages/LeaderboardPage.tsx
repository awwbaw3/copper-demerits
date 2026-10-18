import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDemerits } from '../context/DemeritsContext';
import { EnrichedDemeritSlip, PeriodMode } from '../types/demerits';
import { SlipModalViewer } from '../components/SlipModalViewer';
import { formatTime12h } from '../components/PhysicalSlipCard';
import {
  Trophy,
  Flame,
  Calendar,
  Camera,
  ChevronRight,
  FileText,
  Clock,
  Layers,
  Fingerprint,
  MapPin,
  Tag,
} from 'lucide-react';

export const LeaderboardPage: React.FC = () => {
  const { computeStandings, uploadedSourceFiles } = useDemerits();
  const [periodMode, setPeriodMode] = useState<PeriodMode>('all-time');
  const [customStartDate, setCustomStartDate] = useState<string>('2026-10-01');
  const [customEndDate, setCustomEndDate] = useState<string>('2026-10-31');
  const [selectedDemeritType, setSelectedDemeritType] = useState<string>('all');
  const [selectedSlip, setSelectedSlip] = useState<EnrichedDemeritSlip | null>(null);

  const { patronStandings, anonymousStanding, typeSummaries, periodSlips } = useMemo(
    () =>
      computeStandings({
        mode: periodMode,
        startDate: periodMode === 'custom' ? customStartDate : null,
        endDate: periodMode === 'custom' ? customEndDate : null,
        demeritType: selectedDemeritType,
      }),
    [computeStandings, periodMode, customStartDate, customEndDate, selectedDemeritType]
  );

  const chronologicalSlips = useMemo(() => {
    return [...periodSlips].sort((a, b) => {
      const d = a.incident_date.localeCompare(b.incident_date);
      if (d !== 0) return d;
      return (a.incident_time || '').localeCompare(b.incident_time || '');
    });
  }, [periodSlips]);

  const allStandings = useMemo(() => {
    const list = [...patronStandings];
    if (anonymousStanding && anonymousStanding.slipCount > 0) {
      list.push(anonymousStanding);
    }
    return list;
  }, [patronStandings, anonymousStanding]);

  const totalPeriodDemerits = useMemo(
    () => allStandings.reduce((sum, p) => sum + p.totalDemerits, 0),
    [allStandings]
  );

  const totalPeriodOffenses = useMemo(
    () => allStandings.reduce((sum, p) => sum + p.offenseCount, 0),
    [allStandings]
  );

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-5 sm:py-8 space-y-6 sm:space-y-8">
      {/* Mobile-First Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-[#B87333]/40 bg-gradient-to-br from-[#231914] via-[#171412] to-[#121212] p-5 sm:p-8 shadow-[0_16px_40px_rgba(0,0,0,0.75)]">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="max-w-xl space-y-2.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#B87333]/40 bg-[#B87333]/15 px-3 py-1 text-[11px] font-mono-docket uppercase tracking-widest text-[#E8B888]">
              <Trophy className="h-3.5 w-3.5 text-[#B87333]" />
              <span>COPPER ATHLETIC CLUB · RING OF HONOR</span>
            </div>

            <h1 className="font-athletic text-3xl sm:text-5xl font-extrabold uppercase tracking-tight text-[#F5F2EB] leading-none">
              DEMERIT <span className="text-[#B87333]">LEADERBOARD</span>
            </h1>

            <p className="text-xs sm:text-sm text-[#C4B8AC] leading-relaxed">
              Tracks both the <strong>number</strong> and <strong>type of demerits</strong> issued on
              each slip across any period. Backed by the isolated{' '}
              <code className="text-[#E8B888]">copper_demerits</code> schema and deduplicated across
              the <strong>3 slips</strong> in <code className="text-[#E8B888]">20261017_211324.jpg</code>{' '}
              and <strong>1 scan</strong> in{' '}
              <code className="text-[#E8B888]">Scan_20261017_212309.jpg</code>.
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Link
                to="/submit"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#B87333] to-[#C86D51] px-4 py-2.5 font-athletic text-sm sm:text-base font-bold uppercase tracking-wider text-[#121212] shadow-[0_0_20px_rgba(184,115,51,0.4)] transition hover:brightness-110"
              >
                <Camera className="h-4 w-4" />
                <span>Log Slip Photo</span>
              </Link>
              <Link
                to="/docket"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 font-athletic text-sm sm:text-base font-semibold uppercase tracking-wider text-[#F5F2EB] transition hover:border-[#B87333]"
              >
                <FileText className="h-4 w-4 text-[#B87333]" />
                <span>View Full Docket</span>
              </Link>
            </div>
          </div>

          {/* Period Scoreboard */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 shrink-0 sm:w-auto">
            <div className="rounded-xl border border-[#B87333]/30 bg-[#14110F]/90 p-3 sm:p-4 text-center">
              <span className="block font-mono-docket text-[9px] sm:text-[10px] uppercase tracking-widest text-[#9E8F82]">
                UNIQUE SLIPS
              </span>
              <span className="mt-1 block font-display-tall text-2xl sm:text-4xl font-bold text-[#F5F2EB]">
                {periodSlips.length}
              </span>
              <span className="block font-mono-docket text-[9px] text-emerald-400">
                4 CAPTURES (1 DEDUP)
              </span>
            </div>

            <div className="rounded-xl border border-white/15 bg-[#14110F]/90 p-3 sm:p-4 text-center">
              <span className="block font-mono-docket text-[9px] sm:text-[10px] uppercase tracking-widest text-[#9E8F82]">
                DEMERIT TYPES
              </span>
              <span className="mt-1 block font-display-tall text-2xl sm:text-4xl font-bold text-[#E8B888]">
                {typeSummaries.length}
              </span>
              <span className="block font-mono-docket text-[9px] text-[#9E8F82]">
                {totalPeriodOffenses} OFFENSES CITED
              </span>
            </div>

            <div className="rounded-xl border border-[#C86D51]/30 bg-[#14110F]/90 p-3 sm:p-4 text-center">
              <span className="block font-mono-docket text-[9px] sm:text-[10px] uppercase tracking-widest text-[#9E8F82]">
                PERIOD DEMERITS
              </span>
              <span className="mt-1 block font-display-tall text-2xl sm:text-4xl font-bold text-[#B87333]">
                {totalPeriodDemerits}
              </span>
              <span className="block font-mono-docket text-[9px] text-[#9E8F82]">
                {selectedDemeritType === 'all' ? 'ALL TYPES' : selectedDemeritType.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Period & Demerit Type Filter Controls */}
      <section className="rounded-2xl border border-white/10 bg-[#171412] p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-[#B87333]" />
            <h2 className="font-athletic text-xl sm:text-2xl font-bold uppercase tracking-wide text-[#F5F2EB]">
              LEADERBOARD PERIOD &amp; DEMERIT TYPE FILTER
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#B87333]/30 bg-[#121212] p-1">
            {[
              { id: 'all-time', label: 'All-Time' },
              { id: 'this-month', label: 'This Month (Oct)' },
              { id: 'this-week', label: 'This Week' },
              { id: 'oct-17-session', label: 'Oct 17 Session' },
              { id: 'custom', label: 'Custom Range' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPeriodMode(tab.id as PeriodMode)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-athletic uppercase tracking-wider transition ${
                  periodMode === tab.id
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

        {periodMode === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-[#121212] p-3">
            <div className="flex items-center gap-2">
              <span className="font-mono-docket text-xs text-[#9E8F82]">FROM:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="rounded-lg border border-white/15 bg-[#1A1715] px-2.5 py-1.5 font-mono-docket text-xs text-[#F5F2EB]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono-docket text-xs text-[#9E8F82]">TO:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="rounded-lg border border-white/15 bg-[#1A1715] px-2.5 py-1.5 font-mono-docket text-xs text-[#F5F2EB]"
              />
            </div>
          </div>
        )}

        {/* Demerit Type Filter Pills */}
        <div className="space-y-2 border-t border-white/10 pt-3">
          <span className="flex items-center gap-1.5 font-mono-docket text-[10px] font-bold uppercase tracking-wider text-[#9E8F82]">
            <Tag className="h-3 w-3 text-[#B87333]" />
            <span>FILTER STANDINGS BY DEMERIT TYPE GIVEN ON SLIP:</span>
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedDemeritType('all')}
              className={`rounded-xl border px-3 py-1.5 font-mono-docket text-xs transition ${
                selectedDemeritType === 'all'
                  ? 'border-[#B87333] bg-[#B87333] text-[#121212] font-bold'
                  : 'border-white/15 bg-[#121212] text-[#D6C7B8] hover:border-[#B87333]/50'
              }`}
            >
              All Demerit Types (6 PTS · 5 Offenses)
            </button>

            {typeSummaries.map((ts) => (
              <button
                key={ts.type}
                type="button"
                onClick={() => setSelectedDemeritType(ts.type)}
                className={`rounded-xl border px-3 py-1.5 font-mono-docket text-xs transition ${
                  selectedDemeritType === ts.type
                    ? 'border-[#B87333] bg-[#B87333] text-[#121212] font-bold'
                    : 'border-white/15 bg-[#121212] text-[#D6C7B8] hover:border-[#B87333]/50'
                }`}
              >
                {ts.type} ({ts.totalPoints} {ts.totalPoints === 1 ? 'PT' : 'PTS'} · Leader:{' '}
                {ts.leaderName})
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Patron Standings Cards */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        {allStandings.map((patron, index) => {
          const topScore = allStandings[0]?.totalDemerits || 0;
          const isTiedPoints =
            patron.totalDemerits === topScore &&
            allStandings.filter((p) => p.totalDemerits === topScore).length > 1;
          const isLeader = index === 0 && patron.totalDemerits > 0;
          const typeEntries = Object.entries(patron.byType).sort(
            (a, b) => b[1].points - a[1].points
          );

          return (
            <div
              key={patron.memberId || patron.displayName}
              className={`flex flex-col justify-between rounded-2xl border p-4 sm:p-6 transition-all ${
                isLeader
                  ? 'border-[#B87333] bg-gradient-to-b from-[#251C16] to-[#171412] shadow-[0_12px_35px_rgba(184,115,51,0.18)]'
                  : 'border-white/10 bg-[#1A1715]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-display-tall text-2xl font-bold ${
                        isLeader
                          ? 'bg-gradient-to-br from-[#B87333] to-[#C86D51] text-[#121212]'
                          : 'border border-white/15 bg-[#121212] text-[#D6C7B8]'
                      }`}
                    >
                      #{index + 1}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-athletic text-2xl font-bold uppercase tracking-wide text-[#F5F2EB]">
                          {patron.displayName}
                        </h3>
                        {isLeader && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#B87333]/25 border border-[#B87333] px-2 py-0.5 font-mono-docket text-[10px] font-bold uppercase text-[#E8B888]">
                            <Trophy className="h-3 w-3 text-[#B87333]" />
                            {isTiedPoints
                              ? `LEADER (${patron.totalDemerits} PTS · ${patron.offenseCount} OFFENSES)`
                              : '#1 DEMERIT LEADER'}
                          </span>
                        )}
                        {patron.isStaff && (
                          <span className="rounded bg-white/10 px-2 py-0.5 font-mono-docket text-[10px] uppercase text-[#C4B8AC]">
                            STAFF &amp; PATRON
                          </span>
                        )}
                      </div>
                      <p className="font-mono-docket text-[11px] text-[#9E8F82]">
                        {patron.totalDemerits} Demerits across {patron.offenseCount}{' '}
                        {patron.offenseCount === 1 ? 'Offense' : 'Offenses'} ({patron.slipCount}{' '}
                        {patron.slipCount === 1 ? 'Slip' : 'Slips'}) · Latest:{' '}
                        {patron.latestIncidentDate}{' '}
                        {patron.latestIncidentTime ? formatTime12h(patron.latestIncidentTime) : ''}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Verified Metrics: Total Demerits | Offenses (Types) | Unique Slips */}
                <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-[#121212] p-3 text-center">
                  <div>
                    <span className="block font-mono-docket text-[9px] sm:text-[10px] uppercase text-[#9E8F82]">
                      DEMERITS GIVEN
                    </span>
                    <span className="mt-0.5 block font-display-tall text-3xl font-bold text-[#B87333]">
                      {patron.totalDemerits}
                    </span>
                  </div>

                  <div className="border-x border-white/10">
                    <span className="block font-mono-docket text-[9px] sm:text-[10px] uppercase text-[#9E8F82]">
                      OFFENSE TYPES
                    </span>
                    <span className="mt-0.5 block font-display-tall text-3xl font-bold text-[#E08A4E]">
                      {patron.offenseCount}
                    </span>
                  </div>

                  <div>
                    <span className="block font-mono-docket text-[9px] sm:text-[10px] uppercase text-[#9E8F82]">
                      UNIQUE SLIPS
                    </span>
                    <span className="mt-0.5 block font-display-tall text-3xl font-bold text-[#F5F2EB]">
                      {patron.slipCount}
                    </span>
                  </div>
                </div>

                {/* Breakdown by Demerit Type & Number */}
                {typeEntries.length > 0 && (
                  <div className="mt-3.5 space-y-1.5">
                    <span className="block font-mono-docket text-[10px] uppercase tracking-wider text-[#9E8F82]">
                      DEMERIT BREAKDOWN BY TYPE &amp; POINTS:
                    </span>
                    <div className="grid grid-cols-1 gap-1.5">
                      {typeEntries.map(([type, stats]) => (
                        <div
                          key={type}
                          className="flex items-center justify-between rounded-lg border border-[#B87333]/30 bg-[#121212] px-3 py-1.5 text-xs"
                        >
                          <span className="flex items-center gap-1.5 font-mono-docket text-[#E8B888]">
                            <Tag className="h-3 w-3 text-[#C86D51] shrink-0" />
                            <span>{type}</span>
                          </span>
                          <span className="font-mono-docket font-bold text-[#F5F2EB]">
                            +{stats.points} {stats.points === 1 ? 'Demerit' : 'Demerits'} (
                            {stats.count} {stats.count === 1 ? 'citation' : 'citations'})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Uploaded Slip Photo Thumbnails */}
              <div className="mt-4 border-t border-white/10 pt-3.5 space-y-2">
                <span className="block font-mono-docket text-[10px] uppercase tracking-wider text-[#9E8F82]">
                  ITEMIZED SLIP CITATIONS (TAP TO INSPECT PHOTO):
                </span>
                <div className="space-y-2">
                  {[...patron.slips]
                    .sort((a, b) => (a.incident_time || '').localeCompare(b.incident_time || ''))
                    .map((slip) => (
                      <button
                        key={slip.id}
                        type="button"
                        onClick={() => setSelectedSlip(slip)}
                        className="flex w-full flex-col gap-2 rounded-xl border border-white/10 bg-[#121212] p-3 text-left transition hover:border-[#B87333]"
                      >
                        <div className="flex w-full items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {slip.image_url && (
                              <img
                                src={slip.image_url}
                                alt={`Slip for ${patron.displayName}`}
                                className="h-12 w-16 shrink-0 rounded-lg border border-[#B87333]/40 object-cover bg-black"
                              />
                            )}
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5 font-mono-docket text-xs text-[#E8B888]">
                                <Clock className="h-3 w-3 text-[#C86D51]" />
                                <span>{formatTime12h(slip.incident_time)}</span>
                                <span className="text-[#9E8F82]">· {slip.location_area}</span>
                              </div>
                              <p className="truncate text-xs text-[#C4B8AC] mt-0.5">
                                Signed &ldquo;{slip.raw_signature}&rdquo; → {slip.issuerDisplayName}
                              </p>
                              {slip.secondary_image_url && (
                                <span className="inline-flex items-center gap-1 font-mono-docket text-[10px] text-emerald-400">
                                  <Fingerprint className="h-2.5 w-2.5" />
                                  Deduplicated across 2 uploads (Photo + Scan)
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="rounded bg-[#C86D51]/20 border border-[#C86D51]/40 px-2 py-0.5 font-mono-docket text-xs font-bold text-[#E08A4E]">
                              +{slip.demerit_count} PTS
                            </span>
                            <ChevronRight className="h-4 w-4 text-[#B87333]" />
                          </div>
                        </div>

                        {/* Itemized offenses with type & points */}
                        <div className="space-y-1 border-t border-white/5 pt-2">
                          {slip.resolvedItems.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-2 text-xs text-[#D6C7B8]"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="shrink-0 rounded bg-[#B87333]/20 px-1.5 py-0.5 font-mono-docket text-[10px] text-[#E8B888]">
                                  {item.type}
                                </span>
                                <span className="truncate">{item.description}</span>
                              </div>
                              <span className="shrink-0 font-mono-docket text-[10px] font-bold text-[#E08A4E]">
                                +{item.points}
                              </span>
                            </div>
                          ))}
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Demerit Leaders by Type (Period Category Breakdown) */}
      <section className="rounded-2xl border border-[#B87333]/35 bg-[#171412] p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-[#B87333]" />
            <h2 className="font-athletic text-xl sm:text-2xl font-bold uppercase text-[#F5F2EB]">
              DEMERIT LEADERS BY TYPE (PERIOD BREAKDOWN)
            </h2>
          </div>
          <span className="font-mono-docket text-xs text-[#9E8F82]">
            {typeSummaries.length} Active Categories · 6 Total Demerits
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {typeSummaries.map((ts) => (
            <button
              key={ts.type}
              type="button"
              onClick={() =>
                setSelectedDemeritType(selectedDemeritType === ts.type ? 'all' : ts.type)
              }
              className={`rounded-xl border p-3.5 text-left transition ${
                selectedDemeritType === ts.type
                  ? 'border-[#B87333] bg-[#B87333]/15'
                  : 'border-white/10 bg-[#121212] hover:border-[#B87333]/50'
              }`}
            >
              <span className="block font-mono-docket text-[10px] font-bold uppercase text-[#E8B888]">
                {ts.type}
              </span>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="font-display-tall text-3xl font-bold text-[#F5F2EB]">
                  {ts.totalPoints} {ts.totalPoints === 1 ? 'PT' : 'PTS'}
                </span>
                <span className="font-mono-docket text-[10px] text-[#9E8F82]">
                  {ts.offenseCount} {ts.offenseCount === 1 ? 'citation' : 'citations'}
                </span>
              </div>
              <p className="mt-2 border-t border-white/10 pt-1.5 font-mono-docket text-[11px] text-[#C4B8AC]">
                Leader: <strong className="text-[#E08A4E]">{ts.leaderName}</strong> (+
                {ts.leaderPoints})
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Chronological Evening Timeline (8:50 PM -> 8:56 PM -> 9:09 PM) */}
      <section className="rounded-2xl border border-white/10 bg-[#171412] p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#B87333]" />
            <h2 className="font-athletic text-xl sm:text-2xl font-bold uppercase text-[#F5F2EB]">
              CHRONOLOGICAL SLIP TIMELINE · OCT 17, 2026
            </h2>
          </div>
          <span className="font-mono-docket text-xs text-[#9E8F82]">
            8:50 PM (+1) → 8:56 PM (+2) → 9:09 PM (+3)
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
          {chronologicalSlips.map((slip, idx) => (
            <button
              key={slip.id}
              type="button"
              onClick={() => setSelectedSlip(slip)}
              className="group flex flex-col justify-between overflow-hidden rounded-xl border border-white/15 bg-[#121212] text-left transition hover:border-[#B87333]"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-black">
                {slip.image_url && (
                  <img
                    src={slip.image_url}
                    alt={`Slip #${idx + 1} for ${slip.patronDisplayName}`}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                )}
                <span className="absolute top-2 left-2 rounded bg-black/85 border border-[#B87333]/50 px-2 py-0.5 font-mono-docket text-[10px] font-bold text-[#E8B888]">
                  #{idx + 1} · {formatTime12h(slip.incident_time)}
                </span>
                <span className="absolute top-2 right-2 rounded bg-[#B87333] px-2 py-0.5 font-mono-docket text-xs font-bold text-[#121212]">
                  +{slip.demerit_count} {slip.demerit_count === 1 ? 'PT' : 'PTS'}
                </span>
              </div>

              <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-athletic text-xl font-bold uppercase text-[#F5F2EB]">
                      {slip.patronDisplayName}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono-docket text-[10px] text-[#9E8F82]">
                      <MapPin className="h-3 w-3 text-[#B87333]" />
                      {slip.location_area}
                    </span>
                  </div>

                  <ul className="mt-1.5 space-y-1 text-xs text-[#D6C7B8]">
                    {slip.resolvedItems.map((item, i) => (
                      <li key={i} className="truncate">
                        <span className="text-[#E8B888] font-mono-docket text-[10px]">
                          [{item.type} +{item.points}]
                        </span>{' '}
                        {item.description}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between font-mono-docket text-[10px] text-[#9E8F82]">
                  <span>
                    Signed &ldquo;{slip.raw_signature}&rdquo; → {slip.issuerDisplayName}
                  </span>
                  {slip.secondary_image_url && (
                    <span className="text-emerald-400 font-bold">2 Photos Merged</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Source Image Files Breakdown: 3 Slips in Image 1 + 1 Slip in Image 2 */}
      <section className="rounded-2xl border border-white/10 bg-[#171412] p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-[#B87333]" />
            <h2 className="font-athletic text-xl sm:text-2xl font-bold uppercase text-[#F5F2EB]">
              UPLOADED SOURCE IMAGES (3 SLIPS IN IMAGE 1 + 1 SLIP IN IMAGE 2)
            </h2>
          </div>
          <span className="font-mono-docket text-xs text-emerald-400">
            4 Slip Appearances → 3 Unique Citations
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {uploadedSourceFiles.map((src) => (
            <div
              key={src.id}
              className="rounded-xl border border-white/10 bg-[#121212] p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-block rounded bg-[#B87333]/20 border border-[#B87333]/40 px-2 py-0.5 font-mono-docket text-[10px] font-bold uppercase text-[#E8B888]">
                    {src.slipCountInImage}{' '}
                    {src.slipCountInImage === 1 ? 'SLIP IN IMAGE' : 'SLIPS IN IMAGE'}
                  </span>
                  <h3 className="mt-1 font-mono-docket text-sm font-bold text-[#F5F2EB]">
                    {src.filename}
                  </h3>
                  <p className="font-mono-docket text-[11px] text-[#9E8F82]">
                    Captured: {src.capturedAt}
                  </p>
                </div>
                <span className="font-mono-docket text-[10px] text-emerald-400">
                  SHA-256 #{src.sha256.slice(0, 8)}
                </span>
              </div>

              <div className="overflow-hidden rounded-lg border border-white/10 bg-black">
                <img
                  src={src.imageUrl}
                  alt={src.filename}
                  className="mx-auto max-h-52 w-auto object-contain"
                />
              </div>

              <p className="text-xs text-[#C4B8AC]">{src.description}</p>

              <div className="space-y-1.5 pt-1">
                {src.extractedSlips.map((ex, i) => {
                  const matched = periodSlips.find((s) => s.id === ex.slipId);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => matched && setSelectedSlip(matched)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#1A1715] px-3 py-2 text-left text-xs transition hover:border-[#B87333]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={ex.cropUrl}
                          alt={ex.label}
                          className="h-9 w-12 rounded border border-[#B87333]/40 object-cover bg-black shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-mono-docket text-[11px] font-bold text-[#F5F2EB]">
                            {ex.student} · {ex.time} · {ex.room}
                          </p>
                          <p className="truncate font-mono-docket text-[10px] text-[#9E8F82]">
                            {ex.label}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded px-2 py-0.5 font-mono-docket text-[10px] font-bold ${
                          ex.isDeduplicatedMerge
                            ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                            : 'bg-[#B87333]/20 text-[#E8B888]'
                        }`}
                      >
                        {ex.isDeduplicatedMerge ? 'DEDUPLICATED' : `+${ex.demerits}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <SlipModalViewer slip={selectedSlip} onClose={() => setSelectedSlip(null)} />
    </div>
  );
};
