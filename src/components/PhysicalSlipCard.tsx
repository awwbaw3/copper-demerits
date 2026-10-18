import React from 'react';
import { EnrichedDemeritSlip } from '../types/demerits';
import { CheckSquare, MapPin, Clock, Calendar, Award } from 'lucide-react';

interface PhysicalSlipCardProps {
  slip: Pick<
    EnrichedDemeritSlip,
    | 'id'
    | 'raw_student'
    | 'patronDisplayName'
    | 'raw_signature'
    | 'issuerDisplayName'
    | 'demerit_count'
    | 'incident_date'
    | 'incident_time'
    | 'location_area'
    | 'infractions'
    | 'matchedAlias'
  >;
  compact?: boolean;
}

export function formatTime12h(timeStr: string | null): string {
  if (!timeStr) return 'Night Shift';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const hour24 = parseInt(parts[0], 10);
  const minute = parts[1];
  if (isNaN(hour24)) return timeStr;
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${minute} ${period} (${timeStr.slice(0, 5)})`;
}

export const PhysicalSlipCard: React.FC<PhysicalSlipCardProps> = ({ slip, compact = false }) => {
  const slipSerial = slip.id.slice(-6).toUpperCase();

  return (
    <div
      className={`relative overflow-hidden rounded-lg border-2 border-[#8C6D46] bg-[#F4E9CD] text-[#1C1917] shadow-[0_12px_32px_rgba(0,0,0,0.65)] ${
        compact ? 'p-4' : 'p-5 sm:p-7'
      }`}
      style={{
        backgroundImage:
          'radial-gradient(rgba(184, 115, 51, 0.08) 1px, transparent 0), linear-gradient(to bottom, #F7EED7 0%, #EFE1BC 100%)',
        backgroundSize: '16px 16px, 100% 100%',
      }}
    >
      {/* Top Perforation Edge Effect */}
      <div className="mb-3 flex items-center justify-between border-b-2 border-[#1C1917] pb-2.5">
        <div>
          <p className="font-mono-docket text-[10px] font-bold tracking-widest uppercase text-[#7C5832]">
            FORM CAC-ROH · MARSHALL, MI
          </p>
          <h3 className="font-athletic text-2xl sm:text-3xl font-extrabold tracking-wider uppercase text-[#1C1917]">
            DEMERIT SLIP
          </h3>
        </div>
        <div className="text-right">
          <span className="inline-block rounded border border-[#1C1917] bg-[#E8D5A7] px-2 py-0.5 font-mono-docket text-xs font-bold text-[#1C1917]">
            NO. #{slipSerial}
          </span>
          <p className="mt-1 font-mono-docket text-[10px] uppercase text-[#574B3D]">
            RING OF HONOR COPY
          </p>
        </div>
      </div>

      {/* Metadata Grid: Student / Date / Time / Location */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 border-b-2 border-dashed border-[#1C1917]/40 pb-3.5">
        <div className="rounded bg-[#FAF3E3]/80 px-3 py-2 border border-[#1C1917]/20">
          <span className="block font-mono-docket text-[10px] font-bold uppercase tracking-wider text-[#6B5A45]">
            STUDENT (PATRON):
          </span>
          <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-handwriting text-2xl sm:text-3xl font-bold text-[#152C5B]">
              {slip.patronDisplayName || slip.raw_student || 'Anonymous Patron'}
            </span>
            {slip.raw_student &&
              slip.raw_student.trim().toLowerCase() !==
                (slip.patronDisplayName || '').trim().toLowerCase() && (
                <span className="rounded bg-[#B87333]/20 px-1.5 py-0.5 font-mono-docket text-[10px] font-bold text-[#7C4414]">
                  Slip: &ldquo;{slip.raw_student}&rdquo;
                </span>
              )}
          </div>
        </div>

        <div className="rounded bg-[#FAF3E3]/80 px-3 py-2 border border-[#1C1917]/20">
          <span className="block font-mono-docket text-[10px] font-bold uppercase tracking-wider text-[#6B5A45]">
            LOCATION / AREA:
          </span>
          <div className="mt-1 flex items-center gap-1.5 font-handwriting text-xl sm:text-2xl font-bold text-[#1C1917]">
            <MapPin className="h-4 w-4 shrink-0 text-[#B87333]" />
            <span>{slip.location_area || 'Copper Athletic Club'}</span>
          </div>
        </div>

        <div className="rounded bg-[#FAF3E3]/80 px-3 py-2 border border-[#1C1917]/20">
          <span className="block font-mono-docket text-[10px] font-bold uppercase tracking-wider text-[#6B5A45]">
            INCIDENT DATE:
          </span>
          <div className="mt-1 flex items-center gap-1.5 font-mono-docket text-xs sm:text-sm font-bold text-[#1C1917]">
            <Calendar className="h-3.5 w-3.5 text-[#7C5832]" />
            <span>{slip.incident_date}</span>
          </div>
        </div>

        <div className="rounded bg-[#FAF3E3]/80 px-3 py-2 border border-[#1C1917]/20">
          <span className="block font-mono-docket text-[10px] font-bold uppercase tracking-wider text-[#6B5A45]">
            INCIDENT TIME:
          </span>
          <div className="mt-1 flex items-center gap-1.5 font-mono-docket text-xs sm:text-sm font-bold text-[#1C1917]">
            <Clock className="h-3.5 w-3.5 text-[#7C5832]" />
            <span>{formatTime12h(slip.incident_time)}</span>
          </div>
        </div>
      </div>

      {/* Itemized Infractions Checklist */}
      <div className="my-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono-docket text-xs font-bold uppercase tracking-wider text-[#1C1917]">
            ITEMIZED INFRACTIONS / OFFENSES CITED:
          </span>
          <span className="font-mono-docket text-[11px] font-bold text-[#8B261D]">
            [{slip.infractions.length} CITED]
          </span>
        </div>

        <ul className="space-y-2 rounded border border-[#1C1917]/30 bg-[#FAF3E3]/90 p-3">
          {slip.infractions.length > 0 ? (
            slip.infractions.map((infraction, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 border-b border-dashed border-[#1C1917]/15 pb-1.5 last:border-none last:pb-0"
              >
                <CheckSquare className="mt-1 h-4 w-4 shrink-0 text-[#991B1B]" />
                <span className="font-handwriting text-xl sm:text-2xl font-bold leading-snug text-[#152C5B]">
                  {infraction}
                </span>
              </li>
            ))
          ) : (
            <li className="font-handwriting text-xl text-[#6B5A45] italic">
              General disorderly bar conduct
            </li>
          )}
        </ul>
      </div>

      {/* Footer: Signature & Demerit Tally Box */}
      <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-4 border-t-2 border-[#1C1917] pt-3.5">
        <div className="flex-1">
          <span className="block font-mono-docket text-[10px] font-bold uppercase tracking-wider text-[#6B5A45]">
            STAFF SIGNATURE (AS WRITTEN ON SLIP):
          </span>
          <div className="mt-1 border-b-2 border-[#1C1917] pb-1">
            <span className="font-handwriting text-2xl sm:text-3xl font-bold text-[#7F1D1D]">
              &ldquo;{slip.raw_signature}&rdquo;
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded bg-[#1C1917] px-2 py-0.5 font-mono-docket text-[11px] font-bold text-[#F4E9CD]">
              <Award className="h-3 w-3 text-[#B87333]" />
              NORMALIZED ISSUER: {slip.issuerDisplayName.toUpperCase()}
            </span>
            {slip.matchedAlias && (
              <span className="rounded border border-[#7C5832]/40 bg-[#E8D5A7] px-2 py-0.5 font-mono-docket text-[10px] font-semibold text-[#4A3520]">
                ALIAS MATCH: &ldquo;{slip.matchedAlias}&rdquo;
              </span>
            )}
          </div>
        </div>

        {/* Demerit Count Stamp Box */}
        <div className="flex flex-col items-center justify-center rounded-md border-2 border-[#991B1B] bg-[#FEE2E2]/90 px-4 py-2 text-center shadow-inner">
          <span className="font-mono-docket text-[10px] font-bold uppercase tracking-widest text-[#991B1B]">
            DEMERITS ISSUED
          </span>
          <span className="font-display-tall text-4xl sm:text-5xl font-black leading-none text-[#991B1B]">
            {slip.demerit_count}
          </span>
        </div>
      </div>
    </div>
  );
};
