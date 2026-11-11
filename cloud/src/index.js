// Backend di Solferino 3 Dashboard: ruoli utente/admin, sincronizzazione dei dati personali,
// contenuti condivisi (kit di link) e appunti condivisi tra colleghi.
//
// Accesso con codice per dispositivo: un admin genera un codice monouso per un utente, che lo inserisce
// nell'app e riceve un token di sessione (Authorization: Bearer). Un utente già collegato può generare
// il codice per un suo altro computer. Il primo admin si crea con scripts/admin-code.mjs.

const SESSION_DAYS = 730;
const CODE_DAYS = 7;
// 12 caratteri da 31 (niente 0/O, 1/I/L): ~1e18 combinazioni, non si indovina a tentativi
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const MAX_DATA_BYTES = 1_500_000;
const SHARED_KEYS = new Set(['tools']);
const MAX_NOTE_BYTES = 500_000;
const MAX_NOTE_RECIPIENTS = 50;

export default {
  async fetch(req, env) {
    try {
      return await route(req, env);
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.code, message: err.message }, err.status);
      console.error(err);
      return json({ error: 'server', message: 'Errore del server' }, 500);
    }
  },
};

class HttpError extends Error {
  constructor(status, code, message = code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function route(req, env) {
  const url = new URL(req.url);
  const { pathname: p } = url;
  const m = req.method;

  if (p === '/auth/redeem' && m === 'POST') return redeem(req, env);
  if (p === '/' && m === 'GET') return new Response('Solferino 3 Dashboard API', { headers: { 'content-type': 'text/plain; charset=utf-8' } });

  const me = await authenticate(req, env);
  if (p === '/auth/logout' && m === 'POST') {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(me.tokenHash).run();
    return json({ ok: true });
  }
  if (p === '/api/me' && m === 'GET') return json(publicUser(me));
  if (p === '/api/me/code' && m === 'POST') return json(await createCode(env, me.email, me.email), 201);

  if (p === '/api/data' && m === 'GET') {
    const row = await env.DB.prepare('SELECT rev, data, updated_at FROM user_data WHERE email = ?').bind(me.email).first();
    return json(row ? { rev: row.rev, data: JSON.parse(row.data), updatedAt: row.updated_at } : { rev: 0, data: null, updatedAt: 0 });
  }
  if (p === '/api/data' && m === 'PUT') return putData(req, env, me);

  // Colleghi a cui condividere un appunto (nome ed email: niente ruoli o accessi)
  if (p === '/api/team' && m === 'GET') {
    const { results } = await env.DB.prepare('SELECT email, name FROM users ORDER BY name, email').all();
    return json(results);
  }
  // Appunti condivisi: i miei (non eliminati) e quelli ricevuti (anche eliminati dal proprietario,
  // così l'app ne tiene una copia e poi conferma con DELETE)
  if (p === '/api/shared-notes' && m === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT n.*, o.name AS owner_name, b.name AS updated_by_name FROM shared_notes n
       LEFT JOIN users o ON o.email = n.owner LEFT JOIN users b ON b.email = n.updated_by
       WHERE (n.owner = ?1 AND n.deleted = 0) OR (n.owner != ?1 AND EXISTS (SELECT 1 FROM json_each(n.shared_with) WHERE value = ?1))
       ORDER BY n.date DESC`).bind(me.email).all();
    return json(results.map(publicNote));
  }
  const sharedNote = p.match(/^\/api\/shared-notes\/([^/]+)\/([A-Za-z0-9_-]{1,64})$/);
  if (sharedNote) {
    const owner = decodeURIComponent(sharedNote[1]).toLowerCase();
    if (m === 'PUT') return putNote(req, env, me, owner, sharedNote[2]);
    if (m === 'DELETE') return deleteNote(env, me, owner, sharedNote[2]);
  }
  // Versione 1.13.0 dell'app: solo gli appunti ricevuti, e solo il proprietario scrive
  if (p === '/api/notes' && m === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT n.*, o.name AS owner_name FROM shared_notes n LEFT JOIN users o ON o.email = n.owner
       WHERE n.owner != ?1 AND n.deleted = 0 AND EXISTS (SELECT 1 FROM json_each(n.shared_with) WHERE value = ?1)
       ORDER BY n.date DESC`).bind(me.email).all();
    return json(results.map(publicNote));
  }
  const note = p.match(/^\/api\/notes\/([A-Za-z0-9_-]{1,64})$/);
  if (note && m === 'PUT') return putNote(req, env, me, me.email, note[1]);
  if (note && m === 'DELETE') return deleteNote(env, me, me.email, note[1]);

  const shared = p.match(/^\/api\/shared\/([a-z]+)$/);
  if (shared && SHARED_KEYS.has(shared[1])) {
    if (m === 'GET') {
      const row = await env.DB.prepare('SELECT rev, data, updated_by, updated_at FROM shared WHERE key = ?').bind(shared[1]).first();
      return json(row ? { rev: row.rev, data: JSON.parse(row.data), updatedBy: row.updated_by, updatedAt: row.updated_at } : { rev: 0, data: null });
    }
    if (m === 'PUT') return putShared(req, env, requireAdmin(me), shared[1]);
  }

  if (p === '/api/users' && m === 'GET') {
    requireAdmin(me);
    const { results } = await env.DB.prepare(
      `SELECT u.email, u.name, u.role, u.created_at, u.last_seen,
        (SELECT COUNT(*) FROM sessions s WHERE s.email = u.email AND s.expires_at > ?) AS devices
       FROM users u ORDER BY u.role, u.email`).bind(Date.now()).all();
    return json(results.map((u) => ({ email: u.email, name: u.name, role: u.role, createdAt: u.created_at, lastSeen: u.last_seen, devices: u.devices })));
  }
  if (p === '/api/users' && m === 'POST') {
    requireAdmin(me);
    const body = await readJson(req);
    const email = normalizeEmail(body.email, env);
    const role = body.role === 'admin' ? 'admin' : 'user';
    const res = await env.DB.prepare('INSERT OR IGNORE INTO users (email, name, role, created_at) VALUES (?, ?, ?, ?)')
      .bind(email, String(body.name || '').trim().slice(0, 100), role, Date.now()).run();
    if (!res.meta.changes) throw new HttpError(409, 'exists', 'Utente già invitato');
    return json(await createCode(env, email, me.email), 201);
  }
  const userCode = p.match(/^\/api\/users\/([^/]+)\/code$/);
  if (userCode && m === 'POST') {
    requireAdmin(me);
    const email = decodeURIComponent(userCode[1]).toLowerCase();
    if (!await env.DB.prepare('SELECT 1 FROM users WHERE email = ?').bind(email).first()) throw new HttpError(404, 'not_found', 'Utente non trovato');
    return json(await createCode(env, email, me.email), 201);
  }
  const userPath = p.match(/^\/api\/users\/([^/]+)$/);
  if (userPath) {
    requireAdmin(me);
    const email = decodeURIComponent(userPath[1]).toLowerCase();
    if (email === me.email) throw new HttpError(400, 'self', 'Non puoi modificare il tuo account da qui');
    if (m === 'PATCH') {
      const { role } = await readJson(req);
      if (role !== 'admin' && role !== 'user') throw new HttpError(400, 'role', 'Ruolo non valido');
      await env.DB.prepare('UPDATE users SET role = ? WHERE email = ?').bind(role, email).run();
      return json({ ok: true });
    }
    if (m === 'DELETE') {
      // I dati personali restano: se la persona viene invitata di nuovo li ritrova
      await env.DB.batch([
        env.DB.prepare('DELETE FROM users WHERE email = ?').bind(email),
        env.DB.prepare('DELETE FROM sessions WHERE email = ?').bind(email),
        env.DB.prepare('DELETE FROM codes WHERE email = ?').bind(email),
      ]);
      return json({ ok: true });
    }
  }

  throw new HttpError(404, 'not_found', 'Indirizzo non trovato');
}

// ---------- Accesso con codice ----------

function newCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const c = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
  return `${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8)}`;
}

