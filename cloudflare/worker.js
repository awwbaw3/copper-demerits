/**
 * Copper Demerits (`copperdemerits.com`) — Cloudflare Worker + D1 + R2 + Workers AI Backend (v1.6.12)
 * - Database: Cloudflare D1 (`DB` binding -> `copper-demerits-db`)
 * - Object Storage: Cloudflare R2 (`SLIPS_BUCKET` binding -> `copper-demerits-slips`)
 * - AI Moderation: Cloudflare Workers AI (`AI` binding) + Optional `GEMINI_API_KEY` (Gemini 2.5 Flash)
 * - Email / Opt-In SMS Gateway: Resend (`RESEND_API_KEY` secret) with strict D1 rate-limiting
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Member-Id, X-Member-Pin',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...SECURITY_HEADERS,
    },
  });
}

function parseJsonSafe(str, fallback) {
  if (!str) return fallback;
  if (typeof str === 'object') return str;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

const DEFAULT_REACTIONS = {
  buy_round: 0,
  tough_call: 0,
  two_mins: 0,
  instant_classic: 0,
};

/**
 * Deterministic Profanity, Slur, Vulgarity & Personal Insult / Name-Calling Scanner
 * Keeps the site jovial, friendly, and sports-bar clean.
 */
const OBJECTIONABLE_PATTERNS = [
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

function deterministicModerateText(input) {
  if (!input || typeof input !== 'string') {
    return { flagged: false, sanitized: input || '', matchedTerms: [] };
  }
  let sanitized = input;
  const matchedTerms = [];

  for (const regex of OBJECTIONABLE_PATTERNS) {
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
 * Multi-layer AI + Deterministic Moderation for Slip Text & Optional Image Base64
 * Uses Gemini 2.5 Flash (if env.GEMINI_API_KEY is configured) or Cloudflare Workers AI (env.AI)
 */
async function moderateContent(env, { texts = [], imageBase64 = null }) {
  const combinedText = texts.filter(Boolean).join(' | ');
  const det = deterministicModerateText(combinedText);
  const sanitizedTexts = texts.map((t) => deterministicModerateText(t).sanitized);

  let aiFlagged = false;
  let aiReason = '';
  let blurRegions = [];

  // Layer 2A: Optional Gemini 2.5 Flash Moderation (if GEMINI_API_KEY secret is set)
  if (env.GEMINI_API_KEY) {
    try {
      const parts = [
        {
          text: `You are the friendly Referee Monitor for Copper Athletic Club's tongue-in-cheek "Ring of Honor" bar demerit fan site.
The site must be funny, friendly, and jovial (like "Too many seat moves", "Tried to order Gin & Diet Coke", "The headband", "No call / no show to see the Red Wings").
We strictly disallow profanity, calling people mean names/insults, racist remarks, slurs, or vulgar hostility.
Analyze the following text (and image if attached) and respond ONLY with valid JSON:
{"flagged": boolean, "reason": "short explanation if flagged else empty", "blurRegions": [{"x": 0.1, "y": 0.4, "w": 0.8, "h": 0.15, "label": "CENSORED BY REF"}]}
Text to check: ${JSON.stringify(combinedText)}`,
        },
      ];

      if (imageBase64 && imageBase64.includes('base64,')) {
        const rawB64 = imageBase64.split('base64,')[1];
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: rawB64,
          },
        });
      }

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        }
      );

      if (geminiRes.ok) {
        const geminiJson = await geminiRes.json();
        const rawOut = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = parseJsonSafe(rawOut, null);
        if (parsed && parsed.flagged) {
          aiFlagged = true;
          aiReason = parsed.reason || 'Flagged by Gemini Referee Monitor for unfriendly/vulgar language';
          if (Array.isArray(parsed.blurRegions)) {
            blurRegions = parsed.blurRegions;
          }
        }
      }
    } catch {
      // Fallback to Workers AI / deterministic filter
    }
  }

  // Layer 2B: Built-in Cloudflare Workers AI (100% Free, Zero API Key Required)
  if (!aiFlagged && env.AI && combinedText.trim().length > 0) {
    try {
      const aiRes = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          {
            role: 'system',
            content:
              'You are a friendly sports-bar referee moderator. Allow lighthearted bar banter ("too many seat moves", "ordered gin and diet coke", "missed Red Wings game", "back talk"). Flag ONLY profanity, swear words, personal insults/name-calling, racism, slurs, or vulgar hostility. Reply ONLY with JSON: {"flagged": boolean, "reason": "string"}',
          },
          {
            role: 'user',
            content: combinedText,
          },
        ],
        max_tokens: 90,
      });

      const responseText = aiRes?.response || '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = parseJsonSafe(jsonMatch[0], null);
        if (parsed && parsed.flagged) {
          aiFlagged = true;
          aiReason = parsed.reason || 'Flagged by Cloudflare AI Referee for unfriendly or vulgar language.';
        }
      }
    } catch {
      // Deterministic filter still active
    }
  }

  const flagged = det.flagged || aiFlagged;
  const reason = det.flagged
    ? `Referee Whistle: Filtered unfriendly/profane language (${det.matchedTerms.join(', ')})`
    : aiReason;

  if (flagged && blurRegions.length === 0) {
    blurRegions = [{ x: 0.08, y: 0.42, w: 0.84, h: 0.18, label: 'CENSORED BY THE REF' }];
  }

  return {
    flagged,
    reason: reason || null,
    sanitizedTexts,
    blurRegions,
  };
}

const VALID_DEMERIT_CATEGORIES = [
  'Attendance / No-Show',
  'Insubordination / Defiance',
  'Bar Etiquette / Seating',
  'Drink Crime / Order Foul',
  'Attire / Headgear Foul',
  'Sports / Fantasy Foul',
  'Party Foul / Conduct',
];

function inferDemeritCategory(desc, suggestedType) {
  if (suggestedType && VALID_DEMERIT_CATEGORIES.includes(suggestedType)) {
    return suggestedType;
  }
  const lower = String(desc || '').toLowerCase();
  if (lower.includes('no call') || lower.includes('no show') || lower.includes('red wings') || lower.includes('late') || lower.includes('absent')) {
    return 'Attendance / No-Show';
  }
  if (
    lower.includes('not caring') ||
    lower.includes('first demerit') ||
    lower.includes('defian') ||
    lower.includes('back talk') ||
    lower.includes('insubordinat') ||
    lower.includes('disrespect') ||
    lower.includes('attitude') ||
    lower.includes('mouth')
  ) {
    return 'Insubordination / Defiance';
  }
  if (lower.includes('seat') || lower.includes('chair') || lower.includes('stool') || lower.includes('booth') || lower.includes('table')) {
    return 'Bar Etiquette / Seating';
  }
  if (lower.includes('gin') || lower.includes('diet coke') || lower.includes('order') || lower.includes('drink') || lower.includes('beer') || lower.includes('shot') || lower.includes('tab')) {
    return 'Drink Crime / Order Foul';
  }
  if (lower.includes('headband') || lower.includes('hat') || lower.includes('shirt') || lower.includes('attire') || lower.includes('jersey') || lower.includes('outfit')) {
    return 'Attire / Headgear Foul';
  }
  if (lower.includes('lions') || lower.includes('tigers') || lower.includes('pistons') || lower.includes('michigan') || lower.includes('spartan') || lower.includes('buckeye') || lower.includes('packager') || lower.includes('packer') || lower.includes('sports') || lower.includes('fantasy')) {
    return 'Sports / Fantasy Foul';
  }
  return 'Party Foul / Conduct';
}

function normalizeExtractedDate(rawDate, fallbackDate) {
  const fb = fallbackDate || new Date().toISOString().slice(0, 10);
  const currentYear = fb.slice(0, 4);
  if (!rawDate) return fb;
  const str = String(rawDate).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const yr = parseInt(str.slice(0, 4), 10);
    if (yr < 2025) {
      return `${currentYear}${str.slice(4)}`;
    }
    return str;
  }
  const mdy = str.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
  if (mdy) {
    const mm = mdy[1].padStart(2, '0');
    const dd = mdy[2].padStart(2, '0');
    let yyyy = mdy[3] ? mdy[3] : currentYear;
    if (yyyy.length === 2) yyyy = `20${yyyy}`;
    if (parseInt(yyyy, 10) < 2025) yyyy = currentYear;
    return `${yyyy}-${mm}-${dd}`;
  }
  return fb;
}

function normalizeExtractedTime(rawTime) {
  if (!rawTime) return '21:00';
  const str = String(rawTime).trim().toUpperCase();
  const match = str.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/);
  if (!match) return '21:00';
  let hours = parseInt(match[1], 10);
  const mins = match[2];
  const ampm = match[3];
  if (ampm === 'PM' && hours < 12) {
    hours += 12;
  } else if (ampm === 'AM' && hours === 12) {
    hours = 0;
  } else if (!ampm && hours >= 1 && hours <= 11) {
    // Bar demerit slips written between 1:00 and 11:59 without AM/PM are evening PM hours
    hours += 12;
  }
  return `${String(hours).padStart(2, '0')}:${mins}`;
}

