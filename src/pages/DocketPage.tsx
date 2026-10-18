import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDemerits } from '../context/DemeritsContext';
import { EnrichedDemeritSlip } from '../types/demerits';
import { SlipModalViewer } from '../components/SlipModalViewer';
import { formatTime12h } from '../components/PhysicalSlipCard';
import {
  FileText,
  Search,
  Calendar,
  Clock,
  MapPin,
  CheckSquare,
  Award,
  Camera,
  Fingerprint,
  Layers,
  Tag,
} from 'lucide-react';

export const DocketPage: React.FC = () => {
  const { demerits, uploadedSourceFiles } = useDemerits();
  const [selectedSlip, setSelectedSlip] = useState<EnrichedDemeritSlip | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'citations' | 'source-files'>('citations');

  const uploadedSlips = useMemo(
    () =>
      demerits
        .filter((s) => s.status === 'approved' && Boolean(s.image_url))
        .sort((a, b) => {
          const d = a.incident_date.localeCompare(b.incident_date);
          if (d !== 0) return d;
          return (a.incident_time || '').localeCompare(b.incident_time || '');
        }),
    [demerits]
  );

  const filteredSlips = useMemo(() => {
    if (!searchQuery.trim()) return uploadedSlips;
    const q = searchQuery.toLowerCase();
    return uploadedSlips.filter((slip) => {
      return (
        slip.patronDisplayName.toLowerCase().includes(q) ||
        slip.raw_student.toLowerCase().includes(q) ||
        slip.issuerDisplayName.toLowerCase().includes(q) ||
        slip.raw_signature.toLowerCase().includes(q) ||
        slip.location_area.toLowerCase().includes(q) ||
        (slip.incident_time || '').toLowerCase().includes(q) ||
        slip.resolvedItems.some(
          (item) =>
            item.description.toLowerCase().includes(q) || item.type.toLowerCase().includes(q)
        )
      );
    });
  }, [uploadedSlips, searchQuery]);

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-5 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#B87333]/30 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#B87333]/40 bg-[#B87333]/10 px-3 py-1 text-[11px] font-mono-docket uppercase tracking-widest text-[#E8B888]">
            <FileText className="h-3.5 w-3.5 text-[#B87333]" />
            <span>
              4 SLIP CAPTURES ACROSS 2 IMAGES → {uploadedSlips.length} UNIQUE CITATIONS
            </span>
          </div>
          <h1 className="mt-2 font-athletic text-3xl sm:text-5xl font-extrabold uppercase tracking-wide text-[#F5F2EB]">
            THE <span className="text-[#B87333]">DOCKET</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#B5A99D]">
            Chronological slip log with itemized demerit types and point counts from{' '}
            <code className="text-[#E8B888]">20261017_211324.jpg</code> (8:50 PM, 8:56 PM, 9:09 PM)
            and <code className="text-[#E8B888]">Scan_20261017_212309.jpg</code> (9:09 PM Rick —
            deduplicated).
          </p>
        </div>

        <Link
          to="/submit"
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl bg-[#B87333] px-4 py-2.5 font-athletic text-sm font-bold uppercase tracking-wider text-[#121212] shadow transition hover:bg-[#C86D51]"
        >
          <Camera className="h-4 w-4" />
          <span>Log Slip Photo</span>
        </Link>
      </div>

      {/* View Switcher + Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-[#B87333]/30 bg-[#1A1614] p-1 self-start">
          <button
            type="button"
            onClick={() => setViewMode('citations')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-athletic uppercase tracking-wider transition ${
              viewMode === 'citations'
                ? 'bg-[#B87333] text-[#121212] font-bold'
                : 'text-[#B5A99D] hover:text-white'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>3 Unique Citations (By Time)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('source-files')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-athletic uppercase tracking-wider transition ${
              viewMode === 'source-files'
                ? 'bg-[#B87333] text-[#121212] font-bold'
                : 'text-[#B5A99D] hover:text-white'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>2 Source Images (3 + 1 Slips)</span>
          </button>
        </div>

        {viewMode === 'citations' && (
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9E8F82]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by patron, demerit type, time, room, or reason..."
              className="w-full rounded-xl border border-white/10 bg-[#1A1715] pl-10 pr-4 py-2.5 text-xs sm:text-sm text-[#F5F2EB] placeholder-[#7D7065] focus:border-[#B87333] focus:outline-none"
            />
          </div>
        )}
      </div>

      {viewMode === 'source-files' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {uploadedSourceFiles.map((src) => (
            <div
              key={src.id}
              className="rounded-2xl border border-[#B87333]/35 bg-[#1A1715] p-4 sm:p-6 space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-block rounded bg-[#B87333] px-2.5 py-0.5 font-mono-docket text-[10px] font-bold uppercase text-[#121212]">
                    {src.slipCountInImage}{' '}
                    {src.slipCountInImage === 1 ? 'SLIP IN IMAGE' : 'SLIPS IN IMAGE'}
                  </span>
                  <h2 className="mt-1 font-mono-docket text-base font-bold text-[#F5F2EB]">
                    {src.filename}
                  </h2>
                  <p className="font-mono-docket text-xs text-[#9E8F82]">
                    Photo Timestamp: {src.capturedAt}
                  </p>
                </div>
                <span className="rounded border border-emerald-500/30 bg-emerald-950/30 px-2 py-1 font-mono-docket text-[10px] text-emerald-300">
                  SHA #{src.sha256.slice(0, 8)}
                </span>
              </div>

              <div className="overflow-hidden rounded-xl border border-white/15 bg-black">
                <img
                  src={src.imageUrl}
                  alt={src.filename}
                  className="mx-auto max-h-72 w-auto object-contain"
                />
              </div>

              <p className="text-xs sm:text-sm text-[#C4B8AC]">{src.description}</p>

              <div className="space-y-2 border-t border-white/10 pt-3">
                <span className="block font-mono-docket text-[10px] font-bold uppercase tracking-wider text-[#E8B888]">
                  EXTRACTED SLIPS FROM THIS IMAGE:
                </span>
                {src.extractedSlips.map((ex, i) => {
                  const matched = uploadedSlips.find((s) => s.id === ex.slipId);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => matched && setSelectedSlip(matched)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#121212] p-3 text-left transition hover:border-[#B87333]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={ex.cropUrl}
                          alt={ex.label}
                          className="h-12 w-16 rounded-lg border border-[#B87333]/40 object-cover bg-black shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-athletic text-lg font-bold uppercase text-[#F5F2EB]">
                            {ex.student} · {ex.time} · {ex.room}
                          </p>
                          <p className="truncate font-mono-docket text-[11px] text-[#9E8F82]">
                            {ex.label}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-lg px-2.5 py-1 font-mono-docket text-xs font-bold ${
                          ex.isDeduplicatedMerge
                            ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                            : 'bg-[#C86D51]/20 border border-[#C86D51]/40 text-[#E08A4E]'
                        }`}
                      >
                        {ex.isDeduplicatedMerge ? 'MERGED (DEDUP)' : `+${ex.demerits} PTS`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Unique Citations Grid */
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {filteredSlips.map((slip, idx) => (
            <article
              key={slip.id}
              className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-white/15 bg-[#1A1715] shadow-lg transition hover:border-[#B87333]"
            >
              {slip.image_url && (
                <button
                  type="button"
                  onClick={() => setSelectedSlip(slip)}
                  className="relative block aspect-[4/3] w-full overflow-hidden bg-black text-left"
                >
                  <img
                    src={slip.image_url}
                    alt={`Uploaded slip for ${slip.patronDisplayName}`}
                    className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                  <span className="absolute top-2.5 left-2.5 rounded-lg bg-black/85 border border-[#B87333]/50 px-2.5 py-1 font-mono-docket text-[10px] font-bold text-[#E8B888]">
                    SLIP #{idx + 1} · {formatTime12h(slip.incident_time)}
                  </span>
                  <span className="absolute bottom-2.5 right-2.5 rounded-lg bg-black/80 border border-[#B87333]/50 px-2.5 py-1 font-mono-docket text-[10px] text-[#E8B888]">
                    {slip.secondary_image_url
                      ? 'Tap to Switch Scan / Bar Photo'
                      : 'Tap to View Crop & Full Bar Photo'}
                  </span>
                </button>
              )}

              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 font-mono-docket text-xs text-[#B5A99D]">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-[#B87333]" />
                          {slip.incident_date}
                        </span>
                        {slip.incident_time && (
                          <span className="flex items-center gap-1 text-[#E8B888] font-bold">
                            <Clock className="h-3.5 w-3.5 text-[#C86D51]" />
                            {formatTime12h(slip.incident_time)}
                          </span>
                        )}
                      </div>

                      <h2 className="mt-1 font-athletic text-2xl sm:text-3xl font-bold uppercase text-[#F5F2EB]">
                        {slip.patronDisplayName}
                      </h2>

                      {slip.location_area && (
                        <div className="mt-0.5 flex items-center gap-1 font-mono-docket text-[11px] text-[#9E8F82]">
                          <MapPin className="h-3 w-3 text-[#B87333]" />
                          <span>Room: {slip.location_area}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-[#C86D51] bg-[#C86D51]/15 px-3.5 py-1.5 text-center shrink-0">
                      <span className="font-display-tall text-3xl font-extrabold leading-none text-[#E08A4E]">
                        +{slip.demerit_count}
                      </span>
                      <span className="font-mono-docket text-[9px] font-bold uppercase text-[#D6C7B8]">
                        {slip.demerit_count === 1 ? 'DEMERIT' : 'DEMERITS'}
                      </span>
                    </div>
                  </div>

                  {/* Itemized Demerit Types & Points */}
                  {slip.resolvedItems.length > 0 && (
                    <div className="mt-3.5 rounded-xl border border-white/10 bg-[#121212] p-3 space-y-2">
                      <span className="block font-mono-docket text-[10px] font-bold uppercase tracking-wider text-[#9E8F82]">
                        ITEMIZED DEMERIT TYPES &amp; COUNTS:
                      </span>
                      <ul className="space-y-2">
                        {slip.resolvedItems.map((item, i) => (
                          <li
                            key={i}
                            className="flex flex-col gap-1 border-b border-white/5 pb-1.5 last:border-none last:pb-0"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1 rounded bg-[#B87333]/20 border border-[#B87333]/40 px-1.5 py-0.5 font-mono-docket text-[10px] font-bold text-[#E8B888]">
                                <Tag className="h-2.5 w-2.5" />
                                {item.type}
                              </span>
                              <span className="font-mono-docket text-[10px] font-bold text-[#E08A4E]">
                                +{item.points} {item.points === 1 ? 'PT' : 'PTS'}
                              </span>
                            </div>
                            <div className="flex items-start gap-1.5 text-xs sm:text-sm text-[#F5F2EB]">
                              <CheckSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#C86D51]" />
                              <span>
                                {slip.resolvedItems.length > 1 ? `${i + 1}) ` : ''}
                                {item.description}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {slip.capture_note && (
                    <p className="mt-2.5 font-mono-docket text-[10px] text-[#9E8F82] leading-relaxed">
                      {slip.capture_note}
                    </p>
                  )}
                </div>

                {/* Footer: Normalized Staff Signature + Hash */}
                <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Award className="h-3.5 w-3.5 text-[#B87333]" />
                      <span className="font-mono-docket text-xs font-bold uppercase text-[#F5F2EB]">
                        {slip.issuerDisplayName}
                      </span>
                    </div>
                    <p className="font-mono-docket text-[10px] text-[#9E8F82]">
                      Signed: &ldquo;{slip.raw_signature}&rdquo;
                    </p>
                  </div>

                  <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 font-mono-docket text-[10px] text-emerald-300">
                    <Fingerprint className="h-3 w-3" />
                    {slip.secondary_image_url ? '2 Uploads Merged' : 'Multi-Slip Extracted'}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <SlipModalViewer slip={selectedSlip} onClose={() => setSelectedSlip(null)} />
    </div>
  );
};
