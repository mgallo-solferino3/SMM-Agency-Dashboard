// Backend di Solferino 3 Dashboard: ruoli utente/admin, sincronizzazione dei dati personali,
// contenuti condivisi (kit di link) e appunti condivisi tra colleghi.
// Serve anche la versione web (cartella public/, creata da scripts/build-web.mjs): per la versione web
// fa da tramite verso il foglio Google di Pixieset e verso Asana, che dal browser non si raggiungono direttamente.
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
const ASANA_API = 'https://app.asana.com/api/1.0';
const WEB_COOKIE = 's3web';
const WEB_COOKIE_DAYS = 365;
const WEB_PUBLIC = /^\/(robots\.txt|icon\.png|fonts\/[\w.-]+)$/; // servono anche alla pagina della password

export default {
  async fetch(req, env) {
    const { pathname } = new URL(req.url);
    let res;
    try {
      res = /^\/(api|auth)\//.test(pathname) ? await route(req, env) : await web(req, env);
    } catch (err) {
      if (err instanceof HttpError) res = json({ error: err.code, message: err.message }, err.status);
      else {
        console.error(err);
        res = json({ error: 'server', message: 'Errore del server' }, 500);
      }
    }
    // Niente motori di ricerca, su tutto (anche robots.txt dice Disallow)
    res = new Response(res.body, res);
    res.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return res;
  },
};

// ---------- Versione web: protetta da una password comune (segreto WEB_PASSWORD) ----------
// La password apre le pagine; i dati restano dietro l'accesso con codice. Gli indirizzi /api e /auth
// (usati anche dall'app desktop) non chiedono la password. Il cookie è firmato con la password stessa:
// cambiandola (npx wrangler secret put WEB_PASSWORD) tutti i browser la devono reinserire.
async function web(req, env) {
  const url = new URL(req.url);
  if (WEB_PUBLIC.test(url.pathname)) return env.ASSETS.fetch(req);
  if (!env.WEB_PASSWORD) return passwordPage('La versione web non è ancora configurata.', 503);
  if (url.pathname === '/web-login' && req.method === 'POST') {
    const form = await req.formData().catch(() => null);
    const given = String((form && form.get('password')) || '');
    if (!(await sameText(given, env.WEB_PASSWORD))) {
      await new Promise((r) => setTimeout(r, 1000)); // rallenta i tentativi a raffica
      return passwordPage('Password errata.', 401);
    }
    const exp = Date.now() + WEB_COOKIE_DAYS * 864e5;
    return new Response(null, { status: 303, headers: {
      Location: '/',
      'Set-Cookie': `${WEB_COOKIE}=${exp}.${await webSignature(exp, env)}; Path=/; Max-Age=${WEB_COOKIE_DAYS * 86400}; HttpOnly; Secure; SameSite=Lax`,
    } });
  }
  if (!(await hasWebCookie(req, env))) return passwordPage('', 401);
  return env.ASSETS.fetch(req);
}

async function webSignature(exp, env) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.WEB_PASSWORD), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`web:${exp}`))));
}

async function hasWebCookie(req, env) {
  const m = (req.headers.get('cookie') || '').match(new RegExp(`(?:^|;\\s*)${WEB_COOKIE}=(\\d+)\\.([\\w-]+)`));
  if (!m || Number(m[1]) < Date.now()) return false;
  return sameText(m[2], await webSignature(m[1], env));
}