// Maiuscole, senza trattini e spazi: il codice si può digitare come capita
const codeKey = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

async function createCode(env, email, createdBy) {
  const code = newCode();
  const now = Date.now();
  const expiresAt = now + CODE_DAYS * 864e5;
  await env.DB.batch([
    env.DB.prepare('DELETE FROM codes WHERE expires_at < ?').bind(now),
    env.DB.prepare('INSERT INTO codes (code_hash, email, created_by, created_at, expires_at) VALUES (?, ?, ?, ?, ?)')
      .bind(await sha256url(codeKey(code)), email, createdBy, now, expiresAt),
  ]);
  return { code, email, expiresAt };
}

async function redeem(req, env) {
  const { code, device } = await readJson(req);
  const codeHash = await sha256url(codeKey(code));
  const row = await env.DB.prepare('SELECT * FROM codes WHERE code_hash = ? AND expires_at > ?').bind(codeHash, Date.now()).first();
  if (!row) throw new HttpError(400, 'invalid_code', 'Codice non valido o scaduto: chiedine uno nuovo');
  await env.DB.prepare('DELETE FROM codes WHERE code_hash = ?').bind(codeHash).run(); // monouso
  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(row.email).first();
  if (!user) throw new HttpError(403, 'not_invited', 'Utente non più abilitato');

  const token = randomToken();
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now),
    env.DB.prepare('INSERT INTO sessions (token_hash, email, device, created_at, expires_at) VALUES (?, ?, ?, ?, ?)')
      .bind(await sha256url(token), user.email, String(device || '').slice(0, 100), now, now + SESSION_DAYS * 864e5),
  ]);
  return json({ token, user: publicUser(user) });
}

