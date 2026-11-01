import { DemeritSlip } from '../types/demerits';
import { KNOWN_UPLOADED_FILE_HASHES } from './defaultData';
import { autoCropAndRotateSlip } from './imageAutoCrop';

export interface ImageFingerprint {
  sha256: string;
  dhash: string;
  rotatedDhashes?: string[];
  dataUrl: string;
  width: number;
  height: number;
  originalBytes: number;
  compressedBytes: number;
  savingsPercent: number;
  wasCropped?: boolean;
  rotationApplied?: number;
}

/**
 * Estimates the binary byte length of a base64 Data URL (`data:image/jpeg;base64,...`).
 */
export function estimateDataUrlBytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(',');
  const base64Len = commaIdx >= 0 ? dataUrl.length - (commaIdx + 1) : dataUrl.length;
  return Math.max(1, Math.round((base64Len * 3) / 4));
}

/**
 * Formats a byte count into a clean human-readable label (e.g. `6.4 MB` or `64 KB`).
 */
export function formatByteSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  reason?: 'exact-sha256' | 'perceptual-dhash' | 'citation-match';
  similarityPercent?: number;
  matchedSlip?: DemeritSlip;
  matchedDescription?: string;
}

/**
 * Computes a cryptographic SHA-256 hex digest from an ArrayBuffer or string.
 */
export async function computeSha256FromBuffer(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Computes a 64-bit Perceptual Difference Hash (dHash, 16 hex chars) from an HTMLImageElement
 * at a given rotation (0, 90, 180, 270 degrees).
 */
export function computePerceptualDHash(
  img: HTMLImageElement,
  rotationDeg: 0 | 90 | 180 | 270 = 0
): string {
  const width = 9;
  const height = 8;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.save();
  if (rotationDeg === 0) {
    ctx.drawImage(img, 0, 0, width, height);
  } else {
    ctx.translate(width / 2, height / 2);
    ctx.rotate((rotationDeg * Math.PI) / 180);
    if (rotationDeg === 90 || rotationDeg === 270) {
      ctx.drawImage(img, -height / 2, -width / 2, height, width);
    } else {
      ctx.drawImage(img, -width / 2, -height / 2, width, height);
    }
  }
  ctx.restore();

  const { data } = ctx.getImageData(0, 0, width, height);

  // Convert RGBA to grayscale luminance array (9x8 = 72 pixels)
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  // Compare each pixel (row, col) with (row, col + 1) -> 8x8 = 64 bits
  let bits = '';
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < height; col++) {
      const left = gray[row * width + col];
      const right = gray[row * width + col + 1];
      bits += left < right ? '1' : '0';
    }
  }

  // Convert 64 bits into 16 hex characters
  let hex = '';
  for (let i = 0; i < 64; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

/**
 * Calculates the Hamming distance (number of differing bits, 0..64) between two 16-char hex dHashes.
 */
export function calculateHammingDistance(
  hashA: string | null | undefined,
  hashB: string | null | undefined
): number {
  if (!hashA || !hashB || hashA.length !== 16 || hashB.length !== 16) {
    return 64;
  }
  let distance = 0;
  for (let i = 0; i < 16; i++) {
    const xor = parseInt(hashA[i], 16) ^ parseInt(hashB[i], 16);
    distance += (xor & 1) + ((xor >> 1) & 1) + ((xor >> 2) & 1) + ((xor >> 3) & 1);
  }
  return distance;
}

/**
 * Extracts the exact SHA-256 raw file digest and rotation-aware 64-bit perceptual dHashes,
 * while aggressively compressing modern 12MP-48MP smartphone photos (typically 4MB-12MB)
 * down to a crisp ~45KB-82KB image (stripping all EXIF/GPS metadata and keeping handwriting sharp).
 */
export async function fingerprintImageFile(
  file: File,
  maxDimension = 960,
  initialQuality = 0.74,
  targetMaxBytes = 82 * 1024,
  options?: {
    skipPortraitAutoRotate?: boolean;
  }
): Promise<ImageFingerprint> {
  const originalBytes = file.size || 0;
  const buffer = await file.arrayBuffer();
  const sha256 = await computeSha256FromBuffer(buffer);

  // 1. Automatically crop paper boundary & auto-rotate upright
  const autoResult = await autoCropAndRotateSlip(file, {
    maxDimension,
    quality: initialQuality,
    skipPortraitAutoRotate: options?.skipPortraitAutoRotate,
  });

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onerror = () => reject(new Error('Invalid image format'));
    img.onload = () => {
      const dhash = computePerceptualDHash(img, 0);
      const rotatedDhashes = [
        dhash,
        computePerceptualDHash(img, 90),
        computePerceptualDHash(img, 180),
        computePerceptualDHash(img, 270),
      ].filter(Boolean);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      const renderCompressed = (targetW: number, targetH: number, q: number): string => {
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return autoResult.dataUrl;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        // Fill white background in case of transparent PNGs before JPEG encoding
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(img, 0, 0, targetW, targetH);
        return canvas.toDataURL('image/jpeg', q);
      };

      let dataUrl = renderCompressed(width, height, initialQuality);
      let compressedBytes = estimateDataUrlBytes(dataUrl);

      // Adaptive byte-budget loop: step down quality if needed so smartphone photos stay under ~82KB
      const qualitySteps = [0.66, 0.58, 0.52];
      for (const qStep of qualitySteps) {
        if (compressedBytes <= targetMaxBytes) break;
        dataUrl = renderCompressed(width, height, qStep);
        compressedBytes = estimateDataUrlBytes(dataUrl);
      }

      // Final dimension step-down if an unusually dense texture still exceeds targetMaxBytes
      if (compressedBytes > targetMaxBytes && (width > 720 || height > 720)) {
        width = Math.round(width * 0.82);
        height = Math.round(height * 0.82);
        dataUrl = renderCompressed(width, height, 0.62);
        compressedBytes = estimateDataUrlBytes(dataUrl);
      }

      const savingsPercent =
        originalBytes > compressedBytes
          ? Math.min(99, Math.max(1, Math.round(((originalBytes - compressedBytes) / originalBytes) * 100)))
          : 0;

      resolve({
        sha256,
        dhash,
        rotatedDhashes,
        dataUrl,
        width,
        height,
        originalBytes: originalBytes || compressedBytes,
        compressedBytes,
        savingsPercent,
        wasCropped: autoResult.wasCropped,
        rotationApplied: autoResult.rotationApplied,
      });
    };
    img.src = autoResult.dataUrl;
  });
}

