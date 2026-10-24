import { cloudflareFetch } from './supabase';

export interface BlurRegion {
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
}

export interface ModerationCheckResult {
  flagged: boolean;
  reason: string | null;
  sanitizedTexts: string[];
  blurRegions: BlurRegion[];
}

const CLIENT_OBJECTIONABLE_PATTERNS: RegExp[] = [
  /\bdouche(?:bag|s)?\b/gi,
  /\bfuck(?:ing|er|ed|s)?\b/gi,
  /\bshit(?:ty|head|s)?\b/gi,
  /\bbitch(?:es|ing)?\b/gi,
  /\basshole(?:s)?\b/gi,
  /\bcunt(?:s)?\b/gi,
  /\bdick(?:head|s)?\b/gi,
  /\bpussy\b/gi,
  /\bbastard(?:s)?\b/gi,
  /\bretard(?:ed|s)?\b/gi,
  /\bslut(?:s)?\b/gi,
  /\bwhore(?:s)?\b/gi,
  /\bfag(?:got|s)?\b/gi,
  /\bnigg(?:er|a|as|ers)\b/gi,
  /\bspic(?:s)?\b/gi,
  /\bkike(?:s)?\b/gi,
  /\bchink(?:s)?\b/gi,
  /\bwetback(?:s)?\b/gi,
  /\btranny\b/gi,
  /\bidiot(?:s)?\b/gi,
  /\bmoron(?:s)?\b/gi,
  /\bscumbag(?:s)?\b/gi,
  /\bpiece of shit\b/gi,
  /\bkill yourself\b/gi,
  /\bkys\b/gi,
];

/**
 * Instant client-side profanity, name-calling, and slur detector + sanitizer.
 */
/**
 * Dynamically masks sensitive bar banter words on public scoreboards, tickers,
 * and citation cards (e.g. "F***ering the bartender") preserving context
 * while keeping public viewing PG-13.
 * Reveals unmasked raw text when isRevealed is true.
 */
export function maskSensitiveInfraction(text: string, isRevealed: boolean = false): string {
  if (!text || isRevealed) return text;
  return text.replace(/\bfingering\b/gi, (match) => {
    return match[0] === 'F' ? 'F***ering' : 'f***ering';
  });
}

export function moderateTextInstant(input: string): {
  flagged: boolean;
  sanitized: string;
  matchedTerms: string[];
} {
  if (!input) {
    return { flagged: false, sanitized: '', matchedTerms: [] };
  }
  let sanitized = input;
  const matchedTerms: string[] = [];

  for (const regex of CLIENT_OBJECTIONABLE_PATTERNS) {
    regex.lastIndex = 0;
    const match = regex.exec(input);
    if (match) {
      matchedTerms.push(match[0].toLowerCase());
      sanitized = sanitized.replace(regex, '[🍻 CENSORED BY REF]');
    }
  }

  return {
    flagged: matchedTerms.length > 0,
    sanitized,
    matchedTerms: Array.from(new Set(matchedTerms)),
  };
}

/**
 * Calls the Cloudflare Worker AI Referee Monitor (`/api/moderate-slip`) + local instant check.
 */
export async function scanWithRefereeMonitor(
  texts: string[],
  imageBase64?: string | null
): Promise<ModerationCheckResult> {
  const localChecks = texts.map((t) => moderateTextInstant(t));
  const localFlagged = localChecks.some((c) => c.flagged);
  const localTerms = Array.from(new Set(localChecks.flatMap((c) => c.matchedTerms)));

  try {
    const remote = await cloudflareFetch<{
      ok: boolean;
      flagged: boolean;
      reason: string | null;
      sanitizedTexts: string[];
      blurRegions: BlurRegion[];
    }>('/api/moderate-slip', {
      method: 'POST',
      body: JSON.stringify({
        texts,
        imageBase64: imageBase64 || null,
      }),
    });

    if (remote && remote.ok) {
      return {
        flagged: remote.flagged || localFlagged,
        reason:
          remote.reason ||
          (localFlagged
            ? `Referee Whistle: Filtered unfriendly or profane terms (${localTerms.join(', ')})`
            : null),
        sanitizedTexts:
          remote.sanitizedTexts?.length === texts.length
            ? remote.sanitizedTexts
            : localChecks.map((c) => c.sanitized),
        blurRegions:
          remote.blurRegions && remote.blurRegions.length > 0
            ? remote.blurRegions
            : localFlagged
            ? [{ x: 0.08, y: 0.42, w: 0.84, h: 0.18, label: 'CENSORED BY THE REF' }]
            : [],
      };
    }
  } catch {
    // Fallback to local instant moderation
  }

  return {
    flagged: localFlagged,
    reason: localFlagged
      ? `Referee Whistle: Filtered unfriendly or profane terms (${localTerms.join(', ')})`
      : null,
    sanitizedTexts: localChecks.map((c) => c.sanitized),
    blurRegions: localFlagged
      ? [{ x: 0.08, y: 0.42, w: 0.84, h: 0.18, label: 'CENSORED BY THE REF' }]
      : [],
  };
}

