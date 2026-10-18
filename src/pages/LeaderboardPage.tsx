import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDemerits } from '../context/DemeritsContext';
import { EnrichedDemeritSlip } from '../types/demerits';
import { SlipModalViewer } from '../components/SlipModalViewer';
import { formatTime12h } from '../components/PhysicalSlipCard';
import {
  Trophy,
  Flame,
  Calendar,
  Camera,
  ChevronRight,
  AlertTriangle,
  FileText,
  Clock,
  Layers,
  Fingerprint,
  MapPin,
} from 'lucide-react';

export const LeaderboardPage: React.FC = () => {
  const { computeStandings, demerits, uploadedSourceFiles } = useDemerits();
  const [timeframe, setTimeframe] = useState<'all-time' | 'current-month'>('all-time');
  const [selectedSlip, setSelectedSlip] = useState<EnrichedDemeritSlip | null>(null);

  const currentMonthPrefix = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const { patronStandings, anonymousStanding } = useMemo(
    () => computeStandings(timeframe === 'all-time' ? null : currentMonthPrefix),
    [computeStandings, timeframe, currentMonthPrefix]
  );

  const uploadedSlips = useMemo(() => {
    return demerits.filter((s) => {
      if (s.status !== 'approved' || !s.image_url) return false;
      if (timeframe === 'current-month') {
        return s.incident_date.startsWith(currentMonthPrefix);
      }
      return true;
    });
  }, [demerits, timeframe, currentMonthPrefix]);

  // Chronological order (8:50 PM -> 8:56 PM -> 9:09 PM)
  const chronologicalSlips = useMemo(() => {
    return [...uploadedSlips].sort((a, b) => {
      const d = a.incident_date.localeCompare(b.incident_date);
      if (d !== 0) return d;
      return (a.incident_time || '').localeCompare(b.incident_time || '');
    });
  }, [uploadedSlips]);

  const totalDemerits = useMemo(
    () => uploadedSlips.reduce((sum, s) => sum + s.demerit_count, 0),
    [uploadedSlips]
  );

  const allStandings = useMemo(() => {
    const list = [...patronStandings];
    if (anonymousStanding && anonymousStanding.slipCount > 0) {
      list.push(anonymousStanding);
    }
    return list.sort((a, b) => {
      if (b.totalDemerits !== a.totalDemerits) return b.totalDemerits - a.totalDemerits;
      return b.slipCount - a.slipCount;
    });
  }, [patronStandings, anonymousStanding]);

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
              Standings calculated strictly from the uploaded physical slips: <strong>3 slips</strong>{' '}
              in <code className="text-[#E8B888]">20261017_211324.jpg</code> (8:50 PM, 8:56 PM,
              9:09 PM) and <strong>1 slip</strong> in{' '}
              <code className="text-[#E8B888]">Scan_20261017_212309.jpg</code> (9:09 PM —
              deduplicated against the 9:09 PM Rick slip).
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

          {/* Strictly Verified Scoreboard */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 shrink-0 sm:w-auto">
            <div className="rounded-xl border border-[#B87333]/30 bg-[#14110F]/90 p-3 sm:p-4 text-center">
              <span className="block font-mono-docket text-[9px] sm:text-[10px] uppercase tracking-widest text-[#9E8F82]">
                SLIP CAPTURES
              </span>
              <span className="mt-1 block font-display-tall text-2xl sm:text-4xl font-bold text-[#E8B888]">
                4
              </span>
              <span className="block font-mono-docket text-[9px] text-[#9E8F82]">
                3 + 1 IN 2 FILES
              </span>
            </div>

            <div className="rounded-xl border border-emerald-500/30 bg-[#14110F]/90 p-3 sm:p-4 text-center">
              <span className="block font-mono-docket text-[9px] sm:text-[10px] uppercase tracking-widest text-[#9E8F82]">
                UNIQUE SLIPS
              </span>
              <span className="mt-1 block font-display-tall text-2xl sm:text-4xl font-bold text-[#F5F2EB]">
                {uploadedSlips.length}
              </span>
              <span className="block font-mono-docket text-[9px] text-emerald-400">
                1 DEDUPLICATED
              </span>
            </div>

            <div className="rounded-xl border border-[#C86D51]/30 bg-[#14110F]/90 p-3 sm:p-4 text-center">
              <span className="block font-mono-docket text-[9px] sm:text-[10px] uppercase tracking-widest text-[#9E8F82]">
                TOTAL DEMERITS
              </span>
              <span className="mt-1 block font-display-tall text-2xl sm:text-4xl font-bold text-[#B87333]">
                {totalDemerits}
              </span>
              <span className="block font-mono-docket text-[9px] text-[#9E8F82]">
                BURTIS 3 · RICK 3
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Timeframe Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <h2 className="font-athletic text-xl sm:text-2xl font-bold uppercase tracking-wide text-[#F5F2EB] flex items-center gap-2">
          <Flame className="h-5 w-5 text-[#B87333]" />
          <span>PATRON STANDINGS</span>
        </h2>

        <div className="inline-flex rounded-xl border border-[#B87333]/30 bg-[#1A1614] p-1 self-start sm:self-auto">
          {[
            { id: 'all-time', label: 'All-Time' },
            { id: 'current-month', label: 'Oct 2026' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTimeframe(tab.id as typeof timeframe)}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-athletic uppercase tracking-wider transition ${
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
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        {allStandings.map((patron) => {
          const topScore = allStandings[0]?.totalDemerits || 0;
          const isTiedForFirst =
            patron.totalDemerits === topScore &&
            allStandings.filter((p) => p.totalDemerits === topScore).length > 1;
          const isLeader = patron.totalDemerits === topScore && patron.totalDemerits > 0;

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
                      {isTiedForFirst ? 'T1' : '#1'}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-athletic text-2xl font-bold uppercase tracking-wide text-[#F5F2EB]">
                          {patron.displayName}
                        </h3>
                        {isLeader && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#B87333]/25 border border-[#B87333] px-2 py-0.5 font-mono-docket text-[10px] font-bold uppercase text-[#E8B888]">
                            <Trophy className="h-3 w-3 text-[#B87333]" />
                            {isTiedForFirst ? 'TIED #1 (3 DEMERITS)' : '#1'}
                          </span>
                        )}
                        {patron.isStaff && (
                          <span className="rounded bg-white/10 px-2 py-0.5 font-mono-docket text-[10px] uppercase text-[#C4B8AC]">
                            STAFF &amp; PATRON
                          </span>
                        )}
                      </div>
                      <p className="font-mono-docket text-[11px] text-[#9E8F82]">
                        {patron.slipCount} Unique {patron.slipCount === 1 ? 'Slip' : 'Slips'} ·
                        Latest: {patron.latestIncidentDate}{' '}
                        {patron.latestIncidentTime ? formatTime12h(patron.latestIncidentTime) : ''}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Verified Metrics: Total Demerits | Net Score | Unique Slips */}
                <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-[#121212] p-3 text-center">
                  <div>
                    <span className="block font-mono-docket text-[9px] sm:text-[10px] uppercase text-[#9E8F82]">
                      TOTAL DEMERITS
                    </span>
                    <span className="mt-0.5 block font-display-tall text-3xl font-bold text-[#B87333]">
                      {patron.totalDemerits}
                    </span>
                  </div>

                  <div className="border-x border-white/10">
                    <span className="block font-mono-docket text-[9px] sm:text-[10px] uppercase text-[#9E8F82]">
                      NET SCORE
                    </span>
                    <span className="mt-0.5 block font-display-tall text-3xl font-bold text-[#E08A4E]">
                      {patron.netScore}
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

                {/* Infractions from Uploaded Slips */}
                {patron.recentInfractions.length > 0 && (
                  <div className="mt-3.5">
                    <span className="block font-mono-docket text-[10px] uppercase tracking-wider text-[#9E8F82] mb-1.5">
                      CITED OFFENSES:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {patron.recentInfractions.map((inf, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#B87333]/30 bg-[#B87333]/10 px-2.5 py-1 text-xs text-[#F5F2EB]"
                        >
                          <AlertTriangle className="h-3 w-3 text-[#C86D51] shrink-0" />
                          <span>{inf}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Uploaded Slip Photo Thumbnails */}
              <div className="mt-4 border-t border-white/10 pt-3.5 space-y-2">
                <span className="block font-mono-docket text-[10px] uppercase tracking-wider text-[#9E8F82]">
                  VERIFIED SLIP CITATIONS (TAP TO INSPECT PHOTO):
                </span>
                <div className="space-y-2">
                  {[...patron.slips]
                    .sort((a, b) => (a.incident_time || '').localeCompare(b.incident_time || ''))
                    .map((slip) => (
                      <button
                        key={slip.id}
                        type="button"
                        onClick={() => setSelectedSlip(slip)}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#121212] p-2.5 text-left transition hover:border-[#B87333]"
                      >
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
                            +{slip.demerit_count}
                          </span>
                          <ChevronRight className="h-4 w-4 text-[#B87333]" />
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chronological Evening Timeline (8:50 PM -> 8:56 PM -> 9:09 PM) */}
      <section className="rounded-2xl border border-[#B87333]/35 bg-[#171412] p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#B87333]" />
            <h2 className="font-athletic text-xl sm:text-2xl font-bold uppercase text-[#F5F2EB]">
              CHRONOLOGICAL SLIP TIMELINE · OCT 17, 2026
            </h2>
          </div>
          <span className="font-mono-docket text-xs text-[#9E8F82]">
            8:50 PM → 8:56 PM (+6m) → 9:09 PM (+13m)
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
                    {slip.infractions.map((inf, i) => (
                      <li key={i} className="truncate">
                        • {inf}
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
                  const matched = uploadedSlips.find((s) => s.id === ex.slipId);
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
