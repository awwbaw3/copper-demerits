/**
 * Copper Demerits — Cloudflare Worker Backend API (`copper-demerits-api`)
 * Binds to:
 *   - env.DB: Cloudflare D1 Database (`copper-demerits-db`, ID: feb899d8-606e-4937-91b7-9076e2741961)
 *   - env.SLIPS_BUCKET: Cloudflare R2 Bucket (`copper-demerits-slips`)
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Member-Id',
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

function formatMemberRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    display_name: row.display_name,
    is_staff: Boolean(row.is_staff),
    is_patron: Boolean(row.is_patron),
    claimed_by_contact: row.claimed_by_contact || null,
    is_claimed: Boolean(row.claimed_at || row.claimed_pin),
    claimed_at: row.claimed_at || null,
    favorite_team: row.favorite_team || 'lions',
    tagline: row.tagline || null,
    created_at: row.created_at,
  };
}

function formatSlipRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    patron_id: row.patron_id || null,
    raw_student: row.raw_student,
    issuer_id: row.issuer_id || null,
    raw_signature: row.raw_signature,
    demerit_count: Number(row.demerit_count) || 1,
    incident_date: row.incident_date,
    incident_time: row.incident_time || null,
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
    created_at: row.created_at,
  };
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // 1. Health & Backend Info
      if (path === '/' || path === '/api/health') {
        return jsonResponse({
          ok: true,
          service: 'copper-demerits-api',
          backend: 'cloudflare-d1-r2',
          database: 'copper-demerits-db',
          bucket: 'copper-demerits-slips',
        });
      }

      // 2. GET /api/bootstrap — Returns members, aliases, and demerits in a single call
      if (path === '/api/bootstrap' && request.method === 'GET') {
        const [membersRes, aliasesRes, demeritsRes] = await Promise.all([
          env.DB.prepare('SELECT * FROM members ORDER BY display_name ASC').all(),
          env.DB.prepare('SELECT * FROM staff_aliases ORDER BY alias ASC').all(),
          env.DB.prepare(
            'SELECT * FROM demerits ORDER BY incident_date DESC, incident_time ASC, created_at DESC'
          ).all(),
        ]);

        return jsonResponse({
          ok: true,
          members: (membersRes.results || []).map(formatMemberRow),
          aliases: aliasesRes.results || [],
          demerits: (demeritsRes.results || []).map(formatSlipRow),
        });
      }

      // 3. R2 Slip Image Upload & Retrieval (/api/slips/:key)
      if (path.startsWith('/api/slips/')) {
        const key = decodeURIComponent(path.replace('/api/slips/', ''));
        if (!key) return jsonResponse({ error: 'Missing slip key' }, 400);

        if (request.method === 'GET') {
          const obj = await env.SLIPS_BUCKET.get(key);
          if (!obj) return new Response('Not Found', { status: 404, headers: CORS_HEADERS });
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
            httpMetadata: { contentType },
          });
          const publicUrl = `${url.origin}/api/slips/${encodeURIComponent(key)}`;
          return jsonResponse({ ok: true, key, url: publicUrl });
        }
      }

      // 4. POST /api/claim-profile — Claim or Login to a Staff/Patron Profile
      if (path === '/api/claim-profile' && request.method === 'POST') {
        const body = await request.json();
        const {
          memberId,
          displayName,
          contact,
          pin,
          favoriteTeam = 'lions',
          tagline = '',
          role = 'patron',
        } = body;

        if (!pin || String(pin).trim().length < 4) {
          return jsonResponse({ ok: false, error: 'Please enter a 4-digit Bar PIN.' }, 400);
        }

        let targetMember = null;
        if (memberId) {
          targetMember = await env.DB.prepare('SELECT * FROM members WHERE id = ?')
            .bind(memberId)
            .first();
        } else if (displayName) {
          targetMember = await env.DB.prepare(
            'SELECT * FROM members WHERE lower(trim(display_name)) = lower(trim(?))'
          )
            .bind(displayName)
            .first();
        }

        const cleanPin = String(pin).trim();

        if (targetMember) {
          // If already claimed with a PIN, verify PIN matches
          if (targetMember.claimed_pin && targetMember.claimed_pin !== cleanPin) {
            return jsonResponse(
              {
                ok: false,
                error: 'Incorrect 4-digit Bar PIN for this claimed profile.',
              },
              403
            );
          }

          const nowIso = new Date().toISOString();
          await env.DB.prepare(
            `UPDATE members
             SET claimed_by_contact = COALESCE(?, claimed_by_contact),
                 claimed_pin = ?,
                 claimed_at = COALESCE(claimed_at, ?),
                 favorite_team = COALESCE(?, favorite_team),
                 tagline = COALESCE(?, tagline)
             WHERE id = ?`
          )
            .bind(
              contact || null,
              cleanPin,
              nowIso,
              favoriteTeam || null,
              tagline || null,
              targetMember.id
            )
            .run();

          const updated = await env.DB.prepare('SELECT * FROM members WHERE id = ?')
            .bind(targetMember.id)
            .first();
          return jsonResponse({ ok: true, member: formatMemberRow(updated) });
        }

        // Create & claim a brand new Member profile
        if (!displayName || !String(displayName).trim()) {
          return jsonResponse({ ok: false, error: 'Display name is required.' }, 400);
        }
        const newId = crypto.randomUUID();
        const isStaff = role === 'staff' || role === 'both' ? 1 : 0;
        const isPatron = role === 'patron' || role === 'both' ? 1 : 0;
        const nowIso = new Date().toISOString();

        await env.DB.prepare(
          `INSERT INTO members (id, display_name, is_staff, is_patron, claimed_by_contact, claimed_pin, claimed_at, favorite_team, tagline, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            newId,
            String(displayName).trim(),
            isStaff,
            isPatron,
            contact || null,
            cleanPin,
            nowIso,
            favoriteTeam || 'lions',
            tagline || null,
            nowIso
          )
          .run();

        const created = await env.DB.prepare('SELECT * FROM members WHERE id = ?')
          .bind(newId)
          .first();
        return jsonResponse({ ok: true, member: formatMemberRow(created) });
      }

      // 5. POST /api/members — Add or update a member
      if (path === '/api/members' && request.method === 'POST') {
        const body = await request.json();
        const { id, display_name, is_patron = true, is_staff = false, favorite_team = 'lions', tagline = null } = body;
        const existing = await env.DB.prepare(
          'SELECT * FROM members WHERE lower(trim(display_name)) = lower(trim(?))'
        )
          .bind(display_name)
          .first();

        if (existing) {
          await env.DB.prepare(
            'UPDATE members SET is_patron = ?, is_staff = ?, favorite_team = COALESCE(?, favorite_team), tagline = COALESCE(?, tagline) WHERE id = ?'
          )
            .bind(
              is_patron || existing.is_patron ? 1 : 0,
              is_staff || existing.is_staff ? 1 : 0,
              favorite_team,
              tagline,
              existing.id
            )
            .run();
          const updated = await env.DB.prepare('SELECT * FROM members WHERE id = ?')
            .bind(existing.id)
            .first();
          return jsonResponse({ ok: true, member: formatMemberRow(updated) });
        }

        const memberId = id || crypto.randomUUID();
        const nowIso = new Date().toISOString();
        await env.DB.prepare(
          'INSERT INTO members (id, display_name, is_staff, is_patron, favorite_team, tagline, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )
          .bind(memberId, String(display_name).trim(), is_staff ? 1 : 0, is_patron ? 1 : 0, favorite_team, tagline, nowIso)
          .run();

        const created = await env.DB.prepare('SELECT * FROM members WHERE id = ?')
          .bind(memberId)
          .first();
        return jsonResponse({ ok: true, member: formatMemberRow(created) });
      }

      // 6. POST /api/demerits — Create a new Demerit Slip
      if (path === '/api/demerits' && request.method === 'POST') {
        const body = await request.json();
        const slipId = body.id || crypto.randomUUID();
        let patronId = body.patron_id || null;
        let issuerId = body.issuer_id || null;

        // Normalize issuer from staff_aliases if not set
        if (!issuerId && body.raw_signature) {
          const aliasMatch = await env.DB.prepare(
            'SELECT member_id FROM staff_aliases WHERE alias = lower(trim(?)) LIMIT 1'
          )
            .bind(body.raw_signature)
            .first();
          if (aliasMatch) {
            issuerId = aliasMatch.member_id;
          } else {
            const staffMatch = await env.DB.prepare(
              'SELECT id FROM members WHERE is_staff = 1 AND lower(trim(display_name)) = lower(trim(?)) LIMIT 1'
            )
              .bind(body.raw_signature)
              .first();
            if (staffMatch) issuerId = staffMatch.id;
          }
        }

        // Normalize patron from members if not set
        if (!patronId && body.raw_student) {
          const patronMatch = await env.DB.prepare(
            'SELECT id FROM members WHERE lower(trim(display_name)) = lower(trim(?)) LIMIT 1'
          )
            .bind(body.raw_student)
            .first();
          if (patronMatch) patronId = patronMatch.id;
        }

        const nowIso = body.created_at || new Date().toISOString();
        await env.DB.prepare(
          `INSERT OR REPLACE INTO demerits (
            id, patron_id, raw_student, issuer_id, raw_signature, demerit_count,
            incident_date, incident_time, location_area, infractions, demerit_items,
            image_url, source_image_url, secondary_image_url, image_sha256, image_dhash,
            capture_note, submitted_by_member_id, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            slipId,
            patronId,
            body.raw_student,
            issuerId,
            body.raw_signature,
            Number(body.demerit_count) || 1,
            body.incident_date,
            body.incident_time || null,
            body.location_area || 'Copper Athletic Club',
            JSON.stringify(body.infractions || []),
            JSON.stringify(body.demerit_items || []),
            body.image_url || null,
            body.source_image_url || null,
            body.secondary_image_url || null,
            body.image_sha256 || null,
            body.image_dhash || null,
            body.capture_note || null,
            body.submitted_by_member_id || null,
            body.status || 'approved',
            nowIso
          )
          .run();

        const saved = await env.DB.prepare('SELECT * FROM demerits WHERE id = ?')
          .bind(slipId)
          .first();
        return jsonResponse({ ok: true, slip: formatSlipRow(saved) });
      }

      // 7. PATCH / DELETE /api/demerits/:id
      if (path.startsWith('/api/demerits/')) {
        const slipId = decodeURIComponent(path.replace('/api/demerits/', ''));
        if (request.method === 'DELETE') {
          await env.DB.prepare('DELETE FROM demerits WHERE id = ?').bind(slipId).run();
          return jsonResponse({ ok: true });
        }
        if (request.method === 'PATCH') {
          const body = await request.json();
          const existing = await env.DB.prepare('SELECT * FROM demerits WHERE id = ?')
            .bind(slipId)
            .first();
          if (!existing) return jsonResponse({ error: 'Slip not found' }, 404);

          await env.DB.prepare(
            `UPDATE demerits
             SET status = COALESCE(?, status),
                 patron_id = ?,
                 issuer_id = ?,
                 secondary_image_url = COALESCE(?, secondary_image_url),
                 capture_note = COALESCE(?, capture_note)
             WHERE id = ?`
          )
            .bind(
              body.status ?? null,
              body.patron_id !== undefined ? body.patron_id : existing.patron_id,
              body.issuer_id !== undefined ? body.issuer_id : existing.issuer_id,
              body.secondary_image_url ?? null,
              body.capture_note ?? null,
              slipId
            )
            .run();

          const updated = await env.DB.prepare('SELECT * FROM demerits WHERE id = ?')
            .bind(slipId)
            .first();
          return jsonResponse({ ok: true, slip: formatSlipRow(updated) });
        }
      }

      // 8. POST / DELETE /api/aliases
      if (path === '/api/aliases' && request.method === 'POST') {
        const body = await request.json();
        const cleanAlias = String(body.alias || '').trim().toLowerCase();
        const aliasId = body.id || crypto.randomUUID();
        await env.DB.prepare(
          'INSERT OR REPLACE INTO staff_aliases (id, alias, member_id) VALUES (?, ?, ?)'
        )
          .bind(aliasId, cleanAlias, body.member_id)
          .run();
        return jsonResponse({
          ok: true,
          alias: { id: aliasId, alias: cleanAlias, member_id: body.member_id },
        });
      }

      if (path.startsWith('/api/aliases/') && request.method === 'DELETE') {
        const aliasId = decodeURIComponent(path.replace('/api/aliases/', ''));
        await env.DB.prepare('DELETE FROM staff_aliases WHERE id = ?').bind(aliasId).run();
        return jsonResponse({ ok: true });
      }

      return jsonResponse({ error: 'Not Found', path }, 404);
    } catch (err) {
      return jsonResponse(
        { ok: false, error: err instanceof Error ? err.message : String(err) },
        500
      );
    }
  },
};
