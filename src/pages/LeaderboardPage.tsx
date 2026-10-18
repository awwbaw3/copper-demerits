import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDemerits } from '../context/DemeritsContext';
import { EnrichedDemeritSlip } from '../types/demerits';
import { MAX_OFFICIAL_SLIPS } from '../lib/defaultData';
import { SlipModalViewer } from '../components/SlipModalViewer';
import {
  Trophy,
  Flame,
  Calendar,
  Camera,
  ChevronRight,
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  ShieldCheck,
} from 'lucide-react';

export const LeaderboardPage: React.FC = () => {
  const { computeStandings, demerits } = useDemerits();
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

  const totalDemerits = useMemo(
    () => uploadedSlips.reduce((sum, s) => sum + s.demerit_count, 0),
    [uploadedSlips]
  );

  const allStandings = useMemo(() => {
    const list = [...patronStandings];
    if (anonymousStanding && anonymousStanding.slipCount > 0) {
      list.push(anonymousStanding);
    }
    return list.sort((a, b) => b.totalDemerits - a.totalDemerits);
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
              Verified standings calculated strictly from the uploaded physical slip photos.
              Duplicate image uploads are automatically fingerprinted and blocked.
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Link
                to="/submit"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#B87333] to-[#C86D51] px-4 py-2.5 font-athletic text-sm sm:text-base font-bold uppercase tracking-wider text-[#121212] shadow-[0_0_20px_rgba(184,115,51,0.4)] transition hover:brightness-110"
              >
                <Camera className="h-4 w-4" />
                <span>
                  Upload Slip Photo ({uploadedSlips.length}/{MAX_OFFICIAL_SLIPS})
                </span>
              </Link>
              <Link
                to="/docket"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 font-athletic text-sm sm:text-base font-semibold uppercase tracking-wider text-[#F5F2EB] transition hover:border-[#B87333]"
              >
                <FileText className="h-4 w-4 text-[#B87333]" />
                <span>View Docket</span>
              </Link>
            </div>
          </div>

          {/* Strictly Verified Scoreboard */}
          <div className="grid grid-cols-2 gap-3 shrink-0 sm:w-auto">
            <div className="rounded-xl border border-[#B87333]/30 bg-[#14110F]/90 p-3.5 sm:p-4 text-center">
              <span className="block font-mono-docket text-[10px] uppercase tracking-widest text-[#9E8F82]">
                UPLOADED SLIPS
              </span>
              <span className="mt-1 block font-display-tall text-3xl sm:text-4xl font-bold text-[#F5F2EB]">
                {uploadedSlips.length}
                <span className="text-xl text-[#9E8F82]">/{MAX_OFFICIAL_SLIPS}</span>
              </span>
            </div>

            <div className="rounded-xl border border-[#C86D51]/30 bg-[#14110F]/90 p-3.5 sm:p-4 text-center">
              <span className="block font-mono-docket text-[10px] uppercase tracking-widest text-[#9E8F82]">
                TOTAL DEMERITS
              </span>
              <span className="mt-1 block font-display-tall text-3xl sm:text-4xl font-bold text-[#B87333]">
                {totalDemerits}
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
            { id: 'current-month', label: 'This Month' },
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

      {/* Empty State if the 4 Slip Images Haven't Been Uploaded to Supabase Yet */}
      {allStandings.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#B87333]/40 bg-[#171412] p-8 sm:p-12 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#B87333]/15 text-[#B87333]">
            <ImageIcon className="h-7 w-7" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="font-athletic text-2xl sm:text-3xl font-bold uppercase text-[#F5F2EB]">
              No Fabricated Data — Ready for the 4 Uploaded Slips
            </h3>
            <p className="text-xs sm:text-sm text-[#B5A99D]">
              All synthetic statistics and placeholder slips have been eliminated. Upload your 4
              physical demerit slip photos to populate the live leaderboard.
            </p>
          </div>
          <Link
            to="/submit"
            className="inline-flex items-center gap-2 rounded-xl bg-[#B87333] px-5 py-3 font-athletic text-base font-bold uppercase tracking-wider text-[#121212] shadow transition hover:bg-[#C86D51]"
          >
            <Camera className="h-4 w-4" />
            <span>Upload the 4 Slip Photos</span>
          </Link>
        </div>
      ) : (
        <>
          {/* Patron Standings Cards */}
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
            {allStandings.map((patron, index) => {
              const rank = index + 1;
              const isLeader = rank === 1 && patron.totalDemerits > 0;

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
                          #{rank}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-athletic text-2xl font-bold uppercase tracking-wide text-[#F5F2EB]">
                              {patron.displayName}
                            </h3>
                            {isLeader && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#B87333]/25 border border-[#B87333] px-2 py-0.5 font-mono-docket text-[10px] font-bold uppercase text-[#E8B888]">
                                <Trophy className="h-3 w-3 text-[#B87333]" />
                                #1
                              </span>
                            )}
                          </div>
                          <p className="font-mono-docket text-[11px] text-[#9E8F82]">
                            {patron.slipCount} Uploaded {patron.slipCount === 1 ? 'Slip' : 'Slips'}
                            {patron.latestIncidentDate ? ` · ${patron.latestIncidentDate}` : ''}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Verified Metrics: Total Demerits | Net Score | Uploaded Slips */}
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
                          SLIPS
                        </span>
                        <span className="mt-0.5 block font-display-tall text-3xl font-bold text-[#F5F2EB]">
                          {patron.slipCount}
                        </span>
                      </div>
                    </div>

                    {/* Infractions from Uploaded Slips */}
                    {patron.recentInfractions.length > 0 && (
                      <div className="mt-3.5">
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
                      UPLOADED SLIP PHOTOS (TAP TO VIEW):
                    </span>
                    <div className="space-y-2">
                      {patron.slips.map((slip) => (
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
                                className="h-12 w-12 shrink-0 rounded-lg border border-[#B87333]/40 object-cover bg-black"
                              />
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 font-mono-docket text-xs text-[#E8B888]">
                                <span>{slip.incident_date}</span>
                                {slip.incident_time && <span>· {slip.incident_time}</span>}
                              </div>
                              <p className="truncate text-xs text-[#C4B8AC]">
                                Issued by {slip.issuerDisplayName}
                              </p>
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

          {/* Uploaded Slips Photo Strip (The 4 Uploaded Images) */}
          <section className="rounded-2xl border border-white/10 bg-[#171412] p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#B87333]" />
                <h2 className="font-athletic text-xl sm:text-2xl font-bold uppercase text-[#F5F2EB]">
                  UPLOADED SLIP EVIDENCE ({uploadedSlips.length}/{MAX_OFFICIAL_SLIPS})
                </h2>
              </div>
              {uploadedSlips.length < MAX_OFFICIAL_SLIPS && (
                <Link
                  to="/submit"
                  className="font-mono-docket text-xs text-[#E08A4E] hover:underline"
                >
                  + Upload Remaining ({MAX_OFFICIAL_SLIPS - uploadedSlips.length})
                </Link>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {uploadedSlips.map((slip) => (
                <button
                  key={slip.id}
                  type="button"
                  onClick={() => setSelectedSlip(slip)}
                  className="group relative overflow-hidden rounded-xl border border-white/15 bg-[#121212] text-left transition hover:border-[#B87333]"
                >
                  <div className="aspect-[3/4] w-full overflow-hidden bg-black">
                    {slip.image_url && (
                      <img
                        src={slip.image_url}
                        alt={`Slip for ${slip.patronDisplayName}`}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="p-2.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate font-athletic text-base font-bold uppercase text-[#F5F2EB]">
                        {slip.patronDisplayName}
                      </span>
                      <span className="rounded bg-[#B87333] px-1.5 py-0.5 font-mono-docket text-[10px] font-bold text-[#121212]">
                        +{slip.demerit_count}
                      </span>
                    </div>
                    <p className="truncate font-mono-docket text-[10px] text-[#9E8F82] mt-0.5">
                      {slip.incident_date} · {slip.issuerDisplayName}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      <SlipModalViewer slip={selectedSlip} onClose={() => setSelectedSlip(null)} />
    </div>
  );
};
