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
 * Uploads an already-compressed JPEG Data URL (`< 82 KB`) to Cloudflare R2
 * (`copper-demerits-slips`) via `PUT https://api.copperdemerits.com/api/slips/:filename`.
 */
export async function uploadCompressedSlipToR2(
  dataUrl: string,
  filename: string
): Promise<{ url: string; storageMode: 'cloudflare-r2' | 'local' }> {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();

    const uploadRes = await fetch(`${CLOUDFLARE_API_BASE}/api/slips/${encodeURIComponent(filename)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/jpeg',
      },
      body: blob,
    });

    if (uploadRes.ok) {
      const payload = (await uploadRes.json()) as { ok?: boolean; url?: string };
      return {
        url: payload.url || `${CLOUDFLARE_API_BASE}/api/slips/${encodeURIComponent(filename)}`,
        storageMode: 'cloudflare-r2',
      };
    }
  } catch {
    // Fallback to compressed Data URL if offline
  }

  return {
    url: dataUrl,
    storageMode: 'local',
  };
}

/**
 * Fingerprints & compresses a File (computing SHA-256, 64-bit perceptual dHash, and shrinking
 * 4MB-12MB smartphone photos down to ~45KB-82KB) and uploads it to Cloudflare R2.
 */
export async function processAndUploadSlipImage(file: File): Promise<UploadedSlipAsset> {
  const fingerprint = await fingerprintImageFile(file, 960, 0.74, 82 * 1024);
  const filename = `${fingerprint.sha256.slice(0, 24)}.jpg`;
  const uploaded = await uploadCompressedSlipToR2(fingerprint.dataUrl, filename);

  return {
    url: uploaded.url,
    storageMode: uploaded.storageMode,
    fingerprint,
  };
}
