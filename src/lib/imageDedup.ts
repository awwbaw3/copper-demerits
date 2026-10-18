import { DemeritSlip } from '../types/demerits';
import { KNOWN_UPLOADED_FILE_HASHES } from './defaultData';

export interface ImageFingerprint {
  sha256: string;
  dhash: string;
  rotatedDhashes?: string[];
  dataUrl: string;
  width: number;
  height: number;
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
 * Extracts both the exact SHA-256 file digest and rotation-aware 64-bit perceptual dHashes from a File.
 */
export async function fingerprintImageFile(
  file: File,
  maxDimension = 1280,
  quality = 0.85
): Promise<ImageFingerprint> {
  const buffer = await file.arrayBuffer();
  const sha256 = await computeSha256FromBuffer(buffer);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image format'));
      img.onload = () => {
        const dhash = computePerceptualDHash(img, 0);
        const rotatedDhashes = [
          dhash,
          computePerceptualDHash(img, 90),
          computePerceptualDHash(img, 180),
          computePerceptualDHash(img, 270),
        ].filter(Boolean);

        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        const dataUrl = ctx
          ? (ctx.drawImage(img, 0, 0, width, height), canvas.toDataURL('image/jpeg', quality))
          : (reader.result as string);

        resolve({
          sha256,
          dhash,
          rotatedDhashes,
          dataUrl,
          width,
          height,
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
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
 * Checks whether an image fingerprint matches any existing slip via:
 * 1. Known official source file SHA-256 (including multi-slip photos & rotated scans)
 * 2. Exact SHA-256 file hash match on any slip
 * 3. Rotation-aware Perceptual dHash visual similarity (Hamming distance <= 8 out of 64 bits)
 */
export function checkDuplicateSlipImage(
  fingerprint: Pick<ImageFingerprint, 'sha256' | 'dhash' | 'rotatedDhashes'>,
  existingSlips: DemeritSlip[],
  maxHammingDistance = 8
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

  const candidateHashes =
    fingerprint.rotatedDhashes && fingerprint.rotatedDhashes.length > 0
      ? fingerprint.rotatedDhashes
      : fingerprint.dhash
      ? [fingerprint.dhash]
      : [];

  for (const slip of existingSlips) {
    // 2. Exact SHA-256 match
    if (slip.image_sha256 && normalizedSha && slip.image_sha256.toLowerCase() === normalizedSha) {
      return {
        isDuplicate: true,
        reason: 'exact-sha256',
        similarityPercent: 100,
        matchedSlip: slip,
      };
    }

    // 3. Rotation-aware Perceptual dHash visual match
    if (slip.image_dhash && candidateHashes.length > 0) {
      for (const candidateDhash of candidateHashes) {
        const dist = calculateHammingDistance(candidateDhash, slip.image_dhash);
        if (dist <= maxHammingDistance) {
          const similarityPercent = Math.round(((64 - dist) / 64) * 100);
          return {
            isDuplicate: true,
            reason: 'perceptual-dhash',
            similarityPercent,
            matchedSlip: slip,
          };
        }
      }
    }
  }

  return { isDuplicate: false };
}

/**
 * Checks whether a slip's written citation details (Student + Date + Time, or Student + Date + Infractions)
 * match an already-logged slip on the board (for example, when the same physical slip is captured in both
 * a multi-slip bar photo AND an individual scan).
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
  const normTime = candidate.incident_time ? candidate.incident_time.trim().slice(0, 5) : '';

  for (const slip of existingSlips) {
    if (slip.status === 'rejected') continue;
    const slipStudent = slip.raw_student.trim().toLowerCase();
    const slipDate = slip.incident_date.trim();
    const slipTime = slip.incident_time ? slip.incident_time.trim().slice(0, 5) : '';

    if (slipStudent === normStudent && slipDate === normDate) {
      // Exact timestamp match on the same date for the same student (e.g. Rick 2026-10-17 at 21:09)
      if (normTime && slipTime && normTime === slipTime) {
        return {
          isDuplicate: true,
          reason: 'citation-match',
          similarityPercent: 100,
          matchedSlip: slip,
          matchedDescription: `Same patron (${slip.raw_student}), date (${slip.incident_date}), and time (${slipTime}) already logged.`,
        };
      }

      // Or identical infraction text on the same date for the same student
      const candInf = candidate.infractions.map((i) => i.trim().toLowerCase()).filter(Boolean);
      const existingInf = slip.infractions.map((i) => i.trim().toLowerCase()).filter(Boolean);
      if (
        candInf.length > 0 &&
        existingInf.length > 0 &&
        candInf.some((ci) => existingInf.includes(ci))
      ) {
        return {
          isDuplicate: true,
          reason: 'citation-match',
          similarityPercent: 95,
          matchedSlip: slip,
          matchedDescription: `Same patron (${slip.raw_student}), date (${slip.incident_date}), and infraction already logged.`,
        };
      }
    }
  }

  return { isDuplicate: false };
}
