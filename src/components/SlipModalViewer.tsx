import React, { useEffect, useRef, useState } from 'react';
import { EnrichedDemeritSlip } from '../types/demerits';
import { PhysicalSlipCard, formatTime12h } from './PhysicalSlipCard';
import { X, FileText, Image as ImageIcon, ShieldCheck, UserCheck, Sparkles } from 'lucide-react';

interface SlipModalViewerProps {
  slip: EnrichedDemeritSlip | null;
  onClose: () => void;
}

export const SlipModalViewer: React.FC<SlipModalViewerProps> = ({ slip, onClose }) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [viewMode, setViewMode] = useState<'replica' | 'photo'>('replica');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (slip) {
      setViewMode(slip.image_url ? 'photo' : 'replica');
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [slip]);

  // Modern Web Guidance: Light-dismiss fallback for browsers without native <dialog closedby="any">
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

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby="slipModalTitle"
      className="m-auto w-full max-w-2xl rounded-2xl border border-[#B87333]/50 bg-[#181513] p-0 text-[#F5F2EB] shadow-[0_25px_70px_rgba(0,0,0,0.9)] open:flex open:flex-col"
    >
      {slip && (
        <div className="flex max-h-[90vh] flex-col overflow-hidden">
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-[#1F1A17] px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-[#B87333]/20 px-2 py-0.5 font-mono-docket text-[11px] font-bold uppercase text-[#E08A4E]">
                  OFFICIAL DOCKET RECORD
                </span>
                <span className="font-mono-docket text-xs text-[#9E8F82]">
                  #{slip.id.slice(-6).toUpperCase()}
                </span>
              </div>
              <h2
                id="slipModalTitle"
                className="mt-1 font-athletic text-xl sm:text-2xl font-bold uppercase tracking-wide text-[#F5F2EB]"
              >
                {slip.patronDisplayName} · {slip.demerit_count}{' '}
                {slip.demerit_count === 1 ? 'Demerit' : 'Demerits'}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {slip.image_url && (
                <div className="flex rounded-lg border border-white/10 bg-[#121212] p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('photo')}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-mono-docket transition ${
                      viewMode === 'photo'
                        ? 'bg-[#B87333] text-[#121212] font-bold'
                        : 'text-[#B5A99D] hover:text-white'
                    }`}
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('replica')}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-mono-docket transition ${
                      viewMode === 'replica'
                        ? 'bg-[#B87333] text-[#121212] font-bold'
                        : 'text-[#B5A99D] hover:text-white'
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Slip
                  </button>
                </div>
              )}

              <form method="dialog">
                <button
                  type="submit"
                  aria-label="Close slip viewer"
                  className="rounded-lg border border-white/10 bg-white/5 p-2 text-[#B5A99D] transition hover:border-[#B87333] hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </form>
            </div>
          </div>

          {/* Modal Body */}
          <div className="overflow-y-auto p-5 sm:p-6 space-y-5">
            {viewMode === 'photo' && slip.image_url ? (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-xl border-2 border-[#B87333]/40 bg-black">
                  <img
                    src={slip.image_url}
                    alt={`Uploaded demerit slip for ${slip.patronDisplayName}`}
                    className="mx-auto max-h-[460px] w-auto object-contain"
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-[#9E8F82] font-mono-docket">
                  <span>Captured & Uploaded to Ring of Honor `slips` Bucket</span>
                  <button
                    type="button"
                    onClick={() => setViewMode('replica')}
                    className="text-[#E08A4E] underline hover:text-[#B87333]"
                  >
                    Switch to Transcribed Slip Replica →
                  </button>
                </div>
              </div>
            ) : (
              <PhysicalSlipCard slip={slip} />
            )}

            {/* Normalization & Audit Breakdown */}
            <div className="rounded-xl border border-[#B87333]/25 bg-[#121212]/90 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-mono-docket uppercase tracking-wider text-[#B87333]">
                <Sparkles className="h-4 w-4" />
                <span>Ring of Honor Normalization Audit</span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                <div className="rounded-lg border border-white/5 bg-[#1A1715] p-3">
                  <div className="flex items-center gap-1.5 text-[#9E8F82] font-mono-docket">
                    <UserCheck className="h-3.5 w-3.5 text-[#B87333]" />
                    <span>RECIPIENT PATRON</span>
                  </div>
                  <p className="mt-1 font-semibold text-sm text-[#F5F2EB]">
                    {slip.patronDisplayName}
                  </p>
                  <p className="mt-0.5 font-mono-docket text-[11px] text-[#9E8F82]">
                    Written as: &ldquo;{slip.raw_student}&rdquo;
                  </p>
                </div>

                <div className="rounded-lg border border-white/5 bg-[#1A1715] p-3">
                  <div className="flex items-center gap-1.5 text-[#9E8F82] font-mono-docket">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#C86D51]" />
                    <span>ISSUING STAFF ENFORCER</span>
                  </div>
                  <p className="mt-1 font-semibold text-sm text-[#F5F2EB]">
                    {slip.issuerDisplayName}
                  </p>
                  <p className="mt-0.5 font-mono-docket text-[11px] text-[#9E8F82]">
                    Signed as: &ldquo;{slip.raw_signature}&rdquo;
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-2.5 font-mono-docket text-[11px] text-[#8E8074]">
                <span>
                  LOGGED: {slip.incident_date} @ {formatTime12h(slip.incident_time)}
                </span>
                <span>ROOM: {slip.location_area}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
};