function base64ToUint8Array(base64DataUrl) {
  const rawB64 = base64DataUrl.includes('base64,')
    ? base64DataUrl.split('base64,')[1]
    : base64DataUrl;
  const binaryString = atob(rawB64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function sanitizeExtractedSlips(rawSlips, fallbackDate) {
  if (!Array.isArray(rawSlips) || rawSlips.length === 0) return [];
  return rawSlips.map((s) => {
    const rawStudent = String(s.raw_student || s.student || s.patron || 'Patron').trim();
    const rawSignature = String(
      s.raw_signature || s.signature || s.teacher || s.issuer || 'The Boss - AKA Sarah'
    ).trim();
    const incidentDate = normalizeExtractedDate(s.incident_date || s.date, fallbackDate);
    const incidentTime = normalizeExtractedTime(s.incident_time || s.time);
    const locationArea = String(s.location_area || s.room || 'Copper A.C.').trim() || 'Copper A.C.';

    let rawItems = Array.isArray(s.demerit_items || s.items) ? (s.demerit_items || s.items) : [];
    const rawInfractions = Array.isArray(s.infractions)
      ? s.infractions.map((x) => String(x || '').trim()).filter(Boolean)
      : [];

    if (rawItems.length === 0 && rawInfractions.length > 0) {
      rawItems = rawInfractions.map((desc) => ({
        type: inferDemeritCategory(desc, null),
        description: desc,
        points: 1,
      }));
    }

    if (rawItems.length === 0 && s.reason) {
      const desc = String(s.reason).trim();
      rawItems = [
        {
          type: inferDemeritCategory(desc, null),
          description: desc,
          points: Math.max(1, Number(s.demerit_count || s.points) || 1),
        },
      ];
    }

    if (rawItems.length === 0) {
      rawItems = [
        {
          type: 'Party Foul / Conduct',
          description: 'Bar Demerit Citation',
          points: Math.max(1, Number(s.demerit_count || s.points) || 1),
        },
      ];
    }

    const cleanedItems = rawItems.map((it) => {
      const desc = String(it.description || it.reason || 'Bar Citation').trim();
      return {
        type: inferDemeritCategory(desc, it.type),
        description: desc,
        points: Math.max(1, Number(it.points) || 1),
      };
    });

    const explicitCount = Number(s.demerit_count || s.points);
    const sumPoints = cleanedItems.reduce((acc, it) => acc + it.points, 0);
    if (explicitCount > sumPoints && cleanedItems.length === 1) {
      cleanedItems[0].points = explicitCount;
    }
    const finalCount = cleanedItems.reduce((acc, it) => acc + it.points, 0);

    return {
      raw_student: rawStudent,
      raw_signature: rawSignature,
      incident_date: incidentDate,
      incident_time: incidentTime,
      location_area: locationArea,
      demerit_count: finalCount,
      infractions: cleanedItems.map((it) => it.description),
      demerit_items: cleanedItems,
    };
  });
}

/**
 * Extracts 1 or more physical Demerit Slips from an uploaded photo using Vision AI:
 * - Uses Gemini 2.5 Flash if `env.GEMINI_API_KEY` is configured
 * - Uses Cloudflare Workers AI Vision (`@cf/meta/llama-3.2-11b-vision-instruct` / `@cf/google/gemma-3-12b-it` / `@cf/llava-hf/llava-1.5-7b-hf`)
 */
async function extractSlipsFromImageWithAI(env, { imageBase64, defaultDate, knownMembers = [], knownAliases = [] }) {
  const fallbackDate = defaultDate || new Date().toISOString().slice(0, 10);
  if (!imageBase64) {
    return { ok: false, error: 'Missing imageBase64 for slip extraction.' };
  }

  const rosterHint = knownMembers.length > 0
    ? `Known Copper Athletic Club patrons & staff names: ${knownMembers.join(', ')}. Known nicknames/signatures: ${knownAliases.join(', ')}.`
    : `Known Copper Athletic Club regulars: Rick, Burtis, Sarah (The Boss / The Boss Lady), David Lee.`;

  const extractionPrompt = `You are an expert OCR reader and Referee for Copper Athletic Club's handwritten "DEMERIT SLIP" citations.
First, verify whether this image actually contains at least one physical paper "DEMERIT SLIP" (or written citation slip with fields like Student, Date, Time, Room, Demerits, Teacher/Signature, or handwritten offenses).
- If the image is NOT a demerit slip (for example: a random selfie, a person, a drink, food, a pet, a landscape, or an unrelated screenshot), return:
{"is_demerit_slip": false, "rejection_reason": "This photo does not appear to contain a Copper Demerit Slip. Please snap a clear photo of the physical demerit slip!", "slips": []}

If the image DOES contain 1 or more physical Demerit Slips (up to 4 slips laying next to each other), set "is_demerit_slip": true and read all handwritten fields for EVERY slip visible:
${rosterHint}

- "raw_student": Handwritten name on the "Student:" line (e.g. "Rick", "Burtis", "David Lee", etc.)
- "incident_date": Handwritten date on the "Date(s):" line formatted as YYYY-MM-DD (if year is 26 or missing, use 2026; if blank use "${fallbackDate}")
- "incident_time": Handwritten time on the "Time:" line in 24-hour HH:MM format (note: bar slips are evening PM times unless AM is written, so "9:09" or "9:09 PM" -> "21:09", "6:27" -> "18:27", "8:50" -> "20:50")
- "location_area": Handwritten room on the "Room:" line (e.g. "Copper A.C.", "Copper Bar", "Copper")
- "demerit_count": Total integer number of demerits written on the "Demerits:" line (e.g. "1", "2", "3", "1 - so far" -> 1)
- "raw_signature": Handwritten signature on the "Teacher:" / bottom signature line (e.g. "The Boss - AKA Sarah", "The Boss Lady", "YOUR BOSS!", or if it's Sarah's cursive signature write "Sarah (Cursive Signature)")
- "demerit_items": Array of each handwritten offense/reason listed on the slip. Each item must have:
  - "description": Exact handwritten offense text (e.g. "Too many seat moves", "Tried to order Gin and Diet Coke", "The headband", "Back talk, insubordinate", "No call / no show to see the Red Wings")
  - "type": One of ["Attendance / No-Show", "Insubordination / Defiance", "Bar Etiquette / Seating", "Drink Crime / Order Foul", "Attire / Headgear Foul", "Sports / Fantasy Foul", "Party Foul / Conduct"]
  - "points": Integer points for this offense so the items sum to "demerit_count"

Respond ONLY with valid JSON in this exact structure (no markdown fences, no extra commentary):
{"is_demerit_slip": true, "slips": [{"raw_student": "...", "incident_date": "YYYY-MM-DD", "incident_time": "HH:MM", "location_area": "...", "demerit_count": 1, "raw_signature": "...", "demerit_items": [{"type": "...", "description": "...", "points": 1}]}]}`;

  const dataUrl = imageBase64.startsWith('data:')
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`;

  // 1. Optional Gemini 2.5 Flash Vision if GEMINI_API_KEY is set
  if (env.GEMINI_API_KEY) {
    try {
      const rawB64 = dataUrl.split('base64,')[1];
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: extractionPrompt },
                  { inlineData: { mimeType: 'image/jpeg', data: rawB64 } },
                ],
              },
            ],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        }
      );
      if (geminiRes.ok) {
        const geminiJson = await geminiRes.json();
        const rawOut = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = parseJsonSafe(rawOut, null);
        if (parsed && parsed.is_demerit_slip === false) {
          return {
            ok: false,
            isDemeritSlip: false,
            model: 'gemini-2.5-flash',
            error:
              parsed.rejection_reason ||
              'This photo does not appear to contain a physical Demerit Slip.',
          };
        }
        const slips = sanitizeExtractedSlips(parsed?.slips || (Array.isArray(parsed) ? parsed : []), fallbackDate);
        if (slips.length > 0) {
          return { ok: true, isDemeritSlip: true, model: 'gemini-2.5-flash', slips };
        }
      }
    } catch {
      // Fall through to Cloudflare Workers AI Vision
    }
  }

  // 2. Cloudflare Workers AI Vision Models (`env.AI`)
  if (env.AI) {
    const visionModels = [
      '@cf/mistralai/mistral-small-3.1-24b-instruct',
      '@cf/google/gemma-3-12b-it',
      '@cf/meta/llama-3.2-11b-vision-instruct',
    ];

    for (const modelName of visionModels) {
      try {
        let aiRes;
        if (modelName === '@cf/meta/llama-3.2-11b-vision-instruct') {
          const imgBytes = Array.from(base64ToUint8Array(dataUrl));
          try {
            aiRes = await env.AI.run(modelName, {
              messages: [
                {
                  role: 'user',
                  content: extractionPrompt,
                },
              ],
              image: imgBytes,
              max_tokens: 900,
              temperature: 0.1,
            });
          } catch (innerErr) {
            const msg = String(innerErr?.message || innerErr || '');
            if (msg.toLowerCase().includes('agree')) {
              await env.AI.run(modelName, { prompt: 'agree' });
              aiRes = await env.AI.run(modelName, {
                messages: [
                  {
                    role: 'user',
                    content: extractionPrompt,
                  },
                ],
                image: imgBytes,
                max_tokens: 900,
                temperature: 0.1,
              });
            } else {
              throw innerErr;
            }
          }
        } else {
          aiRes = await env.AI.run(modelName, {
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: extractionPrompt },
                  { type: 'image_url', image_url: { url: dataUrl } },
                ],
              },
            ],
            max_tokens: 900,
            temperature: 0.1,
          });
        }

        const rawResponse =
          typeof aiRes?.response === 'string'
            ? aiRes.response
            : aiRes?.choices?.[0]?.message?.content || JSON.stringify(aiRes || '');

        const jsonMatch = String(rawResponse).match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = parseJsonSafe(jsonMatch[0], null);
          if (parsed && parsed.is_demerit_slip === false) {
            return {
              ok: false,
              isDemeritSlip: false,
              model: modelName,
              error:
                parsed.rejection_reason ||
                'This photo does not appear to contain a physical Demerit Slip.',
            };
          }
          const slips = sanitizeExtractedSlips(
            parsed?.slips || (Array.isArray(parsed) ? parsed : []),
            fallbackDate
          );
          if (slips.length > 0) {
            return { ok: true, isDemeritSlip: true, model: modelName, slips };
          }
        }
      } catch {
        // Try next vision model
      }
    }

    // Fallback Vision model: `@cf/llava-hf/llava-1.5-7b-hf`
    try {
      const imgBytes = Array.from(base64ToUint8Array(dataUrl));
      const llavaRes = await env.AI.run('@cf/llava-hf/llava-1.5-7b-hf', {
        image: imgBytes,
        prompt: extractionPrompt,
        max_tokens: 512,
      });
      const rawText = llavaRes?.description || llavaRes?.response || '';
      const jsonMatch = String(rawText).match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = parseJsonSafe(jsonMatch[0], null);
        if (parsed && parsed.is_demerit_slip === false) {
          return {
            ok: false,
            isDemeritSlip: false,
            model: '@cf/llava-hf/llava-1.5-7b-hf',
            error:
              parsed.rejection_reason ||
              'This photo does not appear to contain a physical Demerit Slip.',
          };
        }
        const slips = sanitizeExtractedSlips(
          parsed?.slips || (Array.isArray(parsed) ? parsed : []),
          fallbackDate
        );
        if (slips.length > 0) {
          return { ok: true, isDemeritSlip: true, model: '@cf/llava-hf/llava-1.5-7b-hf', slips };
        }
      }
    } catch {
      // Fall through
    }
  }

  return {
    ok: false,
    error: 'Could not automatically read slip handwriting from photo.',
  };
}

function normalizeEmail(raw) {
  return String(raw || '').trim().toLowerCase();
}

function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1);
  }
  return digits;
}

/**
 * Formats a Member row for PUBLIC responses — strictly strips all PII (phone, email, PIN, verification codes)
 */
function formatPublicMember(row) {
  if (!row) return null;
  return {
    id: row.id,
    display_name: row.display_name,
    is_staff: Boolean(row.is_staff),
    is_patron: Boolean(row.is_patron),
    is_admin: Boolean(row.is_admin),
    is_claimed: Boolean(row.is_claimed || (row.claimed_pin && String(row.claimed_pin).trim() !== '')),
    claimed_at: row.claimed_at || null,
    favorite_team: row.favorite_team || 'lions',
    tagline: row.tagline || null,
    notification_opt_in: Boolean(row.notification_opt_in),
    notification_verified: Boolean(row.notification_verified),
    created_at: row.created_at,
  };
}

function parseNotificationPreferences(raw) {
  const defaults = {
    leader_crowned: 'none',
    leader_dethroned: 'none',
    slip_cited: 'none',
    ref_override: 'none',
    friday_digest: 'none',
  };
  if (!raw) return defaults;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== 'object') return defaults;
    const valid = ['none', 'email', 'text', 'both'];
    return {
      leader_crowned: valid.includes(parsed.leader_crowned) ? parsed.leader_crowned : 'none',
      leader_dethroned: valid.includes(parsed.leader_dethroned) ? parsed.leader_dethroned : 'none',
      slip_cited: valid.includes(parsed.slip_cited) ? parsed.slip_cited : 'none',
      ref_override: valid.includes(parsed.ref_override) ? parsed.ref_override : 'none',
      friday_digest: valid.includes(parsed.friday_digest) ? parsed.friday_digest : 'none',
    };
  } catch {
    return defaults;
  }
}

/**
 * Formats a Member row for PRIVATE authenticated profile owner responses (when PIN is verified)
 */
function formatPrivateMember(row) {
  if (!row) return null;
  const rawContact = String(row.claimed_by_contact || '').trim();
  const fallbackEmail = rawContact.includes('@') ? rawContact : '';
  const fallbackPhone = !rawContact.includes('@') ? rawContact : '';
  return {
    ...formatPublicMember(row),
    notification_email: row.notification_email || fallbackEmail || '',
    notification_phone: row.notification_phone || fallbackPhone || '',
    notification_carrier: row.notification_carrier || 'none',
    notification_preferences: parseNotificationPreferences(row.notification_preferences),
  };
}

async function checkPinRateLimit(env, ip, memberId) {
  try {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const countRow = await env.DB.prepare(
      `SELECT COUNT(*) as failures FROM pin_failures
       WHERE (ip = ? OR (member_id IS NOT NULL AND member_id = ?))
         AND failed_at >= ?`
    )
      .bind(ip || '0.0.0.0', memberId || '', cutoff)
      .first();
    return (Number(countRow?.failures) || 0) >= 5;
  } catch (err) {
    console.error('checkPinRateLimit error:', err);
    return false;
  }
}

async function recordPinFailure(env, ip, memberId) {
  try {
    await env.DB.prepare(
      `INSERT INTO pin_failures (id, ip, member_id, failed_at)
       VALUES (?, ?, ?, datetime('now'))`
    )
      .bind(crypto.randomUUID(), ip || '0.0.0.0', memberId || null)
      .run();
  } catch (err) {
    console.error('recordPinFailure error:', err);
  }
}

async function clearPinFailures(env, ip, memberId) {
  try {
    await env.DB.prepare(
      `DELETE FROM pin_failures WHERE ip = ? OR (member_id IS NOT NULL AND member_id = ?)`
    )
      .bind(ip || '0.0.0.0', memberId || '')
      .run();
  } catch (err) {
    console.error('clearPinFailures error:', err);
  }
}

async function getTopLeader(env) {
  try {
    const row = await env.DB.prepare(
      `SELECT patron_id, SUM(demerit_count) as total_demerits
       FROM demerits
       WHERE status = 'approved' AND patron_id IS NOT NULL
       GROUP BY patron_id
       ORDER BY total_demerits DESC
       LIMIT 1`
    ).first();
    if (!row || !row.patron_id) return null;
    return {
      patronId: row.patron_id,
      totalDemerits: Number(row.total_demerits) || 0,
    };
  } catch (err) {
    console.error('getTopLeader error:', err);
    return null;
  }
}

async function isNotificationOnCooldown(env, memberId, eventType, cooldownMinutes = 15) {
  try {
    const row = await env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM notification_log
       WHERE member_id = ? AND event_type = ? AND created_at >= datetime('now', '-' || ? || ' minutes')`
    )
      .bind(memberId, eventType, cooldownMinutes)
      .first();
    return (Number(row?.cnt) || 0) > 0;
  } catch {
    return false;
  }
}

