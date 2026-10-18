import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemerits } from '../context/DemeritsContext';
import { processAndUploadSlipImage, SLIPS_BUCKET } from '../lib/supabase';
import { DuplicateCheckResult } from '../lib/imageDedup';
import {
  Camera,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  ArrowRight,
  Fingerprint,
  ShieldAlert,
  Layers,
  Clock,
} from 'lucide-react';

interface SlipDraftItem {
  rawStudent: string;
  rawSignature: string;
  demeritCount: number;
  incidentDate: string;
  incidentTime: string;
  locationArea: string;
  infractions: string[];
}

function createDefaultDraft(time = '21:00'): SlipDraftItem {
  return {
    rawStudent: 'Rick',
    rawSignature: 'The Boss - AKA Sarah',
    demeritCount: 1,
    incidentDate: new Date().toISOString().slice(0, 10),
    incidentTime: time,
    locationArea: 'Copper A.C.',
    infractions: [''],
  };
}

export const SubmitSlipPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    members,
    aliases,
    resolveStaffSignature,
    checkImageDuplicate,
    checkCitationDuplicate,
    submitDemeritSlip,
  } = useDemerits();

  const [slipDrafts, setSlipDrafts] = useState<SlipDraftItem[]>([createDefaultDraft('21:00')]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageSha256, setImageSha256] = useState<string | null>(null);
  const [imageDhash, setImageDhash] = useState<string | null>(null);
  const [duplicateAlert, setDuplicateAlert] = useState<DuplicateCheckResult | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSummary, setSubmittedSummary] = useState<{
    newCount: number;
    mergedCount: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const setSlipCountInPhoto = (count: number) => {
    setSlipDrafts((prev) => {
      if (count <= prev.length) {
        return prev.slice(0, count);
      }
      const next = [...prev];
      const defaultTimes = ['20:50', '20:56', '21:09', '21:15'];
      while (next.length < count) {
        next.push(createDefaultDraft(defaultTimes[next.length] || '21:00'));
      }
      return next;
    });
  };

  const updateDraft = (index: number, patch: Partial<SlipDraftItem>) => {
    setSlipDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const updateDraftInfraction = (draftIdx: number, infIdx: number, val: string) => {
    setSlipDrafts((prev) =>
      prev.map((d, i) =>
        i === draftIdx
          ? {
              ...d,
              infractions: d.infractions.map((inf, j) => (j === infIdx ? val : inf)),
            }
          : d
      )
    );
  };

  const addDraftInfraction = (draftIdx: number) => {
    setSlipDrafts((prev) =>
      prev.map((d, i) =>
        i === draftIdx ? { ...d, infractions: [...d.infractions, ''] } : d
      )
    );
  };

  const removeDraftInfraction = (draftIdx: number, infIdx: number) => {
    setSlipDrafts((prev) =>
      prev.map((d, i) => {
        if (i !== draftIdx) return d;
        if (d.infractions.length <= 1) return { ...d, infractions: [''] };
        return { ...d, infractions: d.infractions.filter((_, j) => j !== infIdx) };
      })
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setErrorMsg(null);
    setDuplicateAlert(null);
    setUploadStatusMsg('Computing SHA-256 & Rotation-Aware 64-bit Perceptual dHash...');

    try {
      const asset = await processAndUploadSlipImage(file);
      const dupCheck = checkImageDuplicate(asset.fingerprint);

      if (dupCheck.isDuplicate) {
        setDuplicateAlert(dupCheck);
        setImageUrl(null);
        setImageSha256(null);
        setImageDhash(null);
        setUploadStatusMsg(null);
      } else {
        setImageUrl(asset.url);
        setImageSha256(asset.fingerprint.sha256);
        setImageDhash(asset.fingerprint.dhash);
        setUploadStatusMsg(
          asset.storageMode === 'supabase'
            ? `Verified Unique Image · Uploaded to Supabase "${SLIPS_BUCKET}" bucket`
            : `Verified Unique Image · Ready for submission`
        );
      }
    } catch {
      setErrorMsg('Failed to process image file. Please try another photo.');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!imageUrl) {
      setErrorMsg('Please upload or capture a photo of the physical demerit slip(s) first.');
      return;
    }

    setSubmitting(true);
    try {
      let newCount = 0;
      let mergedCount = 0;
      const isMultiSlip = slipDrafts.length > 1;

      for (let i = 0; i < slipDrafts.length; i++) {
        const d = slipDrafts[i];
        const cleanedInfractions = d.infractions.map((inf) => inf.trim()).filter(Boolean);

        const res = await submitDemeritSlip({
          raw_student: d.rawStudent,
          raw_signature: d.rawSignature,
          demerit_count: d.demeritCount,
          incident_date: d.incidentDate,
          incident_time: d.incidentTime || null,
          location_area: d.locationArea,
          infractions: cleanedInfractions,
          image_url: imageUrl,
          source_image_url: isMultiSlip ? imageUrl : null,
          image_sha256: i === 0 ? imageSha256 : null,
          image_dhash: i === 0 ? imageDhash : null,
          capture_note: isMultiSlip
            ? `Slip ${i + 1} of ${slipDrafts.length} extracted from multi-slip photo (${
                d.incidentTime || d.incidentDate
              })`
            : null,
          createPatronIfNew: true,
          allowMultiSlipBatch: i > 0,
          mergeIfCitationDuplicate: true,
        });

        if (res.wasMergedDuplicate) {
          mergedCount += 1;
        } else {
          newCount += 1;
        }
      }

      setSubmittedSummary({ newCount, mergedCount });
      setTimeout(() => {
        navigate('/docket');
      }, 1300);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not save slip.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-3 sm:px-4 py-5 sm:py-8 space-y-6">
      {/* Header */}
      <div className="border-b border-[#B87333]/30 pb-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#B87333]/40 bg-[#B87333]/10 px-3 py-1 text-[11px] font-mono-docket uppercase tracking-widest text-[#E8B888]">
          <Camera className="h-3.5 w-3.5 text-[#B87333]" />
          <span>SINGLE OR MULTI-SLIP PHOTO LOGGER · 3-LAYER DEDUP</span>
        </div>
        <h1 className="mt-2 font-athletic text-3xl sm:text-5xl font-extrabold uppercase tracking-wide text-[#F5F2EB]">
          LOG <span className="text-[#B87333]">SLIP PHOTO</span>
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[#B5A99D]">
          Supports photos with <strong>1 slip</strong> (like a single scan) or{' '}
          <strong>multiple slips in one photo</strong> (like 3 slips on the bar table). Automatically
          deduplicates by SHA-256, rotation-aware 64-bit dHash, and citation timestamp/content.
        </p>
      </div>

      {/* Duplicate Image Blocked Alert */}
      {duplicateAlert?.isDuplicate && (
        <div className="rounded-2xl border-2 border-rose-500/60 bg-rose-950/50 p-4 sm:p-5 text-rose-200 space-y-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-6 w-6 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-athletic text-xl font-bold uppercase text-rose-200">
                Duplicate Slip Image Blocked ({duplicateAlert.similarityPercent ?? 100}% Match)
              </h3>
              <p className="mt-0.5 text-xs font-mono-docket text-rose-300">
                {duplicateAlert.matchedDescription
                  ? `Matched official uploaded image: ${duplicateAlert.matchedDescription}`
                  : duplicateAlert.reason === 'exact-sha256'
                  ? 'Exact SHA-256 file match: this exact image file has already been uploaded.'
                  : 'Visual Perceptual dHash match: this slip photo is visually identical to an already uploaded slip.'}
              </p>
              {duplicateAlert.matchedSlip && (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-rose-500/30 bg-black/50 p-2.5">
                  {duplicateAlert.matchedSlip.image_url && (
                    <img
                      src={duplicateAlert.matchedSlip.image_url}
                      alt="Existing matched slip"
                      className="h-14 w-16 rounded-lg object-cover border border-rose-400/40"
                    />
                  )}
                  <div className="text-xs font-mono-docket">
                    <p className="font-bold text-white">
                      Existing Citation: {duplicateAlert.matchedSlip.raw_student} (+
                      {duplicateAlert.matchedSlip.demerit_count} Demerits)
                    </p>
                    <p className="text-rose-300">
                      {duplicateAlert.matchedSlip.incident_date}{' '}
                      {duplicateAlert.matchedSlip.incident_time || ''} · Signed:{' '}
                      &ldquo;{duplicateAlert.matchedSlip.raw_signature}&rdquo;
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl border border-rose-500/50 bg-rose-950/40 p-4 text-xs font-mono-docket text-rose-200">
          {errorMsg}
        </div>
      )}

      {submittedSummary && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/50 bg-emerald-950/60 p-4 text-emerald-200">
          <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
          <div>
            <h3 className="font-athletic text-xl uppercase font-bold">
              Slip Photo Processed!
            </h3>
            <p className="text-xs font-mono-docket">
              {submittedSummary.newCount} new citation(s) logged ·{' '}
              {submittedSummary.mergedCount} duplicate citation(s) merged as secondary photo evidence.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Step 1: Slip Photo Upload + Number of Slips in Image */}
        <div className="rounded-2xl border border-[#B87333]/35 bg-[#1A1715] p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-mono-docket text-[10px] font-bold uppercase tracking-widest text-[#B87333]">
                STEP 1 · UPLOAD PHOTO &amp; SELECT SLIP COUNT IN IMAGE
              </span>
              <h2 className="font-athletic text-xl sm:text-2xl font-bold uppercase text-[#F5F2EB]">
                SLIP PHOTO &amp; MULTI-SLIP COUNT
              </h2>
            </div>

            {imageUrl && (
              <button
                type="button"
                onClick={() => {
                  setImageUrl(null);
                  setImageSha256(null);
                  setImageDhash(null);
                  setUploadStatusMsg(null);
                }}
                className="text-xs font-mono-docket text-rose-400 hover:underline self-start sm:self-auto"
              >
                Change Photo
              </button>
            )}
          </div>

          {/* How many slips are visible in this photo? (1, 2, 3, or 4) */}
          <div className="rounded-xl border border-white/10 bg-[#121212] p-3.5 space-y-2">
            <span className="flex items-center gap-1.5 font-mono-docket text-xs font-bold uppercase text-[#E8B888]">
              <Layers className="h-3.5 w-3.5 text-[#B87333]" />
              <span>HOW MANY PHYSICAL SLIPS ARE IN THIS IMAGE?</span>
            </span>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setSlipCountInPhoto(cnt)}
                  className={`rounded-xl border py-2 font-athletic text-base font-bold uppercase transition ${
                    slipDrafts.length === cnt
                      ? 'border-[#B87333] bg-[#B87333] text-[#121212]'
                      : 'border-white/15 bg-[#1A1715] text-[#D6C7B8] hover:border-[#B87333]/50'
                  }`}
                >
                  {cnt} {cnt === 1 ? 'Slip' : 'Slips'}
                </button>
              ))}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />

          {imageUrl ? (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border-2 border-[#B87333]/50 bg-black p-2">
                <img
                  src={imageUrl}
                  alt="Uploaded physical slip"
                  className="mx-auto max-h-80 w-auto rounded object-contain"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-3.5 py-2 text-xs font-mono-docket text-emerald-300">
                <span className="flex items-center gap-1.5">
                  <Fingerprint className="h-4 w-4 text-emerald-400 shrink-0" />
                  {uploadStatusMsg}
                </span>
                {imageDhash && (
                  <span className="text-[10px] text-emerald-400/80">dHash: {imageDhash}</span>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#B87333]/60 bg-[#121212] p-6 text-center transition hover:border-[#B87333] hover:bg-[#B87333]/10"
              >
                <Upload className="h-7 w-7 text-[#B87333]" />
                <span className="font-athletic text-base font-bold uppercase tracking-wider text-[#F5F2EB]">
                  {uploadingPhoto ? 'Checking Duplicate Hash...' : 'Choose Slip Photo'}
                </span>
                <span className="font-mono-docket text-[11px] text-[#9E8F82]">
                  Single scan or multi-slip bar photo
                </span>
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/15 bg-[#121212] p-6 text-center transition hover:border-[#B87333] hover:bg-white/5"
              >
                <Camera className="h-7 w-7 text-[#C86D51]" />
                <span className="font-athletic text-base font-bold uppercase tracking-wider text-[#F5F2EB]">
                  Take Camera Photo
                </span>
                <span className="font-mono-docket text-[11px] text-[#9E8F82]">
                  Snap physical slip(s) directly
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Step 2: Individual Slip Details for Each Slip in the Image */}
        {slipDrafts.map((draft, draftIdx) => {
          const resolvedStaff = resolveStaffSignature(draft.rawSignature);
          const citationDup = checkCitationDuplicate({
            raw_student: draft.rawStudent,
            incident_date: draft.incidentDate,
            incident_time: draft.incidentTime || null,
            demerit_count: draft.demeritCount,
            infractions: draft.infractions,
          });

          return (
            <div
              key={draftIdx}
              className="rounded-2xl border border-white/15 bg-[#1A1715] p-4 sm:p-6 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                <span className="font-athletic text-xl font-bold uppercase text-[#E8B888]">
                  {slipDrafts.length > 1
                    ? `SLIP #${draftIdx + 1} OF ${slipDrafts.length} IN PHOTO`
                    : 'SLIP DATA & TIMESTAMP'}
                </span>
                {citationDup.isDuplicate && (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 font-mono-docket text-[11px] text-amber-300">
                    <Fingerprint className="h-3.5 w-3.5" />
                    Matches existing {draft.rawStudent} ({draft.incidentTime}) slip — will merge photo
                  </span>
                )}
              </div>

              {/* Patron */}
              <div>
                <label className="block font-mono-docket text-xs font-bold uppercase text-[#D6C7B8]">
                  STUDENT (PATRON ON SLIP) *
                </label>
                <input
                  type="text"
                  required
                  value={draft.rawStudent}
                  onChange={(e) => updateDraft(draftIdx, { rawStudent: e.target.value })}
                  placeholder="Rick, Burtis, or Anonymous Patron"
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#121212] px-3.5 py-2.5 text-sm text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
                />
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {members
                    .filter((m) => m.is_patron)
                    .map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => updateDraft(draftIdx, { rawStudent: m.display_name })}
                        className={`rounded-lg border px-2.5 py-1 font-mono-docket text-xs transition ${
                          draft.rawStudent.trim().toLowerCase() === m.display_name.toLowerCase()
                            ? 'border-[#B87333] bg-[#B87333]/20 text-[#E8B888] font-bold'
                            : 'border-white/10 bg-[#121212] text-[#B5A99D]'
                        }`}
                      >
                        {m.display_name}
                      </button>
                    ))}
                </div>
              </div>

              {/* Date, Time, Room, Demerit Count */}
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                <div>
                  <label className="block font-mono-docket text-xs font-bold uppercase text-[#D6C7B8]">
                    NUMBER OF DEMERITS *
                  </label>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    {[1, 2, 3, 5].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => updateDraft(draftIdx, { demeritCount: cnt })}
                        className={`flex-1 rounded-xl border py-2 font-display-tall text-2xl font-bold transition ${
                          draft.demeritCount === cnt
                            ? 'border-[#B87333] bg-[#B87333] text-[#121212]'
                            : 'border-white/15 bg-[#121212] text-[#F5F2EB]'
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-mono-docket text-xs font-bold uppercase text-[#D6C7B8]">
                    DATE(S) *
                  </label>
                  <input
                    type="date"
                    required
                    value={draft.incidentDate}
                    onChange={(e) => updateDraft(draftIdx, { incidentDate: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#121212] px-3 py-2.5 font-mono-docket text-xs text-[#F5F2EB]"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1 font-mono-docket text-xs font-bold uppercase text-[#D6C7B8]">
                    <Clock className="h-3.5 w-3.5 text-[#C86D51]" />
                    <span>TIME ON SLIP *</span>
                  </label>
                  <input
                    type="time"
                    value={draft.incidentTime}
                    onChange={(e) => updateDraft(draftIdx, { incidentTime: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#121212] px-3 py-2.5 font-mono-docket text-xs text-[#F5F2EB]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono-docket text-xs font-bold uppercase text-[#D6C7B8]">
                  ROOM (AS WRITTEN ON SLIP)
                </label>
                <input
                  type="text"
                  value={draft.locationArea}
                  onChange={(e) => updateDraft(draftIdx, { locationArea: e.target.value })}
                  placeholder="Copper Bar, Copper, Copper A.C."
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#121212] px-3.5 py-2.5 text-sm text-[#F5F2EB]"
                />
              </div>

              {/* Infractions */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block font-mono-docket text-xs font-bold uppercase text-[#D6C7B8]">
                    REASON FOR DEMERITS
                  </label>
                  <button
                    type="button"
                    onClick={() => addDraftInfraction(draftIdx)}
                    className="inline-flex items-center gap-1 font-mono-docket text-xs font-bold text-[#E08A4E]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Line</span>
                  </button>
                </div>

                <div className="mt-2 space-y-2">
                  {draft.infractions.map((inf, infIdx) => (
                    <div key={infIdx} className="flex items-center gap-2">
                      <span className="font-mono-docket text-xs font-bold text-[#B87333] w-6">
                        #{infIdx + 1}
                      </span>
                      <input
                        type="text"
                        value={inf}
                        onChange={(e) => updateDraftInfraction(draftIdx, infIdx, e.target.value)}
                        placeholder="Reason written on slip..."
                        className="flex-1 rounded-xl border border-white/15 bg-[#121212] px-3.5 py-2 text-sm text-[#F5F2EB]"
                      />
                      {draft.infractions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDraftInfraction(draftIdx, infIdx)}
                          aria-label="Remove line"
                          className="rounded-lg border border-white/10 p-2 text-[#9E8F82] hover:text-rose-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Signature */}
              <div>
                <label className="block font-mono-docket text-xs font-bold uppercase text-[#D6C7B8]">
                  SIGNATURE WRITTEN ON SLIP *
                </label>
                <input
                  type="text"
                  required
                  value={draft.rawSignature}
                  onChange={(e) => updateDraft(draftIdx, { rawSignature: e.target.value })}
                  placeholder='e.g. "YOUR BOSS!", "The Boss - AKA Sarah", "Matt Barnes"'
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#121212] px-3.5 py-2.5 text-sm text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
                />

                <div className="mt-2.5 rounded-xl border border-[#B87333]/30 bg-[#121212] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 font-mono-docket text-xs text-[#D6C7B8]">
                      <Sparkles className="h-3.5 w-3.5 text-[#B87333]" />
                      Normalized Issuer:
                    </span>
                    {resolvedStaff.member ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 font-mono-docket text-xs font-bold text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {resolvedStaff.member.display_name}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 font-mono-docket text-[11px] text-amber-300">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Unmapped Signature
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {aliases.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => updateDraft(draftIdx, { rawSignature: a.alias })}
                        className="rounded border border-white/10 bg-[#1A1715] px-2 py-1 font-mono-docket text-[10px] text-[#B5A99D] hover:border-[#B87333] hover:text-white"
                      >
                        &ldquo;{a.alias}&rdquo;
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <button
          type="submit"
          disabled={submitting || !imageUrl}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#B87333] to-[#C86D51] px-6 py-4 font-athletic text-xl font-bold uppercase tracking-wider text-[#121212] shadow-[0_0_25px_rgba(184,115,51,0.4)] transition hover:brightness-110 disabled:opacity-40"
        >
          <span>
            {submitting
              ? 'Saving & Deduplicating...'
              : slipDrafts.length > 1
              ? `Save ${slipDrafts.length} Slips from Photo to Docket`
              : 'Save Slip Photo to Docket'}
          </span>
          <ArrowRight className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
};
