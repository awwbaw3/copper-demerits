import React, { useState, useEffect, useRef } from 'react';
import { EnrichedDemeritSlip, DemeritLineItem } from '../types/demerits';
import { useDemerits } from '../context/DemeritsContext';
import { DEMERIT_CATEGORIES } from '../lib/defaultData';
import { maskSensitiveInfraction } from '../lib/moderation';
import {
  X,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Tag,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Lock,
  KeyRound,
} from 'lucide-react';

interface CorrectSlipMistakeModalProps {
  slip: EnrichedDemeritSlip | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updatedSlip: EnrichedDemeritSlip) => void;
}

const COMMON_BAR_FOULS = [
  { label: 'Pulling a Deb Jarvis', category: 'Party Foul / Conduct', pts: 1 },
  { label: 'Too many seat moves', category: 'Bar Etiquette / Seating', pts: 1 },
  { label: 'Tried to order Gin & Diet Coke', category: 'Drink Crime / Order Foul', pts: 1 },
  { label: 'No call / no show to see Red Wings', category: 'Attendance / No-Show', pts: 1 },
  { label: 'Back talk, insubordinate', category: 'Insubordination / Defiance', pts: 1 },
  { label: 'Spilling a full beer', category: 'Bar Etiquette / Seating', pts: 1 },
  { label: 'Flying chair', category: 'Party Foul / Conduct', pts: 1 },
  { label: 'The headband', category: 'Attire / Headgear Foul', pts: 1 },
];

