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
  Tag,
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
      className="m-auto w-[96vw] max-w-2xl rounded-3xl border-2 border-[#B87333]/60 bg-[#181513] p-0 text-[#F5F2EB] shadow-[0_25px_80px_rgba(0,0,0,0.95)] open:flex open:flex-col pt-[env(safe-area-inset-top,8px)] pb-[env(safe-area-inset-bottom,8px)]"
    >
      {slip && (
        <div className="flex max-h-[88vh] flex-col overflow-hidden">
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-[#1F1A17] px-4 sm:px-5 py-3">
            <div className="min-w-0 pr-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-block rounded-lg bg-[#B87333]/20 px-2 py-0.5 font-mono-docket text-[10px] font-bold uppercase text-[#E08A4E]">
                  VERIFIED SLIP EVIDENCE
                </span>
                {slip.incident_time && (
                  <span className="inline-block rounded-lg bg-[#C86D51]/20 border border-[#C86D51]/40 px-2 py-0.5 font-mono-docket text-[10px] font-bold text-[#F5F2EB]">
                    {formatTime12h(slip.incident_time)}
                  </span>
                )}
              </div>
              <h2
                id="slipModalTitle"
                className="mt-1 truncate font-sans text-lg sm:text-xl font-black uppercase tracking-tight text-[#F5F2EB]"
              >
                {slip.patronDisplayName} · +{slip.demerit_count}{' '}
                {slip.demerit_count === 1 ? 'Demerit' : 'Demerits'} ({slip.location_area})
              </h2>
            </div>

            <form method="dialog">
              <button
                type="submit"
                aria-label="Close slip viewer"
                className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border border-white/15 bg-white/5 p-2 text-[#D6C7B8] transition hover:border-[#B87333] hover:text-white active:scale-95 touch-manipulation cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </form>
          </div>

          {/* Modal Body */}
          <div className="overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* Multi-Capture / Source Photo Switcher */}
            {(slip.secondary_image_url || slip.source_image_url) && (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#B87333]/40 bg-[#121212] p-1.5">
                <button
                  type="button"
                  onClick={() => setActivePhotoTab('primary')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 min-h-[44px] font-sans text-xs font-bold uppercase tracking-tight transition touch-manipulation active:scale-95 cursor-pointer ${
                    activePhotoTab === 'primary'
                      ? 'bg-[#B87333] text-[#121212] font-black'
                      : 'text-[#D6C7B8] hover:text-white'
                  }`}
                >
                  <ImageIcon className="h-4 w-4" />
                  <span>
                    {slip.secondary_image_url ? 'Scan View (9:23 PM)' : 'Individual Slip Crop'}
                  </span>
                </button>

                {slip.secondary_image_url && (
                  <button
                    type="button"
                    onClick={() => setActivePhotoTab('secondary')}
                    className={`flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 min-h-[44px] font-sans text-xs font-bold uppercase tracking-tight transition touch-manipulation active:scale-95 cursor-pointer ${
                      activePhotoTab === 'secondary'
                        ? 'bg-[#B87333] text-[#121212] font-black'
                        : 'text-[#D6C7B8] hover:text-white'
                    }`}
                  >
                    <Layers className="h-4 w-4" />
                    <span>Bar Photo Crop (9:13 PM)</span>
                  </button>
                )}

                {slip.source_image_url && (
                  <button
                    type="button"
                    onClick={() => setActivePhotoTab('source')}
                    className={`flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 min-h-[44px] font-sans text-xs font-bold uppercase tracking-tight transition touch-manipulation active:scale-95 cursor-pointer ${
                      activePhotoTab === 'source'
                        ? 'bg-[#B87333] text-[#121212] font-black'
                        : 'text-[#D6C7B8] hover:text-white'
                    }`}
                  >
                    <Layers className="h-4 w-4" />
                    <span>Full 3-Slip Bar Photo</span>
                  </button>
                )}
              </div>
            )}

            {currentImageUrl && (
              <div className="relative overflow-hidden rounded-xl border-2 border-[#B87333]/40 bg-black">
                <img
                  src={currentImageUrl}
                  alt={`Uploaded demerit slip for ${slip.patronDisplayName}`}
                  className={`mx-auto max-h-[52vh] w-auto object-contain ${
                    slip.is_blurred ? 'blur-md' : ''
                  }`}
                />
                {slip.is_blurred && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/45 p-4 text-center">
                    <span className="rounded-2xl border-2 border-amber-400 bg-black/90 px-4 py-2 font-athletic text-lg font-black uppercase tracking-wider text-amber-300">
                      🦓 Referee Blurred — Friendly Vibes Only
                    </span>
                  </div>
                )}
              </div>
            )}

            {slip.capture_note && (
              <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-3.5 py-2.5 font-mono-docket text-[11px] text-emerald-300">
                <Fingerprint className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>{slip.capture_note}</span>
              </div>
            )}

            {/* Itemized Demerit Types & Points */}
            {slip.resolvedItems.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-[#121212] p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono-docket text-[10px] font-bold uppercase tracking-widest text-[#B87333]">
                    ITEMIZED DEMERIT TYPES &amp; POINTS ON SLIP:
                  </span>
                  <span className="font-mono-docket text-[11px] font-bold text-[#E08A4E]">
                    TOTAL: +{slip.demerit_count} {slip.demerit_count === 1 ? 'DEMERIT' : 'DEMERITS'}
                  </span>
                </div>
                <ul className="space-y-2">
                  {slip.resolvedItems.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#1A1715] p-2.5"
                    >
                      <div className="flex items-start gap-2 text-sm text-[#F5F2EB]">
                        <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#C86D51]" />
                        <div>
                          <span className="inline-flex items-center gap-1 rounded bg-[#B87333]/20 border border-[#B87333]/40 px-2 py-0.5 font-mono-docket text-[10px] font-bold text-[#E8B888] mb-1">
                            <Tag className="h-2.5 w-2.5" />
                            {item.type}
                          </span>
                          <p className="text-xs sm:text-sm text-[#F5F2EB]">
                            {slip.resolvedItems.length > 1 ? `${idx + 1}) ` : ''}
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <span className="self-end sm:self-center shrink-0 rounded-lg bg-[#C86D51]/20 border border-[#C86D51]/40 px-2.5 py-1 font-mono-docket text-xs font-bold text-[#E08A4E]">
                        +{item.points} {item.points === 1 ? 'DEMERIT' : 'DEMERITS'}
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
