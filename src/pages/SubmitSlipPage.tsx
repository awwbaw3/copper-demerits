import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemerits } from '../context/DemeritsContext';
import { processAndUploadSlipImage, SLIPS_BUCKET } from '../lib/supabase';
import { DEMERIT_CATEGORIES } from '../lib/defaultData';
import { DemeritLineItem } from '../types/demerits';
import { DuplicateCheckResult } from '../lib/imageDedup';
import { MichiganTeamBadge, TeamBadgeMeta } from '../components/MichiganSportsGraphics';
import {
  moderateTextInstant,
  scanWithRefereeMonitor,
  applyRefereeBlurStampToImage,
} from '../lib/moderation';
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
  Tag,
  KeyRound,
  UserCheck,
  EyeOff,
} from 'lucide-react';

interface SlipDraftItem {
  rawStudent: string;
  rawSignature: string;
  incidentDate: string;
  incidentTime: string;
  locationArea: string;
  items: DemeritLineItem[];
}

function createDefaultDraft(time = '21:00'): SlipDraftItem {
  return {
    rawStudent: 'Rick',
    rawSignature: 'The Boss - AKA Sarah',
    incidentDate: new Date().toISOString().slice(0, 10),
    incidentTime: time,
    locationArea: 'Copper A.C.',
    items: [
      {
        type: DEMERIT_CATEGORIES[2], // 'Bar Etiquette / Seating'
        description: '',
        points: 1,
      },
    ],
  };
}

