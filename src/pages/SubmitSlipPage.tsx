import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { PwaHelpIcon } from '../components/PwaTooltip';
import {
  rotateImageClockwise,
  cropNormalizedRegionFromDataUrl,
} from '../lib/imageAutoCrop';
import {
  moderateTextInstant,
  scanWithRefereeMonitor,
  applyRefereeBlurStampToImage,
  extractSlipsFromPhotoAI,
  getCurrentLocalDateTime,
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
  RotateCw,
  RotateCcw,
  FileText,
  Images,
} from 'lucide-react';

interface SlipDraftItem {
  rawStudent: string;
  rawSignature: string;
  incidentDate: string;
  incidentTime: string;
  locationArea: string;
  items: DemeritLineItem[];
  cropBox?: {
    x_min: number;
    y_min: number;
    x_max: number;
    y_max: number;
  };
}

function getFallbackClientCropBox(
  index: number,
  totalCount: number
): { x_min: number; y_min: number; x_max: number; y_max: number } {
  if (totalCount === 2) {
    return index === 0
      ? { x_min: 0.01, y_min: 0.02, x_max: 0.51, y_max: 0.98 }
      : { x_min: 0.49, y_min: 0.02, x_max: 0.99, y_max: 0.98 };
  }
  if (totalCount === 3) {
    if (index === 0) return { x_min: 0.01, y_min: 0.01, x_max: 0.51, y_max: 0.52 };
    if (index === 1) return { x_min: 0.49, y_min: 0.01, x_max: 0.99, y_max: 0.52 };
    return { x_min: 0.15, y_min: 0.48, x_max: 0.85, y_max: 0.99 };
  }
  const row = Math.floor((index % 4) / 2);
  const col = (index % 4) % 2;
  return {
    x_min: col === 0 ? 0.01 : 0.49,
    y_min: row === 0 ? 0.01 : 0.49,
    x_max: col === 0 ? 0.51 : 0.99,
    y_max: row === 0 ? 0.51 : 0.99,
  };
}