async function authenticate(req, env) {
  const m = (req.headers.get('authorization') || '').match(/^Bearer (\S+)$/);
  if (!m) throw new HttpError(401, 'login', 'Accesso richiesto');
  const tokenHash = await sha256url(m[1]);
  const row = await env.DB.prepare(
    `SELECT u.email, u.name, u.role FROM sessions s JOIN users u ON u.email = s.email
     WHERE s.token_hash = ? AND s.expires_at > ?`).bind(tokenHash, Date.now()).first();
  if (!row) throw new HttpError(401, 'login', 'Computer scollegato: inserisci un nuovo codice');
  await env.DB.prepare('UPDATE users SET last_seen = ? WHERE email = ?').bind(Date.now(), row.email).run();
  return { ...row, tokenHash };
}

function requireAdmin(me) {
  if (me.role !== 'admin') throw new HttpError(403, 'forbidden', 'Serve il ruolo di amministratore');
  return me;
}

// ---------- Dati ----------

async function putData(req, env, me) {
  const text = await req.text();
  if (text.length > MAX_DATA_BYTES) throw new HttpError(413, 'too_large', 'Dati troppo grandi per la sincronizzazione');
  const { baseRev, data } = JSON.parse(text);
  if (!data || typeof data !== 'object') throw new HttpError(400, 'invalid', 'Dati non validi');
  const now = Date.now();
  const body = JSON.stringify(data);
  // Si scrive solo se nessun altro dispositivo ha salvato nel frattempo (baseRev = revisione attuale)
  const res = baseRev
    ? await env.DB.prepare('UPDATE user_data SET rev = rev + 1, data = ?, updated_at = ? WHERE email = ? AND rev = ?')
      .bind(body, now, me.email, baseRev).run()
    : await env.DB.prepare('INSERT OR IGNORE INTO user_data (email, rev, data, updated_at) VALUES (?, 1, ?, ?)')
      .bind(me.email, body, now).run();
  if (!res.meta.changes) {
    const row = await env.DB.prepare('SELECT rev, data, updated_at FROM user_data WHERE email = ?').bind(me.email).first();
    return json({ error: 'conflict', rev: row?.rev || 0, data: row ? JSON.parse(row.data) : null, updatedAt: row?.updated_at || 0 }, 409);
  }
  return json({ rev: (Number(baseRev) || 0) + 1, updatedAt: now });
}