/**
 * Renders a real-time blurred + Referee-stamped version of a slip photo when profanity or negative remarks are detected.
 */
export async function applyRefereeBlurStampToImage(
  imageSrc: string,
  blurRegions: BlurRegion[] = [{ x: 0.08, y: 0.42, w: 0.84, h: 0.18, label: 'CENSORED BY THE REF' }]
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        let targetW = img.width || 800;
        let targetH = img.height || 600;
        const maxDim = 960;
        if (targetW > maxDim || targetH > maxDim) {
          if (targetW > targetH) {
            targetH = Math.round((targetH * maxDim) / targetW);
            targetW = maxDim;
          } else {
            targetW = Math.round((targetW * maxDim) / targetH);
            targetH = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageSrc);
          return;
        }

        // Draw base image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const regions =
          blurRegions.length > 0
            ? blurRegions
            : [{ x: 0.08, y: 0.42, w: 0.84, h: 0.18, label: 'CENSORED BY THE REF' }];

        for (const reg of regions) {
          const rx = Math.max(0, Math.floor(reg.x * canvas.width));
          const ry = Math.max(0, Math.floor(reg.y * canvas.height));
          const rw = Math.min(canvas.width - rx, Math.floor(reg.w * canvas.width));
          const rh = Math.min(canvas.height - ry, Math.floor(reg.h * canvas.height));

          // Blur region heavily
          ctx.save();
          ctx.beginPath();
          ctx.rect(rx, ry, rw, rh);
          ctx.clip();
          ctx.filter = 'blur(18px)';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          ctx.restore();

          // Draw semi-opaque Referee Caution Tape bar over blurred region
          ctx.save();
          ctx.fillStyle = 'rgba(18, 18, 18, 0.82)';
          ctx.strokeStyle = '#DFC15E';
          ctx.lineWidth = Math.max(2, Math.floor(canvas.width * 0.004));
          ctx.fillRect(rx, ry, rw, rh);
          ctx.strokeRect(rx, ry, rw, rh);

          const fontSize = Math.max(14, Math.floor(rh * 0.34));
          ctx.font = `900 ${fontSize}px sans-serif`;
          ctx.fillStyle = '#DFC15E';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            `🦓 ${reg.label || 'BLURRED BY REF • PENDING ADMIN OVERRIDE'}`,
            rx + rw / 2,
            ry + rh / 2
          );
          ctx.restore();
        }

        resolve(canvas.toDataURL('image/jpeg', 0.72));
      } catch {
        resolve(imageSrc);
      }
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
}

export interface ExtractedSlipAI {
  raw_student: string;
  raw_signature: string;
  incident_date: string;
  incident_time: string;
  location_area: string;
  demerit_count: number;
  infractions: string[];
  demerit_items: {
    type: string;
    description: string;
    points: number;
  }[];
  crop_box?: {
    x_min: number;
    y_min: number;
    x_max: number;
    y_max: number;
  };
}

/**
 * Calls the Cloudflare Worker Vision AI (`/api/extract-slip`) to automatically read
 * 1 or more physical Demerit Slips from an uploaded photo or camera capture.
 */
export async function extractSlipsFromPhotoAI(
  imageBase64: string,
  defaultDate?: string
): Promise<{
  ok: boolean;
  isDemeritSlip?: boolean;
  model?: string;
  rotation_needed?: number;
  slips?: ExtractedSlipAI[];
  error?: string;
}> {
  try {
    const res = await cloudflareFetch<{
      ok: boolean;
      isDemeritSlip?: boolean;
      model?: string;
      rotation_needed?: number;
      slips?: ExtractedSlipAI[];
      error?: string;
    }>('/api/extract-slip', {
      method: 'POST',
      body: JSON.stringify({
        imageBase64,
        defaultDate: defaultDate || new Date().toISOString().slice(0, 10),
      }),
    });
    return res;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Could not automatically read slip photo.',
    };
  }
}

