import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('placeholder')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

export const SLIPS_BUCKET = 'slips';

/**
 * Uploads a slip photo to the Supabase Storage bucket `slips`.
 * If Supabase is not configured or the bucket upload fails, falls back to a compressed Data URL
 * so the slip image renders reliably across sessions.
 */
export async function uploadSlipImage(file: File): Promise<{ url: string; storageMode: 'supabase' | 'local' }> {
  if (supabase) {
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
      const filePath = `submissions/${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(SLIPS_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (!uploadError) {
        const { data } = supabase.storage.from(SLIPS_BUCKET).getPublicUrl(filePath);
        if (data?.publicUrl) {
          return { url: data.publicUrl, storageMode: 'supabase' };
        }
      }
    } catch {
      // Fallback to compressed data URL below
    }
  }

  const dataUrl = await compressImageToDataUrl(file, 1100, 0.82);
  return { url: dataUrl, storageMode: 'local' };
}

function compressImageToDataUrl(file: File, maxDimension = 1100, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(reader.result as string);
      img.onload = () => {
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
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
