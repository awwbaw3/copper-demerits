import { fingerprintImageFile, ImageFingerprint } from './imageDedup';

export const CLOUDFLARE_API_BASE =
  (import.meta.env.VITE_CLOUDFLARE_API_URL as string | undefined) ||
  'https://api.copperdemerits.com';

export const isCloudflareConfigured = true;
export const isSupabaseConfigured = true; // Alias for legacy consumers
export const SLIPS_BUCKET = 'copper-demerits-slips';

export interface UploadedSlipAsset {
  url: string;
  storageMode: 'cloudflare-r2' | 'local';
  fingerprint: ImageFingerprint;
}

/**
 * Helper to call the Cloudflare Worker + D1 + R2 backend (`https://api.copperdemerits.com/api/...`).
 */
export async function cloudflareFetch<T = unknown>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const endpoint = path.startsWith('http')
    ? path
    : `${CLOUDFLARE_API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

  const res = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error((data && data.error) || `Cloudflare API error (${res.status})`);
  }
  return data as T;
}

/**
 * Fingerprints a File (computing SHA-256 and 64-bit perceptual dHash) and uploads it to
 * the Cloudflare R2 bucket `copper-demerits-slips` via `PUT https://api.copperdemerits.com/api/slips/:filename`.
 */
export async function processAndUploadSlipImage(file: File): Promise<UploadedSlipAsset> {
  const fingerprint = await fingerprintImageFile(file, 1280, 0.85);

  try {
    const res = await fetch(fingerprint.dataUrl);
    const blob = await res.blob();
    const filename = `${fingerprint.sha256.slice(0, 24)}.jpg`;

    const uploadRes = await fetch(`${CLOUDFLARE_API_BASE}/api/slips/${filename}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/jpeg',
      },
      body: blob,
    });

    if (uploadRes.ok) {
      const payload = (await uploadRes.json()) as { ok?: boolean; url?: string };
      return {
        url: payload.url || `${CLOUDFLARE_API_BASE}/api/slips/${filename}`,
        storageMode: 'cloudflare-r2',
        fingerprint,
      };
    }
  } catch {
    // Fallback to compressed Data URL if offline
  }

  return {
    url: fingerprint.dataUrl,
    storageMode: 'local',
    fingerprint,
  };
}