async function putShared(req, env, me, key) {
  const { data } = await readJson(req);
  if (key === 'tools' && !isToolList(data)) throw new HttpError(400, 'invalid', 'Elenco di link non valido');
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO shared (key, rev, data, updated_by, updated_at) VALUES (?, 1, ?, ?, ?)
     ON CONFLICT (key) DO UPDATE SET rev = rev + 1, data = excluded.data, updated_by = excluded.updated_by, updated_at = excluded.updated_at`)
    .bind(key, JSON.stringify(data), me.email, now).run();
  return json({ ok: true, updatedAt: now });
}

function publicNote(n) {
  return { owner: n.owner, ownerName: n.owner_name || '', id: n.id, title: n.title, date: n.date, html: n.html,
    sharedWith: JSON.parse(n.shared_with), rev: n.rev, updatedBy: n.updated_by || n.owner,
    updatedByName: n.updated_by_name || '', updatedAt: n.updated_at, deleted: !!n.deleted };
}

const getNote = (env, owner, id) => env.DB.prepare(
  `SELECT n.*, o.name AS owner_name, b.name AS updated_by_name FROM shared_notes n
   LEFT JOIN users o ON o.email = n.owner LEFT JOIN users b ON b.email = n.updated_by
   WHERE n.owner = ? AND n.id = ?`).bind(owner, id).first();

// Il proprietario pubblica (o aggiorna) l'appunto e sceglie i colleghi; senza destinatari la condivisione si toglie.
// Chi l'ha ricevuto può modificarne titolo, data e testo. Con baseRev si scrive solo se nessuno ha salvato nel frattempo.
async function putNote(req, env, me, owner, id) {
  const text = await req.text();
  if (text.length > MAX_NOTE_BYTES) throw new HttpError(413, 'too_large', 'Appunto troppo grande per la condivisione');
  let body;
  try {
    body = JSON.parse(text);
  } catch (_) {
    throw new HttpError(400, 'invalid', 'Richiesta non valida');
  }
  const { title, date, html, sharedWith, baseRev } = body || {};
  if (typeof title !== 'string' || typeof html !== 'string') throw new HttpError(400, 'invalid', 'Appunto non valido');
  const isOwner = owner === me.email;
  const row = await getNote(env, owner, id);
  if (!isOwner && (!row || row.deleted || !JSON.parse(row.shared_with).includes(me.email))) {
    throw new HttpError(403, 'forbidden', 'Questo appunto non è più condiviso con te');
  }
  if (row && baseRev && row.rev !== baseRev && !row.deleted) {
    return json({ error: 'conflict', message: 'Appunto modificato nel frattempo', note: publicNote(row) }, 409);
  }

  let recipients = row ? JSON.parse(row.shared_with) : [];
  if (isOwner) {
    if (!Array.isArray(sharedWith)) throw new HttpError(400, 'invalid', 'Appunto non valido');
    const emails = [...new Set(sharedWith.map((e) => String(e).toLowerCase()))].filter((e) => e !== me.email);
    if (emails.length > MAX_NOTE_RECIPIENTS) throw new HttpError(400, 'invalid', 'Troppi destinatari');
    if (!emails.length) {
      await env.DB.prepare('DELETE FROM shared_notes WHERE owner = ? AND id = ?').bind(owner, id).run();
      return json({ ok: true, note: null });
    }
    // Solo colleghi invitati: gli altri indirizzi si scartano
    const { results } = await env.DB.prepare(`SELECT email FROM users WHERE email IN (${emails.map(() => '?').join(',')})`).bind(...emails).all();
    recipients = results.map((r) => r.email);
  }
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO shared_notes (owner, id, title, date, html, shared_with, updated_at, rev, updated_by, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 0)
     ON CONFLICT (owner, id) DO UPDATE SET title = excluded.title, date = excluded.date, html = excluded.html,
       shared_with = excluded.shared_with, updated_at = excluded.updated_at, rev = rev + 1, updated_by = excluded.updated_by, deleted = 0`)
    .bind(owner, id, title.slice(0, 300), String(date || '').slice(0, 10), html, JSON.stringify(recipients), now, me.email).run();
  return json({ ok: true, note: publicNote(await getNote(env, owner, id)) });
}

// Il proprietario elimina: chi l'ha ricevuto lo vede come eliminato e ne tiene una copia nei propri appunti.
// Chi l'ha ricevuto lo toglie dalla propria lista (o conferma di averne salvato la copia).
async function deleteNote(env, me, owner, id) {
  const row = await getNote(env, owner, id);
  if (!row) return json({ ok: true });
  const recipients = JSON.parse(row.shared_with).filter((e) => e !== me.email);
  const gone = owner === me.email ? !recipients.length : row.deleted && !recipients.length;
  if (gone) await env.DB.prepare('DELETE FROM shared_notes WHERE owner = ? AND id = ?').bind(owner, id).run();
  else if (owner === me.email) await env.DB.prepare('UPDATE shared_notes SET deleted = 1, updated_at = ? WHERE owner = ? AND id = ?').bind(Date.now(), owner, id).run();
  else await env.DB.prepare('UPDATE shared_notes SET shared_with = ? WHERE owner = ? AND id = ?').bind(JSON.stringify(recipients), owner, id).run();
  return json({ ok: true });
}

function isToolList(d) {
  return Array.isArray(d) && d.length <= 200 && d.every((t) => t && typeof t === 'object'
    && typeof t.label === 'string' && typeof t.url === 'string' && /^https?:\/\//i.test(t.url)
    && (t.category === undefined || typeof t.category === 'string') && (t.icon === undefined || typeof t.icon === 'string'));
}

// ---------- Utilità ----------

function publicUser(u) {
  return { email: u.email, name: u.name || '', role: u.role };
}

function normalizeEmail(e, env) {
  const email = String(e || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+$/.test(email) || !email.endsWith('@' + env.ALLOWED_DOMAIN)) {
    throw new HttpError(400, 'email', `Inserisci un indirizzo @${env.ALLOWED_DOMAIN}`);
  }
  return email;
}

async function readJson(req) {
  try {
    return await req.json();
  } catch (_) {
    throw new HttpError(400, 'invalid', 'Richiesta non valida');
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}

function b64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomToken() {
  return b64url(crypto.getRandomValues(new Uint8Array(32)));
}

async function sha256url(s) {
  return b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))));
}