function formatSlip(row, includeAdminOriginals = false) {
  if (!row) return null;
  const formatted = {
    id: row.id,
    patron_id: row.patron_id || null,
    raw_student: row.raw_student,
    issuer_id: row.issuer_id || null,
    raw_signature: row.raw_signature,
    demerit_count: Number(row.demerit_count) || 1,
    incident_date: row.incident_date,
    incident_time: row.incident_time ? String(row.incident_time).slice(0, 5) : null,
    location_area: row.location_area || 'Copper Athletic Club',
    infractions: parseJsonSafe(row.infractions, []),
    demerit_items: parseJsonSafe(row.demerit_items, []),
    image_url: row.image_url || null,
    source_image_url: row.source_image_url || null,
    secondary_image_url: row.secondary_image_url || null,
    image_sha256: row.image_sha256 || null,
    image_dhash: row.image_dhash || null,
    capture_note: row.capture_note || null,
    submitted_by_member_id: row.submitted_by_member_id || null,
    status: row.status || 'approved',
    is_blurred: Boolean(row.is_blurred),
    moderation_flag_reason: row.moderation_flag_reason || null,
    reactions: {
      ...DEFAULT_REACTIONS,
      ...parseJsonSafe(row.reactions, DEFAULT_REACTIONS),
    },
    created_at: row.created_at,
  };

  if (includeAdminOriginals) {
    formatted.original_infractions = parseJsonSafe(row.original_infractions, null);
  }
  return formatted;
}

/**
 * Sends a rate-limited Opt-In Email and/or Carrier SMS Gateway message via Resend (Free Tier, hard-capped)
 */
async function sendControlledNotification(
  env,
  { memberId, eventType, toEmail, toPhone, carrier, channel = 'both', subject, htmlText, smsText }
) {
  if (!env.RESEND_API_KEY) {
    return { sent: false, reason: 'RESEND_API_KEY not configured' };
  }

  if (channel === 'none') {
    return { sent: false, reason: 'Channel preference is none' };
  }

  const allowEmail = channel === 'email' || channel === 'both';
  const allowSms = channel === 'text' || channel === 'both';

  // Enforce strict D1 daily rate cap (max 25 notifications/day across the entire site to guarantee $0 cost)
  const countRow = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM notification_log WHERE created_at >= datetime('now', '-1 day')`
  ).first();
  if ((Number(countRow?.cnt) || 0) >= 25) {
    return { sent: false, reason: 'Daily free notification cap reached (25/day)' };
  }

  const cleanEmail = allowEmail ? (toEmail || '').trim().toLowerCase() : '';
  const cleanDigits = allowSms ? (toPhone || '').replace(/\D/g, '') : '';
  const normalizedDigits =
    cleanDigits.length === 11 && cleanDigits.startsWith('1') ? cleanDigits.slice(1) : cleanDigits;

  const gatewayMap = {
    verizon: [
      `${normalizedDigits}@vtext.com`,
      `${normalizedDigits}@vzwpix.com`,
    ],
    att: [
      `${normalizedDigits}@txt.att.net`,
      `${normalizedDigits}@mms.att.net`,
    ],
    tmobile: [`${normalizedDigits}@tmomail.net`],
    uscellular: [`${normalizedDigits}@email.uscc.net`],
    all_major: [
      `${normalizedDigits}@vtext.com`,
      `${normalizedDigits}@txt.att.net`,
      `${normalizedDigits}@tmomail.net`,
    ],
  };

  const smsRecipients =
    allowSms && normalizedDigits.length === 10 && carrier && carrier !== 'none' && gatewayMap[carrier]
      ? gatewayMap[carrier]
      : [];

  if (!cleanEmail && smsRecipients.length === 0) {
    return { sent: false, reason: 'No verified opt-in email or carrier SMS gateway configured' };
  }

  let emailSent = false;
  let smsSent = false;
  const dispatchDetails = [];

  try {
    // 1. Send Rich HTML + Plain-Text Email to the Member's Email Address
    if (allowEmail && cleanEmail && cleanEmail.includes('@')) {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Copper Demerits <noreply@copperdemerits.com>',
          reply_to: 'info@drit.ninja',
          to: [cleanEmail],
          subject,
          html: htmlText,
          text: smsText || subject,
        }),
      });
      emailSent = emailRes.ok;
      const emailData = await emailRes.json().catch(() => ({}));
      dispatchDetails.push({ channel: 'email', to: cleanEmail, ok: emailRes.ok, id: emailData?.id });
    }

    // 2. Send Pure Plain-Text (No HTML, Short Subject) to Carrier SMS Gateway(s)
    if (allowSms && smsRecipients.length > 0) {
      const smsRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Copper Demerits <noreply@copperdemerits.com>',
          reply_to: 'info@drit.ninja',
          to: smsRecipients,
          subject: 'Copper Demerits',
          text: (smsText || subject).slice(0, 155),
        }),
      });
      smsSent = smsRes.ok;
      const smsData = await smsRes.json().catch(() => ({}));
      dispatchDetails.push({
        channel: 'carrier_sms',
        to: smsRecipients,
        ok: smsRes.ok,
        id: smsData?.id,
      });
    }

    await env.DB.prepare(
      `INSERT INTO notification_log (id, member_id, event_type, recipient_masked) VALUES (?, ?, ?, ?)`
    )
      .bind(
        crypto.randomUUID(),
        memberId || null,
        eventType,
        `email:${emailSent ? 1 : 0},sms:${smsSent ? smsRecipients.length : 0}`
      )
      .run();

    return {
      sent: emailSent || smsSent,
      emailSent,
      smsSent,
      dispatchDetails,
    };
  } catch (err) {
    return {
      sent: false,
      reason: err instanceof Error ? err.message : 'Notification error',
    };
  }
}

/**
 * Weekly Happy Hour Digest (Friday 5:00 PM EST / 21:00 UTC)
 */
async function dispatchFridayDocket(env) {
  if (!env.RESEND_API_KEY) return { ok: false, error: 'RESEND_API_KEY missing' };

  try {
    const allMembersRes = await env.DB.prepare('SELECT * FROM members').all();
    const subscribed = (allMembersRes.results || []).filter((m) => {
      const prefs = parseNotificationPreferences(m.notification_preferences);
      return prefs.friday_digest && prefs.friday_digest !== 'none';
    });

    if (subscribed.length === 0) {
      return { ok: true, dispatched: 0, message: 'No patrons subscribed to Friday Night Docket.' };
    }

    const topPatronsRes = await env.DB.prepare(
      `SELECT m.display_name, SUM(d.demerit_count) as total_demerits
       FROM demerits d
       JOIN members m ON m.id = d.patron_id
       WHERE d.status = 'approved'
       GROUP BY d.patron_id
       ORDER BY total_demerits DESC
       LIMIT 3`
    ).all();
    const topPatrons = topPatronsRes.results || [];

    const totalSlipsRes = await env.DB.prepare(
      `SELECT COUNT(*) as slip_count, SUM(demerit_count) as total_points FROM demerits WHERE status = 'approved'`
    ).first();

    let dispatchedCount = 0;
    for (const member of subscribed) {
      const prefs = parseNotificationPreferences(member.notification_preferences);
      const res = await sendControlledNotification(env, {
        memberId: member.id,
        eventType: 'friday_digest',
        toEmail: member.notification_email,
        toPhone: member.notification_phone || member.claimed_by_contact,
        carrier: member.notification_carrier,
        channel: prefs.friday_digest,
        subject: `🍺 Friday Night Docket: Happy Hour Kickoff & Ring of Honor Leaders!`,
        htmlText: `<div style="font-family:sans-serif;background:#121212;color:#F5F2EB;padding:24px;border-radius:16px;border:2px solid #B87333;">
          <h2 style="color:#DFC15E;margin-top:0;">🍺 FRIDAY NIGHT DOCKET — HAPPY HOUR KICKOFF</h2>
          <p>Happy Friday! It's 5:00 PM in Marshall, MI and the taps are open at Copper Athletic Club.</p>
          <div style="background:#1A1614;padding:16px;border-radius:12px;margin:16px 0;border-left:4px solid #DFC15E;">
            <h4 style="color:#DFC15E;margin:0 0 8px 0;">👑 CURRENT LEADERBOARD PODIUM</h4>
            <ol style="margin:0;padding-left:20px;line-height:1.6;">
              ${topPatrons.map((p) => `<li><strong>${p.display_name}</strong> — ${p.total_demerits} Demerits</li>`).join('')}
            </ol>
          </div>
          <p><strong>Total Wall Demerits:</strong> ${totalSlipsRes?.total_points || 0} demerits across ${totalSlipsRes?.slip_count || 0} physical slips.</p>
          <p style="margin-top:20px;"><a href="https://copperdemerits.com" style="color:#121212;background:#DFC15E;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold;display:inline-block;">View Live Ring of Honor Leaderboard →</a></p>
          <p style="font-size:11px;color:#9E8F82;margin-top:20px;">Unofficial Patron-Run Fan Site for Good-Natured Fun Only — Not Affiliated with Copper Athletic Club. Manage notification channels anytime in My Locker.</p>
        </div>`,
        smsText: `Copper Demerits Friday Docket: Happy hour is LIVE! Leaders: ${topPatrons.map(p => `${p.display_name} (${p.total_demerits})`).join(', ')}. View board: https://copperdemerits.com`,
      });
      if (res.sent) dispatchedCount++;
    }

    return { ok: true, dispatched: dispatchedCount, totalSubscribed: subscribed.length };
  } catch (err) {
    console.error('dispatchFridayDocket error:', err);
    return { ok: false, error: err.message };
  }
}

async function ensureSchemaAndSeed(db) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS members (
        id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        is_staff INTEGER NOT NULL DEFAULT 0,
        is_patron INTEGER NOT NULL DEFAULT 1,
        is_admin INTEGER NOT NULL DEFAULT 0,
        claimed_by_contact TEXT,
        claimed_pin TEXT,
        is_claimed INTEGER NOT NULL DEFAULT 0,
        claimed_at TEXT,
        favorite_team TEXT DEFAULT 'lions',
        tagline TEXT,
        notification_email TEXT,
        notification_phone TEXT,
        notification_carrier TEXT DEFAULT 'none',
        notification_opt_in INTEGER NOT NULL DEFAULT 0,
        notification_verified INTEGER NOT NULL DEFAULT 0,
        verification_code TEXT,
        verification_sent_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    )
    .run();

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS staff_aliases (
        id TEXT PRIMARY KEY,
        alias TEXT NOT NULL UNIQUE,
        member_id TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    )
    .run();

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS demerits (
        id TEXT PRIMARY KEY,
        patron_id TEXT,
        raw_student TEXT NOT NULL,
        issuer_id TEXT,
        raw_signature TEXT NOT NULL,
        demerit_count INTEGER NOT NULL DEFAULT 1,
        incident_date TEXT NOT NULL,
        incident_time TEXT,
        location_area TEXT NOT NULL DEFAULT 'Copper Athletic Club',
        infractions TEXT NOT NULL DEFAULT '[]',
        demerit_items TEXT NOT NULL DEFAULT '[]',
        image_url TEXT,
        source_image_url TEXT,
        secondary_image_url TEXT,
        image_sha256 TEXT,
        image_dhash TEXT,
        capture_note TEXT,
        submitted_by_member_id TEXT,
        status TEXT NOT NULL DEFAULT 'approved',
        is_blurred INTEGER NOT NULL DEFAULT 0,
        moderation_flag_reason TEXT,
        original_infractions TEXT,
        reactions TEXT NOT NULL DEFAULT '{"buy_round":0,"tough_call":0,"two_mins":0,"instant_classic":0}',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    )
    .run();

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS notification_log (
        id TEXT PRIMARY KEY,
        member_id TEXT,
        event_type TEXT NOT NULL,
        recipient_masked TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    )
    .run();

  // Safe column additions for existing D1 tables
  const memberCols = [
    'ALTER TABLE members ADD COLUMN is_claimed INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE members ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE members ADD COLUMN notification_email TEXT',
    'ALTER TABLE members ADD COLUMN notification_phone TEXT',
    "ALTER TABLE members ADD COLUMN notification_carrier TEXT DEFAULT 'none'",
    'ALTER TABLE members ADD COLUMN notification_opt_in INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE members ADD COLUMN notification_verified INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE members ADD COLUMN verification_code TEXT',
    'ALTER TABLE members ADD COLUMN verification_sent_at TEXT',
    'ALTER TABLE members ADD COLUMN notification_preferences TEXT',
  ];
  for (const sql of memberCols) {
    try {
      await db.prepare(sql).run();
    } catch {
      // Column already exists
    }
  }

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS pin_failures (
        id TEXT PRIMARY KEY,
        ip TEXT,
        member_id TEXT,
        failed_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    )
    .run();

  const demeritCols = [
    'ALTER TABLE demerits ADD COLUMN is_blurred INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE demerits ADD COLUMN moderation_flag_reason TEXT',
    'ALTER TABLE demerits ADD COLUMN original_infractions TEXT',
    `ALTER TABLE demerits ADD COLUMN reactions TEXT NOT NULL DEFAULT '{"buy_round":0,"tough_call":0,"two_mins":0,"instant_classic":0}'`,
  ];
  for (const sql of demeritCols) {
    try {
      await db.prepare(sql).run();
    } catch {
      // Column already exists
    }
  }

  // Ensure Matt Barnes and any negative aliases are permanently purged
  await db
    .prepare(
      `DELETE FROM staff_aliases WHERE member_id = '44444444-4444-4444-8444-444444444444' OR alias LIKE '%douche%' OR alias LIKE '%matt%'`
    )
    .run();
  await db
    .prepare(
      `DELETE FROM members WHERE id = '44444444-4444-4444-8444-444444444444' OR LOWER(display_name) = 'matt barnes'`
    )
    .run();

  // Ensure Rick is marked as Site Admin (is_admin = 1)
  await db
    .prepare(`UPDATE members SET is_admin = 1 WHERE id = '11111111-1111-4111-8111-111111111111'`)
    .run();

  // Ensure baseline friendly nicknames exist for the 4 authentic members
  const baselineNicknames = [
    { id: 'c0000000-0000-4000-8000-000000000011', alias: 'rick', member_id: '11111111-1111-4111-8111-111111111111' },
    { id: 'c0000000-0000-4000-8000-000000000012', alias: 'burtis', member_id: '22222222-2222-4222-8222-222222222222' },
    { id: 'c0000000-0000-4000-8000-000000000013', alias: 'david lee', member_id: '55555555-5555-4555-8555-555555555555' },
  ];
  for (const nick of baselineNicknames) {
    await db
      .prepare('INSERT OR IGNORE INTO staff_aliases (id, alias, member_id) VALUES (?, ?, ?)')
      .bind(nick.id, nick.alias, nick.member_id)
      .run();
  }
}

