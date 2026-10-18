import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDemerits } from '../context/DemeritsContext';
import { EnrichedDemeritSlip } from '../types/demerits';
import { SlipModalViewer } from '../components/SlipModalViewer';
import { formatTime12h } from '../components/PhysicalSlipCard';
import {
  FileText,
  Search,
  Filter,
  Calendar,
  Clock,
  MapPin,
  Eye,
  CheckSquare,
  Award,
  Camera,
  Image as ImageIcon,
} from 'lucide-react';

export const DocketPage: React.FC = () => {
  const { demerits, members } = useDemerits();
  const [selectedSlip, setSelectedSlip] = useState<EnrichedDemeritSlip | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatron, setSelectedPatron] = useState<string>('all');
  const [selectedIssuer, setSelectedIssuer] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');

  const approvedSlips = useMemo(
    () => demerits.filter((s) => s.status === 'approved'),
    [demerits]
  );

  const filteredSlips = useMemo(() => {
    return approvedSlips.filter((slip) => {
      if (monthFilter !== 'all' && !slip.incident_date.startsWith(monthFilter)) {
        return false;
      }
      if (selectedPatron === 'anonymous') {
        if (slip.patron_id !== null) return false;
      } else if (selectedPatron !== 'all') {
        if ((slip.patron?.id || slip.patron_id) !== selectedPatron) return false;
      }

      if (selectedIssuer !== 'all') {
        if ((slip.issuer?.id || slip.issuer_id) !== selectedIssuer) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inPatron = slip.patronDisplayName.toLowerCase().includes(q);
        const inRawStudent = slip.raw_student.toLowerCase().includes(q);
        const inIssuer = slip.issuerDisplayName.toLowerCase().includes(q);
        const inSig = slip.raw_signature.toLowerCase().includes(q);
        const inInfractions = slip.infractions.some((inf) => inf.toLowerCase().includes(q));
        return inPatron || inRawStudent || inIssuer || inSig || inInfractions;
      }

      return true;
    });
  }, [approvedSlips, monthFilter, selectedPatron, selectedIssuer, searchQuery]);

  const patronsList = useMemo(() => members.filter((m) => m.is_patron), [members]);
  const staffList = useMemo(() => members.filter((m) => m.is_staff), [members]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#B87333]/30 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#B87333]/40 bg-[#B87333]/10 px-3 py-1 text-xs font-mono-docket uppercase tracking-widest text-[#E8B888]">
            <FileText className="h-3.5 w-3.5 text-[#B87333]" />
            <span>CHRONOLOGICAL BAR LEDGER</span>
          </div>
          <h1 className="mt-2 font-athletic text-4xl sm:text-5xl font-extrabold uppercase tracking-wide text-[#F5F2EB]">
            THE <span className="text-[#B87333]">DOCKET</span>
          </h1>
          <p className="mt-1 text-sm text-[#B5A99D]">
            Every physical demerit slip logged at Copper Athletic Club, complete with itemized
            infractions, timestamps, and normalized staff signatures.
          </p>
        </div>

        <Link
          to="/submit"
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl bg-[#B87333] px-4 py-2.5 font-athletic text-sm font-bold uppercase tracking-wider text-[#121212] shadow transition hover:bg-[#C86D51]"
        >
          <Camera className="h-4 w-4" />
          <span>Submit New Slip</span>
        </Link>
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 rounded-2xl border border-white/10 bg-[#1A1715] p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9E8F82]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search infractions, signatures, patrons..."
            className="w-full rounded-xl border border-white/10 bg-[#121212] pl-9 pr-3 py-2 text-xs text-[#F5F2EB] placeholder-[#7D7065] focus:border-[#B87333] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 shrink-0 text-[#B87333]" />
          <select
            value={selectedPatron}
            onChange={(e) => setSelectedPatron(e.target.value)}
            aria-label="Filter by Patron"
            className="w-full rounded-xl border border-white/10 bg-[#121212] px-3 py-2 text-xs text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
          >
            <option value="all">All Patrons</option>
            {patronsList.map((p) => (
              <option key={p.id} value={p.id}>
                Patron: {p.display_name}
              </option>
            ))}
            <option value="anonymous">Anonymous Patron</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 shrink-0 text-[#C86D51]" />
          <select
            value={selectedIssuer}
            onChange={(e) => setSelectedIssuer(e.target.value)}
            aria-label="Filter by Staff Issuer"
            className="w-full rounded-xl border border-white/10 bg-[#121212] px-3 py-2 text-xs text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
          >
            <option value="all">All Staff Issuers</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>
                Issued by: {s.display_name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0 text-[#B87333]" />
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            aria-label="Filter by Month"
            className="w-full rounded-xl border border-white/10 bg-[#121212] px-3 py-2 text-xs text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
          >
            <option value="all">All Dates ({approvedSlips.length} Slips)</option>
            <option value="2026-10">October 2026</option>
            <option value="2026-09">September 2026</option>
          </select>
        </div>
      </div>

      {/* Docket Feed Grid */}
      {filteredSlips.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#171412] p-12 text-center">
          <p className="font-athletic text-2xl uppercase text-[#D6C7B8]">
            No Demerit Slips Match Your Filter
          </p>
          <p className="mt-1 text-xs font-mono-docket text-[#9E8F82]">
            Try clearing your search query or switching back to All Dates.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {filteredSlips.map((slip) => (
            <article
              key={slip.id}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-b from-[#1E1916] to-[#151210] p-6 shadow-lg transition-all hover:border-[#B87333]"
            >
              {/* Top Copper Bar Accent */}
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#B87333] via-[#C86D51] to-[#B87333]" />

              <div>
                {/* Slip Header Metadata */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-[#B87333]/20 border border-[#B87333]/40 px-2 py-0.5 font-mono-docket text-[10px] font-bold uppercase text-[#E8B888]">
                        SLIP #{slip.id.slice(-6).toUpperCase()}
                      </span>
                      <span className="flex items-center gap-1 font-mono-docket text-xs text-[#B5A99D]">
                        <Calendar className="h-3.5 w-3.5 text-[#B87333]" />
                        {slip.incident_date}
                      </span>
                      {slip.incident_time && (
                        <span className="flex items-center gap-1 font-mono-docket text-xs text-[#B5A99D]">
                          <Clock className="h-3.5 w-3.5 text-[#C86D51]" />
                          {formatTime12h(slip.incident_time)}
                        </span>
                      )}
                    </div>

                    <h2 className="mt-2 font-athletic text-3xl font-bold uppercase tracking-wide text-[#F5F2EB]">
                      {slip.patronDisplayName}
                    </h2>

                    <div className="mt-1 flex items-center gap-1.5 font-mono-docket text-xs text-[#9E8F82]">
                      <MapPin className="h-3.5 w-3.5 text-[#B87333]" />
                      <span>{slip.location_area}</span>
                    </div>
                  </div>

                  {/* Demerit Badge */}
                  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-[#C86D51] bg-[#C86D51]/15 px-4 py-2 text-center shrink-0">
                    <span className="font-display-tall text-4xl font-extrabold leading-none text-[#E08A4E]">
                      +{slip.demerit_count}
                    </span>
                    <span className="font-mono-docket text-[9px] font-bold uppercase tracking-widest text-[#D6C7B8]">
                      {slip.demerit_count === 1 ? 'DEMERIT' : 'DEMERITS'}
                    </span>
                  </div>
                </div>

                {/* Itemized Infractions List */}
                <div className="mt-5 rounded-xl border border-white/10 bg-[#121212]/90 p-4">
                  <span className="block font-mono-docket text-[10px] font-bold uppercase tracking-widest text-[#B87333] mb-2.5">
                    ITEMIZED INFRACTIONS ({slip.infractions.length}):
                  </span>
                  <ul className="space-y-2">
                    {slip.infractions.map((infraction, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-[#F5F2EB]">
                        <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#C86D51]" />
                        <span className="font-medium">{infraction}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Footer: Issuer Normalization + Slip Modal Button */}
              <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/10 pt-4">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-[#B87333]" />
                    <span className="font-mono-docket text-xs font-bold uppercase text-[#F5F2EB]">
                      ISSUER: {slip.issuerDisplayName}
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono-docket text-[11px] text-[#9E8F82]">
                    Signed raw: <span className="italic text-[#D6C7B8]">&ldquo;{slip.raw_signature}&rdquo;</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSlip(slip)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#B87333]/60 bg-[#B87333]/15 px-4 py-2 font-athletic text-xs font-bold uppercase tracking-wider text-[#E8B888] transition hover:bg-[#B87333] hover:text-[#121212]"
                >
                  {slip.image_url ? (
                    <>
                      <ImageIcon className="h-4 w-4" />
                      <span>View Slip &amp; Photo</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      <span>Inspect Slip Modal</span>
                    </>
                  )}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <SlipModalViewer slip={selectedSlip} onClose={() => setSelectedSlip(null)} />
    </div>
  );
};
