import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemerits } from '../context/DemeritsContext';
import { uploadCompressedSlipToR2 } from '../lib/supabase';
import { DEMERIT_CATEGORIES } from '../lib/defaultData';
import { DemeritLineItem } from '../types/demerits';
import {
  DuplicateCheckResult,
  fingerprintImageFile,
  formatByteSize,
} from '../lib/imageDedup';
import { MichiganTeamBadge, TeamBadgeMeta } from '../components/MichiganSportsGraphics';
import {
  moderateTextInstant,
  scanWithRefereeMonitor,
  applyRefereeBlurStampToImage,
  extractSlipsFromPhotoAI,
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
  Wand2,
  SlidersHorizontal,
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
  const [compressionStats, setCompressionStats] = useState<{
    originalBytes: number;
    compressedBytes: number;
    savingsPercent: number;
    width: number;
    height: number;
  } | null>(null);
  const [duplicateAlert, setDuplicateAlert] = useState<DuplicateCheckResult | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showManualEditor, setShowManualEditor] = useState(false);
  const [autoLoggedSlips, setAutoLoggedSlips] = useState<SlipDraftItem[] | null>(null);
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

  /**
   * Saves an array of slip drafts to Cloudflare D1 (with AI Referee auto-blur moderation & stat merging).
   */
  const persistSlipDrafts = async (
    draftsToSave: SlipDraftItem[],
    targetImageUrl: string,
    targetRawDataUrl: string | null,
    targetSha256: string | null,
    targetDhash: string | null
  ) => {
    if (!currentMember) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      let newCount = 0;
      let mergedCount = 0;
      let blurredQueueCount = 0;
      const isMultiSlip = draftsToSave.length > 1;

      for (let i = 0; i < draftsToSave.length; i++) {
        const d = draftsToSave[i];
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
          targetRawDataUrl
        );

        let finalSlipImageUrl = targetImageUrl;
        if (modScan.flagged && (targetRawDataUrl || targetImageUrl)) {
          const blurredDataUrl = await applyRefereeBlurStampToImage(
            targetRawDataUrl || targetImageUrl,
            modScan.blurRegions
          );
          const blurKey = `${(targetSha256 || Date.now().toString()).slice(0, 24)}_blurred_${i + 1}.jpg`;
          const blurredUpload = await uploadCompressedSlipToR2(blurredDataUrl, blurKey);
          finalSlipImageUrl = blurredUpload.url;
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
          source_image_url: isMultiSlip ? targetImageUrl : null,
          image_sha256: i === 0 ? targetSha256 : null,
          image_dhash: i === 0 ? targetDhash : null,
          is_blurred: modScan.flagged,
          moderation_flag_reason: modScan.reason,
          capture_note: isMultiSlip
            ? `Slip ${i + 1} of ${draftsToSave.length} auto-extracted from multi-slip photo (${
                d.incidentTime || d.incidentDate
              })`
            : 'Auto-extracted & logged via AI Vision Capture',
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

      setAutoLoggedSlips(draftsToSave);
      setSubmittedSummary({ newCount, mergedCount, blurredQueueCount });
      setTimeout(() => {
        navigate(blurredQueueCount > 0 ? '/admin' : '/docket');
      }, 2400);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not save slip.');
      setShowManualEditor(true);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Zero-Touch Image Capture + Smart Smartphone Compression + Pre-Storage Slip Verification:
   * 1. Accepts ANY size smartphone photo (never rejects large photos) and reduces it in-browser down to ~45KB-82KB + checks duplicates.
   * 2. Verifies via AI Vision (`/api/extract-slip`) that the photo is INDEED a physical Demerit Slip and extracts all handwritten fields BEFORE storing anything in R2.
   * 3. Only after confirming it is a genuine Demerit Slip, uploads the reduced (<82KB) image to Cloudflare R2 (`copper-demerits-slips`) and logs to Cloudflare D1.
   */
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
    setSubmittedSummary(null);
    setAutoLoggedSlips(null);
    setCompressionStats(null);
    setUploadStatusMsg(
      'Step 1/3 · Reducing Smartphone Photo Size (<80KB) & Verifying Uniqueness (SHA-256 + dHash)...'
    );

    try {
      // 1. Accept any size smartphone image, reduce it in-browser to ~45KB-82KB, and check duplicates FIRST (0 bytes uploaded)
      const fingerprint = await fingerprintImageFile(file, 960, 0.74, 82 * 1024);
      const dupCheck = checkImageDuplicate(fingerprint);

      if (dupCheck.isDuplicate) {
        setDuplicateAlert(dupCheck);
        setImageUrl(null);
        setRawDataUrl(null);
        setImageSha256(null);
        setImageDhash(null);
        setCompressionStats(null);
        setUploadStatusMsg(null);
        return;
      }

      setCompressionStats({
        originalBytes: fingerprint.originalBytes,
        compressedBytes: fingerprint.compressedBytes,
        savingsPercent: fingerprint.savingsPercent,
        width: fingerprint.width,
        height: fingerprint.height,
      });

      // Show local preview while AI Vision verifies that the photo is indeed a Demerit Slip
      setImageUrl(fingerprint.dataUrl);
      setRawDataUrl(fingerprint.dataUrl);
      setImageSha256(fingerprint.sha256);
      setImageDhash(fingerprint.dhash);
      setUploadStatusMsg(
        `Step 2/3 · Reduced (${formatByteSize(fingerprint.originalBytes)} → ${formatByteSize(
          fingerprint.compressedBytes
        )}) · AI Vision Verifying Demerit Slip & Reading Handwriting...`
      );

      const todayStr = new Date().toISOString().slice(0, 10);
      const aiResult = await extractSlipsFromPhotoAI(fingerprint.dataUrl, todayStr);

      // 2. If AI Vision detects this is NOT a Demerit Slip (e.g., random selfie, drink, pet), block it BEFORE ever storing in Cloudflare R2!
      if (aiResult.isDemeritSlip === false) {
        setImageUrl(null);
        setRawDataUrl(null);
        setImageSha256(null);
        setImageDhash(null);
        setCompressionStats(null);
        setUploadStatusMsg(null);
        setErrorMsg(
          `🦓 Referee Whistle: ${
            aiResult.error ||
            'This photo does not appear to contain a physical Copper Demerit Slip. Please snap a clear photo of the demerit slip (0 bytes stored).'
          }`
        );
        return;
      }

      // 3. Verified as a Demerit Slip! Now store the reduced (<82KB) image in Cloudflare R2
      const filename = `${fingerprint.sha256.slice(0, 24)}.jpg`;
      const uploaded = await uploadCompressedSlipToR2(fingerprint.dataUrl, filename);
      setImageUrl(uploaded.url);

      if (aiResult.ok && aiResult.slips && aiResult.slips.length > 0) {
        const extractedDrafts: SlipDraftItem[] = aiResult.slips.map((s) => ({
          rawStudent: s.raw_student || 'Patron',
          rawSignature: s.raw_signature || 'The Boss - AKA Sarah',
          incidentDate: s.incident_date || todayStr,
          incidentTime: s.incident_time || '21:00',
          locationArea: s.location_area || 'Copper A.C.',
          items:
            Array.isArray(s.demerit_items) && s.demerit_items.length > 0
              ? s.demerit_items.map((it) => ({
                  type: it.type || DEMERIT_CATEGORIES[6],
                  description: it.description || 'Bar Citation',
                  points: Math.max(1, Number(it.points) || 1),
                }))
              : [
                  {
                    type: DEMERIT_CATEGORIES[6],
                    description: (s.infractions && s.infractions[0]) || 'Bar Demerit Citation',
                    points: Math.max(1, Number(s.demerit_count) || 1),
                  },
                ],
        }));

        setSlipDrafts(extractedDrafts);
        setUploadStatusMsg(
          `Step 3/3 · Verified Demerit Slip (${extractedDrafts.length} ${
            extractedDrafts.length === 1 ? 'Slip' : 'Slips'
          }) · Storing ${formatByteSize(fingerprint.compressedBytes)} & Logging to Ring of Honor...`
        );

        // Automatically log and save the extracted slip(s) so the user doesn't have to do anything else!
        await persistSlipDrafts(
          extractedDrafts,
          uploaded.url,
          fingerprint.dataUrl,
          fingerprint.sha256,
          fingerprint.dhash
        );

        setUploadStatusMsg(
          `Zero-Touch Complete · ${extractedDrafts.length} ${
            extractedDrafts.length === 1 ? 'Slip' : 'Slips'
          } Verified, Reduced (${formatByteSize(
            fingerprint.originalBytes
          )} → ${formatByteSize(fingerprint.compressedBytes)}${
            fingerprint.savingsPercent > 0 ? `, ${fingerprint.savingsPercent}% saved` : ''
          }) & Logged Automatically!`
        );
      } else {
        // Only open manual editor if handwriting was too faint for full OCR
        setShowManualEditor(true);
        setUploadStatusMsg(
          `Photo reduced (${formatByteSize(fingerprint.originalBytes)} → ${formatByteSize(
            fingerprint.compressedBytes
          )}) & stored in R2 · Review or enter slip details below.`
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

    await persistSlipDrafts(slipDrafts, imageUrl, rawDataUrl, imageSha256, imageDhash);
  };

  return (
    <div className="mx-auto max-w-3xl px-3 sm:px-4 py-5 sm:py-8 space-y-6">
      {/* Header */}
      <div className="border-b border-[#B87333]/30 pb-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#B87333]/40 bg-[#B87333]/10 px-3 py-1 text-[11px] font-mono-docket uppercase tracking-widest text-[#E8B888]">
          <Wand2 className="h-3.5 w-3.5 text-[#DFC15E]" />
          <span>ZERO-TOUCH AI VISION CAPTURE · SNAP &amp; DONE</span>
        </div>
        <h1 className="mt-2 font-athletic text-3xl sm:text-5xl font-extrabold uppercase tracking-wide text-[#F5F2EB]">
          SNAP A <span className="text-[#B87333]">SLIP PHOTO</span>
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[#B5A99D]">
          Just snap or choose a photo of the physical demerit slip(s). Our AI Referee automatically
          reads the handwriting (Student, Offenses, Points, Time, Room &amp; Signature) and logs it
          to the Ring of Honor — <strong className="text-[#DFC15E]">nothing else to type!</strong>
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
                SIGN IN OR CLAIM YOUR PROFILE FIRST
              </h2>
              <p className="text-xs sm:text-sm text-[#D6C7B8]">
                Sign in with your email or 10-digit phone number + Bar PIN (or claim an unclaimed
                name on the board) so every uploaded slip is tied to a verified bar member.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#DFC15E] to-[#B87333] px-5 py-3.5 font-athletic text-base font-black uppercase tracking-wider text-[#121212] shadow-[0_0_25px_rgba(223,193,94,0.4)] hover:brightness-110 shrink-0 cursor-pointer"
            >
              <KeyRound className="h-4 w-4" />
              <span>Sign In / Claim</span>
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

      {/* Zero-Touch Auto-Logged Receipt Card */}
      {submittedSummary && autoLoggedSlips && (
        <div className="rounded-3xl border-2 border-emerald-500/60 bg-gradient-to-b from-emerald-950/70 to-[#14110F] p-5 sm:p-6 text-emerald-100 space-y-4 shadow-[0_15px_50px_rgba(16,185,129,0.2)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-7 w-7 text-emerald-400 shrink-0" />
              <div>
                <span className="font-mono-docket text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                  ZERO-TOUCH AI VISION OCR • LOGGED AUTOMATICALLY
                </span>
                <h3 className="font-athletic text-2xl sm:text-3xl uppercase font-black text-white">
                  Slip Grabbed &amp; Logged to Ring of Honor!
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/docket')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-400 px-4 py-2 font-athletic text-sm font-black uppercase tracking-wider text-[#121212] hover:bg-emerald-300 cursor-pointer"
            >
              <span>View on Wall of Slips</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <p className="text-xs font-mono-docket text-emerald-200">
            {submittedSummary.newCount} new citation(s) logged automatically ·{' '}
            {submittedSummary.mergedCount} duplicate citation(s) merged as secondary photo evidence
            {submittedSummary.blurredQueueCount > 0
              ? ` · ${submittedSummary.blurredQueueCount} slip(s) auto-blurred by Referee & queued for Admin override.`
              : '.'}
          </p>

          <div className="grid grid-cols-1 gap-3">
            {autoLoggedSlips.map((s, idx) => {
              const resolvedPatron = resolvePatronNickname(s.rawStudent);
              const resolvedStaff = resolveStaffSignature(s.rawSignature);
              const totalPts = s.items.reduce((sum, it) => sum + (Number(it.points) || 1), 0);
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-emerald-500/35 bg-black/45 p-3.5 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-athletic text-xl font-black uppercase text-white">
                      {resolvedPatron.member?.display_name || s.rawStudent}{' '}
                      {resolvedPatron.member &&
                        s.rawStudent.trim().toLowerCase() !==
                          resolvedPatron.member.display_name.trim().toLowerCase() && (
                          <span className="font-mono-docket text-xs font-normal text-emerald-300">
                            (Slip: &ldquo;{s.rawStudent}&rdquo;)
                          </span>
                        )}
                    </div>
                    <span className="rounded-lg bg-[#C86D51]/25 border border-[#C86D51]/50 px-2.5 py-0.5 font-mono-docket text-xs font-bold text-[#E08A4E]">
                      +{totalPts} {totalPts === 1 ? 'DEMERIT' : 'DEMERITS'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {s.items.map((it, j) => (
                      <div
                        key={j}
                        className="flex flex-wrap items-center justify-between gap-2 font-mono-docket text-xs text-[#F5F2EB]"
                      >
                        <span>&bull; &ldquo;{it.description}&rdquo;</span>
                        <span className="text-[10px] text-[#DFC15E]">
                          {it.type} (+{it.points})
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2 font-mono-docket text-[11px] text-[#B5A99D]">
                    <span>
                      📅 {s.incidentDate} · 🕒 {s.incidentTime} · 📍 {s.locationArea}
                    </span>
                    <span>
                      ✍️ Signed: &ldquo;{s.rawSignature}&rdquo;
                      {resolvedStaff.member ? ` (${resolvedStaff.member.display_name})` : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Step 1: Zero-Touch Slip Photo Capture */}
        <div className="rounded-3xl border-2 border-[#B87333]/50 bg-[#1A1715] p-5 sm:p-7 space-y-4 shadow-[0_15px_45px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-mono-docket text-[10px] font-bold uppercase tracking-widest text-[#DFC15E]">
                ONE-TAP CAMERA OR PHOTO UPLOAD · AUTO-EXTRACTS ALL FIELDS
              </span>
              <h2 className="font-athletic text-2xl sm:text-3xl font-bold uppercase text-[#F5F2EB]">
                SNAP OR UPLOAD SLIP PHOTO
              </h2>
              <p className="mt-0.5 font-mono-docket text-xs text-[#B5A99D]">
                Works with 1 single slip or up to 4 slips in the same photo. Everything is read and
                saved automatically!
              </p>
            </div>

            {imageUrl && (
              <button
                type="button"
                onClick={() => {
                  setImageUrl(null);
                  setRawDataUrl(null);
                  setImageSha256(null);
                  setImageDhash(null);
                  setCompressionStats(null);
                  setUploadStatusMsg(null);
                  setSubmittedSummary(null);
                  setAutoLoggedSlips(null);
                }}
                className="rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-1.5 text-xs font-mono-docket font-bold text-rose-300 hover:bg-rose-500/25 self-start sm:self-auto cursor-pointer"
              >
                Snap Another Slip Photo
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
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-3.5 py-2.5 text-xs font-mono-docket text-emerald-300">
                <span className="flex items-center gap-1.5">
                  {uploadingPhoto || submitting ? (
                    <Wand2 className="h-4 w-4 text-[#DFC15E] animate-spin shrink-0" />
                  ) : (
                    <Fingerprint className="h-4 w-4 text-emerald-400 shrink-0" />
                  )}
                  {uploadStatusMsg}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {compressionStats && (
                    <span className="rounded-md border border-[#DFC15E]/40 bg-[#DFC15E]/15 px-2 py-0.5 text-[10px] font-bold text-[#DFC15E]">
                      ⚡ {formatByteSize(compressionStats.originalBytes)} &rarr;{' '}
                      {formatByteSize(compressionStats.compressedBytes)} (
                      {compressionStats.width}&times;{compressionStats.height}px
                      {compressionStats.savingsPercent > 0
                        ? ` · ${compressionStats.savingsPercent}% saved`
                        : ''}
                      )
                    </span>
                  )}
                  {imageDhash && (
                    <span className="text-[10px] text-emerald-400/80">dHash: {imageDhash}</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={uploadingPhoto || submitting}
                className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-[#DFC15E]/70 bg-gradient-to-b from-[#241C14] to-[#121212] p-6 sm:p-7 text-center transition hover:border-[#DFC15E] hover:brightness-110 active:scale-95 touch-manipulation cursor-pointer"
              >
                <Camera className="h-9 w-9 text-[#DFC15E]" />
                <span className="font-athletic text-xl font-black uppercase tracking-wider text-[#F5F2EB]">
                  {uploadingPhoto
                    ? 'AI Reading & Logging Slip...'
                    : 'Take Camera Photo'}
                </span>
                <span className="font-mono-docket text-xs text-[#D6C7B8]">
                  Snap slip(s) — grabs all info &amp; saves automatically
                </span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto || submitting}
                className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-[#B87333]/60 bg-[#121212] p-6 sm:p-7 text-center transition hover:border-[#B87333] hover:bg-[#B87333]/10 active:scale-95 touch-manipulation cursor-pointer"
              >
                <Upload className="h-9 w-9 text-[#B87333]" />
                <span className="font-athletic text-xl font-black uppercase tracking-wider text-[#F5F2EB]">
                  {uploadingPhoto
                    ? 'AI Reading & Logging Slip...'
                    : 'Choose Slip Photo'}
                </span>
                <span className="font-mono-docket text-xs text-[#D6C7B8]">
                  Upload single scan or multi-slip bar photo
                </span>
              </button>
            </div>
          )}

          {/* Friendly Mobile Hint */}
          <div className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 flex items-center gap-2.5 text-xs font-mono-docket text-[#D6C7B8]">
            <span className="text-base shrink-0">💡</span>
            <span>
              <strong className="text-[#DFC15E]">Pro-Tip:</strong> Lay slip flat in good bar lighting. Our AI reads handwriting, calculates demerit points, and logs to the scoreboard in seconds!
            </span>
          </div>

          {/* Optional Manual Override Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-white/10 pt-3">
            <span className="font-mono-docket text-xs text-[#D6C7B8]">
              ✨ AI Vision automatically grabs Student, Date, Time, Room, Offenses, Points &amp;
              Signature.
            </span>
            <button
              type="button"
              onClick={() => setShowManualEditor((prev) => !prev)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-[#121212] px-3.5 py-2 min-h-[44px] font-sans font-bold text-xs uppercase tracking-tight text-[#E8B888] hover:border-[#B87333] active:scale-95 touch-manipulation cursor-pointer self-start sm:self-auto"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>{showManualEditor ? 'Hide Manual Editor' : 'Manual Override / Edit'}</span>
            </button>
          </div>
        </div>

        {/* Optional Manual Slip Editor (Collapsed by default since AI Vision auto-extracts & logs!) */}
        {showManualEditor && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-[#121212] p-4 space-y-2">
              <span className="flex items-center gap-1.5 font-sans font-bold text-xs uppercase tracking-wider text-[#E8B888]">
                <Layers className="h-4 w-4 text-[#B87333]" />
                <span>HOW MANY PHYSICAL SLIPS ARE IN THIS IMAGE?</span>
              </span>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setSlipCountInPhoto(cnt)}
                    className={`rounded-xl border py-2.5 min-h-[44px] font-sans text-xs sm:text-sm font-extrabold uppercase transition touch-manipulation active:scale-95 cursor-pointer ${
                      slipDrafts.length === cnt
                        ? 'border-[#B87333] bg-[#B87333] text-[#121212] shadow-md'
                        : 'border-white/15 bg-[#1A1715] text-[#D6C7B8] hover:border-[#B87333]/50'
                    }`}
                  >
                    {cnt} {cnt === 1 ? 'Slip' : 'Slips'}
                  </button>
                ))}
              </div>
            </div>

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
                        Matches existing {resolvedPatron.member?.display_name || draft.rawStudent} ({draft.incidentTime}) slip — will merge
                        photo
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
                      className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#121212] px-3.5 py-2.5 min-h-[44px] text-base sm:text-sm text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
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
                              className={`rounded-xl border px-3 py-1.5 min-h-[38px] font-sans text-xs font-bold transition touch-manipulation active:scale-95 cursor-pointer ${
                                resolvedPatron.member?.id === m.id
                                  ? 'border-[#B87333] bg-[#B87333]/25 text-[#E8B888]'
                                  : 'border-white/10 bg-[#1A1715] text-[#D6C7B8] hover:border-[#B87333]/50'
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
                        className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#121212] px-3 py-2.5 min-h-[44px] font-mono-docket text-base sm:text-xs text-[#F5F2EB]"
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
                        className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#121212] px-3 py-2.5 min-h-[44px] font-mono-docket text-base sm:text-xs text-[#F5F2EB]"
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
                        className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#121212] px-3.5 py-2 min-h-[44px] text-base sm:text-sm text-[#F5F2EB]"
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
                        className="inline-flex items-center gap-1 min-h-[44px] px-3 py-1.5 font-sans text-xs font-bold uppercase text-[#E08A4E] hover:text-[#DFC15E] touch-manipulation active:scale-95 cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add Demerit Offense</span>
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {draft.items.map((item, itemIdx) => (
                        <div
                          key={itemIdx}
                          className="rounded-2xl border border-white/10 bg-[#121212] p-3.5 space-y-2.5"
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
                                className="flex-1 rounded-xl border border-white/15 bg-[#1A1715] px-3 py-2 min-h-[44px] font-sans text-base sm:text-xs text-[#E8B888]"
                              >
                                {DEMERIT_CATEGORIES.map((cat) => (
                                  <option key={cat} value={cat}>
                                    Type: {cat}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="font-mono-docket text-[10px] text-[#D6C7B8]">
                                POINTS:
                              </span>
                              {[1, 2, 3].map((pts) => (
                                <button
                                  key={pts}
                                  type="button"
                                  onClick={() =>
                                    updateDraftLineItem(draftIdx, itemIdx, { points: pts })
                                  }
                                  className={`rounded-xl border min-h-[44px] min-w-[44px] flex items-center justify-center font-sans text-sm font-black transition touch-manipulation active:scale-95 cursor-pointer ${
                                    item.points === pts
                                      ? 'border-[#B87333] bg-[#B87333] text-[#121212] shadow-md'
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
                                  className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border border-white/10 p-2 text-[#D6C7B8] hover:text-rose-400 active:scale-95 touch-manipulation cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) =>
                              updateDraftLineItem(draftIdx, itemIdx, {
                                description: e.target.value,
                              })
                            }
                            placeholder="Reason written on slip (e.g. Too many seat moves)..."
                            className="w-full rounded-xl border border-white/15 bg-[#1A1715] px-3.5 py-2.5 min-h-[44px] text-base sm:text-sm text-[#F5F2EB]"
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
                      className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#121212] px-3.5 py-2.5 min-h-[44px] text-base sm:text-sm text-[#F5F2EB] focus:border-[#B87333] focus:outline-none"
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
                            className="rounded-xl border border-white/10 bg-[#1A1715] px-3 py-1.5 min-h-[38px] font-sans text-xs font-bold text-[#D6C7B8] hover:border-[#B87333] hover:text-white touch-manipulation active:scale-95 cursor-pointer"
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
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#B87333] to-[#C86D51] px-6 py-4 min-h-[54px] font-sans font-black text-lg uppercase tracking-tight text-[#121212] shadow-[0_0_25px_rgba(184,115,51,0.4)] transition hover:brightness-110 active:scale-95 touch-manipulation disabled:opacity-40 cursor-pointer"
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
          </div>
        )}

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

