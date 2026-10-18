/**
 * Copper Demerits (`copperdemerits.com`) — Cloudflare Worker + D1 + R2 + Workers AI Backend (v1.6.0)
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

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
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
    is_claimed: Boolean(row.is_claimed),
    claimed_at: row.claimed_at || null,
    favorite_team: row.favorite_team || 'lions',
    tagline: row.tagline || null,
    notification_opt_in: Boolean(row.notification_opt_in),
    notification_verified: Boolean(row.notification_verified),
    created_at: row.created_at,
  };
}

/**
 * Formats a Member row for PRIVATE authenticated profile owner responses (when PIN is verified)
 */
function formatPrivateMember(row) {
  if (!row) return null;
  return {
    ...formatPublicMember(row),
    notification_email: row.notification_email || '',
    notification_phone: row.notification_phone || row.claimed_by_contact || '',
    notification_carrier: row.notification_carrier || 'none',
  };
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
 * Sends a rate-limited Opt-In Email or Carrier SMS Gateway message via Resend (Free Tier, hard-capped)
 */
async function sendControlledNotification(env, { memberId, eventType, toEmail, toPhone, carrier, subject, htmlText, smsText }) {
  if (!env.RESEND_API_KEY) {
    return { sent: false, reason: 'RESEND_API_KEY not configured' };
  }

  // Enforce strict D1 daily rate cap (max 25 notifications/day across the entire site to guarantee $0 cost)
  const countRow = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM notification_log WHERE created_at >= datetime('now', '-1 day')`
  ).first();
  if ((Number(countRow?.cnt) || 0) >= 25) {
    return { sent: false, reason: 'Daily free notification cap reached (25/day)' };
  }

  const recipients = [];
  if (toEmail && toEmail.includes('@')) {
    recipients.push(toEmail.trim());
  }

  // Optional Free Carrier Email-to-SMS Gateway if user selected a carrier and opted in
  const cleanDigits = (toPhone || '').replace(/\D/g, '');
  if (cleanDigits.length === 10 && carrier && carrier !== 'none') {
    const gatewayMap = {
      verizon: `${cleanDigits}@vtext.com`,
      att: `${cleanDigits}@txt.att.net`,
      tmobile: `${cleanDigits}@tmomail.net`,
      uscellular: `${cleanDigits}@email.uscc.net`,
    };
    if (gatewayMap[carrier]) {
      recipients.push(gatewayMap[carrier]);
    }
  }

  if (recipients.length === 0) {
    return { sent: false, reason: 'No verified opt-in email or carrier SMS gateway configured' };
  }

  try {
    // Try sending from verified copperdemerits.com domain, fallback to drit.ninja if DNS still propagating
    let res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Ring of Honor Referee <referee@copperdemerits.com>',
        to: recipients,
        subject,
        html: htmlText,
        text: smsText || subject,
      }),
    });

    if (!res.ok) {
      res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Ring of Honor Referee <onboarding@resend.dev>',
          to: recipients,
          subject,
          html: htmlText,
          text: smsText || subject,
        }),
      });
    }

    await env.DB.prepare(
      `INSERT INTO notification_log (id, member_id, event_type, recipient_masked) VALUES (?, ?, ?, ?)`
    )
      .bind(crypto.randomUUID(), memberId || null, eventType, `${recipients.length} recipient(s)`)
      .run();

    return { sent: res.ok };
  } catch (err) {
    return { sent: false, reason: err instanceof Error ? err.message : 'Notification error' };
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
    'ALTER TABLE members ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE members ADD COLUMN notification_email TEXT',
    'ALTER TABLE members ADD COLUMN notification_phone TEXT',
    "ALTER TABLE members ADD COLUMN notification_carrier TEXT DEFAULT 'none'",
    'ALTER TABLE members ADD COLUMN notification_opt_in INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE members ADD COLUMN notification_verified INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE members ADD COLUMN verification_code TEXT',
    'ALTER TABLE members ADD COLUMN verification_sent_at TEXT',
  ];
  for (const sql of memberCols) {
    try {
      await db.prepare(sql).run();
    } catch {
      // Column already exists
    }
  }

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
          version: '1.6.0',
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
          await env.SLIPS_BUCKET.put(key, body, {
            httpMetadata: {
              contentType,
              cacheControl: 'public, max-age=31536000, immutable',
            },
          });
          const publicUrl = `${url.origin}/api/slips/${encodeURIComponent(key)}`;
          return jsonResponse({ ok: true, key, url: publicUrl });
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

      // 5. Claim or Sign In to a Staff / Patron Profile (`POST /api/claim-profile`)
      if (path === '/api/claim-profile' && request.method === 'POST') {
        const body = await request.json();
        const { memberId, displayName, pin, favoriteTeam, tagline, role } = body;
        const cleanPin = (pin || '').trim();

        if (cleanPin.length < 4 || cleanPin.length > 8) {
          return jsonResponse(
            { ok: false, error: 'Please enter a 4 to 8 digit Bar PIN.' },
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

        let existing = null;
        if (memberId) {
          existing = await env.DB.prepare('SELECT * FROM members WHERE id = ?')
            .bind(memberId)
            .first();
        } else if (displayName) {
          existing = await env.DB.prepare(
            'SELECT * FROM members WHERE LOWER(display_name) = LOWER(?)'
          )
            .bind(displayName.trim())
            .first();
        }

        if (existing) {
          if (existing.is_claimed && existing.claimed_pin && existing.claimed_pin !== cleanPin) {
            return jsonResponse(
              {
                ok: false,
                error:
                  'This profile is already claimed. Enter the matching 4–8 digit Bar PIN to sign in.',
              },
              403
            );
          }

          const now = new Date().toISOString();
          await env.DB.prepare(
            `UPDATE members
             SET is_claimed = 1,
                 claimed_pin = ?,
                 claimed_at = COALESCE(claimed_at, ?),
                 favorite_team = COALESCE(?, favorite_team),
                 tagline = COALESCE(?, tagline)
             WHERE id = ?`
          )
            .bind(
              cleanPin,
              now,
              favoriteTeam || existing.favorite_team || 'lions',
              tagline !== undefined ? tagline : existing.tagline,
              existing.id
            )
            .run();

          const updated = await env.DB.prepare('SELECT * FROM members WHERE id = ?')
            .bind(existing.id)
            .first();
          return jsonResponse({
            ok: true,
            mode: existing.is_claimed ? 'logged-in' : 'claimed',
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

        await env.DB.prepare(
          `INSERT INTO members (id, display_name, is_staff, is_patron, is_admin, claimed_pin, is_claimed, claimed_at, favorite_team, tagline, created_at)
           VALUES (?, ?, ?, ?, 0, ?, 1, ?, ?, ?, ?)`
        )
          .bind(
            newId,
            displayName.trim(),
            isStaff,
            isPatron,
            cleanPin,
            now,
            favoriteTeam || 'lions',
            tagline || 'Copper AC Regular',
            now
          )
          .run();

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
        } = body;

        if (!memberId || !currentPin) {
          return jsonResponse(
            { ok: false, error: 'Your current 4–8 digit Bar PIN is required to save profile changes.' },
            401
          );
        }

        const existing = await env.DB.prepare('SELECT * FROM members WHERE id = ?')
          .bind(memberId)
          .first();

        if (!existing) {
          return jsonResponse({ ok: false, error: 'Profile not found.' }, 404);
        }

        if (existing.is_claimed && existing.claimed_pin && existing.claimed_pin !== String(currentPin).trim()) {
          return jsonResponse({ ok: false, error: 'Incorrect current Bar PIN.' }, 403);
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

        const emailChanged =
          notificationEmail !== undefined &&
          String(notificationEmail).trim().toLowerCase() !==
            String(existing.notification_email || '').trim().toLowerCase();
        const phoneChanged =
          notificationPhone !== undefined &&
          String(notificationPhone).replace(/\D/g, '') !==
            String(existing.notification_phone || existing.claimed_by_contact || '').replace(/\D/g, '');

        const nextVerified =
          emailChanged || phoneChanged ? 0 : Number(existing.notification_verified) || 0;

        await env.DB.prepare(
          `UPDATE members
           SET display_name = ?,
               tagline = ?,
               favorite_team = ?,
               claimed_pin = ?,
               is_claimed = 1,
               notification_email = ?,
               notification_phone = ?,
               notification_carrier = ?,
               notification_opt_in = ?,
               notification_verified = ?
           WHERE id = ?`
        )
          .bind(
            (displayName || existing.display_name).trim(),
            tagline !== undefined ? tagline.trim() : existing.tagline,
            favoriteTeam || existing.favorite_team || 'lions',
            finalPin,
            notificationEmail !== undefined ? notificationEmail.trim() : existing.notification_email,
            notificationPhone !== undefined ? notificationPhone.trim() : existing.notification_phone,
            notificationCarrier || existing.notification_carrier || 'none',
            notificationOptIn ? 1 : 0,
            notificationOptIn ? nextVerified : 0,
            memberId
          )
          .run();

        const updated = await env.DB.prepare('SELECT * FROM members WHERE id = ?')
          .bind(memberId)
          .first();

        return jsonResponse({
          ok: true,
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

        // If flagged, do NOT deny — blur it and send it to Site Admin Rick's Override Queue ('pending')!
        const finalStatus = isFlaggedOrBlurred ? 'pending' : body.status || 'approved';
        const flagReason = isFlaggedOrBlurred
          ? mod.reason || body.moderation_flag_reason || 'Blurred by Referee Monitor — Pending Admin Override'
          : null;

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
            body.patron_id || null,
            sanitizedStudent,
            body.issuer_id || null,
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
        } else if (body.patron_id) {
          // If clean and approved, notify the cited patron if they opted into verified notifications
          const patronRow = await env.DB.prepare(
            `SELECT * FROM members WHERE id = ? AND notification_opt_in = 1 AND notification_verified = 1`
          )
            .bind(body.patron_id)
            .first();
          if (patronRow) {
            await sendControlledNotification(env, {
              memberId: patronRow.id,
              eventType: 'patron_new_slip',
              toEmail: patronRow.notification_email,
              toPhone: patronRow.notification_phone || patronRow.claimed_by_contact,
              carrier: patronRow.notification_carrier,
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

      // 14. Add or Delete Staff Alias (`/api/aliases`) — Moderated for friendly tone
      if (path === '/api/aliases' && request.method === 'POST') {
        const body = await request.json();
        const alias = (body.alias || '').trim().toLowerCase();
        const memberId = body.member_id;
        if (!alias || !memberId) {
          return jsonResponse({ ok: false, error: 'alias and member_id required' }, 400);
        }

        const mod = await moderateContent(env, { texts: [alias] });
        if (mod.flagged) {
          return jsonResponse(
            {
              ok: false,
              error: `Referee Whistle: Staff aliases cannot contain insults, name-calling, or profanity! (${mod.reason})`,
            },
            400
          );
        }

        const id = crypto.randomUUID();
        await env.DB.prepare(
          'INSERT INTO staff_aliases (id, alias, member_id) VALUES (?, ?, ?)'
        )
          .bind(id, alias, memberId)
          .run();

        const created = await env.DB.prepare('SELECT * FROM staff_aliases WHERE id = ?')
          .bind(id)
          .first();
        return jsonResponse({ ok: true, alias: created });
      }

      if (path.startsWith('/api/aliases/') && request.method === 'DELETE') {
        const id = decodeURIComponent(path.replace('/api/aliases/', ''));
        await env.DB.prepare('DELETE FROM staff_aliases WHERE id = ?').bind(id).run();
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
};