/**
 * Resolves a raw student name or raw signature written on a slip to a Member ID
 * using both members.display_name and staff_aliases (nicknames).
 */
function matchMemberFromAliases(rawText, members, aliases, roleFilter = null) {
  const cleaned = String(rawText || '').trim().toLowerCase();
  if (!cleaned) return null;

  const candidateMembers = roleFilter
    ? members.filter((m) => (roleFilter === 'staff' ? Boolean(m.is_staff) : Boolean(m.is_patron)))
    : members;
  const candidateIds = new Set(candidateMembers.map((m) => m.id));

  // 1. Exact display_name match
  const exactDisplay = candidateMembers.find(
    (m) => String(m.display_name || '').trim().toLowerCase() === cleaned
  );
  if (exactDisplay) return exactDisplay.id;

  // 2. Exact nickname/alias match
  const exactAlias = aliases.find(
    (a) => candidateIds.has(a.member_id) && String(a.alias || '').trim().toLowerCase() === cleaned
  );
  if (exactAlias) return exactAlias.member_id;

  // 3. Substring nickname/alias match (longest alias first, min 3 chars)
  const sortedAliases = [...aliases]
    .filter((a) => candidateIds.has(a.member_id) && String(a.alias || '').trim().length >= 3)
    .sort((a, b) => b.alias.length - a.alias.length);

  for (const a of sortedAliases) {
    if (cleaned.includes(String(a.alias).trim().toLowerCase())) {
      return a.member_id;
    }
  }

  // 4. Display name substring match
  for (const m of candidateMembers) {
    const dName = String(m.display_name || '').trim().toLowerCase();
    if (dName.length >= 3 && cleaned.includes(dName)) {
      return m.id;
    }
  }

  return null;
}

/**
 * Automatically merges/reassigns slip stats (`patron_id` and `issuer_id`) whenever
 * nicknames or display names are added or updated.
 */
