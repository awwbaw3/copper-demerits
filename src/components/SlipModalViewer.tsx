import React, { useEffect, useRef, useState } from 'react';
import { EnrichedDemeritSlip } from '../types/demerits';
import { formatTime12h } from './PhysicalSlipCard';
import {
  X,
  ShieldCheck,
  UserCheck,
  Calendar,
  Clock,
  MapPin,
  Fingerprint,
  CheckSquare,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';

interface SlipModalViewerProps {
  slip: EnrichedDemeritSlip | null;
  onClose: () => void;
}

export const SlipModalViewer: React.FC<SlipModalViewerProps> = ({ slip, onClose }) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [activePhotoTab, setActivePhotoTab] = useState<'primary' | 'secondary' | 'source'>('primary');

  useEffect(() => {
    setActivePhotoTab('primary');
  }, [slip?.id]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (slip) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [slip]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      onClose();
    };

    const handleClick = (event: MouseEvent) => {
      if ('closedBy' in HTMLDialogElement.prototype) return;
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isDialogContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;

      if (!isDialogContent) {
        dialog.close();
      }
    };

    dialog.addEventListener('close', handleClose);
    dialog.addEventListener('click', handleClick);
    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('click', handleClick);
    };
  }, [onClose]);

  const currentImageUrl =
    activePhotoTab === 'secondary' && slip?.secondary_image_url
      ? slip.secondary_image_url
      : activePhotoTab === 'source' && slip?.source_image_url
      ? slip.source_image_url
      : slip?.image_url;

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby="slipModalTitle"
      className="m-auto w-[95vw] max-w-2xl rounded-2xl border border-[#B87333]/50 bg-[#181513] p-0 text-[#F5F2EB] shadow-[0_25px_70px_rgba(0,0,0,0.9)] open:flex open:flex-col"
    >
      {slip && (
        <div className="flex max-h-[90vh] flex-col overflow-hidden">
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-[#1F1A17] px-4 sm:px-5 py-3.5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-block rounded bg-[#B87333]/20 px-2 py-0.5 font-mono-docket text-[10px] font-bold uppercase text-[#E08A4E]">
                  VERIFIED SLIP EVIDENCE
                </span>
                {slip.incident_time && (
                  <span className="inline-block rounded bg-[#C86D51]/20 border border-[#C86D51]/40 px-2 py-0.5 font-mono-docket text-[10px] font-bold text-[#F5F2EB]">
                    {formatTime12h(slip.incident_time)}
                  </span>
                )}
              </div>
              <h2
                id="slipModalTitle"
                className="mt-1 truncate font-athletic text-xl sm:text-2xl font-bold uppercase tracking-wide text-[#F5F2EB]"
              >
                {slip.patronDisplayName} · +{slip.demerit_count}{' '}
                {slip.demerit_count === 1 ? 'Demerit' : 'Demerits'} ({slip.location_area})
              </h2>
            </div>

            <form method="dialog">
              <button
                type="submit"
                aria-label="Close slip viewer"
                className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-[#B5A99D] transition hover:border-[#B87333] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </form>
          </div>

          {/* Modal Body */}
          <div className="overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* Multi-Capture / Source Photo Switcher */}
            {(slip.secondary_image_url || slip.source_image_url) && (
              <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#B87333]/30 bg-[#121212] p-1.5">
                <button
                  type="button"
                  onClick={() => setActivePhotoTab('primary')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono-docket text-[11px] font-bold transition ${
                    activePhotoTab === 'primary'
                      ? 'bg-[#B87333] text-[#121212]'
                      : 'text-[#C4B8AC] hover:text-white'
                  }`}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  <span>
                    {slip.secondary_image_url ? 'Scan View (9:23 PM)' : 'Individual Slip Crop'}
                  </span>
                </button>

                {slip.secondary_image_url && (
                  <button
                    type="button"
                    onClick={() => setActivePhotoTab('secondary')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono-docket text-[11px] font-bold transition ${
                      activePhotoTab === 'secondary'
                        ? 'bg-[#B87333] text-[#121212]'
                        : 'text-[#C4B8AC] hover:text-white'
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span>Bar Photo Crop (9:13 PM)</span>
                  </button>
                )}

                {slip.source_image_url && (
                  <button
                    type="button"
                    onClick={() => setActivePhotoTab('source')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono-docket text-[11px] font-bold transition ${
                      activePhotoTab === 'source'
                        ? 'bg-[#B87333] text-[#121212]'
                        : 'text-[#C4B8AC] hover:text-white'
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span>Full 3-Slip Bar Photo (20261017_211324.jpg)</span>
                  </button>
                )}
              </div>
            )}

            {currentImageUrl && (
              <div className="overflow-hidden rounded-xl border-2 border-[#B87333]/40 bg-black">
                <img
                  src={currentImageUrl}
                  alt={`Uploaded demerit slip for ${slip.patronDisplayName}`}
                  className="mx-auto max-h-[52vh] w-auto object-contain"
                />
              </div>
            )}

            {slip.capture_note && (
              <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-3.5 py-2.5 font-mono-docket text-[11px] text-emerald-300">
                <Fingerprint className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>{slip.capture_note}</span>
              </div>
            )}

            {/* Itemized Infractions */}
            {slip.infractions.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-[#121212] p-4">
                <span className="block font-mono-docket text-[10px] font-bold uppercase tracking-widest text-[#B87333] mb-2">
                  REASON FOR DEMERITS (TRANSCRIBED FROM SLIP):
                </span>
                <ul className="space-y-1.5">
                  {slip.infractions.map((inf, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-[#F5F2EB]">
                      <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#C86D51]" />
                      <span>
                        {slip.infractions.length > 1 ? `${idx + 1}) ` : ''}
                        {inf}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Patron & Staff Signature Details */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-xl border border-white/10 bg-[#121212] p-3.5">
                <div className="flex items-center gap-1.5 text-[#9E8F82] font-mono-docket">
                  <UserCheck className="h-3.5 w-3.5 text-[#B87333]" />
                  <span>STUDENT (PATRON)</span>
                </div>
                <p className="mt-1 font-athletic text-lg font-bold uppercase text-[#F5F2EB]">
                  {slip.patronDisplayName}
                </p>
                <p className="font-mono-docket text-[11px] text-[#9E8F82]">
                  Written on slip: &ldquo;{slip.raw_student}&rdquo;
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#121212] p-3.5">
                <div className="flex items-center gap-1.5 text-[#9E8F82] font-mono-docket">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#C86D51]" />
                  <span>ISSUED BY (NORMALIZED)</span>
                </div>
                <p className="mt-1 font-athletic text-lg font-bold uppercase text-[#F5F2EB]">
                  {slip.issuerDisplayName}
                </p>
                <p className="font-mono-docket text-[11px] text-[#9E8F82]">
                  Signature on slip: &ldquo;{slip.raw_signature}&rdquo;
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 font-mono-docket text-[11px] text-[#9E8F82]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-[#B87333]" />
                  {slip.incident_date}
                </span>
                {slip.incident_time && (
                  <span className="flex items-center gap-1 text-[#E8B888]">
                    <Clock className="h-3.5 w-3.5 text-[#C86D51]" />
                    {formatTime12h(slip.incident_time)}
                  </span>
                )}
                {slip.location_area && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-[#B87333]" />
                    Room: {slip.location_area}
                  </span>
                )}
              </div>

              {(slip.image_dhash || slip.image_sha256) && (
                <span className="flex items-center gap-1 text-emerald-400">
                  <Fingerprint className="h-3.5 w-3.5" />
                  SHA/dHash Verified #{(slip.image_dhash || slip.image_sha256 || '').slice(0, 8)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
};