/**
 * Computes fingerprint from an existing image URL / Data URL.
 */
export async function fingerprintImageUrl(
  imageUrl: string
): Promise<{ sha256: string; dhash: string }> {
  const encoder = new TextEncoder();
  const sha256 = await computeSha256FromBuffer(encoder.encode(imageUrl).buffer as ArrayBuffer);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onerror = () => resolve({ sha256, dhash: '' });
    img.onload = () => {
      const dhash = computePerceptualDHash(img, 0);
      resolve({ sha256, dhash });
    };
    img.src = imageUrl;
  });
}

/**
 * Checks whether an image fingerprint is an exact binary SHA-256 duplicate of an already-uploaded file.
 *
 * NOTE: We intentionally do NOT block uploads based on 9x8 perceptual dHash alone because every
 * auto-cropped Cherry Printers "DEMERIT SLIP" form has the exact same bold top header, horizontal
 * rule lines, and checkbox layout, producing 84%–92% dHash similarity across completely different
 * tickets! Duplicate slip detection for different photos of the same ticket is handled accurately
 * by `checkDuplicateCitationContent` after OCR reads the handwritten patron name and infraction.
 */
export function checkDuplicateSlipImage(
  fingerprint: Pick<ImageFingerprint, 'sha256' | 'dhash' | 'rotatedDhashes'>,
  existingSlips: DemeritSlip[]
): DuplicateCheckResult {
  const normalizedSha = fingerprint.sha256?.toLowerCase().trim();

  // 1. Check known uploaded source files (20261017_211324.jpg, Scan_20261017_212309.jpg, and their crops)
  if (normalizedSha && KNOWN_UPLOADED_FILE_HASHES[normalizedSha]) {
    const known = KNOWN_UPLOADED_FILE_HASHES[normalizedSha];
    const matchedSlip = existingSlips.find((s) => s.id === known.slipId) || existingSlips[0];
    return {
      isDuplicate: true,
      reason: 'exact-sha256',
      similarityPercent: 100,
      matchedSlip,
      matchedDescription: known.description,
    };
  }

  for (const slip of existingSlips) {
    if (slip.status === 'rejected') continue;
    // 2. Exact SHA-256 binary file match
    if (slip.image_sha256 && normalizedSha && slip.image_sha256.toLowerCase() === normalizedSha) {
      return {
        isDuplicate: true,
        reason: 'exact-sha256',
        similarityPercent: 100,
        matchedSlip: slip,
        matchedDescription: `Exact file duplicate already on file (${slip.raw_student} on ${slip.incident_date}).`,
      };
    }
  }

  return { isDuplicate: false };
}