export const SubmitSlipPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    members,
    aliases,
    currentMember,
    setIsProfileModalOpen,
    resolveStaffSignature,
    resolvePatronNickname,
    checkImageDuplicate,
    checkCitationDuplicate,
    submitDemeritSlip,
  } = useDemerits();

  const [slipDrafts, setSlipDrafts] = useState<SlipDraftItem[]>([createDefaultDraft('21:00')]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [rawDataUrl, setRawDataUrl] = useState<string | null>(null);
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
    blurredQueueCount: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Real-time client check across all drafts to preview Referee Blur / Queue status
  const liveModerationCheck = moderateTextInstant(
    slipDrafts
      .map(
        (d) =>
          `${d.rawStudent} ${d.rawSignature} ${d.items.map((it) => it.description).join(' ')}`
      )
      .join(' ')
  );

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

  const updateDraftLineItem = (
    draftIdx: number,
    itemIdx: number,
    patch: Partial<DemeritLineItem>
  ) => {
    setSlipDrafts((prev) =>
      prev.map((d, i) =>
        i === draftIdx
          ? {
              ...d,
              items: d.items.map((item, j) => (j === itemIdx ? { ...item, ...patch } : item)),
            }
          : d
      )
    );
  };

  const addDraftLineItem = (draftIdx: number) => {
    setSlipDrafts((prev) =>
      prev.map((d, i) =>
        i === draftIdx
          ? {
              ...d,
              items: [
                ...d.items,
                {
                  type: DEMERIT_CATEGORIES[0],
                  description: '',
                  points: 1,
                },
              ],
            }
          : d
      )
    );
  };

  const removeDraftLineItem = (draftIdx: number, itemIdx: number) => {
    setSlipDrafts((prev) =>
      prev.map((d, i) => {
        if (i !== draftIdx) return d;
        if (d.items.length <= 1) return d;
        return { ...d, items: d.items.filter((_, j) => j !== itemIdx) };
      })
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!currentMember) {
      setIsProfileModalOpen(true);
      e.target.value = '';
      return;
    }

    setUploadingPhoto(true);
    setErrorMsg(null);
    setDuplicateAlert(null);
    setUploadStatusMsg('Computing SHA-256, 64-bit Perceptual dHash & AI Referee Scan...');

    try {
      const asset = await processAndUploadSlipImage(file);
      const dupCheck = checkImageDuplicate(asset.fingerprint);

      if (dupCheck.isDuplicate) {
        setDuplicateAlert(dupCheck);
        setImageUrl(null);
        setRawDataUrl(null);
        setImageSha256(null);
        setImageDhash(null);
        setUploadStatusMsg(null);
      } else {
        setImageUrl(asset.url);
        setRawDataUrl(asset.fingerprint.dataUrl);
        setImageSha256(asset.fingerprint.sha256);
        setImageDhash(asset.fingerprint.dhash);
        setUploadStatusMsg(
          asset.storageMode === 'cloudflare-r2'
            ? `Verified Unique Image · Uploaded to Cloudflare R2 "${SLIPS_BUCKET}"`
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

    if (!currentMember) {
      setIsProfileModalOpen(true);
      setErrorMsg('Please claim or sign in to your Staff or Patron profile before dropping a slip.');
      return;
    }

    if (!imageUrl) {
      setErrorMsg('Please upload or capture a photo of the physical demerit slip(s) first.');
      return;
    }

    setSubmitting(true);
    try {
      let newCount = 0;
      let mergedCount = 0;
      let blurredQueueCount = 0;
      const isMultiSlip = slipDrafts.length > 1;

      for (let i = 0; i < slipDrafts.length; i++) {
        const d = slipDrafts[i];
        const validItems = d.items
          .map((item) => ({
            type: item.type,
            description: item.description.trim() || item.type,
            points: Math.max(1, Number(item.points) || 1),
          }))
          .filter(Boolean);

        const totalDemeritCount = validItems.reduce((sum, item) => sum + item.points, 0);
        const cleanedInfractions = validItems.map((item) => item.description);

        // Scan text + image with AI Referee Monitor
        const modScan = await scanWithRefereeMonitor(
          [d.rawStudent, d.rawSignature, ...cleanedInfractions],
          rawDataUrl
        );

        let finalSlipImageUrl = imageUrl;
        if (modScan.flagged && (rawDataUrl || imageUrl)) {
          finalSlipImageUrl = await applyRefereeBlurStampToImage(
            rawDataUrl || imageUrl,
            modScan.blurRegions
          );
        }

        const res = await submitDemeritSlip({
          raw_student: d.rawStudent,
          raw_signature: d.rawSignature,
          submitted_by_member_id: currentMember.id,
          demerit_count: totalDemeritCount,
          incident_date: d.incidentDate,
          incident_time: d.incidentTime || null,
          location_area: d.locationArea,
          infractions: cleanedInfractions,
          demerit_items: validItems,
          image_url: finalSlipImageUrl,
          source_image_url: isMultiSlip ? imageUrl : null,
          image_sha256: i === 0 ? imageSha256 : null,
          image_dhash: i === 0 ? imageDhash : null,
          is_blurred: modScan.flagged,
          moderation_flag_reason: modScan.reason,
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
        } else if (res.wasBlurredAndQueued) {
          blurredQueueCount += 1;
        } else {
          newCount += 1;
        }
      }

      setSubmittedSummary({ newCount, mergedCount, blurredQueueCount });
      setTimeout(() => {
        navigate(blurredQueueCount > 0 ? '/admin' : '/docket');
      }, 1600);
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
          <span>CLOUDFLARE D1 + R2 · PROFILE-VERIFIED SLIP LOGGER</span>
        </div>
        <h1 className="mt-2 font-athletic text-3xl sm:text-5xl font-extrabold uppercase tracking-wide text-[#F5F2EB]">
          DROP A <span className="text-[#B87333]">SLIP PHOTO</span>
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[#B5A99D]">
          Claim or sign in to your Staff or Patron Bar Profile to log single-slip scans or
          multi-slip bar photos directly to Cloudflare R2 &amp; D1.
        </p>
      </div>

      {/* Bar Locker Pass Gate Banner */}
      {!currentMember ? (
        <div className="rounded-3xl border-2 border-[#DFC15E]/60 bg-gradient-to-r from-[#241A10] via-[#1B1510] to-[#14110F] p-5 sm:p-6 shadow-[0_15px_45px_rgba(0,0,0,0.65)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DFC15E]/50 bg-[#DFC15E]/15 px-3 py-0.5 font-mono-docket text-[10px] font-bold uppercase tracking-widest text-[#DFC15E]">
                <KeyRound className="h-3 w-3" />
                BAR LOCKER LOGIN REQUIRED TO UPLOAD
              </span>
              <h2 className="font-athletic text-2xl sm:text-3xl font-black uppercase text-[#F5F2EB]">
                CLAIM YOUR STAFF OR PATRON PROFILE FIRST
              </h2>
              <p className="text-xs sm:text-sm text-[#D6C7B8]">
                Pick your card (<strong className="text-white">Sarah</strong>,{' '}
                <strong className="text-white">Rick</strong>,{' '}
                <strong className="text-white">Burtis</strong>,{' '}
                <strong className="text-white">David Lee</strong>, or create a new Patron pass) with
                a 4 to 8-digit Bar PIN so every uploaded slip is tied to a verified bar member.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#DFC15E] to-[#B87333] px-5 py-3.5 font-athletic text-base font-black uppercase tracking-wider text-[#121212] shadow-[0_0_25px_rgba(223,193,94,0.4)] hover:brightness-110 shrink-0 cursor-pointer"
            >
              <KeyRound className="h-4 w-4" />
              <span>Claim / Sign In</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-950/25 px-4 py-3">
          <div className="flex items-center gap-3">
            <MichiganTeamBadge
              iconType={
                (currentMember.favorite_team as TeamBadgeMeta['iconType']) || 'lions'
              }
              size="sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-athletic text-lg font-black uppercase text-white">
                  Dropping Slip as {currentMember.display_name}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 font-mono-docket text-[10px] font-bold uppercase text-emerald-300">
                  <UserCheck className="h-3 w-3" />
                  Verified Bar Pass
                </span>
              </div>
              <p className="font-mono-docket text-[11px] text-emerald-200/80">
                {currentMember.is_admin
                  ? 'Site Administrator & Official Referee'
                  : currentMember.is_staff
                  ? 'Official Bar Referee / Staff Account'
                  : 'Verified Ring of Honor Patron'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsProfileModalOpen(true)}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 font-mono-docket text-xs text-[#E8B888] hover:border-[#B87333] cursor-pointer"
          >
            Edit My Profile / Switch
          </button>
        </div>
      )}

      {/* Real-Time Referee Auto-Blur & Admin Queue Notice */}
      {liveModerationCheck.flagged && (
        <div className="rounded-2xl border-2 border-amber-500/60 bg-amber-950/40 p-4 text-amber-200">
          <div className="flex items-start gap-3">
            <EyeOff className="h-6 w-6 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-athletic text-lg font-bold uppercase text-amber-200">
                🦓 Referee Auto-Blur Active — Will Queue for Admin Review
              </h3>
              <p className="mt-0.5 text-xs font-mono-docket text-amber-300">
                The Automated Referee detected potential profanity or name-calling (
                <strong>{liveModerationCheck.matchedTerms.join(', ')}</strong>). To keep Copper
                Demerits friendly and jovial, this slip image will be automatically blurred,
                profanity censored as <code className="text-white">[🍻 CENSORED BY REF]</code>, and
                placed in the Ref Booth Queue for the Site Admin (Rick) to review or override.
              </p>
            </div>
          </div>
        </div>
      )}

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
              {submittedSummary.mergedCount} duplicate citation(s) merged as secondary photo evidence
              {submittedSummary.blurredQueueCount > 0
                ? ` · ${submittedSummary.blurredQueueCount} slip(s) auto-blurred by Referee & queued for Admin override.`
                : '.'}
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
          const resolvedPatron = resolvePatronNickname(draft.rawStudent);
          const totalSlipPoints = draft.items.reduce(
            (sum, item) => sum + (Number(item.points) || 1),
            0
          );
          const citationDup = checkCitationDuplicate({
            raw_student: draft.rawStudent,
            incident_date: draft.incidentDate,
            incident_time: draft.incidentTime || null,
            demerit_count: totalSlipPoints,
            infractions: draft.items.map((i) => i.description),
          });

          return (
            <div
              key={draftIdx}
              className="rounded-2xl border border-white/15 bg-[#1A1715] p-4 sm:p-6 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-athletic text-xl font-bold uppercase text-[#E8B888]">
                    {slipDrafts.length > 1
                      ? `SLIP #${draftIdx + 1} OF ${slipDrafts.length} IN PHOTO`
                      : 'SLIP DATA, TIMESTAMP & DEMERIT TYPES'}
                  </span>
                  <span className="rounded-lg bg-[#C86D51]/20 border border-[#C86D51]/40 px-2.5 py-0.5 font-mono-docket text-xs font-bold text-[#E08A4E]">
                    TOTAL: +{totalSlipPoints} {totalSlipPoints === 1 ? 'DEMERIT' : 'DEMERITS'}
                  </span>
                </div>

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
                  STUDENT (PATRON OR NICKNAME WRITTEN ON SLIP) *
                </label>
                <input
                  type="text"
                  required
                  value={draft.rawStudent}
                  onChange={(e) => updateDraft(draftIdx, { rawStudent: e.target.value })}
                  placeholder="Rick, Burtis, Dave, or any linked Patron Nickname"
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#121212] px-3.5 py-2.5 text-sm text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
                />

                <div className="mt-2.5 rounded-xl border border-[#B87333]/30 bg-[#121212] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 font-mono-docket text-xs text-[#D6C7B8]">
                      <Sparkles className="h-3.5 w-3.5 text-[#B87333]" />
                      Stats Merge Into Profile:
                    </span>
                    {resolvedPatron.member ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 font-mono-docket text-xs font-bold text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {resolvedPatron.member.display_name}
                        {resolvedPatron.matchedAlias &&
                          resolvedPatron.matchedAlias.toLowerCase() !==
                            resolvedPatron.member.display_name.toLowerCase() && (
                            <span className="text-[10px] font-normal text-emerald-200/80">
                              (via nickname &ldquo;{resolvedPatron.matchedAlias}&rdquo;)
                            </span>
                          )}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 font-mono-docket text-[11px] text-amber-300">
                        <AlertCircle className="h-3.5 w-3.5" />
                        New Patron Profile (&ldquo;{draft.rawStudent.trim() || 'Unknown'}&rdquo;)
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {members
                      .filter((m) => m.is_patron)
                      .map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => updateDraft(draftIdx, { rawStudent: m.display_name })}
                          className={`rounded-lg border px-2.5 py-1 font-mono-docket text-xs transition ${
                            resolvedPatron.member?.id === m.id
                              ? 'border-[#B87333] bg-[#B87333]/20 text-[#E8B888] font-bold'
                              : 'border-white/10 bg-[#1A1715] text-[#B5A99D] hover:border-[#B87333]/50'
                          }`}
                        >
                          {m.display_name}
                        </button>
                      ))}
                  </div>
                </div>
              </div>

              {/* Date, Time, Room */}
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
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

                <div>
                  <label className="block font-mono-docket text-xs font-bold uppercase text-[#D6C7B8]">
                    ROOM (AS WRITTEN ON SLIP)
                  </label>
                  <input
                    type="text"
                    value={draft.locationArea}
                    onChange={(e) => updateDraft(draftIdx, { locationArea: e.target.value })}
                    placeholder="Copper Bar, Copper, Copper A.C."
                    className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#121212] px-3.5 py-2 text-sm text-[#F5F2EB]"
                  />
                </div>
              </div>

              {/* Itemized Demerit Types & Points */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 font-mono-docket text-xs font-bold uppercase text-[#D6C7B8]">
                    <Tag className="h-3.5 w-3.5 text-[#B87333]" />
                    <span>ITEMIZED DEMERIT TYPES &amp; POINTS ON SLIP *</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => addDraftLineItem(draftIdx)}
                    className="inline-flex items-center gap-1 font-mono-docket text-xs font-bold text-[#E08A4E]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Demerit Offense</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {draft.items.map((item, itemIdx) => (
                    <div
                      key={itemIdx}
                      className="rounded-xl border border-white/10 bg-[#121212] p-3 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                          <span className="font-mono-docket text-xs font-bold text-[#B87333]">
                            #{itemIdx + 1}
                          </span>
                          <select
                            value={item.type}
                            onChange={(e) =>
                              updateDraftLineItem(draftIdx, itemIdx, { type: e.target.value })
                            }
                            aria-label="Demerit Type"
                            className="flex-1 rounded-lg border border-white/15 bg-[#1A1715] px-2.5 py-1.5 font-mono-docket text-xs text-[#E8B888]"
                          >
                            {DEMERIT_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                Type: {cat}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="font-mono-docket text-[10px] text-[#9E8F82]">
                            POINTS:
                          </span>
                          {[1, 2, 3].map((pts) => (
                            <button
                              key={pts}
                              type="button"
                              onClick={() =>
                                updateDraftLineItem(draftIdx, itemIdx, { points: pts })
                              }
                              className={`rounded-lg border px-2.5 py-1 font-mono-docket text-xs font-bold transition ${
                                item.points === pts
                                  ? 'border-[#B87333] bg-[#B87333] text-[#121212]'
                                  : 'border-white/15 bg-[#1A1715] text-[#D6C7B8]'
                              }`}
                            >
                              +{pts}
                            </button>
                          ))}
                          {draft.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeDraftLineItem(draftIdx, itemIdx)}
                              aria-label="Remove offense"
                              className="rounded-lg border border-white/10 p-1.5 text-[#9E8F82] hover:text-rose-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) =>
                          updateDraftLineItem(draftIdx, itemIdx, { description: e.target.value })
                        }
                        placeholder="Reason written on slip (e.g. Too many seat moves)..."
                        className="w-full rounded-lg border border-white/15 bg-[#1A1715] px-3 py-2 text-sm text-[#F5F2EB]"
                      />
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
                  placeholder='e.g. "YOUR BOSS!", "The Boss - AKA Sarah", "Sarah (Cursive Signature)"'
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
              ? 'Referee Scanning & Saving...'
              : slipDrafts.length > 1
              ? `Save ${slipDrafts.length} Slips from Photo to Docket`
              : 'Save Slip Photo to Docket'}
          </span>
          <ArrowRight className="h-5 w-5" />
        </button>

        {/* Unofficial Fan Site Disclaimer */}
        <div className="rounded-xl border border-white/10 bg-[#141210] px-4 py-3 text-center">
          <p className="font-mono-docket text-[11px] text-[#9E8F82]">
            🍺 <strong className="text-[#E8B888]">Unofficial Patron-Run Fan Site:</strong> Copper
            Demerits is intended strictly for friendly, jovial bar fun. Not owned by or affiliated
            with Copper Athletic Club. Slips with profanity or personal insults are automatically
            blurred by the AI Referee and held for Admin review.
          </p>
        </div>
      </form>
    </div>
  );
};

