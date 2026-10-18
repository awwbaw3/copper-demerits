import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemerits } from '../context/DemeritsContext';
import { processAndUploadSlipImage, SLIPS_BUCKET } from '../lib/supabase';
import { MAX_OFFICIAL_SLIPS } from '../lib/defaultData';
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
} from 'lucide-react';

export const SubmitSlipPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    members,
    aliases,
    demerits,
    resolveStaffSignature,
    checkImageDuplicate,
    submitDemeritSlip,
  } = useDemerits();

  const [rawStudent, setRawStudent] = useState('Rick');
  const [rawSignature, setRawSignature] = useState('The Boss - AKA Sarah');
  const [demeritCount, setDemeritCount] = useState<number>(1);
  const [incidentDate, setIncidentDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [incidentTime, setIncidentTime] = useState<string>('');
  const [locationArea, setLocationArea] = useState('Copper Athletic Club');
  const [infractions, setInfractions] = useState<string[]>(['']);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageSha256, setImageSha256] = useState<string | null>(null);
  const [imageDhash, setImageDhash] = useState<string | null>(null);
  const [duplicateAlert, setDuplicateAlert] = useState<DuplicateCheckResult | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const resolvedStaff = resolveStaffSignature(rawSignature);
  const uploadedCount = demerits.filter((s) => Boolean(s.image_url)).length;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setErrorMsg(null);
    setDuplicateAlert(null);
    setUploadStatusMsg('Computing SHA-256 & 64-bit Perceptual dHash fingerprint...');

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

  const updateInfraction = (index: number, value: string) => {
    setInfractions((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const addInfractionRow = () => {
    setInfractions((prev) => [...prev, '']);
  };

  const removeInfractionRow = (index: number) => {
    if (infractions.length <= 1) {
      setInfractions(['']);
      return;
    }
    setInfractions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!imageUrl) {
      setErrorMsg('Please upload or capture a photo of the physical demerit slip first.');
      return;
    }

    const cleanedInfractions = infractions.map((i) => i.trim()).filter(Boolean);

    setSubmitting(true);
    try {
      await submitDemeritSlip({
        raw_student: rawStudent,
        raw_signature: rawSignature,
        demerit_count: demeritCount,
        incident_date: incidentDate,
        incident_time: incidentTime ? incidentTime : null,
        location_area: locationArea,
        infractions: cleanedInfractions,
        image_url: imageUrl,
        image_sha256: imageSha256,
        image_dhash: imageDhash,
        createPatronIfNew: true,
      });
      setSubmittedSuccess(true);
      setTimeout(() => {
        navigate('/docket');
      }, 1100);
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
          <span>
            UPLOAD SLIP PHOTO ({uploadedCount}/{MAX_OFFICIAL_SLIPS} UPLOADED)
          </span>
        </div>
        <h1 className="mt-2 font-athletic text-3xl sm:text-5xl font-extrabold uppercase tracking-wide text-[#F5F2EB]">
          LOG <span className="text-[#B87333]">UPLOADED SLIP</span>
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[#B5A99D]">
          Every entry requires an uploaded slip photo. Each photo is automatically fingerprinted
          (SHA-256 + 64-bit perceptual dHash) to block duplicate uploads.
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
                {duplicateAlert.reason === 'exact-sha256'
                  ? 'Exact SHA-256 file match: this exact image file has already been uploaded.'
                  : 'Visual Perceptual dHash match: this slip photo is visually identical to an already uploaded slip.'}
              </p>
              {duplicateAlert.matchedSlip && (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-rose-500/30 bg-black/50 p-2.5">
                  {duplicateAlert.matchedSlip.image_url && (
                    <img
                      src={duplicateAlert.matchedSlip.image_url}
                      alt="Existing matched slip"
                      className="h-14 w-14 rounded-lg object-cover border border-rose-400/40"
                    />
                  )}
                  <div className="text-xs font-mono-docket">
                    <p className="font-bold text-white">
                      Existing Slip: {duplicateAlert.matchedSlip.raw_student} (+
                      {duplicateAlert.matchedSlip.demerit_count} Demerits)
                    </p>
                    <p className="text-rose-300">
                      Date: {duplicateAlert.matchedSlip.incident_date} · Signed:{' '}
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

      {submittedSuccess && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/50 bg-emerald-950/60 p-4 text-emerald-200">
          <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
          <div>
            <h3 className="font-athletic text-xl uppercase font-bold">
              Uploaded Slip Saved!
            </h3>
            <p className="text-xs font-mono-docket">
              Normalized Issuer: {resolvedStaff.member?.display_name || rawSignature}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Step 1: Slip Photo Upload / Camera Capture */}
        <div className="rounded-2xl border border-[#B87333]/35 bg-[#1A1715] p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono-docket text-[10px] font-bold uppercase tracking-widest text-[#B87333]">
                STEP 1 · REQUIRED SLIP PHOTO
              </span>
              <h2 className="font-athletic text-xl sm:text-2xl font-bold uppercase text-[#F5F2EB]">
                SELECT OR SNAP SLIP IMAGE
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
                className="text-xs font-mono-docket text-rose-400 hover:underline"
              >
                Change Photo
              </button>
            )}
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
                  <span className="text-[10px] text-emerald-400/80">
                    dHash: {imageDhash}
                  </span>
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
                  From phone gallery or device
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
                  Snap physical slip directly
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Step 2: Patron & Signature Normalization */}
        <div className="rounded-2xl border border-white/10 bg-[#1A1715] p-4 sm:p-6 space-y-4">
          <span className="font-mono-docket text-[10px] font-bold uppercase tracking-widest text-[#B87333]">
            STEP 2 · PATRON &amp; STAFF SIGNATURE
          </span>

          <div>
            <label className="block font-mono-docket text-xs font-bold uppercase text-[#D6C7B8]">
              PATRON NAME (STUDENT ON SLIP) *
            </label>
            <input
              type="text"
              required
              value={rawStudent}
              onChange={(e) => setRawStudent(e.target.value)}
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
                    onClick={() => setRawStudent(m.display_name)}
                    className={`rounded-lg border px-2.5 py-1 font-mono-docket text-xs transition ${
                      rawStudent.trim().toLowerCase() === m.display_name.toLowerCase()
                        ? 'border-[#B87333] bg-[#B87333]/20 text-[#E8B888] font-bold'
                        : 'border-white/10 bg-[#121212] text-[#B5A99D]'
                    }`}
                  >
                    {m.display_name}
                  </button>
                ))}
              <button
                type="button"
                onClick={() => setRawStudent('Anonymous Patron')}
                className={`rounded-lg border px-2.5 py-1 font-mono-docket text-xs transition ${
                  rawStudent.trim().toLowerCase() === 'anonymous patron'
                    ? 'border-[#B87333] bg-[#B87333]/20 text-[#E8B888] font-bold'
                    : 'border-white/10 bg-[#121212] text-[#B5A99D]'
                }`}
              >
                Anonymous Patron
              </button>
            </div>
          </div>

          <div>
            <label className="block font-mono-docket text-xs font-bold uppercase text-[#D6C7B8]">
              STAFF SIGNATURE WRITTEN ON SLIP *
            </label>
            <input
              type="text"
              required
              value={rawSignature}
              onChange={(e) => setRawSignature(e.target.value)}
              placeholder='e.g. "The Boss - AKA Sarah", "The Douche", "Burtis"'
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
                    onClick={() => setRawSignature(a.alias)}
                    className="rounded border border-white/10 bg-[#1A1715] px-2 py-1 font-mono-docket text-[10px] text-[#B5A99D] hover:border-[#B87333] hover:text-white"
                  >
                    &ldquo;{a.alias}&rdquo;
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Citation Details */}
        <div className="rounded-2xl border border-white/10 bg-[#1A1715] p-4 sm:p-6 space-y-4">
          <span className="font-mono-docket text-[10px] font-bold uppercase tracking-widest text-[#B87333]">
            STEP 3 · SLIP DETAILS
          </span>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <div>
              <label className="block font-mono-docket text-xs font-bold uppercase text-[#D6C7B8]">
                DEMERIT COUNT *
              </label>
              <div className="mt-1.5 flex items-center gap-1.5">
                {[1, 2, 3, 5].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setDemeritCount(cnt)}
                    className={`flex-1 rounded-xl border py-2 font-display-tall text-2xl font-bold transition ${
                      demeritCount === cnt
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
                INCIDENT DATE *
              </label>
              <input
                type="date"
                required
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#121212] px-3 py-2.5 font-mono-docket text-xs text-[#F5F2EB]"
              />
            </div>

            <div>
              <label className="block font-mono-docket text-xs font-bold uppercase text-[#D6C7B8]">
                TIME (OPTIONAL)
              </label>
              <input
                type="time"
                value={incidentTime}
                onChange={(e) => setIncidentTime(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#121212] px-3 py-2.5 font-mono-docket text-xs text-[#F5F2EB]"
              />
            </div>
          </div>

          <div>
            <label className="block font-mono-docket text-xs font-bold uppercase text-[#D6C7B8]">
              LOCATION / ROOM
            </label>
            <input
              type="text"
              value={locationArea}
              onChange={(e) => setLocationArea(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#121212] px-3.5 py-2.5 text-sm text-[#F5F2EB]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block font-mono-docket text-xs font-bold uppercase text-[#D6C7B8]">
                INFRACTIONS WRITTEN ON SLIP
              </label>
              <button
                type="button"
                onClick={addInfractionRow}
                className="inline-flex items-center gap-1 font-mono-docket text-xs font-bold text-[#E08A4E]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Line</span>
              </button>
            </div>

            <div className="mt-2 space-y-2">
              {infractions.map((inf, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="font-mono-docket text-xs font-bold text-[#B87333] w-6">
                    #{idx + 1}
                  </span>
                  <input
                    type="text"
                    value={inf}
                    onChange={(e) => updateInfraction(idx, e.target.value)}
                    placeholder="Infraction written on slip..."
                    className="flex-1 rounded-xl border border-white/15 bg-[#121212] px-3.5 py-2 text-sm text-[#F5F2EB]"
                  />
                  {infractions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeInfractionRow(idx)}
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
        </div>

        <button
          type="submit"
          disabled={submitting || !imageUrl}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#B87333] to-[#C86D51] px-6 py-4 font-athletic text-xl font-bold uppercase tracking-wider text-[#121212] shadow-[0_0_25px_rgba(184,115,51,0.4)] transition hover:brightness-110 disabled:opacity-40"
        >
          <span>{submitting ? 'Saving Uploaded Slip...' : 'Save Uploaded Slip to Docket'}</span>
          <ArrowRight className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
};
