import { createClient } from '@supabase/supabase-js';
import { fingerprintImageFile, ImageFingerprint } from './imageDedup';

const FALLBACK_SUPABASE_URL = 'https://iqbpnkttwtugxkospdqt.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxYnBua3R0d3R1Z3hrb3NwZHF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MzUxODEsImV4cCI6MjA3MDUxMTE4MX0.sMxdeufAkyivjntyzeU5IafXi47P6jz-FTBOqO53SQI';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || FALLBACK_SUPABASE_URL;
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || FALLBACK_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const COPPER_DEMERITS_SCHEMA = 'copper_demerits';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: COPPER_DEMERITS_SCHEMA },
});

export const SLIPS_BUCKET = 'slips';

export interface UploadedSlipAsset {
  url: string;
  storageMode: 'supabase' | 'local';
  fingerprint: ImageFingerprint;
}

/**
 * Fingerprints a File (computing SHA-256 and 64-bit perceptual dHash) and uploads it to
 * the Supabase Storage bucket `slips` using the SHA-256 digest as a deterministic filename.
 */
export async function processAndUploadSlipImage(file: File): Promise<UploadedSlipAsset> {
  const fingerprint = await fingerprintImageFile(file, 1280, 0.85);

  try {
    // Convert compressed JPEG dataUrl to Blob for clean storage upload
    const res = await fetch(fingerprint.dataUrl);
    const blob = await res.blob();
    const filePath = `submissions/${fingerprint.sha256.slice(0, 24)}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(SLIPS_BUCKET)
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        cacheControl: '31536000',
        upsert: true,
      });

    if (!uploadError) {
      const { data } = supabase.storage.from(SLIPS_BUCKET).getPublicUrl(filePath);
      if (data?.publicUrl) {
        return {
          url: data.publicUrl,
          storageMode: 'supabase',
          fingerprint,
        };
      }
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

/**
 * Uploads a base64 Data URL from localStorage into the Supabase `slips` bucket during auto-migration.
 */
export async function uploadDataUrlToSupabaseBucket(
  dataUrl: string,
  sha256: string
): Promise<string> {
  if (!dataUrl.startsWith('data:image/')) return dataUrl;
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const filePath = `submissions/${sha256.slice(0, 24)}.jpg`;
    const { error } = await supabase.storage.from(SLIPS_BUCKET).upload(filePath, blob, {
      contentType: 'image/jpeg',
      cacheControl: '31536000',
      upsert: true,
    });
    if (!error) {
      const { data } = supabase.storage.from(SLIPS_BUCKET).getPublicUrl(filePath);
      if (data?.publicUrl) return data.publicUrl;
    }
  } catch {
    // Keep dataUrl if upload fails
  }
  return dataUrl;
}