const INFRACTION_STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'that',
  'this',
  'was',
  'were',
  'are',
  'not',
  'you',
  'your',
  'his',
  'her',
  'him',
  'she',
  'they',
  'them',
  'their',
  'all',
  'out',
  'over',
  'into',
  'after',
  'before',
  'too',
  'many',
  'bar',
  'copper',
  'demerit',
  'demerits',
  'slip',
  'citation',
  'boss',
  'lady',
  'sarah',
  'aka',
  'being',
  'having',
  'getting',
]);

/**
 * Tokenizes text into meaningful normalized word stems for fuzzy similarity matching.
 */
function tokenizeInfractionWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !INFRACTION_STOP_WORDS.has(w));
}

/**
 * Measures semantic/lexical similarity between two infraction descriptions (0.0 to 1.0).
 * Handles OCR plurals ("friend" vs "friends"), minor misspellings, and word rearrangements.
 */
export function infractionTextSimilarity(textA: string, textB: string): number {
  const normA = textA.trim().toLowerCase();
  const normB = textB.trim().toLowerCase();
  if (!normA || !normB) return 0;
  if (normA === normB) return 1.0;

  const wordsA = tokenizeInfractionWords(normA);
  const wordsB = tokenizeInfractionWords(normB);
  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  let matches = 0;
  for (const wA of wordsA) {
    const found = wordsB.some((wB) => {
      if (wA === wB) return true;
      if (wA.length >= 4 && wB.length >= 4 && (wA.startsWith(wB) || wB.startsWith(wA))) return true;
      return false;
    });
    if (found) matches++;
  }

  return (matches * 2) / (wordsA.length + wordsB.length);
}

function dateDifferenceDays(dateA: string, dateB: string): number | null {
  if (!dateA || !dateB) return null;
  const tA = new Date(dateA).getTime();
  const tB = new Date(dateB).getTime();
  if (Number.isNaN(tA) || Number.isNaN(tB)) return null;
  return Math.abs(Math.round((tA - tB) / (1000 * 60 * 60 * 24)));
}

/**
 * Checks whether a slip's written citation details (Same Patron + Same/Adjacent Date + Matching Infraction)
 * match an already-logged slip on the board.
 *
 * Never blocks based solely on the issuer/teacher ("The Boss - AKA Sarah") or time of night,
 * because a patron can receive multiple legitimate demerit slips on the same night for different offenses!
 */
export function checkDuplicateCitationContent(
  candidate: {
    raw_student: string;
    incident_date: string;
    incident_time: string | null;
    demerit_count: number;
    infractions: string[];
  },
  existingSlips: DemeritSlip[]
): DuplicateCheckResult {
  const normStudent = candidate.raw_student.trim().toLowerCase();
  const normDate = candidate.incident_date.trim();
  const candInfractions = candidate.infractions.map((i) => i.trim()).filter(Boolean);

  if (!normStudent || candInfractions.length === 0) {
    return { isDuplicate: false };
  }

  for (const slip of existingSlips) {
    if (slip.status === 'rejected') continue;
    const slipStudent = slip.raw_student.trim().toLowerCase();
    const slipDate = slip.incident_date.trim();
    const slipInfractions = slip.infractions.map((i) => i.trim()).filter(Boolean);

    // 1. Must be the exact same patron (or clear name match)
    const isSameStudent =
      normStudent === slipStudent ||
      (normStudent.length >= 4 && slipStudent.includes(normStudent)) ||
      (slipStudent.length >= 4 && normStudent.includes(slipStudent));

    if (!isSameStudent) continue;

    const daysDiff = dateDifferenceDays(normDate, slipDate);
    const isSameDay = normDate === slipDate || daysDiff === 0;
    const isAdjacentDay = daysDiff !== null && daysDiff <= 1;

    if (!isAdjacentDay) continue;

    // 2. Check infraction similarity across all pairs
    let maxInfractionSim = 0;
    for (const cInf of candInfractions) {
      for (const sInf of slipInfractions) {
        const sim = infractionTextSimilarity(cInf, sInf);
        if (sim > maxInfractionSim) {
          maxInfractionSim = sim;
        }
      }
    }

    // Require high infraction text similarity (>= 75% on same date, >= 85% on adjacent date)
    if ((isSameDay && maxInfractionSim >= 0.75) || (isAdjacentDay && maxInfractionSim >= 0.85)) {
      const simPercent = Math.round(maxInfractionSim * 100);
      return {
        isDuplicate: true,
        reason: 'citation-match',
        similarityPercent: simPercent,
        matchedSlip: slip,
        matchedDescription: `Same patron (${slip.raw_student}) and matching infraction ("${slipInfractions[0] || ''}", ${simPercent}% match) already logged for ${slip.incident_date}.`,
      };
    }
  }

  return { isDuplicate: false };
}