// Confronto che non dipende da dove le stringhe differiscono
async function sameText(a, b) {
  const [x, y] = await Promise.all([sha256url(a), sha256url(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

function passwordPage(error, status) {
  const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return new Response(`<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>Solferino 3 Dashboard</title><link rel="icon" href="/icon.png">
<style>
@font-face { font-family: Fustat; src: url(/fonts/fustat-latin-wght-normal.woff2) format("woff2"); font-weight: 200 800; }
@font-face { font-family: Antonio; src: url(/fonts/antonio-latin-wght-normal.woff2) format("woff2"); font-weight: 100 700; }
:root { --bg: #f2eeec; --panel: #fff; --text: #02182b; --muted: #5b6470; --line: #ddd6d2; --accent: #6295a5; --danger: #c9512f; }
@media (prefers-color-scheme: dark) { :root { --bg: #02182b; --panel: #04243d; --text: #f2eeec; --muted: #b6b4bc; --line: #20374a; --danger: #ef785a; } }
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px;
  background: var(--bg); color: var(--text); font: 14px Fustat, -apple-system, "Segoe UI", sans-serif; }
form { width: 100%; max-width: 380px; display: flex; flex-direction: column; gap: 12px; padding: 28px; background: var(--panel); border: 1px solid var(--line); border-radius: 3px; }
.brand { font: 700 22px Antonio, sans-serif; text-transform: uppercase; display: flex; align-items: baseline; margin-bottom: 6px; }
.brand b { color: var(--accent); font-weight: 400; margin-left: 2px; }
.brand span { font: 500 10px Fustat, sans-serif; letter-spacing: .22em; margin-left: 10px; }
p { margin: 0; }
input { font: inherit; font-size: 16px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 3px; background: transparent; color: inherit; }
input:focus { outline: none; border-color: var(--accent); }
button { font: inherit; font-size: 12px; text-transform: uppercase; letter-spacing: .16em; padding: 11px; border: 0; border-radius: 3px; background: var(--accent); color: #fff; cursor: pointer; }
.error { color: var(--danger); font-size: 12px; min-height: 1em; }
</style></head>
<body><form method="post" action="/web-login">
<div class="brand">Solferino<b>3</b><span>Dashboard</span></div>
<p>Area riservata: inserisci la password.</p>
<input type="password" name="password" autocomplete="current-password" autofocus required>
<button type="submit">Entra</button>
<div class="error">${esc(error)}</div>
</form></body></html>`, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

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

  const me = await authenticate(req, env);
  if (p === '/auth/logout' && m === 'POST') {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(me.tokenHash).run();
    return json({ ok: true });
  }
  if (p === '/api/me' && m === 'GET') return json(publicUser(me));
  if (p === '/api/me/code' && m === 'POST') return json(await createCode(env, me.email, me.email), 201);

  if (p === '/api/data' && m === 'GET') {
    // ?rev=N: se online c'è ancora la revisione N non serve rimandare i dati
    const known = Number(url.searchParams.get('rev')) || 0;
    if (known) {
      const r = await env.DB.prepare('SELECT rev FROM user_data WHERE email = ?').bind(me.email).first();
      if (r && r.rev === known) return json({ rev: known, unchanged: true });
    }
    const row = await env.DB.prepare('SELECT rev, data, updated_at FROM user_data WHERE email = ?').bind(me.email).first();
    return json(row ? { rev: row.rev, data: JSON.parse(row.data), updatedAt: row.updated_at } : { rev: 0, data: null, updatedAt: 0 });
  }
  if (p === '/api/data' && m === 'PUT') return putData(req, env, me);

  if (p === '/api/sheet' && m === 'POST') return json(await fetchSheet(await readJson(req)));
  const asanaPath = p.match(/^\/api\/asana(\/[A-Za-z0-9_/]+)$/);
  if (asanaPath && (m === 'GET' || m === 'POST')) return asanaProxy(req, asanaPath[1], url.search);

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

// ---------- Tramite per la versione web ----------

// Foglio Google come CSV ("Chiunque abbia il link") o script Google pubblicato (foglio privato): come main.js
function sheetCsvUrl(input) {
  const u = new URL(String(input).trim());
  if (u.hostname !== 'docs.google.com') throw new Error('Il link deve essere di un foglio Google o dello script Google (script.google.com/…/exec)');
  const published = u.pathname.match(/^\/spreadsheets\/d\/e\/([\w-]+)/);
  if (published) {
    const gid = u.searchParams.get('gid');
    return `https://docs.google.com/spreadsheets/d/e/${published[1]}/pub?output=csv${gid ? `&gid=${gid}` : ''}`;
  }
  const id = u.pathname.match(/^\/spreadsheets\/d\/([\w-]+)/);
  if (!id) throw new Error('Non riconosco il link del foglio Google');
  const gid = (u.hash.match(/gid=(\d+)/) || u.search.match(/gid=(\d+)/) || [])[1];
  return `https://docs.google.com/spreadsheets/d/${id[1]}/export?format=csv${gid ? `&gid=${gid}` : ''}`;
}

const isAppsScriptUrl = (u) => u.hostname === 'script.google.com'
  && /^\/(a\/macros\/[\w.-]+|macros)\/s\/[\w-]+\/exec$/.test(u.pathname);

async function fetchSheet({ url, key } = {}) {
  try {
    const u = new URL(String(url).trim());
    if (isAppsScriptUrl(u)) {
      u.searchParams.set('key', String(key || ''));
      const res = await fetch(u.toString());
      if (!res.ok || !(res.headers.get('content-type') || '').includes('application/json')) {
        return { error: 'Script non raggiungibile: in "Chi ha accesso" deve essere impostato "Chiunque"' };
      }
      const data = await res.json();
      if (data.error) return { error: `Script Google: ${data.error}` };
      if (Array.isArray(data.sheets)) {
        return { sheets: data.sheets.filter((s) => Array.isArray(s.rows)).map((s) => ({ name: String(s.name || 'Foglio'), rows: s.rows })) };
      }
      return Array.isArray(data.rows) ? { sheets: [{ name: String(data.sheet || 'Foglio'), rows: data.rows }] } : { error: 'Risposta dello script non valida' };
    }
    const res = await fetch(sheetCsvUrl(url));
    if (!res.ok || !(res.headers.get('content-type') || '').includes('text/csv')) {
      return { error: 'Il foglio è privato: collegalo tramite lo script Google (indirizzo …/exec e chiave), vedi README' };
    }
    return { csv: await res.text() };
  } catch (err) {
    return { error: String((err && err.message) || err) };
  }
}

// Asana con il token personale dell'utente (resta nel suo browser, qui passa e basta)
async function asanaProxy(req, path, search) {
  const token = req.headers.get('x-asana-token') || '';
  if (!token) throw new HttpError(400, 'asana', 'Asana non è collegato');
  const res = await fetch(ASANA_API + path + search, {
    method: req.method,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(req.method === 'POST' ? { 'Content-Type': 'application/json' } : {}) },
    body: req.method === 'POST' ? await req.text() : undefined,
  });
  return new Response(res.body, { status: res.status, headers: { 'content-type': 'application/json; charset=utf-8' } });
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