async function syncSlipsWithAliasesAndNames(db) {
  const [membersRes, aliasesRes, slipsRes] = await Promise.all([
    db.prepare('SELECT * FROM members').all(),
    db.prepare('SELECT * FROM staff_aliases').all(),
    db.prepare('SELECT * FROM demerits').all(),
  ]);

  const members = membersRes.results || [];
  const aliases = aliasesRes.results || [];
  const slips = slipsRes.results || [];

  let updatedCount = 0;
  for (const slip of slips) {
    const matchedPatronId =
      matchMemberFromAliases(slip.raw_student, members, aliases, 'patron') ||
      matchMemberFromAliases(slip.raw_student, members, aliases, null) ||
      slip.patron_id;

    const matchedIssuerId =
      matchMemberFromAliases(slip.raw_signature, members, aliases, 'staff') ||
      slip.issuer_id;

    if (matchedPatronId !== slip.patron_id || matchedIssuerId !== slip.issuer_id) {
      await db
        .prepare('UPDATE demerits SET patron_id = ?, issuer_id = ? WHERE id = ?')
        .bind(matchedPatronId || null, matchedIssuerId || null, slip.id)
        .run();
      updatedCount++;
    }
  }

  return updatedCount;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // 1. Health Check
      if (path === '/api/health') {
        return jsonResponse({
          ok: true,
          service: 'copper-demerits-api',
          version: '1.6.6',
          backend: 'cloudflare-d1-r2-ai',
          database: 'copper-demerits-db',
          bucket: 'copper-demerits-slips',
        });
      }

      // 2. Serve or Upload Slip Images from Cloudflare R2 (`/api/slips/:filename`)
      if (path.startsWith('/api/slips/')) {
        const key = decodeURIComponent(path.replace('/api/slips/', ''));
        if (!key) {
          return jsonResponse({ ok: false, error: 'Missing slip key' }, 400);
        }

        if (request.method === 'GET') {
          const obj = await env.SLIPS_BUCKET.get(key);
          if (!obj) {
            return jsonResponse({ ok: false, error: 'Slip image not found in R2' }, 404);
          }
          const headers = new Headers(CORS_HEADERS);
          obj.writeHttpMetadata(headers);
          headers.set('etag', obj.httpEtag);
          headers.set('Cache-Control', 'public, max-age=31536000, immutable');
          if (!headers.get('Content-Type')) {
            headers.set('Content-Type', 'image/jpeg');
          }
          return new Response(obj.body, { headers });
        }

        if (request.method === 'PUT' || request.method === 'POST') {
          const contentType = request.headers.get('Content-Type') || 'image/jpeg';
          const body = await request.arrayBuffer();
          const maxBytes = 350 * 1024; // 350 KB hard cap (client compresses smartphone photos to ~45KB-82KB)
          if (body.byteLength > maxBytes) {
            return jsonResponse(
              {
                ok: false,
                error: `Slip image exceeds 350 KB optimized storage limit (${Math.round(
                  body.byteLength / 1024
                )} KB). Please upload via the Copper Demerits app so automatic compression runs first.`,
              },
              413
            );
          }
          await env.SLIPS_BUCKET.put(key, body, {
            httpMetadata: {
              contentType,
              cacheControl: 'public, max-age=31536000, immutable',
            },
          });
          const publicUrl = `${url.origin}/api/slips/${encodeURIComponent(key)}`;
          return jsonResponse({
            ok: true,
            key,
            url: publicUrl,
            bytes: body.byteLength,
          });
        }
      }

      await ensureSchemaAndSeed(env.DB);

      // 3. Real-Time AI & Deterministic Moderation Endpoint (`POST /api/moderate-slip`)
      if (path === '/api/moderate-slip' && request.method === 'POST') {
        const body = await request.json();
        const texts = Array.isArray(body.texts) ? body.texts : [body.text || ''];
        const mod = await moderateContent(env, {
          texts,
          imageBase64: body.imageBase64 || null,
        });
        return jsonResponse({
          ok: true,
          ...mod,
        });
      }

      // 3B. Zero-Touch AI Vision Slip OCR & Extraction (`POST /api/extract-slip`)
      if (path === '/api/extract-slip' && request.method === 'POST') {
        const body = await request.json();
        const [membersRes, aliasesRes] = await Promise.all([
          env.DB.prepare('SELECT display_name FROM members').all(),
          env.DB.prepare('SELECT alias FROM staff_aliases').all(),
        ]);
        const knownMembers = (membersRes.results || []).map((m) => m.display_name);
        const knownAliases = (aliasesRes.results || []).map((a) => a.alias);

        const extraction = await extractSlipsFromImageWithAI(env, {
          imageBase64: body.imageBase64 || null,
          defaultDate: body.defaultDate || new Date().toISOString().slice(0, 10),
          knownMembers,
          knownAliases,
        });

        return jsonResponse(extraction, 200);
      }

      // 4. Bootstrap All Public Data (`GET /api/bootstrap`) — Zero PII Exposed
      if (path === '/api/bootstrap' && request.method === 'GET') {
        const [membersRes, aliasesRes, slipsRes] = await Promise.all([
          env.DB.prepare('SELECT * FROM members ORDER BY display_name ASC').all(),
          env.DB.prepare('SELECT * FROM staff_aliases ORDER BY alias ASC').all(),
          env.DB.prepare(
            'SELECT * FROM demerits ORDER BY incident_date DESC, incident_time DESC'
          ).all(),
        ]);

        return jsonResponse({
          ok: true,
          members: (membersRes.results || []).map(formatPublicMember),
          aliases: aliasesRes.results || [],
          demerits: (slipsRes.results || []).map((r) => formatSlip(r, false)),
        });
      }

      // 5. Claim an Unclaimed Profile, Create New Profile, or Sign In via Email/Phone + PIN (`POST /api/claim-profile` or `POST /api/login`)
      if ((path === '/api/claim-profile' || path === '/api/login') && request.method === 'POST') {
        const body = await request.json();
        const {
          action,
          loginIdentifier,
          memberId,
          displayName,
          pin,
          email,
          phone,
          favoriteTeam,
          tagline,
          role,
          notificationPreferences,
        } = body;
        const cleanPin = String(pin || '').trim();

        if (cleanPin.length < 4 || cleanPin.length > 8) {
          return jsonResponse(
            { ok: false, error: 'Please enter a 4 to 8 digit Bar PIN.' },
            400
          );
        }

        const isLoginRequest =
          path === '/api/login' || action === 'login' || Boolean(loginIdentifier);

        // --- A. RETURNING USER SIGN-IN (Email or 10-Digit Phone + 4-8 Digit PIN) ---
        if (isLoginRequest) {
          const rawId = String(loginIdentifier || email || phone || '').trim();
          if (!rawId) {
            return jsonResponse(
              {
                ok: false,
                error: 'Enter your Email Address or 10-Digit Phone Number to sign in.',
              },
              400
            );
          }

          const targetEmail = rawId.includes('@') ? normalizeEmail(rawId) : '';
          const targetPhone = !rawId.includes('@') ? normalizePhone(rawId) : '';

          if (!targetEmail && targetPhone.length < 7) {
            return jsonResponse(
              {
                ok: false,
                error: 'Enter a valid Email Address or 10-Digit Phone Number to sign in.',
              },
              400
            );
          }

          const allMembersRes = await env.DB.prepare('SELECT * FROM members').all();
          const allMembers = allMembersRes.results || [];

          const matchedMember = allMembers.find((m) => {
            const isClaimedRow = Boolean(
              m.is_claimed || (m.claimed_pin && String(m.claimed_pin).trim() !== '')
            );
            if (!isClaimedRow) return false;

            const rowEmail = normalizeEmail(m.notification_email);
            const rowContactEmail = String(m.claimed_by_contact || '').includes('@')
              ? normalizeEmail(m.claimed_by_contact)
              : '';
            const rowPhone = normalizePhone(m.notification_phone);
            const rowContactPhone = !String(m.claimed_by_contact || '').includes('@')
              ? normalizePhone(m.claimed_by_contact)
              : '';

            if (targetEmail) {
              return rowEmail === targetEmail || rowContactEmail === targetEmail;
            }
            if (targetPhone) {
              return (
                (rowPhone && rowPhone === targetPhone) ||
                (rowContactPhone && rowContactPhone === targetPhone)
              );
            }
            return false;
          });

          if (!matchedMember) {
            return jsonResponse(
              {
                ok: false,
                error:
                  'No claimed profile found for that email address or phone number. If you have not claimed your card yet, switch to the "Claim Unclaimed Name" tab!',
              },
              404
            );
          }

          const ip = request.headers.get('cf-connecting-ip') || '0.0.0.0';
          if (await checkPinRateLimit(env, ip, matchedMember.id)) {
            return jsonResponse(
              {
                ok: false,
                error:
                  'Too many incorrect PIN attempts. Security lockout active for 15 minutes.',
              },
              429
            );
          }

          if (String(matchedMember.claimed_pin || '').trim() !== cleanPin) {
            await recordPinFailure(env, ip, matchedMember.id);
            return jsonResponse(
              {
                ok: false,
                error: 'Incorrect 4–8 digit Bar PIN for that email address or phone number.',
              },
              403
            );
          }

          await clearPinFailures(env, ip, matchedMember.id);

          return jsonResponse({
            ok: true,
            mode: 'logged-in',
            member: formatPrivateMember(matchedMember),
          });
        }

        // --- B. CLAIMING AN UNCLAIMED PROFILE OR CREATING A NEW PROFILE ---
        const cleanEmail = normalizeEmail(email);
        const cleanPhone = normalizePhone(phone);

        if (!cleanEmail && !cleanPhone) {
          return jsonResponse(
            {
              ok: false,
              error:
                'Please enter either your Email Address or your 10-Digit Phone Number to claim your profile (you will use this with your PIN to sign in next time).',
            },
            400
          );
        }

        if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
          return jsonResponse(
            { ok: false, error: 'Please enter a valid email address.' },
            400
          );
        }

        if (cleanPhone && cleanPhone.length !== 10) {
          return jsonResponse(
            { ok: false, error: 'Please enter a valid 10-digit phone number (e.g. 269-274-9665).' },
            400
          );
        }

        // Moderate displayName & tagline for friendly bar tone
        const modCheck = await moderateContent(env, {
          texts: [displayName || '', tagline || ''],
        });
        if (modCheck.flagged) {
          return jsonResponse(
            {
              ok: false,
              error: `Referee Whistle: Please keep names and taglines friendly, jovial, and profanity-free! (${modCheck.reason})`,
            },
            400
          );
        }

        // Ensure no other claimed profile already uses this email or phone number
        const allMembersRes = await env.DB.prepare('SELECT * FROM members').all();
        const allMembers = allMembersRes.results || [];

        let existing = null;
        if (memberId) {
          existing = allMembers.find((m) => m.id === memberId) || null;
        } else if (displayName) {
          existing =
            allMembers.find(
              (m) => String(m.display_name || '').toLowerCase() === displayName.trim().toLowerCase()
            ) || null;
        }

        const duplicateContactOwner = allMembers.find((m) => {
          if (existing && m.id === existing.id) return false;
          const isClaimedRow = Boolean(
            m.is_claimed || (m.claimed_pin && String(m.claimed_pin).trim() !== '')
          );
          if (!isClaimedRow) return false;

          const mEmail = normalizeEmail(m.notification_email);
          const mContactEmail = String(m.claimed_by_contact || '').includes('@')
            ? normalizeEmail(m.claimed_by_contact)
            : '';
          const mPhone = normalizePhone(m.notification_phone);
          const mContactPhone = !String(m.claimed_by_contact || '').includes('@')
            ? normalizePhone(m.claimed_by_contact)
            : '';

          if (cleanEmail && (mEmail === cleanEmail || mContactEmail === cleanEmail)) {
            return true;
          }
          if (cleanPhone && (mPhone === cleanPhone || mContactPhone === cleanPhone)) {
            return true;
          }
          return false;
        });

        if (duplicateContactOwner) {
          return jsonResponse(
            {
              ok: false,
              error: `That email or phone number is already linked to a claimed profile (${duplicateContactOwner.display_name}). Switch to the "Sign In" tab to log in with your PIN!`,
            },
            409
          );
        }

        if (existing) {
          const alreadyClaimed = Boolean(
            existing.is_claimed ||
              (existing.claimed_pin && String(existing.claimed_pin).trim() !== '')
          );
          if (alreadyClaimed) {
            return jsonResponse(
              {
                ok: false,
                error:
                  'This profile has already been claimed! Please use the "Sign In" tab with your email or phone number and 4–8 digit Bar PIN.',
              },
              409
            );
          }

          const now = new Date().toISOString();
          const notifPrefs = notificationPreferences
            ? JSON.stringify(parseNotificationPreferences(notificationPreferences))
            : null;

          await env.DB.prepare(
            `UPDATE members
             SET is_claimed = 1,
                 claimed_pin = ?,
                 claimed_at = COALESCE(claimed_at, ?),
                 claimed_by_contact = ?,
                 notification_email = COALESCE(?, notification_email),
                 notification_phone = COALESCE(?, notification_phone),
                 notification_preferences = COALESCE(?, notification_preferences),
                 favorite_team = COALESCE(?, favorite_team),
                 tagline = COALESCE(?, tagline)
             WHERE id = ?`
          )
            .bind(
              cleanPin,
              now,
              cleanEmail || cleanPhone,
              cleanEmail || null,
              cleanPhone || null,
              notifPrefs,
              favoriteTeam || existing.favorite_team || 'lions',
              tagline !== undefined && tagline !== '' ? tagline : existing.tagline,
              existing.id
            )
            .run();

          const updated = await env.DB.prepare('SELECT * FROM members WHERE id = ?')
            .bind(existing.id)
            .first();
          return jsonResponse({
            ok: true,
            mode: 'claimed',
            member: formatPrivateMember(updated),
          });
        }

        // Create and claim a brand new Patron/Staff profile
        if (!displayName || !displayName.trim()) {
          return jsonResponse({ ok: false, error: 'Display name is required.' }, 400);
        }

        const newId = crypto.randomUUID();
        const now = new Date().toISOString();
        const isStaff = role === 'staff' || role === 'both' ? 1 : 0;
        const isPatron = role === 'staff' ? 0 : 1;
        const newNotifPrefs = JSON.stringify(
          parseNotificationPreferences(notificationPreferences || {})
        );

        await env.DB.prepare(
          `INSERT INTO members (id, display_name, is_staff, is_patron, is_admin, claimed_by_contact, claimed_pin, is_claimed, claimed_at, notification_email, notification_phone, notification_preferences, favorite_team, tagline, created_at)
           VALUES (?, ?, ?, ?, 0, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            newId,
            displayName.trim(),
            isStaff,
            isPatron,
            cleanEmail || cleanPhone,
            cleanPin,
            now,
            cleanEmail || null,
            cleanPhone || null,
            newNotifPrefs,
            favoriteTeam || 'lions',
            tagline || 'Copper AC Regular',
            now
          )
          .run();

        await syncSlipsWithAliasesAndNames(env.DB);

        const created = await env.DB.prepare('SELECT * FROM members WHERE id = ?')
          .bind(newId)
          .first();
        return jsonResponse({
          ok: true,
          mode: 'created-and-claimed',
          member: formatPrivateMember(created),
        });
      }

      // 6. Edit Own Claimed Profile (`PATCH /api/my-profile`)
      if (path === '/api/my-profile' && request.method === 'PATCH') {
        const body = await request.json();
        const {
          memberId,
          currentPin,
          newPin,
          displayName,
          tagline,
          favoriteTeam,
          notificationEmail,
          notificationPhone,
          notificationCarrier,
          notificationOptIn,
          notificationPreferences,
        } = body;

        if (!memberId || !currentPin) {
          return jsonResponse(
            { ok: false, error: 'Your current 4–8 digit Bar PIN is required to save profile changes.' },
            401
          );
        }

        const ip = request.headers.get('cf-connecting-ip') || '0.0.0.0';
        if (await checkPinRateLimit(env, ip, memberId)) {
          return jsonResponse(
            {
              ok: false,
              error:
                'Too many incorrect PIN attempts. Security lockout active for 15 minutes.',
            },
            429
          );
        }

        const existing = await env.DB.prepare('SELECT * FROM members WHERE id = ?')
          .bind(memberId)
          .first();

        if (!existing) {
          return jsonResponse({ ok: false, error: 'Profile not found.' }, 404);
        }

        if (existing.is_claimed && existing.claimed_pin && existing.claimed_pin !== String(currentPin).trim()) {
          await recordPinFailure(env, ip, memberId);
          return jsonResponse({ ok: false, error: 'Incorrect current Bar PIN.' }, 403);
        }

        await clearPinFailures(env, ip, memberId);

        const nextEmail =
          notificationEmail !== undefined
            ? normalizeEmail(notificationEmail)
            : normalizeEmail(existing.notification_email);
        const nextPhone =
          notificationPhone !== undefined
            ? normalizePhone(notificationPhone)
            : normalizePhone(existing.notification_phone || existing.claimed_by_contact);

        if (!nextEmail && (!nextPhone || nextPhone.length !== 10)) {
          return jsonResponse(
            {
              ok: false,
              error:
                'Please keep at least a valid Email Address or 10-Digit Phone Number on your profile so you can sign in with your PIN.',
            },
            400
          );
        }

        // Ensure updated email/phone does not collide with another claimed profile
        const allMembersRes = await env.DB.prepare('SELECT * FROM members WHERE id != ?')
          .bind(memberId)
          .all();
        const collision = (allMembersRes.results || []).find((m) => {
          const isClaimedRow = Boolean(
            m.is_claimed || (m.claimed_pin && String(m.claimed_pin).trim() !== '')
          );
          if (!isClaimedRow) return false;
          const mEmail = normalizeEmail(m.notification_email);
          const mPhone = normalizePhone(m.notification_phone || m.claimed_by_contact);
          if (nextEmail && mEmail && mEmail === nextEmail) return true;
          if (nextPhone && mPhone && mPhone === nextPhone) return true;
          return false;
        });

        if (collision) {
          return jsonResponse(
            {
              ok: false,
              error: 'That email address or phone number is already linked to another claimed profile.',
            },
            409
          );
        }

        // Moderate updated displayName & tagline
        const mod = await moderateContent(env, {
          texts: [displayName || existing.display_name, tagline || ''],
        });
        if (mod.flagged) {
          return jsonResponse(
            {
              ok: false,
              error: `Referee Whistle: Please keep your display name and tagline friendly and profanity-free! (${mod.reason})`,
            },
            400
          );
        }

        const finalPin =
          newPin && String(newPin).trim().length >= 4 && String(newPin).trim().length <= 8
            ? String(newPin).trim()
            : existing.claimed_pin || String(currentPin).trim();

        const emailChanged = nextEmail !== normalizeEmail(existing.notification_email);
        const phoneChanged =
          nextPhone !== normalizePhone(existing.notification_phone || existing.claimed_by_contact);

        const nextVerified =
          emailChanged || phoneChanged ? 0 : Number(existing.notification_verified) || 0;

        const nextPreferences =
          notificationPreferences !== undefined
            ? JSON.stringify(parseNotificationPreferences(notificationPreferences))
            : existing.notification_preferences;

        await env.DB.prepare(
          `UPDATE members
           SET display_name = ?,
               tagline = ?,
               favorite_team = ?,
               claimed_pin = ?,
               claimed_by_contact = ?,
               is_claimed = 1,
               notification_email = ?,
               notification_phone = ?,
               notification_carrier = ?,
               notification_opt_in = ?,
               notification_verified = ?,
               notification_preferences = ?
           WHERE id = ?`
        )
          .bind(
            (displayName || existing.display_name).trim(),
            tagline !== undefined ? tagline.trim() : existing.tagline,
            favoriteTeam || existing.favorite_team || 'lions',
            finalPin,
            nextEmail || nextPhone,
            nextEmail || null,
            nextPhone || null,
            notificationCarrier || existing.notification_carrier || 'none',
            notificationOptIn ? 1 : 0,
            notificationOptIn ? nextVerified : 0,
            nextPreferences,
            memberId
          )
          .run();

        // Sync any slips that match the updated display_name or member nicknames
        const mergedCount = await syncSlipsWithAliasesAndNames(env.DB);

        const updated = await env.DB.prepare('SELECT * FROM members WHERE id = ?')
          .bind(memberId)
          .first();

        return jsonResponse({
          ok: true,
          mergedCount,
          member: formatPrivateMember(updated),
        });
      }

      // 7. Request 6-Digit Opt-In Verification Code (`POST /api/notifications/send-code`)
      if (path === '/api/notifications/send-code' && request.method === 'POST') {
        const body = await request.json();
        const {
          memberId,
          pin,
          email,
          phone,
          carrier,
          optInAccepted,
        } = body;

        if (!optInAccepted) {
          return jsonResponse(
            {
              ok: false,
              error: 'You must accept the Opt-In Notification Agreement before verifying.',
            },
            400
          );
        }

        const existing = await env.DB.prepare('SELECT * FROM members WHERE id = ?')
          .bind(memberId)
          .first();
        if (!existing || (existing.claimed_pin && existing.claimed_pin !== String(pin || '').trim())) {
          return jsonResponse({ ok: false, error: 'Valid Bar PIN required.' }, 403);
        }

        const code = String(Math.floor(100000 + Math.random() * 900000));
        const now = new Date().toISOString();

        await env.DB.prepare(
          `UPDATE members
           SET notification_email = ?,
               notification_phone = ?,
               notification_carrier = ?,
               notification_opt_in = 1,
               verification_code = ?,
               verification_sent_at = ?
           WHERE id = ?`
        )
          .bind(
            (email || '').trim(),
            (phone || '').trim(),
            carrier || 'none',
            code,
            now,
            memberId
          )
          .run();

        const sendRes = await sendControlledNotification(env, {
          memberId,
          eventType: 'opt_in_verification',
          toEmail: email,
          toPhone: phone,
          carrier,
          subject: `🍺 Your Copper Demerits Verification Code: ${code}`,
          htmlText: `<div style="font-family:sans-serif;background:#121212;color:#F5F2EB;padding:24px;border-radius:16px;border:2px solid #B87333;">
            <h2 style="color:#B87333;margin-top:0;">RING OF HONOR • OPT-IN VERIFICATION</h2>
            <p>Hey <strong>${existing.display_name}</strong>,</p>
            <p>Your 6-digit verification code to enable Ring of Honor notifications is:</p>
            <div style="font-size:28px;font-weight:900;letter-spacing:6px;color:#DFC15E;padding:12px 18px;background:#1E1916;border-radius:12px;display:inline-block;">${code}</div>
            <p style="font-size:12px;color:#9E8F82;margin-top:18px;">Unofficial Patron-Run Fan Site for Good-Natured Fun Only — Not Affiliated with Copper Athletic Club. You can turn off notifications anytime in My Locker.</p>
            <p style="font-size:11px;color:#8E8074;margin-top:10px;">Website concerns, comments, or complaints? Contact info@drit.ninja.</p>
          </div>`,
          smsText: `Copper Demerits Fan Site Verification Code for ${existing.display_name}: ${code}. Reply STOP or toggle off in My Locker anytime.`,
        });

        return jsonResponse({
          ok: true,
          emailDispatched: sendRes.sent,
          verificationCodePreview: sendRes.sent ? undefined : code,
          message: sendRes.sent
            ? '6-digit verification code sent! Enter it below to confirm your opt-in.'
            : `Verification code generated (${code}) — enter it below to complete opt-in.`,
        });
      }

      // 8. Verify 6-Digit Opt-In Code (`POST /api/notifications/verify-code`)
      if (path === '/api/notifications/verify-code' && request.method === 'POST') {
        const body = await request.json();
        const { memberId, pin, code } = body;

        const existing = await env.DB.prepare('SELECT * FROM members WHERE id = ?')
          .bind(memberId)
          .first();
        if (!existing || (existing.claimed_pin && existing.claimed_pin !== String(pin || '').trim())) {
          return jsonResponse({ ok: false, error: 'Valid Bar PIN required.' }, 403);
        }

        if (!code || String(existing.verification_code || '').trim() !== String(code).trim()) {
          return jsonResponse({ ok: false, error: 'Invalid 6-digit verification code.' }, 400);
        }

        await env.DB.prepare(
          `UPDATE members
           SET notification_verified = 1,
               notification_opt_in = 1,
               verification_code = NULL
           WHERE id = ?`
        )
          .bind(memberId)
          .run();

        const updated = await env.DB.prepare('SELECT * FROM members WHERE id = ?')
          .bind(memberId)
          .first();
        return jsonResponse({
          ok: true,
          member: formatPrivateMember(updated),
        });
      }

      // 8B. Send a Live Test Email & Carrier SMS Alert to a Verified/Claimed Profile (`POST /api/notifications/test`)
      if (path === '/api/notifications/test' && request.method === 'POST') {
        const body = await request.json();
        const { memberId, pin, email, phone, carrier, channel } = body;

        const ip = request.headers.get('cf-connecting-ip') || '0.0.0.0';
        if (await checkPinRateLimit(env, ip, memberId)) {
          return jsonResponse(
            {
              ok: false,
              error:
                'Too many incorrect PIN attempts. Security lockout active for 15 minutes.',
            },
            429
          );
        }

        const existing = await env.DB.prepare('SELECT * FROM members WHERE id = ?')
          .bind(memberId)
          .first();
        if (!existing || (existing.claimed_pin && existing.claimed_pin !== String(pin || '').trim())) {
          await recordPinFailure(env, ip, memberId);
          return jsonResponse({ ok: false, error: 'Valid Bar PIN required.' }, 403);
        }

        await clearPinFailures(env, ip, memberId);

        const targetEmail = normalizeEmail(email || existing.notification_email);
        const targetPhone = normalizePhone(
          phone || existing.notification_phone || existing.claimed_by_contact
        );
        const targetCarrier = carrier || existing.notification_carrier || 'all_major';

        // Also save the email/phone/carrier and mark opt-in verified on the profile if provided
        if (targetEmail || targetPhone) {
          await env.DB.prepare(
            `UPDATE members
             SET notification_email = COALESCE(?, notification_email),
                 notification_phone = COALESCE(?, notification_phone),
                 notification_carrier = ?,
                 notification_opt_in = 1,
                 notification_verified = 1
             WHERE id = ?`
          )
            .bind(
              targetEmail || null,
              targetPhone || null,
              targetCarrier === 'all_major' ? existing.notification_carrier || 'verizon' : targetCarrier,
              memberId
            )
            .run();
        }

        const testRes = await sendControlledNotification(env, {
          memberId,
          eventType: 'profile_test_alert',
          toEmail: targetEmail,
          toPhone: targetPhone,
          carrier: targetCarrier,
          channel: channel || 'both',
          subject: `🍺 Ring of Honor Test Alert for ${existing.display_name}!`,
          htmlText: `<div style="font-family:sans-serif;background:#121212;color:#F5F2EB;padding:24px;border-radius:16px;border:2px solid #B87333;">
            <h2 style="color:#DFC15E;margin-top:0;">🍺 COPPER DEMERITS • LIVE SYSTEM TEST</h2>
            <p>Hey <strong>${existing.display_name}</strong>,</p>
            <p>Your <strong>Ring of Honor</strong> profile notifications are live and connected!</p>
            <div style="background:#1A1512;border:1px solid #B87333;border-radius:12px;padding:14px;margin:16px 0;">
              <p style="margin:0 0 6px 0;color:#E08A4E;font-weight:bold;">Current Standing: #1 Ring of Honor (3 Demerits)</p>
              <p style="margin:0;font-size:13px;color:#D6C7B8;">Latest Slip: &ldquo;Too many seat moves, Tried to order Gin &amp; Diet Coke, The headband&rdquo; — Signed by The Boss - AKA Sarah</p>
            </div>
            <p style="margin-top:16px;"><a href="https://copperdemerits.com" style="color:#121212;background:#DFC15E;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:bold;display:inline-block;">Open Ring of Honor Leaderboard</a></p>
            <p style="font-size:11px;color:#9E8F82;margin-top:18px;">Unofficial Patron-Run Fan Site for Good-Natured Fun Only — Not Affiliated with Copper Athletic Club.</p>
            <p style="font-size:11px;color:#8E8074;margin-top:10px;">Website concerns, comments, or complaints? Contact info@drit.ninja.</p>
          </div>`,
          smsText: `Copper Demerits Test for ${existing.display_name}: Ring of Honor alerts are LIVE! (#1 with 3 Demerits). View board: https://copperdemerits.com`,
        });

        const updated = await env.DB.prepare('SELECT * FROM members WHERE id = ?')
          .bind(memberId)
          .first();

        return jsonResponse({
          ok: true,
          ...testRes,
          member: formatPrivateMember(updated),
        });
      }

      // 8C. Send a Live Admin Test Preview of the Friday Night Docket (`POST /api/notifications/friday-digest-test`)
      if (path === '/api/notifications/friday-digest-test' && request.method === 'POST') {
        const body = await request.json();
        const { adminMemberId, pin } = body;
        const ip = request.headers.get('cf-connecting-ip') || '0.0.0.0';

        if (await checkPinRateLimit(env, ip, adminMemberId)) {
          return jsonResponse(
            {
              ok: false,
              error:
                'Too many incorrect PIN attempts. Security lockout active for 15 minutes.',
            },
            429
          );
        }

        const admin = await env.DB.prepare('SELECT * FROM members WHERE id = ?')
          .bind(adminMemberId)
          .first();
        if (
          !admin ||
          (!admin.is_admin && !admin.is_staff) ||
          String(admin.claimed_pin || '').trim() !== String(pin || '').trim()
        ) {
          await recordPinFailure(env, ip, adminMemberId);
          return jsonResponse({ ok: false, error: 'Valid Admin/Staff Bar PIN required.' }, 403);
        }
        await clearPinFailures(env, ip, adminMemberId);

        // Preview dispatch specifically to this admin
        const topPatronsRes = await env.DB.prepare(
          `SELECT m.display_name, SUM(d.demerit_count) as total_demerits
           FROM demerits d
           JOIN members m ON m.id = d.patron_id
           WHERE d.status = 'approved'
           GROUP BY d.patron_id
           ORDER BY total_demerits DESC
           LIMIT 3`
        ).all();
        const topPatrons = topPatronsRes.results || [];

        const totalSlipsRes = await env.DB.prepare(
          `SELECT COUNT(*) as slip_count, SUM(demerit_count) as total_points FROM demerits WHERE status = 'approved'`
        ).first();

        const previewRes = await sendControlledNotification(env, {
          memberId: admin.id,
          eventType: 'friday_digest_preview',
          toEmail: admin.notification_email,
          toPhone: admin.notification_phone || admin.claimed_by_contact,
          carrier: admin.notification_carrier,
          channel: 'both',
          subject: `🍺 [Admin Preview] Friday Night Docket: Happy Hour Kickoff!`,
          htmlText: `<div style="font-family:sans-serif;background:#121212;color:#F5F2EB;padding:24px;border-radius:16px;border:2px solid #DFC15E;">
            <span style="background:#DFC15E;color:#121212;font-size:10px;font-weight:900;padding:3px 8px;border-radius:6px;text-transform:uppercase;">Admin Test Preview</span>
            <h2 style="color:#DFC15E;margin-top:12px;">🍺 FRIDAY NIGHT DOCKET — HAPPY HOUR KICKOFF</h2>
            <p>Hey ${admin.display_name}, this is the Friday 5:00 PM Happy Hour broadcast sent to subscribed Ring of Honor patrons:</p>
            <div style="background:#1A1614;padding:16px;border-radius:12px;margin:16px 0;border-left:4px solid #DFC15E;">
              <h4 style="color:#DFC15E;margin:0 0 8px 0;">👑 CURRENT LEADERBOARD PODIUM</h4>
              <ol style="margin:0;padding-left:20px;line-height:1.6;">
                ${topPatrons.map((p) => `<li><strong>${p.display_name}</strong> — ${p.total_demerits} Demerits</li>`).join('')}
              </ol>
            </div>
            <p><strong>Total Wall Demerits:</strong> ${totalSlipsRes?.total_points || 0} demerits across ${totalSlipsRes?.slip_count || 0} physical slips.</p>
            <p style="margin-top:20px;"><a href="https://copperdemerits.com" style="color:#121212;background:#DFC15E;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold;display:inline-block;">View Live Ring of Honor Leaderboard →</a></p>
            <p style="font-size:11px;color:#9E8F82;margin-top:20px;">Unofficial Patron-Run Fan Site for Good-Natured Fun Only — Not Affiliated with Copper Athletic Club.</p>
          </div>`,
          smsText: `[Admin Preview] Friday Docket: Happy hour is LIVE! Leaders: ${topPatrons.map(p => `${p.display_name} (${p.total_demerits})`).join(', ')}. View wall: https://copperdemerits.com`,
        });

        return jsonResponse({
          ok: true,
          previewSent: previewRes.sent,
          dispatchDetails: previewRes.dispatchDetails,
        });
      }

      // 9. Add or Update Member (`POST /api/members`)
      if (path === '/api/members' && request.method === 'POST') {
        const body = await request.json();
        const displayName = (body.display_name || '').trim();
        if (!displayName) {
          return jsonResponse({ ok: false, error: 'display_name is required' }, 400);
        }

        const mod = await moderateContent(env, { texts: [displayName] });
        if (mod.flagged) {
          return jsonResponse(
            {
              ok: false,
              error: `Referee Whistle: Member names must be friendly and clean! (${mod.reason})`,
            },
            400
          );
        }

        const existing = await env.DB.prepare(
          'SELECT * FROM members WHERE LOWER(display_name) = LOWER(?)'
        )
          .bind(displayName)
          .first();

        if (existing) {
          await env.DB.prepare(
            'UPDATE members SET is_patron = ?, is_staff = ? WHERE id = ?'
          )
            .bind(body.is_patron ? 1 : 0, body.is_staff ? 1 : 0, existing.id)
            .run();
          const updated = await env.DB.prepare('SELECT * FROM members WHERE id = ?')
            .bind(existing.id)
            .first();
          return jsonResponse({ ok: true, member: formatPublicMember(updated) });
        }

        const id = body.id || crypto.randomUUID();
        await env.DB.prepare(
          'INSERT INTO members (id, display_name, is_staff, is_patron) VALUES (?, ?, ?, ?)'
        )
          .bind(id, displayName, body.is_staff ? 1 : 0, body.is_patron !== false ? 1 : 0)
          .run();

        // Also seed their display_name lowercase as a baseline nickname in staff_aliases
        await env.DB.prepare(
          'INSERT OR IGNORE INTO staff_aliases (id, alias, member_id) VALUES (?, ?, ?)'
        )
          .bind(crypto.randomUUID(), displayName.toLowerCase(), id)
          .run();

        await syncSlipsWithAliasesAndNames(env.DB);

        const created = await env.DB.prepare('SELECT * FROM members WHERE id = ?')
          .bind(id)
          .first();
        return jsonResponse({ ok: true, member: formatPublicMember(created) });
      }

      // 10. Create Demerit Slip (`POST /api/demerits`) — Auto-Moderates, Auto-Blurs & Queues for Admin Rick if Flagged!
      if (path === '/api/demerits' && request.method === 'POST') {
        const body = await request.json();
        const id = body.id || crypto.randomUUID();
        const rawInfractions = Array.isArray(body.infractions) ? body.infractions : [];
        const rawItems = Array.isArray(body.demerit_items) ? body.demerit_items : [];

        // Run AI & Deterministic Referee Monitor on student name, signature, and infractions
        const mod = await moderateContent(env, {
          texts: [
            body.raw_student || '',
            body.raw_signature || '',
            ...rawInfractions,
          ],
        });

        const isFlaggedOrBlurred = Boolean(mod.flagged || body.is_blurred);
        const sanitizedStudent = mod.sanitizedTexts[0] || body.raw_student || 'Anonymous Patron';
        const sanitizedSignature = mod.sanitizedTexts[1] || body.raw_signature || 'Staff';
        const sanitizedInfractions = rawInfractions.map(
          (_, idx) => mod.sanitizedTexts[idx + 2] || rawInfractions[idx]
        );
        const sanitizedItems = rawItems.map((item, idx) => ({
          ...item,
          description: sanitizedInfractions[idx] || deterministicModerateText(item.description || '').sanitized,
        }));

        // Resolve patron_id and issuer_id from nicknames / aliases if a different nickname was written on the slip
        const [membersRes, aliasesRes] = await Promise.all([
          env.DB.prepare('SELECT * FROM members').all(),
          env.DB.prepare('SELECT * FROM staff_aliases').all(),
        ]);
        const allMembers = membersRes.results || [];
        const allAliases = aliasesRes.results || [];

        let resolvedPatronId =
          body.patron_id ||
          matchMemberFromAliases(sanitizedStudent, allMembers, allAliases, 'patron') ||
          matchMemberFromAliases(sanitizedStudent, allMembers, allAliases, null) ||
          null;

        if (
          !resolvedPatronId &&
          !isFlaggedOrBlurred &&
          sanitizedStudent &&
          sanitizedStudent.toLowerCase() !== 'anonymous patron'
        ) {
          const newPatronId = crypto.randomUUID();
          await env.DB.prepare(
            'INSERT INTO members (id, display_name, is_staff, is_patron, is_claimed, favorite_team, tagline) VALUES (?, ?, 0, 1, 0, ?, ?)'
          )
            .bind(newPatronId, sanitizedStudent.trim(), 'lions', 'Ring of Honor Contender')
            .run();
          await env.DB.prepare(
            'INSERT OR IGNORE INTO staff_aliases (id, alias, member_id) VALUES (?, ?, ?)'
          )
            .bind(crypto.randomUUID(), sanitizedStudent.trim().toLowerCase(), newPatronId)
            .run();
          resolvedPatronId = newPatronId;
        }

        const resolvedIssuerId =
          body.issuer_id ||
          matchMemberFromAliases(sanitizedSignature, allMembers, allAliases, 'staff') ||
          null;

        // If flagged, do NOT deny — blur it and send it to Site Admin Rick's Override Queue ('pending')!
        const finalStatus = isFlaggedOrBlurred ? 'pending' : body.status || 'approved';
        const flagReason = isFlaggedOrBlurred
          ? mod.reason || body.moderation_flag_reason || 'Blurred by Referee Monitor — Pending Admin Override'
          : null;

        // Track leaderboard status prior to this slip
        const previousLeader = await getTopLeader(env);

        await env.DB.prepare(
          `INSERT INTO demerits (
            id, patron_id, raw_student, issuer_id, raw_signature, demerit_count,
            incident_date, incident_time, location_area, infractions, demerit_items,
            image_url, source_image_url, secondary_image_url, image_sha256, image_dhash,
            capture_note, submitted_by_member_id, status, is_blurred, moderation_flag_reason,
            original_infractions, reactions
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            id,
            resolvedPatronId,
            sanitizedStudent,
            resolvedIssuerId,
            sanitizedSignature,
            Number(body.demerit_count) || 1,
            body.incident_date,
            body.incident_time ? String(body.incident_time).slice(0, 5) : null,
            body.location_area || 'Copper Athletic Club',
            JSON.stringify(sanitizedInfractions),
            JSON.stringify(sanitizedItems),
            body.image_url || null,
            body.source_image_url || null,
            body.secondary_image_url || null,
            body.image_sha256 || null,
            body.image_dhash || null,
            body.capture_note || null,
            body.submitted_by_member_id || null,
            finalStatus,
            isFlaggedOrBlurred ? 1 : 0,
            flagReason,
            isFlaggedOrBlurred ? JSON.stringify(rawInfractions) : null,
            JSON.stringify(DEFAULT_REACTIONS)
          )
          .run();

        // Notify Site Admin (Rick) if a slip was blurred & sent to the Admin Override Queue
        if (isFlaggedOrBlurred) {
          const admins = await env.DB.prepare(
            `SELECT * FROM members WHERE is_admin = 1 AND notification_opt_in = 1 AND notification_verified = 1`
          ).all();
          for (const admin of admins.results || []) {
            await sendControlledNotification(env, {
              memberId: admin.id,
              eventType: 'admin_moderation_queue',
              toEmail: admin.notification_email,
              toPhone: admin.notification_phone || admin.claimed_by_contact,
              carrier: admin.notification_carrier,
              subject: `🦓 Ref Booth Alert: Blurred Slip Queued for Override (${sanitizedStudent})`,
              htmlText: `<div style="font-family:sans-serif;background:#121212;color:#F5F2EB;padding:20px;border-radius:16px;border:2px solid #B87333;">
                <h3 style="color:#DFC15E;margin-top:0;">🦓 SLIP BLURRED &amp; QUEUED FOR ADMIN OVERRIDE</h3>
                <p>A new slip for <strong>${sanitizedStudent}</strong> was automatically blurred by the Referee Monitor and placed in your Ref Booth Queue.</p>
                <p><strong>Reason:</strong> ${flagReason}</p>
                <p><a href="https://copperdemerits.com/admin" style="color:#B87333;font-weight:bold;">Open Ref Booth (/admin) to Approve, Unblur, or Eject →</a></p>
              </div>`,
              smsText: `Copper Demerits Ref Booth: Blurred slip for ${sanitizedStudent} queued for your admin override at copperdemerits.com/admin`,
            });
          }
        } else {
          // If clean and approved:
          const currentLeader = await getTopLeader(env);

          // 1. Leaderboard Crown / Dethroned Check
          if (
            previousLeader &&
            currentLeader &&
            previousLeader.patronId !== currentLeader.patronId
          ) {
            // New Leader Crowned
            const newLeaderRow = await env.DB.prepare('SELECT * FROM members WHERE id = ?')
              .bind(currentLeader.patronId)
              .first();
            if (newLeaderRow) {
              const prefs = parseNotificationPreferences(newLeaderRow.notification_preferences);
              if (prefs.leader_crowned !== 'none') {
                const onCooldown = await isNotificationOnCooldown(
                  env,
                  newLeaderRow.id,
                  'leader_crowned',
                  15
                );
                if (!onCooldown) {
                  await sendControlledNotification(env, {
                    memberId: newLeaderRow.id,
                    eventType: 'leader_crowned',
                    toEmail: newLeaderRow.notification_email,
                    toPhone: newLeaderRow.notification_phone || newLeaderRow.claimed_by_contact,
                    carrier: newLeaderRow.notification_carrier,
                    channel: prefs.leader_crowned,
                    subject: `👑 Ring of Honor Crown: You are now the #1 Demerit Leader!`,
                    htmlText: `<div style="font-family:sans-serif;background:#121212;color:#F5F2EB;padding:24px;border-radius:16px;border:2px solid #DFC15E;">
                      <h2 style="color:#DFC15E;margin-top:0;">👑 YOU ARE NOW THE #1 DEMERIT LEADER!</h2>
                      <p>Hail to the King! You just claimed the #1 spot on the Copper Athletic Club <strong>Ring of Honor Leaderboard</strong> with <strong>${currentLeader.totalDemerits} Demerits</strong>.</p>
                      <p style="margin-top:20px;"><a href="https://copperdemerits.com" style="color:#121212;background:#DFC15E;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold;display:inline-block;">View Ring of Honor Leaderboard →</a></p>
                      <p style="font-size:11px;color:#9E8F82;margin-top:20px;">Unofficial Patron-Run Fan Site for Good-Natured Fun Only — Not Affiliated with Copper Athletic Club.</p>
                    </div>`,
                    smsText: `👑 Crowned! You just took the #1 spot on the Ring of Honor Leaderboard with ${currentLeader.totalDemerits} Demerits! View board: https://copperdemerits.com`,
                  });
                }
              }
            }

            // Previous Leader Dethroned
            const prevLeaderRow = await env.DB.prepare('SELECT * FROM members WHERE id = ?')
              .bind(previousLeader.patronId)
              .first();
            if (prevLeaderRow) {
              const prefs = parseNotificationPreferences(prevLeaderRow.notification_preferences);
              if (prefs.leader_dethroned !== 'none') {
                const onCooldown = await isNotificationOnCooldown(
                  env,
                  prevLeaderRow.id,
                  'leader_dethroned',
                  15
                );
                if (!onCooldown) {
                  await sendControlledNotification(env, {
                    memberId: prevLeaderRow.id,
                    eventType: 'leader_dethroned',
                    toEmail: prevLeaderRow.notification_email,
                    toPhone: prevLeaderRow.notification_phone || prevLeaderRow.claimed_by_contact,
                    carrier: prevLeaderRow.notification_carrier,
                    channel: prefs.leader_dethroned,
                    subject: `📉 Dethroned! You were just overtaken for #1 on the Leaderboard`,
                    htmlText: `<div style="font-family:sans-serif;background:#121212;color:#F5F2EB;padding:24px;border-radius:16px;border:2px solid #B87333;">
                      <h2 style="color:#E08A4E;margin-top:0;">📉 DETHRONED FROM THE #1 SPOT!</h2>
                      <p>Hey ${prevLeaderRow.display_name}, someone just overtook you for #1 on the Ring of Honor Leaderboard.</p>
                      <p style="margin-top:20px;"><a href="https://copperdemerits.com" style="color:#121212;background:#DFC15E;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold;display:inline-block;">Reclaim Your Crown on the Board →</a></p>
                      <p style="font-size:11px;color:#9E8F82;margin-top:20px;">Unofficial Patron-Run Fan Site for Good-Natured Fun Only — Not Affiliated with Copper Athletic Club.</p>
                    </div>`,
                    smsText: `📉 Dethroned! You were just overtaken for #1 on the Ring of Honor Leaderboard. Reclaim your title at https://copperdemerits.com`,
                  });
                }
              }
            }
          }

          // 2. Slip Cited Alert to Patron
          if (resolvedPatronId) {
            const patronRow = await env.DB.prepare('SELECT * FROM members WHERE id = ?')
              .bind(resolvedPatronId)
              .first();
            if (patronRow) {
              const prefs = parseNotificationPreferences(patronRow.notification_preferences);
              const channelChoice =
                prefs.slip_cited !== 'none'
                  ? prefs.slip_cited
                  : patronRow.notification_opt_in && patronRow.notification_verified
                  ? 'both'
                  : 'none';

              if (channelChoice !== 'none') {
                const onCooldown = await isNotificationOnCooldown(env, patronRow.id, 'slip_cited', 5);
                if (!onCooldown) {
                  await sendControlledNotification(env, {
                    memberId: patronRow.id,
                    eventType: 'slip_cited',
                    toEmail: patronRow.notification_email,
                    toPhone: patronRow.notification_phone || patronRow.claimed_by_contact,
                    carrier: patronRow.notification_carrier,
                    channel: channelChoice,
                    subject: `🚨 Penalty Box Alert: +${body.demerit_count || 1} Demerit(s) Logged for ${patronRow.display_name}!`,
                    htmlText: `<div style="font-family:sans-serif;background:#121212;color:#F5F2EB;padding:20px;border-radius:16px;border:2px solid #B87333;">
                      <h3 style="color:#B87333;margin-top:0;">🚨 NEW RING OF HONOR DEMERIT SLIP</h3>
                      <p>Hey <strong>${patronRow.display_name}</strong>, a new slip (+${body.demerit_count || 1} Demerits) was just logged on the wall!</p>
                      <p><strong>Offense:</strong> ${sanitizedInfractions.join(', ')}</p>
                      <p><a href="https://copperdemerits.com/docket" style="color:#DFC15E;font-weight:bold;">View the Wall of Slips →</a></p>
                    </div>`,
                    smsText: `Ring of Honor Alert: +${body.demerit_count || 1} Demerit(s) logged for ${patronRow.display_name} (${sanitizedInfractions.join(', ')}). View at copperdemerits.com`,
                  });
                }
              }
            }
          }
        }

        const created = await env.DB.prepare('SELECT * FROM demerits WHERE id = ?')
          .bind(id)
          .first();
        return jsonResponse({
          ok: true,
          wasBlurredAndQueued: isFlaggedOrBlurred,
          moderationReason: flagReason,
          slip: formatSlip(created, false),
        });
      }

      // 11. Preset Jovial Bar Reactions on a Slip (`POST /api/demerits/:id/react`)
      if (path.match(/^\/api\/demerits\/[^/]+\/react$/) && request.method === 'POST') {
        const parts = path.split('/');
        const id = decodeURIComponent(parts[3]);
        const body = await request.json();
        const reactionKey = body.reaction;

        if (!['buy_round', 'tough_call', 'two_mins', 'instant_classic'].includes(reactionKey)) {
          return jsonResponse({ ok: false, error: 'Invalid reaction type' }, 400);
        }

        const existing = await env.DB.prepare('SELECT * FROM demerits WHERE id = ?')
          .bind(id)
          .first();
        if (!existing) {
          return jsonResponse({ ok: false, error: 'Slip not found' }, 404);
        }

        const currentReactions = {
          ...DEFAULT_REACTIONS,
          ...parseJsonSafe(existing.reactions, DEFAULT_REACTIONS),
        };
        currentReactions[reactionKey] = (Number(currentReactions[reactionKey]) || 0) + 1;

        await env.DB.prepare('UPDATE demerits SET reactions = ? WHERE id = ?')
          .bind(JSON.stringify(currentReactions), id)
          .run();

        const updated = await env.DB.prepare('SELECT * FROM demerits WHERE id = ?')
          .bind(id)
          .first();
        return jsonResponse({ ok: true, slip: formatSlip(updated, false) });
      }

      // 12. Admin Override Queue Action (`POST /api/admin/override-slip`) — Restricted to Rick (Admin) or Staff
      if (path === '/api/admin/override-slip' && request.method === 'POST') {
        const body = await request.json();
        const { slipId, action, adminMemberId } = body;

        const adminRow = adminMemberId
          ? await env.DB.prepare('SELECT * FROM members WHERE id = ?').bind(adminMemberId).first()
          : null;

        if (!adminRow || (!adminRow.is_admin && !adminRow.is_staff)) {
          return jsonResponse(
            { ok: false, error: 'Only Site Admin (Rick) or verified Bar Staff can override queued slips.' },
            403
          );
        }

        const slipRow = await env.DB.prepare('SELECT * FROM demerits WHERE id = ?')
          .bind(slipId)
          .first();
        if (!slipRow) {
          return jsonResponse({ ok: false, error: 'Slip not found.' }, 404);
        }

        if (action === 'reject') {
          await env.DB.prepare('DELETE FROM demerits WHERE id = ?').bind(slipId).run();
          return jsonResponse({ ok: true, deleted: true });
        }

        if (action === 'approve_unblur') {
          const origInfractions = parseJsonSafe(slipRow.original_infractions, null);
          const restoredInfractions =
            Array.isArray(origInfractions) && origInfractions.length > 0
              ? origInfractions
              : parseJsonSafe(slipRow.infractions, []);
          const currentItems = parseJsonSafe(slipRow.demerit_items, []);
          const restoredItems = currentItems.map((it, idx) => ({
            ...it,
            description: restoredInfractions[idx] || it.description,
          }));

          await env.DB.prepare(
            `UPDATE demerits
             SET status = 'approved',
                 is_blurred = 0,
                 moderation_flag_reason = 'Approved & Unblurred by Admin Override',
                 infractions = ?,
                 demerit_items = ?
             WHERE id = ?`
          )
            .bind(JSON.stringify(restoredInfractions), JSON.stringify(restoredItems), slipId)
            .run();
        } else if (action === 'approve_keep_blurred') {
          await env.DB.prepare(
            `UPDATE demerits
             SET status = 'approved',
                 is_blurred = 1
             WHERE id = ?`
          )
            .bind(slipId)
            .run();
        }

        if (slipRow.patron_id) {
          const patronRow = await env.DB.prepare('SELECT * FROM members WHERE id = ?')
            .bind(slipRow.patron_id)
            .first();
          if (patronRow) {
            const prefs = parseNotificationPreferences(patronRow.notification_preferences);
            if (prefs.ref_override !== 'none') {
              const actionLabel =
                action === 'reject'
                  ? 'Disallowed & Removed from Wall'
                  : action === 'approve_unblur'
                  ? 'Approved & Unblurred'
                  : 'Approved (Kept Blurred)';
              await sendControlledNotification(env, {
                memberId: patronRow.id,
                eventType: 'ref_override',
                toEmail: patronRow.notification_email,
                toPhone: patronRow.notification_phone || patronRow.claimed_by_contact,
                carrier: patronRow.notification_carrier,
                channel: prefs.ref_override,
                subject: `📢 Referee Decision on Your Slip: ${actionLabel}`,
                htmlText: `<div style="font-family:sans-serif;background:#121212;color:#F5F2EB;padding:20px;border-radius:16px;border:2px solid #DFC15E;">
                  <h3 style="color:#DFC15E;margin-top:0;">📢 REFEREE BOOTH OVERRIDE DECISION</h3>
                  <p>Hey <strong>${patronRow.display_name}</strong>,</p>
                  <p>The Official Bar Referee reviewed a slip logged under your name:</p>
                  <p><strong>Decision:</strong> ${actionLabel}</p>
                  <p><strong>Cited Name:</strong> ${slipRow.raw_student}</p>
                  <p><a href="https://copperdemerits.com/docket" style="color:#DFC15E;font-weight:bold;">View Current Wall of Slips →</a></p>
                </div>`,
                smsText: `Referee Decision: Your slip for "${slipRow.raw_student}" was reviewed in the Ref Booth (${actionLabel}). View docket: https://copperdemerits.com/docket`,
              });
            }
          }
        }

        const updated = await env.DB.prepare('SELECT * FROM demerits WHERE id = ?')
          .bind(slipId)
          .first();
        return jsonResponse({ ok: true, slip: formatSlip(updated, true) });
      }

      // 13. Update or Delete Demerit Slip (`/api/demerits/:id`)
      if (path.startsWith('/api/demerits/')) {
        const id = decodeURIComponent(path.replace('/api/demerits/', ''));
        if (request.method === 'PATCH') {
          const body = await request.json();
          const existing = await env.DB.prepare('SELECT * FROM demerits WHERE id = ?')
            .bind(id)
            .first();
          if (!existing) {
            return jsonResponse({ ok: false, error: 'Slip not found' }, 404);
          }

          await env.DB.prepare(
            `UPDATE demerits
             SET status = ?,
                 patron_id = ?,
                 issuer_id = ?,
                 secondary_image_url = ?,
                 capture_note = ?,
                 is_blurred = ?
             WHERE id = ?`
          )
            .bind(
              body.status !== undefined ? body.status : existing.status,
              body.patron_id !== undefined ? body.patron_id : existing.patron_id,
              body.issuer_id !== undefined ? body.issuer_id : existing.issuer_id,
              body.secondary_image_url !== undefined
                ? body.secondary_image_url
                : existing.secondary_image_url,
              body.capture_note !== undefined ? body.capture_note : existing.capture_note,
              body.is_blurred !== undefined ? (body.is_blurred ? 1 : 0) : existing.is_blurred,
              id
            )
            .run();

          const updated = await env.DB.prepare('SELECT * FROM demerits WHERE id = ?')
            .bind(id)
            .first();
          return jsonResponse({ ok: true, slip: formatSlip(updated, false) });
        }

        if (request.method === 'DELETE') {
          await env.DB.prepare('DELETE FROM demerits WHERE id = ?').bind(id).run();
          return jsonResponse({ ok: true });
        }
      }

      // 14. Add or Delete Member Nickname / Staff Alias (`/api/aliases`)
      // Restricted to: Site Admins/Staff OR the signed-in Claimed Profile owner adjusting their OWN nicknames!
      if (path === '/api/aliases' && request.method === 'POST') {
        const body = await request.json();
        const alias = (body.alias || '').trim().toLowerCase();
        const memberId = body.member_id;
        const actorMemberId = body.actor_member_id || memberId;
        const actorPin = body.actor_pin ? String(body.actor_pin).trim() : '';

        if (!alias || !memberId) {
          return jsonResponse({ ok: false, error: 'alias and member_id required' }, 400);
        }

        const actor = actorMemberId
          ? await env.DB.prepare('SELECT * FROM members WHERE id = ?').bind(actorMemberId).first()
          : null;

        if (!actor) {
          return jsonResponse(
            { ok: false, error: 'Sign in to your claimed profile or Admin account to adjust nicknames.' },
            401
          );
        }

        const isAdminOrStaff = Boolean(actor.is_admin || actor.is_staff);
        const isOwnClaimedProfile = actor.id === memberId && Boolean(actor.is_claimed);

        if (!isAdminOrStaff && !isOwnClaimedProfile) {
          return jsonResponse(
            {
              ok: false,
              error: 'Only Site Admins or the claimed profile owner can adjust nicknames for this profile.',
            },
            403
          );
        }

        if (actor.claimed_pin && actorPin && actor.claimed_pin !== actorPin) {
          return jsonResponse(
            { ok: false, error: 'Incorrect Bar PIN for profile verification.' },
            403
          );
        }

        const mod = await moderateContent(env, { texts: [alias] });
        if (mod.flagged) {
          return jsonResponse(
            {
              ok: false,
              error: `Referee Whistle: Nicknames and aliases must be bar-friendly and cannot contain insults, name-calling, or profanity! (${mod.reason})`,
            },
            400
          );
        }

        const existingAlias = await env.DB.prepare(
          'SELECT * FROM staff_aliases WHERE LOWER(alias) = LOWER(?)'
        )
          .bind(alias)
          .first();

        if (existingAlias) {
          return jsonResponse(
            {
              ok: false,
              error: `The nickname "${alias}" is already mapped to a profile.`,
            },
            409
          );
        }

        const id = crypto.randomUUID();
        await env.DB.prepare(
          'INSERT INTO staff_aliases (id, alias, member_id) VALUES (?, ?, ?)'
        )
          .bind(id, alias, memberId)
          .run();

        // Automatically merge any existing slips written with this nickname into the target profile!
        const mergedCount = await syncSlipsWithAliasesAndNames(env.DB);

        const created = await env.DB.prepare('SELECT * FROM staff_aliases WHERE id = ?')
          .bind(id)
          .first();
        return jsonResponse({ ok: true, alias: created, mergedCount });
      }

      if (path.startsWith('/api/aliases/') && request.method === 'DELETE') {
        const id = decodeURIComponent(path.replace('/api/aliases/', ''));
        const actorMemberId = url.searchParams.get('actor_member_id') || '';
        const actorPin = (url.searchParams.get('actor_pin') || '').trim();

        const aliasRow = await env.DB.prepare('SELECT * FROM staff_aliases WHERE id = ?')
          .bind(id)
          .first();
        if (!aliasRow) {
          return jsonResponse({ ok: false, error: 'Nickname not found' }, 404);
        }

        if (actorMemberId) {
          const actor = await env.DB.prepare('SELECT * FROM members WHERE id = ?')
            .bind(actorMemberId)
            .first();
          const isAdminOrStaff = Boolean(actor && (actor.is_admin || actor.is_staff));
          const isOwnClaimedProfile = Boolean(
            actor && actor.id === aliasRow.member_id && actor.is_claimed
          );
          if (!isAdminOrStaff && !isOwnClaimedProfile) {
            return jsonResponse(
              {
                ok: false,
                error: 'Only Site Admins or the claimed profile owner can remove this nickname.',
              },
              403
            );
          }
          if (actor?.claimed_pin && actorPin && actor.claimed_pin !== actorPin) {
            return jsonResponse({ ok: false, error: 'Incorrect Bar PIN.' }, 403);
          }
        }

        await env.DB.prepare('DELETE FROM staff_aliases WHERE id = ?').bind(id).run();
        await syncSlipsWithAliasesAndNames(env.DB);
        return jsonResponse({ ok: true });
      }

      return jsonResponse({ ok: false, error: `Route not found: ${path}` }, 404);
    } catch (err) {
      return jsonResponse(
        {
          ok: false,
          error: err instanceof Error ? err.message : 'Internal Worker Error',
        },
        500
      );
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(dispatchFridayDocket(env));
  },
};