function createDefaultDraft(time?: string): SlipDraftItem {
  const localNow = getCurrentLocalDateTime();
  return {
    rawStudent: 'Rick',
    rawSignature: 'The Boss - AKA Sarah',
    incidentDate: localNow.date,
    incidentTime: time || localNow.time,
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
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    members,
    aliases,
    currentMember,
    isAdminOrStaff,
    setIsProfileModalOpen,
    resolveStaffSignature,
    resolvePatronNickname,
    checkImageDuplicate,
    checkCitationDuplicate,
    submitDemeritSlip,
  } = useDemerits();

  const initialMode = searchParams.get('mode') === 'multi' ? 'multi' : 'single';
  const [scanMode, setScanMode] = useState<'single' | 'multi'>(initialMode);
  // 0 = Auto-Detect (1–4 slips in photo), or explicit 2, 3, 4 slips in photo
  const [expectedSlipCount, setExpectedSlipCount] = useState<number>(0);

  useEffect(() => {
    const urlMode = searchParams.get('mode');
    if (urlMode === 'multi') {
      setScanMode('multi');
    } else if (urlMode === 'single') {
      setScanMode('single');
    }
  }, [searchParams]);

  const handleModeSwitch = (nextMode: 'single' | 'multi') => {
    setScanMode(nextMode);
    if (nextMode === 'multi') {
      setSearchParams({ mode: 'multi' }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
      setExpectedSlipCount(0);
    }
  };

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
  const [wasAutoCropped, setWasAutoCropped] = useState<boolean>(false);
  const [rotationDeg, setRotationDeg] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showManualEditor, setShowManualEditor] = useState(false);
  const [autoLoggedSlips, setAutoLoggedSlips] = useState<SlipDraftItem[] | null>(null);
  const [submittedSummary, setSubmittedSummary] = useState<{
    newCount: number;
    mergedCount: number;
    blurredQueueCount: number;
    photosProcessed?: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const multiFileInputRef = useRef<HTMLInputElement | null>(null);
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
      const localNow = getCurrentLocalDateTime();
      while (next.length < count) {
        next.push(createDefaultDraft(localNow.time));
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
   * Saves an array of slip drafts to Cloudflare D1 (with AI Referee auto-blur moderation,
   * individual slip cropping from multi-slip photos, & stat merging).
   */
  const persistSlipDrafts = async (
    draftsToSave: SlipDraftItem[],
    targetImageUrl: string,
    targetRawDataUrl: string | null,
    targetSha256: string | null,
    targetDhash: string | null,
    bypassDuplicateCheck = false,
    options?: {
      skipSuccessRedirect?: boolean;
    }
  ): Promise<{
    newCount: number;
    mergedCount: number;
    blurredQueueCount: number;
  }> => {
    if (!currentMember) {
      return { newCount: 0, mergedCount: 0, blurredQueueCount: 0 };
    }
    setSubmitting(true);
    setErrorMsg(null);
    setDuplicateAlert(null);
    try {
      let finalTargetUrl = targetImageUrl;
      if (targetImageUrl.startsWith('data:') && targetSha256) {
        const filename = `${targetSha256.slice(0, 24)}.jpg`;
        const uploaded = await uploadCompressedSlipToR2(targetImageUrl, filename);
        finalTargetUrl = uploaded.url;
        setImageUrl(uploaded.url);
      }

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

        // If this photo has multiple slips, crop each slip out using its AI Vision cropBox
        // (or quadrant fallback if the LLM omitted or returned a full-frame box) so each patron's
        // card on the Wall of Slips shows their own cropped ticket!
        let individualSlipDataUrl = targetRawDataUrl;
        let finalSlipImageUrl = finalTargetUrl;

        if (isMultiSlip && targetRawDataUrl) {
          let activeCropBox = d.cropBox;
          const rawW = activeCropBox
            ? (Number(activeCropBox.x_max) || 1) - (Number(activeCropBox.x_min) || 0)
            : 1;
          const rawH = activeCropBox
            ? (Number(activeCropBox.y_max) || 1) - (Number(activeCropBox.y_min) || 0)
            : 1;
          if (!activeCropBox || rawW <= 0.08 || rawH <= 0.08 || (rawW >= 0.85 && rawH >= 0.85)) {
            activeCropBox = getFallbackClientCropBox(i, draftsToSave.length);
          }

          try {
            const croppedDataUrl = await cropNormalizedRegionFromDataUrl(
              targetRawDataUrl,
              activeCropBox,
              960,
              0.78
            );
            individualSlipDataUrl = croppedDataUrl;
            const cropKey = `${(targetSha256 || Date.now().toString()).slice(0, 24)}_slip_${i + 1}.jpg`;
            const cropUpload = await uploadCompressedSlipToR2(croppedDataUrl, cropKey);
            finalSlipImageUrl = cropUpload.url;
          } catch {
            // Fallback to full photo
          }
        }

        // Scan text + image with AI Referee Monitor
        const modScan = await scanWithRefereeMonitor(
          [d.rawStudent, d.rawSignature, ...cleanedInfractions],
          individualSlipDataUrl
        );

        if (modScan.flagged && (individualSlipDataUrl || finalSlipImageUrl)) {
          const blurredDataUrl = await applyRefereeBlurStampToImage(
            individualSlipDataUrl || finalSlipImageUrl,
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
          source_image_url: isMultiSlip ? finalTargetUrl : null,
          image_sha256: i === 0 && !bypassDuplicateCheck ? targetSha256 : null,
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
          mergeIfCitationDuplicate: !bypassDuplicateCheck,
          bypassDuplicateCheck,
        });

        if (res.wasMergedDuplicate) {
          mergedCount += 1;
        } else if (res.wasBlurredAndQueued) {
          blurredQueueCount += 1;
        } else {
          newCount += 1;
        }
      }

      if (!options?.skipSuccessRedirect) {
        setAutoLoggedSlips(draftsToSave);
        setSubmittedSummary({ newCount, mergedCount, blurredQueueCount, photosProcessed: 1 });
        const loggedPatrons = draftsToSave.map((d) => d.rawStudent).join(', ');
        setTimeout(() => {
          navigate(
            blurredQueueCount > 0 && isAdminOrStaff
              ? '/admin'
              : `/docket?justLogged=1&patron=${encodeURIComponent(loggedPatrons)}`
          );
        }, 2000);
      }

      return { newCount, mergedCount, blurredQueueCount };
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not save slip.');
      setShowManualEditor(true);
      return { newCount: 0, mergedCount: 0, blurredQueueCount: 0 };
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Zero-Touch Image Capture + Smart Smartphone Compression + Pre-Storage Slip Verification:
   * Supports BOTH:
   * - A single photo containing 1 to 4 physical slips laid out together
   * - Multiple separate photos selected at once from the camera roll (`files.length > 1`)
   */
  const handleManualRotate = async (additionalDeg: number) => {
    if (!imageUrl) return;
    try {
      setUploadingPhoto(true);
      setUploadStatusMsg(`Rotating slip ${additionalDeg > 0 ? '+' : ''}${additionalDeg}° upright...`);
      const rotated = await rotateImageClockwise(imageUrl, additionalDeg);
      setImageUrl(rotated);
      setRawDataUrl(rotated);
      setRotationDeg((prev) => ((prev + additionalDeg) % 360 + 360) % 360);
      if (imageSha256) {
        const filename = `${imageSha256.slice(0, 24)}_rot${Date.now() % 10000}.jpg`;
        const uploaded = await uploadCompressedSlipToR2(rotated, filename);
        setImageUrl(uploaded.url);
      }
      setUploadStatusMsg('Slip rotated upright successfully!');
      setTimeout(() => setUploadStatusMsg(null), 2000);
    } catch (err) {
      console.error('Failed to rotate image:', err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files ? Array.from(e.target.files) : [];
    if (fileList.length === 0) return;

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

    const isMultiBatchFiles = fileList.length > 1;
    const isMultiModeActive = scanMode === 'multi' || expectedSlipCount > 1 || isMultiBatchFiles;
    const localNow = getCurrentLocalDateTime();
    const todayStr = localNow.date;
    const scanTimeStr = localNow.time;

    try {
      // CASE A: User selected MULTIPLE separate photo files from their camera roll at once!
      if (isMultiBatchFiles) {
        let totalNew = 0;
        let totalMerged = 0;
        let totalBlurred = 0;
        const allBatchDrafts: SlipDraftItem[] = [];

        for (let fIdx = 0; fIdx < fileList.length; fIdx++) {
          const currentFile = fileList[fIdx];
          setUploadStatusMsg(
            `Batch Photo ${fIdx + 1} of ${fileList.length} · Compressing & Reading Slip(s) with AI Vision...`
          );

          const fingerprint = await fingerprintImageFile(currentFile, 1100, 0.75, 95 * 1024, {
            skipPortraitAutoRotate: expectedSlipCount > 1,
          });
          setImageUrl(fingerprint.dataUrl);
          setRawDataUrl(fingerprint.dataUrl);
          setImageSha256(fingerprint.sha256);
          setImageDhash(fingerprint.dhash);
          setCompressionStats({
            originalBytes: fingerprint.originalBytes,
            compressedBytes: fingerprint.compressedBytes,
            savingsPercent: fingerprint.savingsPercent,
            width: fingerprint.width,
            height: fingerprint.height,
          });

          const aiResult = await extractSlipsFromPhotoAI(
            fingerprint.dataUrl,
            todayStr,
            expectedSlipCount > 1 ? expectedSlipCount : undefined,
            scanTimeStr
          );

          if (aiResult.isDemeritSlip === false || !aiResult.ok || !aiResult.slips?.length) {
            continue;
          }

          let workingDataUrl = fingerprint.dataUrl;
          if (aiResult.rotation_needed && aiResult.rotation_needed !== 0) {
            try {
              workingDataUrl = await rotateImageClockwise(fingerprint.dataUrl, aiResult.rotation_needed);
              setImageUrl(workingDataUrl);
              setRawDataUrl(workingDataUrl);
            } catch {
              // keep original
            }
          }

          const extractedDrafts: SlipDraftItem[] = aiResult.slips.map((s) => ({
            rawStudent: s.raw_student || 'Patron',
            rawSignature: s.raw_signature || 'The Boss - AKA Sarah',
            incidentDate: s.incident_date || todayStr,
            incidentTime: s.incident_time || scanTimeStr,
            locationArea: s.location_area || 'Copper A.C.',
            cropBox: s.crop_box,
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

          const filename = `${fingerprint.sha256.slice(0, 24)}.jpg`;
          const uploaded = await uploadCompressedSlipToR2(workingDataUrl, filename);

          const batchRes = await persistSlipDrafts(
            extractedDrafts,
            uploaded.url,
            workingDataUrl,
            fingerprint.sha256,
            fingerprint.dhash,
            false,
            { skipSuccessRedirect: true }
          );

          totalNew += batchRes.newCount;
          totalMerged += batchRes.mergedCount;
          totalBlurred += batchRes.blurredQueueCount;
          allBatchDrafts.push(...extractedDrafts);
        }

        if (allBatchDrafts.length > 0) {
          setSlipDrafts(allBatchDrafts);
          setAutoLoggedSlips(allBatchDrafts);
          setSubmittedSummary({
            newCount: totalNew,
            mergedCount: totalMerged,
            blurredQueueCount: totalBlurred,
            photosProcessed: fileList.length,
          });
          setUploadStatusMsg(
            `Batch Complete · ${allBatchDrafts.length} Slip(s) across ${fileList.length} Photos Verified & Logged Automatically!`
          );
          const batchPatrons = allBatchDrafts.map((d) => d.rawStudent).join(', ');
          setTimeout(() => {
            navigate(
              totalBlurred > 0 && isAdminOrStaff
                ? '/admin'
                : `/docket?justLogged=1&patron=${encodeURIComponent(batchPatrons)}`
            );
          }, 2200);
        } else {
          setErrorMsg(
            '🦓 Referee Whistle: Could not detect physical Demerit Slips in the selected photos. Please try a clearer photo or use Manual Override below.'
          );
        }
        return;
      }

      // CASE B: Single image file (containing either 1 slip OR 2–4 slips laid side-by-side)
      const file = fileList[0];
      setUploadStatusMsg(
        isMultiModeActive
          ? 'Step 1/3 · Optimizing Multi-Slip Photo (<95KB) & Preparing High-Res Layout...'
          : 'Step 1/3 · Reducing Smartphone Photo Size (<80KB) & Preparing Slip...'
      );

      // Use slightly higher maxDimension (1150px) and skip blind portrait 270° rotation when in Multi-Slip mode
      const fingerprint = await fingerprintImageFile(
        file,
        isMultiModeActive ? 1150 : 960,
        isMultiModeActive ? 0.76 : 0.74,
        isMultiModeActive ? 105 * 1024 : 82 * 1024,
        { skipPortraitAutoRotate: isMultiModeActive }
      );
      setWasAutoCropped(Boolean(fingerprint.wasCropped));
      setRotationDeg(fingerprint.rotationApplied || 0);

      setCompressionStats({
        originalBytes: fingerprint.originalBytes,
        compressedBytes: fingerprint.compressedBytes,
        savingsPercent: fingerprint.savingsPercent,
        width: fingerprint.width,
        height: fingerprint.height,
      });

      setImageUrl(fingerprint.dataUrl);
      setRawDataUrl(fingerprint.dataUrl);
      setImageSha256(fingerprint.sha256);
      setImageDhash(fingerprint.dhash);

      const dupCheck = checkImageDuplicate(fingerprint);
      if (dupCheck.isDuplicate) {
        setDuplicateAlert(dupCheck);
        setShowManualEditor(true);
        setUploadStatusMsg(null);
        return;
      }

      setUploadStatusMsg(
        `Step 2/3 · Reduced (${formatByteSize(fingerprint.originalBytes)} → ${formatByteSize(
          fingerprint.compressedBytes
        )}) · AI Vision Scanning ${
          expectedSlipCount > 1
            ? `All ${expectedSlipCount} Slips in Photo`
            : isMultiModeActive
            ? 'All Slips (1–4) in Photo'
            : 'Demerit Slip & Reading Handwriting'
        }...`
      );

      const aiResult = await extractSlipsFromPhotoAI(
        fingerprint.dataUrl,
        todayStr,
        expectedSlipCount > 1 ? expectedSlipCount : undefined,
        scanTimeStr
      );

      // If AI detects the photo still needs rotation to be upright, apply it automatically
      let finalWorkingImageUrl = fingerprint.dataUrl;
      if (aiResult.rotation_needed && aiResult.rotation_needed !== 0) {
        try {
          finalWorkingImageUrl = await rotateImageClockwise(
            fingerprint.dataUrl,
            aiResult.rotation_needed
          );
          setImageUrl(finalWorkingImageUrl);
          setRawDataUrl(finalWorkingImageUrl);
          setRotationDeg((prev) => (prev + (aiResult.rotation_needed || 0)) % 360);
        } catch {
          // Keep current image
        }
      }

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

      if (aiResult.ok && aiResult.slips && aiResult.slips.length > 0) {
        const extractedDrafts: SlipDraftItem[] = aiResult.slips.map((s) => ({
          rawStudent: s.raw_student || 'Patron',
          rawSignature: s.raw_signature || 'The Boss - AKA Sarah',
          incidentDate: s.incident_date || todayStr,
          incidentTime: s.incident_time || scanTimeStr,
          locationArea: s.location_area || 'Copper A.C.',
          cropBox: s.crop_box,
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

        // If user explicitly chose e.g. 2, 3, or 4 slips and AI found fewer, pad drafts and open manual review so they can verify
        if (expectedSlipCount > extractedDrafts.length) {
          while (extractedDrafts.length < expectedSlipCount) {
            extractedDrafts.push(createDefaultDraft(scanTimeStr));
          }
          setSlipDrafts(extractedDrafts);
          setShowManualEditor(true);
          setUploadStatusMsg(
            `AI read ${aiResult.slips.length} of ${expectedSlipCount} slips — review or complete the remaining slip card(s) below and tap Save!`
          );
          return;
        }

        setSlipDrafts(extractedDrafts);
        if (extractedDrafts.length > 1) {
          setScanMode('multi');
        }

        // Pre-storage Citation Duplicate Check:
        // Compare extracted student, date & infractions against all existing slips on the scoreboard.
        for (const draft of extractedDrafts) {
          const citDup = checkCitationDuplicate({
            raw_student: draft.rawStudent,
            incident_date: draft.incidentDate,
            incident_time: draft.incidentTime,
            demerit_count: draft.items.reduce((sum, it) => sum + (Number(it.points) || 1), 0),
            infractions: draft.items.map((it) => it.description),
          });

          if (citDup.isDuplicate) {
            setDuplicateAlert(citDup);
            setShowManualEditor(true);
            setUploadStatusMsg(
              'Possible duplicate citation detected — review below or tap "Log It Anyway" if this is a new slip.'
            );
            return;
          }
        }

        // 3. Verified as genuine NEW Demerit Slip(s)! Store the reduced image in Cloudflare R2
        const filename = `${fingerprint.sha256.slice(0, 24)}.jpg`;
        const uploaded = await uploadCompressedSlipToR2(finalWorkingImageUrl, filename);
        setImageUrl(uploaded.url);

        setUploadStatusMsg(
          `Step 3/3 · Verified ${extractedDrafts.length} ${
            extractedDrafts.length === 1 ? 'Demerit Slip' : 'Demerit Slips in Photo'
          } · Storing ${formatByteSize(fingerprint.compressedBytes)} & Logging to Ring of Honor...`
        );

        // Automatically log and save the extracted slip(s) so the user doesn't have to do anything else!
        await persistSlipDrafts(
          extractedDrafts,
          uploaded.url,
          finalWorkingImageUrl,
          fingerprint.sha256,
          fingerprint.dhash,
          false
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
        if (expectedSlipCount > 1) {
          setSlipCountInPhoto(expectedSlipCount);
        }
        setShowManualEditor(true);
        setUploadStatusMsg(
          `Photo reduced (${formatByteSize(fingerprint.originalBytes)} → ${formatByteSize(
            fingerprint.compressedBytes
          )}) · Review or enter slip details below.`
        );
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to process image file. Please try another photo.';
      setErrorMsg(msg);
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

    // Pre-submission citation duplicate check across all drafts
    for (const d of slipDrafts) {
      const citDup = checkCitationDuplicate({
        raw_student: d.rawStudent,
        incident_date: d.incidentDate,
        incident_time: d.incidentTime,
        demerit_count: d.items.reduce((sum, it) => sum + (Number(it.points) || 1), 0),
        infractions: d.items.map((it) => it.description),
      });

      if (citDup.isDuplicate) {
        setDuplicateAlert(citDup);
        setErrorMsg(
          `🦓 Referee Whistle: Possible duplicate citation! ${
            citDup.matchedDescription ||
            `A citation for ${d.rawStudent} on ${d.incidentDate} already exists on the scoreboard.`
          } If this is a brand-new ticket, tap "Log It Anyway — This Is a New Ticket" above.`
        );
        return;
      }
    }

    await persistSlipDrafts(slipDrafts, imageUrl, rawDataUrl, imageSha256, imageDhash, false);
  };

  return (
    <div className="mx-auto max-w-3xl px-3 sm:px-4 py-5 sm:py-8 space-y-6">
      {/* Header */}
      <div className="border-b border-[#B87333]/30 pb-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#B87333]/40 bg-[#B87333]/10 px-3 py-1 text-[11px] font-mono-docket uppercase tracking-widest text-[#E8B888]">
          <Wand2 className="h-3.5 w-3.5 text-[#DFC15E]" />
          <span>ZERO-TOUCH AI VISION CAPTURE · SINGLE OR MULTI-SLIP SCANNER</span>
        </div>
        <h1 className="mt-2 font-athletic text-3xl sm:text-5xl font-extrabold uppercase tracking-wide text-[#F5F2EB]">
          SNAP <span className="text-[#B87333]">1 OR MULTIPLE SLIPS</span>
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[#B5A99D]">
          Snap a single ticket, lay <strong className="text-[#F5F2EB]">2–4 physical slips side-by-side</strong> in one photo, or select <strong className="text-[#F5F2EB]">multiple photos at once</strong> from your camera roll. Our AI Referee reads every slip&apos;s Student, Offenses, Points, Time &amp; Signature and logs them to the Ring of Honor automatically —{' '}
          <strong className="text-[#DFC15E]">anyone (Referees or Patrons) can scan slips for the whole table!</strong>
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
                Sign in with your Name, Nickname, Phone, or Email + Bar PIN (or claim an unclaimed
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
                  ? 'Site Administrator & Official Referee · Can scan slips for any patron'
                  : currentMember.is_staff
                  ? 'Official Bar Referee / Staff Account · Can scan slips for any patron'
                  : 'Verified Ring of Honor Patron · Can scan slips for yourself or friends'}
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

      {/* Duplicate Slip Notice with 1-Tap Override Button */}
      {duplicateAlert?.isDuplicate && (
        <div className="rounded-2xl border-2 border-amber-500/60 bg-amber-950/50 p-4 sm:p-5 text-amber-100 space-y-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-6 w-6 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <h3 className="font-athletic text-xl font-bold uppercase text-amber-200">
                Possible Duplicate Citation Flagged ({duplicateAlert.similarityPercent ?? 100}% Match)
              </h3>
              <p className="mt-0.5 text-xs font-mono-docket text-amber-200/90">
                {duplicateAlert.matchedDescription
                  ? duplicateAlert.matchedDescription
                  : 'This photo file or citation matches a slip already logged on the Ring of Honor.'}
              </p>
              {duplicateAlert.matchedSlip && (
                <div className="mt-2 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-black/50 p-2.5">
                  {duplicateAlert.matchedSlip.image_url && (
                    <img
                      src={duplicateAlert.matchedSlip.image_url}
                      alt="Existing matched slip"
                      className="h-14 w-16 rounded-lg object-cover border border-amber-400/40"
                    />
                  )}
                  <div className="text-xs font-mono-docket">
                    <p className="font-bold text-white">
                      Existing Citation: {duplicateAlert.matchedSlip.raw_student} (+
                      {duplicateAlert.matchedSlip.demerit_count} Demerits)
                    </p>
                    <p className="text-amber-300">
                      {duplicateAlert.matchedSlip.incident_date}{' '}
                      {duplicateAlert.matchedSlip.incident_time || ''} · Signed:{' '}
                      &ldquo;{duplicateAlert.matchedSlip.raw_signature}&rdquo;
                    </p>
                  </div>
                </div>
              )}

              {imageUrl && (
                <div className="pt-2 flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() =>
                      persistSlipDrafts(
                        slipDrafts,
                        imageUrl,
                        rawDataUrl,
                        imageSha256,
                        imageDhash,
                        true
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#DFC15E] to-[#B87333] px-4 py-2.5 font-athletic text-sm font-black uppercase tracking-wider text-[#121212] shadow-md hover:brightness-110 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Log It Anyway — This Is a New Ticket</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDuplicateAlert(null);
                      setShowManualEditor(true);
                    }}
                    className="rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 font-mono-docket text-xs text-[#F5F2EB] hover:border-[#DFC15E] cursor-pointer"
                  >
                    Edit Slip Details First
                  </button>
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
                  {autoLoggedSlips.length > 1
                    ? `${autoLoggedSlips.length} Slips Grabbed & Logged to Ring of Honor!`
                    : 'Slip Grabbed & Logged to Ring of Honor!'}
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
                      {autoLoggedSlips.length > 1 && (
                        <span className="mr-2 rounded bg-emerald-500/20 px-2 py-0.5 font-mono-docket text-xs text-emerald-300">
                          Slip #{idx + 1}
                        </span>
                      )}
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
        <div className="rounded-3xl border-2 border-[#B87333]/50 bg-[#1A1715] p-5 sm:p-7 space-y-5 shadow-[0_15px_45px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-mono-docket text-[10px] font-bold uppercase tracking-widest text-[#DFC15E]">
                ONE-TAP CAMERA OR PHOTO UPLOAD · AUTO-EXTRACTS ALL FIELDS
              </span>
              <div className="flex items-center gap-2">
                <h2 className="font-athletic text-2xl sm:text-3xl font-bold uppercase text-[#F5F2EB]">
                  {scanMode === 'multi'
                    ? 'MULTI-SLIP & BATCH PHOTO SCANNER'
                    : 'SNAP OR UPLOAD SLIP PHOTO'}
                </h2>
                <PwaHelpIcon
                  tag="MULTI-SLIP & CAMERA"
                  content="Switch between Single Slip or Multi-Slip / Batch mode! You can lay 2–4 physical slips side-by-side in a single photo, or select multiple photos at once from your gallery."
                />
              </div>
              <p className="mt-0.5 font-mono-docket text-xs text-[#B5A99D]">
                {scanMode === 'multi'
                  ? 'Lay 2 to 4 physical slips flat next to each other in 1 photo, OR select multiple slip photos from your camera roll at once!'
                  : 'Snap 1 slip or switch to Multi-Slip / Batch Mode below to scan 2–4 slips at once!'}
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
                  setDuplicateAlert(null);
                }}
                className="rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-1.5 text-xs font-mono-docket font-bold text-rose-300 hover:bg-rose-500/25 self-start sm:self-auto cursor-pointer"
              >
                Snap Another Slip Photo
              </button>
            )}
          </div>

          {/* PROMINENT SCAN MODE TOGGLE: SINGLE SLIP vs MULTI-SLIP / BATCH */}
          <div className="rounded-2xl border border-[#B87333]/40 bg-[#12100E] p-2.5 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleModeSwitch('single')}
                className={`flex items-center justify-center gap-2 rounded-xl py-3 px-3 min-h-[48px] font-athletic text-base sm:text-lg font-black uppercase tracking-wider transition touch-manipulation active:scale-95 cursor-pointer ${
                  scanMode === 'single'
                    ? 'bg-gradient-to-r from-[#B87333] to-[#C86D51] text-[#121212] shadow-[0_0_20px_rgba(184,115,51,0.35)]'
                    : 'border border-white/10 bg-[#1A1715] text-[#D6C7B8] hover:border-[#B87333]/50 hover:text-white'
                }`}
              >
                <FileText className="h-4 w-4 shrink-0" />
                <span>Single Slip Photo</span>
              </button>

              <button
                type="button"
                onClick={() => handleModeSwitch('multi')}
                className={`flex items-center justify-center gap-2 rounded-xl py-3 px-3 min-h-[48px] font-athletic text-base sm:text-lg font-black uppercase tracking-wider transition touch-manipulation active:scale-95 cursor-pointer ${
                  scanMode === 'multi'
                    ? 'bg-gradient-to-r from-[#DFC15E] to-[#B87333] text-[#121212] shadow-[0_0_20px_rgba(223,193,94,0.4)]'
                    : 'border border-[#DFC15E]/30 bg-[#1A1715] text-[#DFC15E] hover:border-[#DFC15E] hover:bg-[#DFC15E]/10'
                }`}
              >
                <Layers className="h-4 w-4 shrink-0" />
                <span>Multi-Slip / Batch (2–4 Slips)</span>
              </button>
            </div>

            {/* Upfront Multi-Slip Count Selector when Multi-Slip Mode is active */}
            {scanMode === 'multi' && (
              <div className="rounded-xl border border-[#DFC15E]/35 bg-[#1B1611] p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-mono-docket text-[11px] font-bold uppercase text-[#DFC15E]">
                    <Layers className="h-3.5 w-3.5" />
                    <span>HOW MANY PHYSICAL SLIPS ARE IN YOUR PHOTO?</span>
                  </span>
                  <span className="font-mono-docket text-[10px] text-[#D6C7B8]">
                    AI splits &amp; assigns each slip to its own Patron automatically
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { count: 0, label: '✨ Auto-Detect (1–4)' },
                    { count: 2, label: '2 Slips in Photo' },
                    { count: 3, label: '3 Slips in Photo' },
                    { count: 4, label: '4 Slips in Photo' },
                  ].map((opt) => (
                    <button
                      key={opt.count}
                      type="button"
                      onClick={() => {
                        setExpectedSlipCount(opt.count);
                        if (opt.count > 0) {
                          setSlipCountInPhoto(opt.count);
                        }
                      }}
                      className={`rounded-xl border py-2 px-2.5 min-h-[42px] font-mono-docket text-xs font-bold transition touch-manipulation active:scale-95 cursor-pointer ${
                        expectedSlipCount === opt.count
                          ? 'border-[#DFC15E] bg-[#DFC15E] text-[#121212] shadow-sm'
                          : 'border-white/15 bg-[#12100E] text-[#D6C7B8] hover:border-[#DFC15E]/50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            ref={multiFileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              setScanMode('multi');
              handleFileChange(e);
            }}
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
              <div className="overflow-hidden rounded-xl border-2 border-[#B87333]/50 bg-black p-2 space-y-2">
                <img
                  src={imageUrl}
                  alt="Uploaded physical slip"
                  className="mx-auto max-h-80 w-auto rounded object-contain"
                />
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2 px-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {wasAutoCropped && (
                      <span className="inline-flex items-center gap-1 rounded bg-[#B87333]/25 border border-[#B87333]/50 px-2 py-0.5 font-mono-docket text-[10px] font-bold text-[#E8B888]">
                        ✂️ AUTO-CROPPED TO RECEIPT
                      </span>
                    )}
                    {rotationDeg > 0 && (
                      <span className="inline-flex items-center gap-1 rounded bg-[#DFC15E]/20 border border-[#DFC15E]/40 px-2 py-0.5 font-mono-docket text-[10px] font-bold text-[#DFC15E]">
                        ↻ ROTATED {rotationDeg}° UPRIGHT
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleManualRotate(90)}
                      disabled={uploadingPhoto || submitting}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/5 px-2.5 py-1.5 min-h-[38px] font-mono-docket text-xs font-bold text-[#D6C7B8] hover:text-[#DFC15E] hover:border-[#DFC15E]/50 active:scale-95 touch-manipulation cursor-pointer transition disabled:opacity-50"
                      title="Rotate 90 degrees clockwise"
                    >
                      <RotateCw className="h-3.5 w-3.5 text-[#DFC15E]" />
                      <span>Rotate 90°</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleManualRotate(-90)}
                      disabled={uploadingPhoto || submitting}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/5 px-2.5 py-1.5 min-h-[38px] font-mono-docket text-xs font-bold text-[#D6C7B8] hover:text-[#DFC15E] hover:border-[#DFC15E]/50 active:scale-95 touch-manipulation cursor-pointer transition disabled:opacity-50"
                      title="Rotate 90 degrees counter-clockwise"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-[#DFC15E]" />
                      <span>Rotate -90°</span>
                    </button>
                  </div>
                </div>
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
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={uploadingPhoto || submitting}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#DFC15E]/70 bg-gradient-to-b from-[#241C14] to-[#121212] p-5 sm:p-6 text-center transition hover:border-[#DFC15E] hover:brightness-110 active:scale-95 touch-manipulation cursor-pointer"
              >
                <Camera className="h-8 w-8 text-[#DFC15E]" />
                <span className="font-athletic text-xl font-black uppercase tracking-wider text-[#F5F2EB]">
                  {uploadingPhoto
                    ? 'AI Reading Slip(s)...'
                    : scanMode === 'multi'
                    ? 'Snap Multi-Slip Photo'
                    : 'Take Camera Photo'}
                </span>
                <span className="font-mono-docket text-[11px] text-[#D6C7B8]">
                  {scanMode === 'multi'
                    ? 'Frame 2–4 slips side-by-side & snap once'
                    : 'Snap 1 slip (or up to 4 slips together)'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto || submitting}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#B87333]/60 bg-[#121212] p-5 sm:p-6 text-center transition hover:border-[#B87333] hover:bg-[#B87333]/10 active:scale-95 touch-manipulation cursor-pointer"
              >
                <Upload className="h-8 w-8 text-[#B87333]" />
                <span className="font-athletic text-xl font-black uppercase tracking-wider text-[#F5F2EB]">
                  {uploadingPhoto ? 'AI Reading Slip(s)...' : 'Choose Slip Photo'}
                </span>
                <span className="font-mono-docket text-[11px] text-[#D6C7B8]">
                  Upload from camera roll or gallery
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleModeSwitch('multi');
                  multiFileInputRef.current?.click();
                }}
                disabled={uploadingPhoto || submitting}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-400/60 bg-gradient-to-b from-emerald-950/35 to-[#121212] p-5 sm:p-6 text-center transition hover:border-emerald-400 hover:brightness-110 active:scale-95 touch-manipulation cursor-pointer"
              >
                <Images className="h-8 w-8 text-emerald-400" />
                <span className="font-athletic text-xl font-black uppercase tracking-wider text-emerald-200">
                  {uploadingPhoto ? 'Batch Scanning...' : 'Multi-Slip / Batch Upload'}
                </span>
                <span className="font-mono-docket text-[11px] text-emerald-200/80">
                  1 photo with 2–4 slips OR select multiple photos
                </span>
              </button>
            </div>
          )}

          {/* Friendly Mobile Hint */}
          <div className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 flex items-center gap-2.5 text-xs font-mono-docket text-[#D6C7B8]">
            <span className="text-base shrink-0">💡</span>
            <span>
              <strong className="text-[#DFC15E]">Multi-Slip Pro-Tip:</strong> Lay up to{' '}
              <strong className="text-white">4 slips side-by-side</strong> on the bar and take 1 clear photo — OR select{' '}
              <strong className="text-white">multiple separate slip photos</strong> from your phone gallery at once. Each slip is cropped and credited to the right patron automatically!
            </span>
          </div>

          {/* Optional Manual Override Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-white/10 pt-3">
            <span className="font-mono-docket text-xs text-[#D6C7B8]">
              ✨ AI Vision automatically grabs Student, Date, Time, Room, Offenses, Points &amp;
              Signature for every slip.
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
                    onClick={() => {
                      setExpectedSlipCount(cnt);
                      setSlipCountInPhoto(cnt);
                    }}
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
                        Similar citation on file for {resolvedPatron.member?.display_name || draft.rawStudent}
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
