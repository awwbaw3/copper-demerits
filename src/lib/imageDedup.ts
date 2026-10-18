import { DemeritSlip } from '../types/demerits';

export interface ImageFingerprint {
  sha256: string;
  dhash: string;
  dataUrl: string;
  width: number;
  height: number;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  reason?: 'exact-sha256' | 'perceptual-dhash' | 'citation-match';
  similarityPercent?: number;
  matchedSlip?: DemeritSlip;
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
 * Computes a 64-bit Perceptual Difference Hash (dHash, 16 hex chars) from an HTMLImageElement.
 * Resizes image to 9x8 grayscale and compares adjacent horizontal pixels (col < col+1).
 * Resilient to recompression, resizing, WhatsApp/SMS forwarding, and minor crops.
 */
export function computePerceptualDHash(img: HTMLImageElement): string {
  const width = 9;
  const height = 8;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.drawImage(img, 0, 0, width, height);
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
export function calculateHammingDistance(hashA: string | null | undefined, hashB: string | null | undefined): number {
  if (!hashA || !hashB || hashA.length !== 16 || hashB.length !== 16) {
    return 64;
  }
  let distance = 0;
  for (let i = 0; i < 16; i++) {
    const xor = parseInt(hashA[i], 16) ^ parseInt(hashB[i], 16);
    // Count set bits in 4-bit nibble
    distance += (xor & 1) + ((xor >> 1) & 1) + ((xor >> 2) & 1) + ((xor >> 3) & 1);
  }
  return distance;
}

/**
 * Extracts both the exact SHA-256 file digest and the 64-bit perceptual dHash from a File or Data URL.
 */
export async function fingerprintImageFile(file: File, maxDimension = 1280, quality = 0.85): Promise<ImageFingerprint> {
  const buffer = await file.arrayBuffer();
  const sha256 = await computeSha256FromBuffer(buffer);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image format'));
      img.onload = () => {
        const dhash = computePerceptualDHash(img);

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
 * Computes fingerprint from an existing image URL / Data URL (for migrating/deduplicating existing localStorage slips).
 */
export async function fingerprintImageUrl(imageUrl: string): Promise<{ sha256: string; dhash: string }> {
  const encoder = new TextEncoder();
  const sha256 = await computeSha256FromBuffer(encoder.encode(imageUrl).buffer as ArrayBuffer);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onerror = () => resolve({ sha256, dhash: '' });
    img.onload = () => {
      const dhash = computePerceptualDHash(img);
      resolve({ sha256, dhash });
    };
    img.src = imageUrl;
  });
}

/**
 * Checks whether an image fingerprint matches any existing slip via:
 * 1. Exact SHA-256 file hash match
 * 2. Perceptual dHash visual similarity (Hamming distance <= 8 out of 64 bits, i.e. >= 87.5% visual match)
 */
export function checkDuplicateSlipImage(
  fingerprint: Pick<ImageFingerprint, 'sha256' | 'dhash'>,
  existingSlips: DemeritSlip[],
  maxHammingDistance = 8
): DuplicateCheckResult {
  for (const slip of existingSlips) {
    // 1. Exact SHA-256 match
    if (slip.image_sha256 && fingerprint.sha256 && slip.image_sha256 === fingerprint.sha256) {
      return {
        isDuplicate: true,
        reason: 'exact-sha256',
        similarityPercent: 100,
        matchedSlip: slip,
      };
    }

    // 2. Perceptual dHash visual match
    if (slip.image_dhash && fingerprint.dhash) {
      const dist = calculateHammingDistance(fingerprint.dhash, slip.image_dhash);
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

  return { isDuplicate: false };
}