export const CorrectSlipMistakeModal: React.FC<CorrectSlipMistakeModalProps> = ({
  slip,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { members, currentMember, isAdminOrStaff, activePin, setIsProfileModalOpen, correctSlipMistake } = useDemerits();
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const [rawStudent, setRawStudent] = useState('');
  const [selectedPatronId, setSelectedPatronId] = useState<string>('');
  const [incidentDate, setIncidentDate] = useState('');
  const [incidentTime, setIncidentTime] = useState('');
  const [locationArea, setLocationArea] = useState('Copper Athletic Club');
  const [items, setItems] = useState<DemeritLineItem[]>([]);
  const [correctionNote, setCorrectionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isClaimedAndLoggedIn = Boolean(
    currentMember &&
      (currentMember.is_claimed ?? true) &&
      Boolean(activePin)
  );

  const isOwnDemerit = Boolean(
    isClaimedAndLoggedIn &&
      (currentMember?.id === slip?.patron_id ||
        (slip?.raw_student &&
          currentMember?.display_name?.trim().toLowerCase() ===
            slip.raw_student.trim().toLowerCase()))
  );

  const canEdit = Boolean(isAdminOrStaff || isOwnDemerit);

  // Sync state when slip opens
  useEffect(() => {
    if (slip) {
      setRawStudent(slip.raw_student || '');
      setSelectedPatronId(slip.patron_id || '');
      setIncidentDate(slip.incident_date || '');
      setIncidentTime(slip.incident_time || '');
      setLocationArea(slip.location_area || 'Copper Athletic Club');
      setCorrectionNote('');
      setErrorMsg(null);
      setSuccessMsg(null);

      if (slip.demerit_items && slip.demerit_items.length > 0) {
        setItems(slip.demerit_items.map((i) => ({ ...i })));
      } else if (slip.infractions && slip.infractions.length > 0) {
        setItems(
          slip.infractions.map((desc) => ({
            type: 'Party Foul / Conduct',
            description: desc,
            points: 1,
          }))
        );
      } else {
        setItems([{ type: 'Party Foul / Conduct', description: '', points: 1 }]);
      }
    }
  }, [slip]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const handleAddItem = () => {
    setItems((prev) => [...prev, { type: 'Party Foul / Conduct', description: '', points: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof DemeritLineItem, value: any) => {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, [field]: value } : it))
    );
  };

  const handleApplyPreset = (index: number, preset: { label: string; category: string; pts: number }) => {
    handleItemChange(index, 'description', preset.label);
    handleItemChange(index, 'type', preset.category);
    handleItemChange(index, 'points', preset.pts);
  };

  const totalPoints = items.reduce((sum, it) => sum + (Number(it.points) || 1), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slip) return;

    if (!canEdit) {
      setErrorMsg(
        'Referee Whistle: You can only correct your own demerits after claiming and logging in, or if you are an admin in the Ref Booth.'
      );
      return;
    }

    if (items.length === 0 || items.some((i) => !i.description.trim())) {
      setErrorMsg('Please specify at least one valid infraction description.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const infractions = items.map((i) => i.description.trim());
      const res = await correctSlipMistake(slip.id, {
        rawStudent: rawStudent.trim() || undefined,
        patronId: !isAdminOrStaff ? currentMember?.id : (selectedPatronId || null),
        infractions,
        demeritItems: items.map((it) => ({
          type: it.type,
          description: it.description.trim(),
          points: Number(it.points) || 1,
        })),
        demeritCount: totalPoints,
        incidentDate: incidentDate || undefined,
        incidentTime: incidentTime || null,
        locationArea: locationArea || undefined,
        correctionNote: correctionNote.trim() || undefined,
      });

      if (!res.ok) {
        setErrorMsg(res.error || 'Failed to update slip.');
        setSubmitting(false);
        return;
      }

      setSuccessMsg('Slip mistake corrected successfully!');
      if (res.slip && onSuccess) {
        onSuccess(res.slip);
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error updating slip.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !slip) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="correctMistakeTitle"
      className="m-auto w-[96vw] max-w-2xl rounded-3xl border-2 border-[#DFC15E]/60 bg-[#161311] p-0 text-[#F5F2EB] shadow-[0_25px_80px_rgba(0,0,0,0.95)] open:flex open:flex-col pt-[env(safe-area-inset-top,8px)] pb-[env(safe-area-inset-bottom,8px)]"
    >
      <div className="flex max-h-[88vh] flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#1F1916] px-4 sm:px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DFC15E]/40 bg-[#DFC15E]/15 text-[#DFC15E]">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <span className="font-mono-docket text-[10px] font-bold uppercase tracking-widest text-[#DFC15E]">
                REFEREE CITATION CORRECTION
              </span>
              <h2
                id="correctMistakeTitle"
                className="font-athletic text-xl sm:text-2xl font-black uppercase tracking-wide text-[#F5F2EB]"
              >
                CORRECT SLIP MISTAKE
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close correction modal"
            className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border border-white/15 bg-white/5 p-2 text-[#D6C7B8] transition hover:border-[#B87333] hover:text-white active:scale-95 touch-manipulation cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
          {!canEdit && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-950/40 p-4 text-xs text-amber-200 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <Lock className="h-4 w-4 text-amber-400" />
                <span>CORRECTION ACCESS RESTRICTED</span>
              </div>
              <p className="font-mono-docket text-[11px] leading-relaxed text-[#D6C7B8]">
                Per Copper Athletic Club rules, you can only correct your own demerits after claiming your locker profile and logging in with your 4-digit PIN, or if you are an official referee in the Ref Booth.
              </p>
              {!currentMember ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setIsProfileModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#DFC15E] px-4 py-2 font-athletic text-xs font-black uppercase tracking-wider text-[#121212] hover:bg-[#E8B888] active:scale-95 transition"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Claim / Log In to My Locker</span>
                </button>
              ) : (
                <p className="font-mono-docket text-[11px] text-rose-300">
                  You are logged in as <strong>{currentMember.display_name}</strong>. This slip belongs to another patron, so you cannot edit it.
                </p>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3.5 text-xs text-rose-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Original Slip Snapshot Reference */}
          {slip.image_url && (
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0E0C0B] p-3">
              <img
                src={slip.image_url}
                alt="Original slip handwriting"
                className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-xl border border-[#B87333]/40 object-cover bg-black"
              />
              <div className="min-w-0 space-y-1">
                <span className="font-mono-docket text-[10px] font-bold uppercase tracking-wider text-[#B87333]">
                  ORIGINAL SLIP EVIDENCE REFERENCE
                </span>
                <p className="font-athletic text-sm sm:text-base font-bold text-[#F5F2EB] truncate">
                  Original Text: &ldquo;{slip.raw_student}&rdquo; · Signed &ldquo;{slip.raw_signature}&rdquo;
                </p>
                <p className="font-mono-docket text-[11px] text-[#A8988B] line-clamp-2">
                  Recorded Offenses: {slip.infractions.map((i) => maskSensitiveInfraction(i)).join(' · ')}
                </p>
              </div>
            </div>
          )}

          {/* Student / Patron Attribution */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-mono-docket text-xs font-bold uppercase text-[#D6C7B8]">
                STUDENT NAME (HANDWRITTEN ON SLIP)
              </label>
              <input
                type="text"
                required
                value={rawStudent}
                onChange={(e) => setRawStudent(e.target.value)}
                placeholder="e.g. Ziggie, David Lee, Rick, Burtis"
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0D0B0A] px-3.5 py-2.5 text-base sm:text-sm min-h-[44px] text-[#F5F2EB] focus:border-[#DFC15E] focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-mono-docket text-xs font-bold uppercase text-[#D6C7B8]">
                MATCHED ROSTER PROFILE (STATS LINK)
              </label>
              {isAdminOrStaff ? (
                <select
                  value={selectedPatronId}
                  onChange={(e) => setSelectedPatronId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0D0B0A] px-3.5 py-2.5 text-base sm:text-sm min-h-[44px] text-[#F5F2EB] focus:border-[#DFC15E] focus:outline-none"
                >
                  <option value="">Auto-resolve from name or alias</option>
                  {members
                    .filter((m) => m.is_patron)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.display_name} {m.is_claimed ? '✓ Claimed' : '(Unclaimed)'}
                      </option>
                    ))}
                </select>
              ) : (
                <div className="mt-1.5 flex items-center justify-between rounded-xl border border-[#DFC15E]/30 bg-[#161210] px-3.5 py-2.5 min-h-[44px] text-base sm:text-sm text-[#F5F2EB]">
                  <span className="font-bold text-[#E8B888]">
                    {currentMember?.display_name || slip?.patronDisplayName || 'Your Locker Profile'}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-[#DFC15E]/20 px-2 py-0.5 font-mono-docket text-[10px] font-bold text-[#DFC15E]">
                    <Lock className="h-3 w-3" /> LOCKED (OWN DEMERIT)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Infraction Line Items */}
          <div className="space-y-2.5 rounded-2xl border border-white/10 bg-[#0E0C0B] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-[#DFC15E]" />
                <span className="font-athletic text-base font-bold uppercase tracking-wider text-[#F5F2EB]">
                  INFRACTION REASONS &amp; CATEGORIES
                </span>
              </div>
              <span className="font-mono-docket text-xs font-bold text-[#E8B888]">
                TOTAL: +{totalPoints} {totalPoints === 1 ? 'DEMERIT' : 'DEMERITS'}
              </span>
            </div>

            <div className="space-y-3 pt-1">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-white/10 bg-[#161311] p-3 space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        required
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        placeholder="e.g. Pulling a Deb Jarvis, Flying chair..."
                        className="w-full rounded-xl border border-white/15 bg-[#0D0B0A] px-3.5 py-2 text-base sm:text-sm min-h-[44px] text-[#F5F2EB] focus:border-[#DFC15E] focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={item.type}
                        onChange={(e) => handleItemChange(idx, 'type', e.target.value)}
                        className="rounded-xl border border-white/15 bg-[#0D0B0A] px-3 py-2 text-base sm:text-xs min-h-[44px] text-[#F5F2EB] focus:border-[#DFC15E]"
                      >
                        {DEMERIT_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>

                      <select
                        value={item.points}
                        onChange={(e) => handleItemChange(idx, 'points', Number(e.target.value))}
                        className="rounded-xl border border-white/15 bg-[#0D0B0A] px-2.5 py-2 text-base sm:text-xs min-h-[44px] text-[#DFC15E] font-bold"
                      >
                        <option value={1}>+1 PT</option>
                        <option value={2}>+2 PTS</option>
                        <option value={3}>+3 PTS</option>
                        <option value={4}>+4 PTS</option>
                      </select>

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 active:scale-95 touch-manipulation cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Preset quick pills */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="font-mono-docket text-[10px] text-[#8E8074] uppercase mr-1">
                      Quick Preset:
                    </span>
                    {COMMON_BAR_FOULS.map((foul, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => handleApplyPreset(idx, foul)}
                        className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 font-mono-docket text-[10px] text-[#D6C7B8] hover:border-[#DFC15E] hover:text-white active:scale-95 touch-manipulation cursor-pointer"
                      >
                        {foul.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[#DFC15E]/50 bg-[#DFC15E]/10 px-3.5 py-2 font-mono-docket text-xs font-bold text-[#DFC15E] hover:bg-[#DFC15E]/20 active:scale-95 touch-manipulation cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Another Offense Line Item</span>
              </button>
            </div>
          </div>

          {/* Date, Time & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-mono-docket text-xs font-bold uppercase text-[#D6C7B8]">
                <Calendar className="inline h-3 w-3 mr-1 text-[#DFC15E]" />
                INCIDENT DATE
              </label>
              <input
                type="date"
                required
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0D0B0A] px-3.5 py-2.5 text-base sm:text-sm min-h-[44px] text-[#F5F2EB]"
              />
            </div>

            <div>
              <label className="block font-mono-docket text-xs font-bold uppercase text-[#D6C7B8]">
                <Clock className="inline h-3 w-3 mr-1 text-[#C86D51]" />
                INCIDENT TIME (HH:MM)
              </label>
              <input
                type="text"
                value={incidentTime}
                onChange={(e) => setIncidentTime(e.target.value)}
                placeholder="20:00 or 8:00 PM"
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0D0B0A] px-3.5 py-2.5 text-base sm:text-sm min-h-[44px] text-[#F5F2EB]"
              />
            </div>

            <div>
              <label className="block font-mono-docket text-xs font-bold uppercase text-[#D6C7B8]">
                VENUE / ROOM
              </label>
              <input
                type="text"
                value={locationArea}
                onChange={(e) => setLocationArea(e.target.value)}
                placeholder="Copper Athletic Club"
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0D0B0A] px-3.5 py-2.5 text-base sm:text-sm min-h-[44px] text-[#F5F2EB]"
              />
            </div>
          </div>

          {/* Correction Reason Note */}
          <div>
            <label className="block font-mono-docket text-xs font-bold uppercase text-[#D6C7B8]">
              CORRECTION REASON / AUDIT NOTE (OPTIONAL)
            </label>
            <input
              type="text"
              value={correctionNote}
              onChange={(e) => setCorrectionNote(e.target.value)}
              placeholder='e.g. "AI OCR misread handwriting as Deb Taco instead of Deb Jarvis"'
              className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0D0B0A] px-3.5 py-2.5 text-base sm:text-sm min-h-[44px] text-[#F5F2EB] focus:border-[#DFC15E] focus:outline-none"
            />
          </div>

          {/* Rules Banner */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 font-mono-docket text-[11px] text-amber-200">
            ⚖️ <strong>Referee Rules Standard:</strong> All slip corrections are monitored for bar-friendly language. No profanity, mean insults, or attacks are permitted.
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto rounded-xl border border-white/15 bg-white/5 px-5 py-3 min-h-[48px] touch-manipulation active:scale-95 font-mono-docket text-xs font-bold text-[#D6C7B8] hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !canEdit}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#DFC15E] via-[#E8B888] to-[#DFC15E] px-6 py-3 min-h-[48px] touch-manipulation active:scale-95 font-athletic text-sm font-black uppercase tracking-wider text-[#121212] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-[0_0_20px_rgba(223,193,94,0.3)]"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{submitting ? 'Saving Correction...' : 'Save Slip Correction'}</span>
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
};
