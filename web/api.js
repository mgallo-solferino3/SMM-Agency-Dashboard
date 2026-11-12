/* Solferino 3 Dashboard – versione web.
 * Sostituisce preload.js + main.js: stesso window.api usato da renderer/app.js, ma i dati stanno sul server
 * (Worker Cloudflare, stessa origine) e si sincronizzano con l'app desktop. Serve l'account Solferino 3:
 * senza accesso si mostra la schermata del codice. Cache dei dati nel browser per partire subito e reggere
 * brevi disconnessioni; Asana e foglio Google passano dal Worker. */
'use strict';

(() => {
  const POLL_MS = 60 * 1000;
  const PUSH_DELAY_MS = 1500;
  const ASANA_POLL_MS = 2 * 60 * 1000;
  const ASANA_MAX_PAGES = 5;
  const ASANA_NOTIFY_MAX = 3;
  const ASANA_KNOWN_MAX = 5000;
  const ASANA_TASK_FIELDS = 'name,due_on,due_at,permalink_url,projects.name,memberships.project.name,memberships.section.name,parent.name,parent.projects.name';
  const ASANA_PROJECT_FIELDS = 'name,color,permalink_url,members.gid';
  const ASANA_PROJECTS_EVERY_MS = 10 * 60 * 1000;
  const NOTES_NOTIFY_MAX = 3;

  // ---------- Memoria del browser (può essere piena o bloccata: si va avanti lo stesso) ----------
  const ls = {
    get(k, d) {
      try {
        const v = localStorage.getItem('s3.' + k);
        return v === null ? d : JSON.parse(v);
      } catch (_) { return d; }
    },
    set(k, v) {
      try { localStorage.setItem('s3.' + k, JSON.stringify(v)); } catch (_) {}
    },
    del(...keys) {
      for (const k of keys) try { localStorage.removeItem('s3.' + k); } catch (_) {}
    },
  };

  let token = ls.get('token', '');
  const cloud = {
    user: ls.get('user', null), rev: ls.get('rev', 0), dirty: ls.get('dirty', false), syncedAt: 0, error: '', syncing: false,
    sharedTools: ls.get('sharedTools', null), sharedNotes: [], knownNotes: ls.get('knownNotes', null), unseenNotes: ls.get('unseenNotes', []),
  };
  let saveSeq = 0;
  let pushTimer;
  let started = false;

  const listeners = { cloud: [], data: [], asana: [], openNotes: [] };
  const emit = (k, v) => listeners[k].forEach((cb) => cb(v));
  const cloudPublic = () => ({ connected: !!token, user: cloud.user, syncedAt: cloud.syncedAt, error: cloud.error, dirty: cloud.dirty,
    syncing: cloud.syncing, sharedTools: cloud.sharedTools, sharedNotes: cloud.sharedNotes, unseenNotes: cloud.unseenNotes });
  const sendCloud = () => emit('cloud', cloudPublic());
  const message = (err) => String((err && err.message) || err);
  const toastMsg = (msg) => typeof window.toast === 'function' && window.toast(msg);

  class ApiError extends Error {
    constructor(status, body) {
      super((body && body.message) || `Server non raggiungibile (${status})`);
      this.status = status;
      this.body = body;
    }
  }

  async function api(method, path, body, headers = {}) {
    let res;
    try {
      res = await fetch(path, { method, cache: 'no-store',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
        body: body === undefined ? undefined : JSON.stringify(body) });
    } catch (_) {
      throw new Error('Nessuna connessione: le modifiche si inviano appena torna la rete');
    }
    const data = await res.json().catch(() => null);
    if (res.status === 401 && token && !path.startsWith('/api/asana')) signOut((data && data.message) || 'Accesso scaduto: inserisci un nuovo codice');
    if (!res.ok) throw new ApiError(res.status, data);
    return data;
  }

  const call = (fn) => async (...args) => {
    try {
      return { ok: true, result: await fn(...args) };
    } catch (err) {
      return { ok: false, error: message(err) };
    }
  };

  // ---------- Accesso con il codice per dispositivo ----------
  function signOut(reason) {
    token = '';
    ls.del('token', 'user', 'rev', 'dirty', 'data', 'sharedTools', 'knownNotes', 'unseenNotes', 'asana');
    try { sessionStorage.setItem('s3.loginMessage', reason || ''); } catch (_) {}
    location.reload();
  }

  function showLogin() {
    return new Promise((resolve) => {
      let reason = '';
      try { reason = sessionStorage.getItem('s3.loginMessage') || ''; sessionStorage.removeItem('s3.loginMessage'); } catch (_) {}
      const el = (tag, attrs = {}, ...kids) => {
        const e = document.createElement(tag);
        Object.assign(e, attrs);
        e.append(...kids);
        return e;
      };
      const input = el('input', { type: 'text', placeholder: 'XXXX-XXXX-XXXX', autocomplete: 'off', spellcheck: false, className: 'login-code' });
      const btn = el('button', { type: 'submit', className: 'primary' }, 'Accedi');
      const error = el('div', { className: 'sheet-status error' }, reason);
      const form = el('form', { className: 'login-card' },
        el('div', { className: 'brand' }, 'Solferino', el('b', {}, '3'), el('span', {}, 'Dashboard')),
        el('p', {}, 'Inserisci il codice per collegare questo browser al tuo account.'),
        input, btn, error,
        el('div', { className: 'hint' }, 'Il codice te lo dà un amministratore, oppure lo generi dall\'app desktop: '
          + 'Impostazioni → Account Solferino 3 → "Collega un altro computer". Vale una volta sola.'));
      const overlay = el('div', { className: 'login' }, form);
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!input.value.trim()) return input.focus();
        btn.disabled = true;
        btn.textContent = 'Collegamento…';
        error.textContent = '';
        // Permesso per le notifiche (appunti condivisi, task Asana): va chiesto durante un clic
        if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
        try {
          const res = await fetch('/auth/redeem', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: input.value, device: `Browser (${navigator.platform || 'web'})` }) });
          const data = await res.json().catch(() => null);
          if (!res.ok) throw new Error((data && data.message) || `Server non raggiungibile (${res.status})`);
          token = data.token;
          cloud.user = data.user;
          ls.set('token', token);
          ls.set('user', data.user);
          overlay.remove();
          resolve();
        } catch (err) {
          error.textContent = message(err);
          btn.disabled = false;
          btn.textContent = 'Accedi';
        }
      });
      document.body.append(overlay);
      input.focus();
    });
  }

  // ---------- Dati personali: stessi della app desktop (user_data con revisione) ----------
  function cacheData(data) {
    ls.set('data', data);
  }

  function setRev(rev, dirty) {
    cloud.rev = rev;
    cloud.dirty = dirty;
    ls.set('rev', rev);
    ls.set('dirty', dirty);
  }

  // Dati arrivati da un altro dispositivo; se qui c'erano modifiche non inviate restano in copia nel browser
  function applyRemote(data, rev, conflict) {
    if (conflict) ls.set('copiaPrimaDellaSincronizzazione', { savedAt: Date.now(), data: ls.get('data', null) });
    cacheData(data);
    setRev(rev, false);
    emit('data', { data, conflict });
  }

  async function pushData() {
    const data = ls.get('data', null);
    if (!data || !cloud.dirty) return;
    const seq = saveSeq;
    try {
      const res = await api('PUT', '/api/data', { baseRev: cloud.rev, data });
      setRev(res.rev, seq !== saveSeq);
    } catch (err) {
      // Un altro dispositivo ha salvato prima: vince la versione online
      if (err.status !== 409 || !err.body || !err.body.data) throw err;
      applyRemote(err.body.data, err.body.rev, true);
    }
  }

  function schedulePush() {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(async function push() {
      if (cloud.syncing) return (pushTimer = setTimeout(push, PUSH_DELAY_MS));
      cloud.syncing = true;
      try {
        await pushData();
        cloud.syncedAt = Date.now();
        cloud.error = '';
      } catch (err) {
        cloud.error = message(err);
      } finally {
        cloud.syncing = false;
        sendCloud();
      }
      if (cloud.dirty && !cloud.error) pushTimer = setTimeout(push, PUSH_DELAY_MS);
    }, PUSH_DELAY_MS);
  }

  // Controllo periodico: account, kit di link, appunti condivisi, dati cambiati altrove (o invio di quelli locali)
  async function refresh() {
    if (!token || cloud.syncing) return;
    cloud.syncing = true;
    sendCloud();
    try {
      cloud.user = await api('GET', '/api/me');
      ls.set('user', cloud.user);
      const shared = await api('GET', '/api/shared/tools');
      cloud.sharedTools = Array.isArray(shared.data) ? shared.data : null;
      ls.set('sharedTools', cloud.sharedTools);
      await fetchSharedNotes();
      if (cloud.dirty) await pushData();
      else {
        const remote = await api('GET', `/api/data${cloud.rev ? `?rev=${cloud.rev}` : ''}`);
        if (remote.rev && !remote.unchanged && remote.rev !== cloud.rev) applyRemote(remote.data, remote.rev, false);
      }
      cloud.syncedAt = Date.now();
      cloud.error = '';
    } catch (err) {
      cloud.error = message(err);
    } finally {
      cloud.syncing = false;
      sendCloud();
    }
  }

  async function load() {
    if (!token) await showLogin();
    const cached = ls.get('data', null);
    try {
      if (cached && cloud.dirty) {
        await pushData();
        return ls.get('data', cached);
      }
      const remote = await api('GET', `/api/data${cached && cloud.rev ? `?rev=${cloud.rev}` : ''}`);
      if (remote.unchanged) return cached;
      if (remote.rev) {
        cacheData(remote.data);
        setRev(remote.rev, false);
        return remote.data;
      }
      return cached; // niente online: l'app crea i dati iniziali e li salva
    } catch (err) {
      cloud.error = message(err);
      return cached;
    }
  }

  function startBackground() {
    if (started) return;
    started = true;
    refresh();
    setInterval(refresh, POLL_MS);
    let last = Date.now();
    const onBack = () => {
      if (document.visibilityState === 'visible' && Date.now() - last > 15000) {
        last = Date.now();
        refresh();
        syncAsana();
      }
    };
    document.addEventListener('visibilitychange', onBack);
    window.addEventListener('focus', onBack);
    window.addEventListener('online', () => refresh());
    // Uscendo con modifiche non ancora inviate: si prova a inviarle subito
    window.addEventListener('pagehide', () => { if (cloud.dirty) pushData().catch(() => {}); });
    loadAsana();
    syncAsana();
    setInterval(syncAsana, ASANA_POLL_MS);
  }

  // ---------- Appunti condivisi ----------
  const noteKey = (n) => `${n.owner}/${n.id}`;

  function notify(title, body, onClick) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      const n = new Notification(title, { body, icon: 'icon.png' });
      n.onclick = () => {
        window.focus();
        n.close();
        onClick && onClick();
      };
    } catch (_) {}
  }

  async function fetchSharedNotes() {
    const notes = await api('GET', '/api/shared-notes');
    if (!Array.isArray(notes)) return;
    const me = cloud.user && cloud.user.email;
    const received = notes.filter((n) => n.owner !== me && !n.deleted);
    const firstCheck = !Array.isArray(cloud.knownNotes);
    const known = new Set(cloud.knownNotes || []);
    const fresh = received.filter((n) => !known.has(noteKey(n)));
    const present = new Set(received.map(noteKey));
    if (!firstCheck && fresh.length) {
      const from = (n) => n.ownerName || n.owner.split('@')[0];
      const open = () => emit('openNotes');
      if (fresh.length > NOTES_NOTIFY_MAX) {
        notify(`${fresh.length} appunti condivisi con te`, fresh.slice(0, NOTES_NOTIFY_MAX).map((n) => `${from(n)}: ${n.title}`).join('\n') + '\n…', open);
      } else fresh.forEach((n) => notify(`${from(n)} ha condiviso un appunto`, n.title, open));
    }
    cloud.sharedNotes = notes;
    cloud.knownNotes = [...present];
    cloud.unseenNotes = firstCheck ? [] : [...new Set([...cloud.unseenNotes.filter((k) => present.has(k)), ...fresh.map(noteKey)])];
    ls.set('knownNotes', cloud.knownNotes);
    ls.set('unseenNotes', cloud.unseenNotes);
  }

  function replaceNote(key, note) {
    cloud.sharedNotes = cloud.sharedNotes.filter((x) => noteKey(x) !== key);
    if (note) cloud.sharedNotes.push(note);
    sendCloud();
  }

  async function saveSharedNote(n) {
    const body = { title: String(n.title || ''), date: String(n.date || ''), html: String(n.html || ''), baseRev: Number(n.baseRev) || 0 };
    if (Array.isArray(n.sharedWith)) body.sharedWith = n.sharedWith;
    const key = `${n.owner}/${n.id}`;
    try {
      const res = await api('PUT', `/api/shared-notes/${encodeURIComponent(n.owner)}/${encodeURIComponent(n.id)}`, body);
      replaceNote(key, res.note);
      return { ok: true, note: res.note };
    } catch (err) {
      if (err.status === 409 && err.body && err.body.note) {
        replaceNote(key, err.body.note);
        return { ok: false, conflict: true, note: err.body.note, error: err.message };
      }
      if (err.status === 403) replaceNote(key, null);
      return { ok: false, error: message(err) };
    }
  }

  // ---------- Asana (token personale, solo in questo browser) ----------
  const ASANA_EMPTY = { token: '', user: '', tasks: [], projects: [], projectsAt: 0, known: [], unseen: [], syncedAt: 0, error: '' };
  let asana = { ...ASANA_EMPTY };
  let asanaSyncing = false;
  const asanaUsersCache = new Map();
  const ASANA_GID = /^\d{1,30}$/;
  const ASANA_DATE = /^\d{4}-\d{2}-\d{2}$/;

  const loadAsana = () => { asana = { ...ASANA_EMPTY, ...ls.get('asana', {}) }; };
  const saveAsana = () => ls.set('asana', asana);
  const asanaPublic = () => ({ connected: !!asana.token, user: asana.user, tasks: asana.tasks, projects: asana.projects, unseen: asana.unseen,
    syncedAt: asana.syncedAt, error: asana.error, syncing: asanaSyncing });
  const sendAsana = () => emit('asana', asanaPublic());

  async function asanaRequest(method, pathname, params = {}, data, tok = asana.token) {
    const qs = new URLSearchParams(params).toString();
    let res;
    try {
      res = await fetch(`/api/asana${pathname}${qs ? `?${qs}` : ''}`, { method, cache: 'no-store',
        headers: { Authorization: `Bearer ${token}`, 'x-asana-token': tok, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: data === undefined ? undefined : JSON.stringify({ data }) });
    } catch (_) {
      throw new Error('Nessuna connessione');
    }
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error('Token Asana non valido o revocato: inseriscine uno nuovo');
    if (res.status === 429) throw new Error('Troppe richieste ad Asana: riprovo al prossimo controllo');
    if (!res.ok) throw new Error(body.errors?.[0]?.message ? `Asana: ${body.errors[0].message}` : body.message || `Asana non raggiungibile (${res.status})`);
    return body;
  }
  const asanaGet = (pathname, params, tok) => asanaRequest('GET', pathname, params, undefined, tok);

  async function asanaGetAll(pathname, params) {
    const out = [];
    let offset;
    for (let i = 0; i < ASANA_MAX_PAGES; i++) {
      const res = await asanaGet(pathname, { ...params, limit: '100', ...(offset ? { offset } : {}) });
      out.push(...(res.data || []));
      offset = res.next_page?.offset;
      if (!offset) break;
    }
    return out;
  }

  const projectNames = (list) => (list || []).map((p) => p.name).filter(Boolean);
  function toTask(t, ws) {
    const own = projectNames(t.projects);
    return {
      gid: t.gid, name: t.name || '(senza titolo)', due: t.due_on || (t.due_at || '').slice(0, 10), url: t.permalink_url,
      projects: own.length ? own : projectNames(t.parent?.projects),
      parent: t.parent?.name || '',
      section: (t.memberships || []).map((m) => m.section?.name).find(Boolean) || '',
      workspace: ws.name,
    };
  }

  async function fetchMyAsanaProjects(me) {
    const projects = [];
    for (const ws of me.workspaces || []) {
      const favorites = await asanaGetAll('/users/me/favorites', { resource_type: 'project', workspace: ws.gid, opt_fields: 'gid' });
      const favOrder = new Map(favorites.map((f, i) => [f.gid, i]));
      const all = await asanaGetAll('/projects', { workspace: ws.gid, archived: 'false', opt_fields: ASANA_PROJECT_FIELDS });
      for (const p of all) {
        const member = (p.members || []).some((m) => m.gid === me.gid);
        if (!member && !favOrder.has(p.gid)) continue;
        projects.push({ gid: p.gid, name: p.name || '(senza nome)', url: p.permalink_url, color: p.color || '',
          favorite: favOrder.has(p.gid) ? favOrder.get(p.gid) : -1, workspace: ws.name });
      }
    }
    return projects;
  }

  async function fetchMyAsanaTasks() {
    const me = (await asanaGet('/users/me', { opt_fields: 'name,workspaces.name' })).data;
    const tasks = [];
    for (const ws of me.workspaces || []) {
      const list = await asanaGetAll('/tasks', { assignee: 'me', workspace: ws.gid, completed_since: 'now', opt_fields: ASANA_TASK_FIELDS });
      tasks.push(...list.map((t) => toTask(t, ws)));
    }
    const refreshProjects = Date.now() - asana.projectsAt > ASANA_PROJECTS_EVERY_MS || !asana.projectsAt;
    return { user: me.name, tasks, projects: refreshProjects ? await fetchMyAsanaProjects(me) : null };
  }

  function notifyAsana(fresh) {
    if (!fresh.length) return;
    if (fresh.length > ASANA_NOTIFY_MAX) {
      notify(`${fresh.length} nuovi task Asana`, fresh.slice(0, ASANA_NOTIFY_MAX).map((t) => t.name).join('\n') + '\n…');
      return;
    }
    for (const t of fresh) {
      const where = [t.projects[0], t.parent].filter(Boolean).join(' › ');
      notify('Nuovo task Asana', [t.name, where].filter(Boolean).join('\n'), () => window.open(t.url, '_blank', 'noopener'));
    }
  }

  async function syncAsana() {
    if (!asana.token || asanaSyncing) return asanaPublic();
    asanaSyncing = true;
    sendAsana();
    const tok = asana.token;
    try {
      const { user, tasks, projects } = await fetchMyAsanaTasks();
      if (asana.token === tok) {
        const firstSync = !asana.syncedAt;
        const known = new Set(asana.known);
        const fresh = tasks.filter((t) => !known.has(t.gid));
        const open = new Set(tasks.map((t) => t.gid));
        if (!firstSync) notifyAsana(fresh);
        Object.assign(asana, {
          user, tasks, syncedAt: Date.now(), error: '',
          ...(projects ? { projects, projectsAt: Date.now() } : {}),
          known: [...new Set([...asana.known, ...open])].slice(-ASANA_KNOWN_MAX),
          unseen: firstSync ? [] : [...asana.unseen.filter((g) => open.has(g)), ...fresh.map((t) => t.gid)],
        });
      }
    } catch (err) {
      if (asana.token === tok) asana.error = message(err);
    }
    asanaSyncing = false;
    saveAsana();
    sendAsana();
    return asanaPublic();
  }

  // ---------- File, appunti, link ----------
  function download(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function pickJson() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json,.json';
      input.addEventListener('cancel', () => resolve(null));
      input.addEventListener('change', async () => {
        const f = input.files && input.files[0];
        if (!f) return resolve(null);
        try {
          resolve(JSON.parse(await f.text()));
        } catch (_) {
          resolve({ __error: 'File non valido' });
        }
      });
      input.click();
    });
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(String(text));
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = String(text);
      document.body.append(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
  }

  function openExternal(url) {
    url = String(url || '');
    if (/^(https?:|mailto:|tel:)/i.test(url)) window.open(url, '_blank', 'noopener');
    else toastMsg('Le app installate si aprono solo dall\'app desktop');
  }

  // Tema: sul desktop lo imposta Electron (prefers-color-scheme); qui la classe "dark" (vedi build-web.mjs)
  const darkQuery = matchMedia('(prefers-color-scheme: dark)');
  let theme = 'system';
  function applyTheme() {
    const dark = theme === 'dark' || (theme !== 'light' && darkQuery.matches);
    document.documentElement.classList.toggle('dark', dark);
  }
  darkQuery.addEventListener('change', applyTheme);

  function setIcon(dataUrl) {
    let link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.append(link);
    }
    link.href = dataUrl || 'icon.png';
  }

  const none = async () => null;

  window.api = {
    platform: 'web',
    load: async () => {
      const data = await load();
      startBackground();
      return data;
    },
    save: async (data) => {
      saveSeq++;
      cacheData(data);
      if (!cloud.dirty) setRev(cloud.rev, true);
      schedulePush();
      return true;
    },
    openExternal: async (url) => openExternal(url),
    chromeProfiles: async () => [],
    copy: (text) => copyText(text),
    exportData: async (data) => {
      download(`solferino3-dashboard-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2));
      return true;
    },
    importData: () => pickJson(),
    captureSite: none,
    fetchSheet: async (url, key) => {
      try {
        return await api('POST', '/api/sheet', { url, key });
      } catch (err) {
        return { error: message(err) };
      }
    },
    listApps: async () => [],
    appIcon: none,
    checkUpdate: none, // la versione web si aggiorna da sola ricaricando la pagina
    onUpdate: () => {},
    installUpdate: async () => ({ ok: false, error: 'Ricarica la pagina' }),
    setAppearance: async (a = {}) => {
      theme = a.theme || 'system';
      applyTheme();
      let meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'theme-color';
        document.head.append(meta);
      }
      if (a.bg) meta.content = a.bg;
    },
    setIcon: async (dataUrl) => setIcon(dataUrl),

    asanaGet: async () => {
      loadAsana();
      return asanaPublic();
    },
    asanaSync: () => {
      asana.projectsAt = 0;
      return syncAsana();
    },
    asanaSeen: async () => {
      asana.unseen = [];
      saveAsana();
      sendAsana();
    },
    asanaConnect: async (tok) => {
      tok = String(tok || '').trim();
      if (tok) {
        try {
          await asanaGet('/users/me', { opt_fields: 'name' }, tok);
        } catch (err) {
          return { ok: false, error: message(err) };
        }
      }
      asana = { ...ASANA_EMPTY, token: tok };
      asanaUsersCache.clear();
      saveAsana();
      if (tok) await syncAsana();
      else sendAsana();
      return { ok: true };
    },
    asanaUsers: async (projectGid) => {
      if (!asana.token || !ASANA_GID.test(String(projectGid))) return { ok: false, error: 'Progetto non valido' };
      try {
        const ws = (await asanaGet(`/projects/${projectGid}`, { opt_fields: 'workspace.gid' })).data.workspace.gid;
        if (!asanaUsersCache.has(ws)) {
          const users = await asanaGetAll('/users', { workspace: ws, opt_fields: 'name,email' });
          asanaUsersCache.set(ws, users.map((u) => ({ gid: u.gid, name: u.name || u.email || '(senza nome)', email: u.email || '' }))
            .sort((a, b) => a.name.localeCompare(b.name, 'it')));
        }
        const me = (await asanaGet('/users/me', { opt_fields: 'gid' })).data.gid;
        return { ok: true, me, users: asanaUsersCache.get(ws) };
      } catch (err) {
        return { ok: false, error: message(err) };
      }
    },
    asanaCreateTask: async (t = {}) => {
      const name = String(t.name || '').trim();
      if (!asana.token) return { ok: false, error: 'Asana non è collegato' };
      if (!name) return { ok: false, error: 'Manca il nome del task' };
      if (!ASANA_GID.test(String(t.project))) return { ok: false, error: 'Scegli un progetto' };
      if (t.assignee && !ASANA_GID.test(String(t.assignee))) return { ok: false, error: 'Persona non valida' };
      if (t.due && !ASANA_DATE.test(String(t.due))) return { ok: false, error: 'Data di scadenza non valida' };
      try {
        const task = (await asanaRequest('POST', '/tasks', { opt_fields: 'permalink_url' }, {
          name: name.slice(0, 1024), notes: String(t.notes || '').slice(0, 60000), projects: [String(t.project)],
          ...(t.assignee ? { assignee: String(t.assignee) } : {}), ...(t.due ? { due_on: t.due } : {}),
        })).data;
        asana.known = [...asana.known, task.gid].slice(-ASANA_KNOWN_MAX);
        saveAsana();
        syncAsana();
        return { ok: true, gid: task.gid, url: task.permalink_url };
      } catch (err) {
        return { ok: false, error: message(err) };
      }
    },
    onAsana: (cb) => listeners.asana.push(cb),

    cloudGet: async () => cloudPublic(),
    cloudSync: () => refresh(),
    cloudRedeem: async () => ({ ok: false, error: 'Già collegato' }),
    cloudMyCode: call(() => api('POST', '/api/me/code')),
    cloudLogout: async () => {
      await api('POST', '/auth/logout').catch(() => {});
      signOut('Browser scollegato');
      return true;
    },
    cloudUsers: call(() => api('GET', '/api/users')),
    cloudInvite: call((email, name, role) => api('POST', '/api/users', { email: String(email), name: String(name || ''), role })),
    cloudUserCode: call((email) => api('POST', `/api/users/${encodeURIComponent(email)}/code`)),
    cloudSetRole: call((email, role) => api('PATCH', `/api/users/${encodeURIComponent(email)}`, { role })),
    cloudRemoveUser: call((email) => api('DELETE', `/api/users/${encodeURIComponent(email)}`)),
    cloudTeam: call(() => api('GET', '/api/team')),
    cloudSaveNote: (n) => saveSharedNote(n),
    cloudDeleteNote: call(async (owner, id) => {
      await api('DELETE', `/api/shared-notes/${encodeURIComponent(owner)}/${encodeURIComponent(id)}`);
      replaceNote(`${owner}/${id}`, null);
    }),
    cloudNotesSeen: async () => {
      if (!cloud.unseenNotes.length) return;
      cloud.unseenNotes = [];
      ls.set('unseenNotes', []);
      sendCloud();
    },
    onOpenNotes: (cb) => listeners.openNotes.push(cb),
    cloudPublishTools: call(async (tools) => {
      await api('PUT', '/api/shared/tools', { data: tools });
      cloud.sharedTools = tools;
      ls.set('sharedTools', tools);
      sendCloud();
    }),
    onCloud: (cb) => listeners.cloud.push(cb),
    onDataRemote: (cb) => listeners.data.push(cb),
  };
})();
