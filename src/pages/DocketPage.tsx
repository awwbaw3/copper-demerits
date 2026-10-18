import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDemerits } from '../context/DemeritsContext';
import { EnrichedDemeritSlip } from '../types/demerits';
import { MAX_OFFICIAL_SLIPS } from '../lib/defaultData';
import { SlipModalViewer } from '../components/SlipModalViewer';
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
} from 'lucide-react';

export const DocketPage: React.FC = () => {
  const { demerits } = useDemerits();
  const [selectedSlip, setSelectedSlip] = useState<EnrichedDemeritSlip | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Strictly approved slips with an uploaded photo
  const uploadedSlips = useMemo(
    () => demerits.filter((s) => s.status === 'approved' && Boolean(s.image_url)),
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
        slip.infractions.some((inf) => inf.toLowerCase().includes(q))
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
              UPLOADED SLIP ARCHIVE ({uploadedSlips.length}/{MAX_OFFICIAL_SLIPS})
            </span>
          </div>
          <h1 className="mt-2 font-athletic text-3xl sm:text-5xl font-extrabold uppercase tracking-wide text-[#F5F2EB]">
            THE <span className="text-[#B87333]">DOCKET</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#B5A99D]">
            Showing strictly the uploaded slip photos and their normalized staff signatures.
          </p>
        </div>

        <Link
          to="/submit"
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl bg-[#B87333] px-4 py-2.5 font-athletic text-sm font-bold uppercase tracking-wider text-[#121212] shadow transition hover:bg-[#C86D51]"
        >
          <Camera className="h-4 w-4" />
          <span>Upload Slip Photo</span>
        </Link>
      </div>

      {/* Search Bar */}
      {uploadedSlips.length > 0 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9E8F82]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search uploaded slips by patron, staff signature, or infraction..."
            className="w-full rounded-xl border border-white/10 bg-[#1A1715] pl-10 pr-4 py-3 text-xs sm:text-sm text-[#F5F2EB] placeholder-[#7D7065] focus:border-[#B87333] focus:outline-none"
          />
        </div>
      )}

      {/* Docket Feed Grid */}
      {filteredSlips.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#B87333]/40 bg-[#171412] p-10 text-center space-y-3">
          <p className="font-athletic text-2xl uppercase text-[#F5F2EB]">
            No Uploaded Slip Photos Found
          </p>
          <p className="text-xs font-mono-docket text-[#9E8F82]">
            Upload the 4 official demerit slip photos to view them on The Docket.
          </p>
          <Link
            to="/submit"
            className="inline-flex items-center gap-2 rounded-xl bg-[#B87333] px-4 py-2.5 font-athletic text-sm font-bold uppercase text-[#121212]"
          >
            <Camera className="h-4 w-4" />
            <span>Upload Slip Photo</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {filteredSlips.map((slip) => (
            <article
              key={slip.id}
              className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-white/15 bg-[#1A1715] shadow-lg transition hover:border-[#B87333]"
            >
              {/* Actual Uploaded Slip Photo */}
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
                  <span className="absolute bottom-2.5 right-2.5 rounded-lg bg-black/80 border border-[#B87333]/50 px-2.5 py-1 font-mono-docket text-[10px] text-[#E8B888]">
                    Tap to Enlarge Photo
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
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-[#C86D51]" />
                            {slip.incident_time}
                          </span>
                        )}
                      </div>

                      <h2 className="mt-1 font-athletic text-2xl sm:text-3xl font-bold uppercase text-[#F5F2EB]">
                        {slip.patronDisplayName}
                      </h2>

                      {slip.location_area && (
                        <div className="mt-0.5 flex items-center gap-1 font-mono-docket text-[11px] text-[#9E8F82]">
                          <MapPin className="h-3 w-3 text-[#B87333]" />
                          <span>{slip.location_area}</span>
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

                  {/* Infractions */}
                  {slip.infractions.length > 0 && (
                    <div className="mt-3.5 rounded-xl border border-white/10 bg-[#121212] p-3">
                      <ul className="space-y-1.5">
                        {slip.infractions.map((infraction, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-[#F5F2EB]">
                            <CheckSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#C86D51]" />
                            <span>{infraction}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
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

                  {(slip.image_dhash || slip.image_sha256) && (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 font-mono-docket text-[10px] text-emerald-300">
                      <Fingerprint className="h-3 w-3" />
                      Unique
                    </span>
                  )}
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
