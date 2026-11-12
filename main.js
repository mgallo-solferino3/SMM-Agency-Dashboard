const { app, BrowserWindow, ipcMain, shell, dialog, clipboard, screen, nativeImage, nativeTheme, net, Notification, powerMonitor } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL, fileURLToPath } = require('url');
const { execFile, spawn } = require('child_process');
const os = require('os');
const crypto = require('crypto');

const IS_MAC = process.platform === 'darwin';
const IS_WIN = process.platform === 'win32';

// Hostname -> app desktop da aprire al posto del sito (se installata)
const APP_BY_HOST = [
  { match: (h) => h === 'dash.cloudflare.com', name: 'Cloudflare' },
  // I link a una pagina precisa (un task, la console sviluppatori) vanno al browser: è Asana stessa
  // a passarli all'app desktop se l'utente lo preferisce. Aprendo l'app l'indirizzo andrebbe perso.
  { match: (h) => h === 'app.asana.com', name: 'Asana', onlyHome: true },
  { match: (h) => h === 'capcut.com' || h.endsWith('.capcut.com'), name: 'CapCut' },
];

// Hostname -> nome del profilo Chrome in cui aprirlo
const CHROME_PROFILE_BY_HOST = {};
const CHROME_LOCAL_STATE = IS_WIN
  ? path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'User Data', 'Local State')
  : path.join(app.getPath('home'), 'Library', 'Application Support', 'Google', 'Chrome', 'Local State');
const CHROME_EXE_WIN = () => [
  process.env.ProgramFiles, process.env['ProgramFiles(x86)'], process.env.LOCALAPPDATA,
].filter(Boolean).map((d) => path.join(d, 'Google', 'Chrome', 'Application', 'chrome.exe')).find((f) => fs.existsSync(f));

// Profili di Chrome: { cartella: { name, user_name (email dell'account), … } }
function readChromeProfiles() {
  try {
    return JSON.parse(fs.readFileSync(CHROME_LOCAL_STATE, 'utf8')).profile?.info_cache || {};
  } catch (_) {
    return {};
  }
}

function findChromeProfileDir(profileName) {
  for (const [dir, info] of Object.entries(readChromeProfiles())) {
    if (info.name === profileName) return dir;
  }
  return null;
}

function openInChromeProfile(profileDir, url) {
  if (IS_MAC) {
    // -n forza un nuovo processo: senza, se Chrome e' gia' aperto, "open" si limita ad
    // attivarlo ignorando --profile-directory e l'URL finisce nel profilo gia' in uso.
    execFile('open', ['-na', 'Google Chrome', '--args', `--profile-directory=${profileDir}`, url]);
    return true;
  }
  const chromeExe = IS_WIN && CHROME_EXE_WIN();
  if (chromeExe) {
    execFile(chromeExe, [`--profile-directory=${profileDir}`, url]);
    return true;
  }
  return false;
}

const DATA_FILE = () => path.join(app.getPath('userData'), 'dashboard-data.json');
let win;

// Una sola copia aperta: due istanze scriverebbero sullo stesso file dei dati.
// La seconda passa la sua versione alla prima e si chiude.
const isPrimaryInstance = app.requestSingleInstanceLock({ version: app.getVersion(), execPath: process.execPath });
if (!isPrimaryInstance) app.exit(0);

// ---- Cambio nome da "Agency Dashboard SMM" (fino alla 1.3.x) ----
const OLD_APP_NAME = 'Agency Dashboard SMM';
const MIGRATED_FILES = ['dashboard-data.json', 'widget-position.json', 'thumbnails'];

// La cartella dei dati prende il nome dell'app: al primo avvio si copiano i dati da quella vecchia
// (che resta come copia di sicurezza) e si aggiornano i percorsi delle anteprime salvati nei dati.
function migrateOldUserData() {
  const oldDir = path.join(app.getPath('appData'), OLD_APP_NAME);
  const newDir = app.getPath('userData');
  if (oldDir === newDir || fs.existsSync(DATA_FILE()) || !fs.existsSync(path.join(oldDir, 'dashboard-data.json'))) return;
  try {
    fs.mkdirSync(newDir, { recursive: true });
    for (const name of MIGRATED_FILES) {
      const from = path.join(oldDir, name);
      if (fs.existsSync(from)) fs.cpSync(from, path.join(newDir, name), { recursive: true });
    }
    const oldUrl = pathToFileURL(oldDir).toString();
    const newUrl = pathToFileURL(newDir).toString();
    const data = fs.readFileSync(DATA_FILE(), 'utf8');
    fs.writeFileSync(DATA_FILE(), data.split(oldUrl).join(newUrl), 'utf8');
  } catch (_) { /* in caso di errore l'app parte vuota e i dati restano nella cartella vecchia */ }
}

// Mac: aggiornando da una versione col vecchio nome, la nuova app finisce in "Agency Dashboard SMM.app".
// La si rinomina dopo la chiusura (rinominare un'app aperta la bloccherebbe) e la si riapre: un riavvio veloce.
function renameOldMacBundle() {
  if (!IS_MAC || !app.isPackaged) return false;
  const bundle = path.resolve(process.execPath, '..', '..', '..');
  const wanted = path.join(path.dirname(bundle), `${app.getName()}.app`);
  if (path.basename(bundle) !== `${OLD_APP_NAME}.app` || fs.existsSync(wanted)) return false;
  try {
    fs.accessSync(path.dirname(bundle), fs.constants.W_OK);
  } catch (_) {
    return false;
  }
  spawn('/bin/bash', ['-c', 'while kill -0 "$1" 2>/dev/null; do sleep 0.2; done; if mv "$2" "$3"; then open "$3"; else open "$2"; fi',
    'rinomina', String(process.pid), bundle, wanted], { detached: true, stdio: 'ignore' }).unref();
  app.exit(0);
  return true;
}

const ICON_PATH = path.join(__dirname, 'build', 'icon.png');

// Impostazioni salvate (tema, icona) lette all'avvio, prima che l'interfaccia sia pronta
function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE(), 'utf8')).settings || {};
  } catch (_) {
    return {};
  }
}

const THEME_SOURCES = ['system', 'light', 'dark'];
// Colori della barra del titolo inviati dall'interfaccia in base a tema e palette scelti
let chromeColors = null;

// Barra del titolo: su Mac i "semafori" dentro la finestra, su Windows i pulsanti
// standard sovrapposti in alto a destra, con i colori del tema (chiaro/scuro)
const titleBarOverlay = () => {
  if (chromeColors) return { color: chromeColors.bg, symbolColor: chromeColors.fg, height: 40 };
  return nativeTheme.shouldUseDarkColors
    ? { color: '#02182b', symbolColor: '#f2eeec', height: 40 }
    : { color: '#f2eeec', symbolColor: '#02182b', height: 40 };
};

// Icona scelta nelle impostazioni (data URL) o null per quella originale
let customIcon = null;

function applyIcon(dataUrl) {
  customIcon = typeof dataUrl === 'string' && dataUrl.startsWith('data:image/') ? dataUrl : null;
  const img = customIcon ? nativeImage.createFromDataURL(customIcon) : nativeImage.createFromPath(ICON_PATH);
  if (img.isEmpty()) return;
  if (IS_MAC && app.dock) app.dock.setIcon(img);
  if (!IS_MAC && win && !win.isDestroyed()) win.setIcon(img);
  if (widgetWin && !widgetWin.isDestroyed()) widgetWin.webContents.send('widget:icon', customIcon);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    ...(IS_MAC
      ? { titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 18, y: 18 } }
      : { titleBarStyle: 'hidden', titleBarOverlay: titleBarOverlay(), autoHideMenuBar: true }),
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#02182b' : '#f2eeec',
    icon: customIcon ? nativeImage.createFromDataURL(customIcon) : ICON_PATH,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Widget flottante: compare quando la finestra viene ridotta a icona
  win.on('minimize', showWidget);
  win.on('restore', hideWidget);
  win.on('show', hideWidget);
  win.on('focus', () => {
    hideWidget();
    checkForUpdateIfStale();
    syncAsanaIfStale();
    syncCloudIfStale();
  });
  win.on('closed', () => {
    // Distrugge il widget: altrimenti conterebbe come finestra aperta e 'activate' non ricreerebbe la principale
    if (widgetWin && !widgetWin.isDestroyed()) widgetWin.destroy();
    win = null;
  });

  // Nessuna navigazione interna: i link esterni si aprono nel browser predefinito
  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternalSafe(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) {
      e.preventDefault();
      openExternalSafe(url);
    }
  });
}

// ---- Widget "riapri app" ----
const WIDGET_SIZE = 76;
const WIDGET_POS_FILE = () => path.join(app.getPath('userData'), 'widget-position.json');
let widgetWin;
let widgetDragOrigin = null;

function loadWidgetPosition() {
  try {
    const pos = JSON.parse(fs.readFileSync(WIDGET_POS_FILE(), 'utf8'));
    // Scarta posizioni fuori da tutti gli schermi (es. monitor esterno scollegato)
    const visible = screen.getAllDisplays().some(({ workArea: a }) =>
      pos.x >= a.x && pos.y >= a.y && pos.x + WIDGET_SIZE <= a.x + a.width && pos.y + WIDGET_SIZE <= a.y + a.height);
    if (visible) return pos;
  } catch (_) {}
  const { workArea: a } = screen.getPrimaryDisplay();
  return { x: a.x + a.width - WIDGET_SIZE - 24, y: a.y + a.height - WIDGET_SIZE - 24 };
}

function saveWidgetPosition() {
  if (!widgetWin || widgetWin.isDestroyed()) return;
  const [x, y] = widgetWin.getPosition();
  try {
    fs.writeFileSync(WIDGET_POS_FILE(), JSON.stringify({ x, y }), 'utf8');
  } catch (_) {}
}

function showWidget() {
  if (widgetWin && !widgetWin.isDestroyed()) {
    widgetWin.showInactive();
    return;
  }
  const { x, y } = loadWidgetPosition();
  widgetWin = new BrowserWindow({
    x,
    y,
    width: WIDGET_SIZE,
    height: WIDGET_SIZE,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'widget-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  widgetWin.setAlwaysOnTop(true, 'floating');
  if (IS_MAC) widgetWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  widgetWin.loadFile(path.join(__dirname, 'renderer', 'widget.html'));
  widgetWin.once('ready-to-show', () => widgetWin && widgetWin.showInactive());
  widgetWin.on('closed', () => { widgetWin = null; });
}

function hideWidget() {
  if (widgetWin && !widgetWin.isDestroyed()) widgetWin.hide();
}

function restoreMainWindow() {
  if (!win || win.isDestroyed()) {
    createWindow();
    return;
  }
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
  app.focus({ steal: true });
}

ipcMain.handle('widget:icon', () => customIcon);

ipcMain.on('widget:restore', () => {
  hideWidget();
  restoreMainWindow();
});

ipcMain.on('widget:drag-start', () => {
  if (widgetWin) widgetDragOrigin = widgetWin.getPosition();
});

ipcMain.on('widget:drag-move', (_e, { dx, dy }) => {
  if (!widgetWin || !widgetDragOrigin) return;
  widgetWin.setPosition(Math.round(widgetDragOrigin[0] + dx), Math.round(widgetDragOrigin[1] + dy));
});

ipcMain.on('widget:drag-end', () => {
  widgetDragOrigin = null;
  saveWidgetPosition();
});

// Scorciatoie ad app: su Mac un bundle .app, su Windows un collegamento .lnk o un .exe
function isAppPath(p) {
  if (!fs.existsSync(p)) return false;
  if (IS_MAC) return p.endsWith('.app') && fs.statSync(p).isDirectory();
  if (IS_WIN) return /\.(lnk|exe)$/i.test(p) && fs.statSync(p).isFile();
  return false;
}

function openApp(appPath) {
  if (IS_MAC) execFile('open', [appPath]);
  else shell.openPath(appPath);
}

// Percorso di un'app installata cercata per nome (es. "Asana"), o null
function findAppByName(name) {
  if (IS_MAC) {
    const p = `/Applications/${name}.app`;
    return fs.existsSync(p) ? p : null;
  }
  const hit = listInstalledApps().find((a) => a.name.toLowerCase() === name.toLowerCase());
  return hit ? hit.path : null;
}

// chromeProfile: cartella del profilo Chrome scelto per lo strumento (vince sulle app desktop)
function openExternalSafe(url, chromeProfile = '') {
  try {
    const u = new URL(url);
    const isWeb = u.protocol === 'http:' || u.protocol === 'https:';
    if (chromeProfile && isWeb && readChromeProfiles()[chromeProfile] && openInChromeProfile(chromeProfile, u.toString())) return true;
    // Scorciatoia a un'app (file:///Applications/Nome.app o file:///C:/…/Nome.lnk)
    if (u.protocol === 'file:') {
      const appPath = fileURLToPath(u);
      if (isAppPath(appPath)) {
        openApp(appPath);
        return true;
      }
      return false;
    }
    const isHome = (u.pathname === '/' || u.pathname === '') && !u.search;
    const desktopApp = APP_BY_HOST.find((a) => a.match(u.hostname) && (!a.onlyHome || isHome));
    const desktopAppPath = desktopApp && findAppByName(desktopApp.name);
    if (desktopAppPath) {
      openApp(desktopAppPath);
      return true;
    }
    const profileDir = CHROME_PROFILE_BY_HOST[u.hostname] && findChromeProfileDir(CHROME_PROFILE_BY_HOST[u.hostname]);
    if (profileDir && openInChromeProfile(profileDir, u.toString())) return true;
    if (u.protocol === 'http:' || u.protocol === 'https:' || u.protocol === 'mailto:') {
      shell.openExternal(u.toString());
      return true;
    }
  } catch (_) {}
  return false;
}

// ---- IPC ----
ipcMain.handle('data:load', () => {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE(), 'utf8'));
  } catch (_) {
    return null;
  }
});

function writeData(data) {
  const file = DATA_FILE();
  const tmp = file + '.tmp';
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file); // scrittura atomica
}

ipcMain.handle('data:save', (_e, data) => {
  writeData(data);
  markCloudDirty();
  return true;
});

ipcMain.handle('open:external', (_e, url, chromeProfile) => openExternalSafe(String(url), String(chromeProfile || '')));

// Profili di Chrome per la scelta nel modulo degli strumenti, con l'email dell'account se c'è
ipcMain.handle('chrome:profiles', () => Object.entries(readChromeProfiles())
  .map(([dir, info]) => ({ dir, name: String(info.name || dir), email: String(info.user_name || '') }))
  .sort((a, b) => a.name.localeCompare(b.name, 'it')));

// ---- Aspetto: tema chiaro/scuro, colori della barra del titolo, icona ----
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

ipcMain.handle('appearance:set', (_e, { theme, bg, fg } = {}) => {
  if (THEME_SOURCES.includes(theme)) nativeTheme.themeSource = theme;
  if (HEX_COLOR.test(bg) && HEX_COLOR.test(fg)) chromeColors = { bg, fg };
  if (win && !win.isDestroyed()) {
    if (chromeColors) win.setBackgroundColor(chromeColors.bg);
    if (IS_WIN) win.setTitleBarOverlay(titleBarOverlay());
  }
  return true;
});

ipcMain.handle('icon:set', (_e, dataUrl) => {
  applyIcon(dataUrl);
  return true;
});

// ---- App installate (tendina "App installate" negli strumenti) ----
// Mac: i bundle .app nelle cartelle Applicazioni. Windows: i collegamenti del menu Start.
const APP_DIRS = () => (IS_WIN
  ? [
    path.join(process.env.ProgramData || 'C:\\ProgramData', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
    path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
  ]
  : [
    '/Applications',
    '/Applications/Utilities',
    '/System/Applications',
    '/System/Applications/Utilities',
    path.join(app.getPath('home'), 'Applications'),
  ]);

// Collegamenti del menu Start che non sono app da lanciare
const WIN_SKIP = /uninstall|disinstall|readme|leggimi|\bhelp\b|\bguida\b|manual|website|sito web/i;

function listInstalledApps() {
  const found = new Map(); // su Windows chiave = nome, per non duplicare i collegamenti utente/sistema
  const scan = (dir, depth) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
    for (const e of entries) {
      if (e.name.startsWith('.')) continue;
      const full = path.join(dir, e.name);
      if (IS_WIN && e.isFile() && /\.lnk$/i.test(e.name)) {
        const name = e.name.slice(0, -4);
        if (!WIN_SKIP.test(name) && !found.has(name.toLowerCase())) found.set(name.toLowerCase(), { name, path: full });
      } else if (!e.isDirectory()) {
        continue;
      } else if (!IS_WIN && e.name.endsWith('.app')) {
        if (!found.has(full)) found.set(full, { name: e.name.slice(0, -4), path: full });
      } else if (depth > 0) {
        scan(full, depth - 1); // es. /Applications/Adobe Photoshop 2025/…app
      }
    }
  };
  for (const dir of APP_DIRS()) scan(dir, IS_WIN ? 2 : 1);
  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name, 'it'));
}

ipcMain.handle('apps:list', () => listInstalledApps());

ipcMain.handle('apps:icon', async (_e, appPath) => {
  appPath = String(appPath);
  if (!isAppPath(appPath)) return null;
  if (IS_WIN) {
    // L'icona di un .lnk ha la freccetta del collegamento: meglio quella dell'eseguibile
    let target = appPath;
    try {
      if (/\.lnk$/i.test(appPath)) target = shell.readShortcutLink(appPath).target || appPath;
    } catch (_) {}
    try {
      return (await app.getFileIcon(target, { size: 'large' })).toDataURL();
    } catch (_) {
      return null;
    }
  }
  try {
    const img = await nativeImage.createThumbnailFromPath(appPath, { width: 64, height: 64 });
    if (!img.isEmpty()) return img.toDataURL();
  } catch (_) {}
  try {
    return (await app.getFileIcon(appPath, { size: 'normal' })).toDataURL();
  } catch (_) {
    return null;
  }
});

ipcMain.handle('clipboard:write', (_e, text) => {
  clipboard.writeText(String(text));
  return true;
});

ipcMain.handle('data:export', async (_e, data) => {
  const stamp = new Date().toISOString().slice(0, 10);
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    defaultPath: `solferino3-dashboard-backup-${stamp}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (canceled || !filePath) return false;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  return true;
});

// ---- Allegati dei progetti: file copiati nella cartella dati dell'app (non finiscono nei backup .json) ----
const ATTACHMENTS_DIR = () => path.join(app.getPath('userData'), 'allegati');

// Nome del file salvato (id-nome originale): solo dentro la cartella degli allegati
function attachmentPath(file) {
  const p = path.join(ATTACHMENTS_DIR(), path.basename(String(file)));
  if (!file || p !== path.join(ATTACHMENTS_DIR(), String(file))) throw new Error('Allegato non valido');
  return p;
}

function copyAttachments(paths) {
  const dir = ATTACHMENTS_DIR();
  fs.mkdirSync(dir, { recursive: true });
  return paths.filter((src) => fs.statSync(src, { throwIfNoEntry: false })?.isFile()).map((src) => {
    const id = crypto.randomUUID().slice(0, 8);
    const name = path.basename(src);
    const file = `${id}-${name.replace(/[\\/:*?"<>|]/g, '_')}`;
    fs.copyFileSync(src, path.join(dir, file));
    return { id, name, file, size: fs.statSync(path.join(dir, file)).size, addedAt: Date.now() };
  });
}

ipcMain.handle('attachments:pick', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, { properties: ['openFile', 'multiSelections'] });
  return canceled ? [] : copyAttachments(filePaths);
});
ipcMain.handle('attachments:add', (_e, paths) => copyAttachments((Array.isArray(paths) ? paths : []).map(String).filter(Boolean)));
ipcMain.handle('attachments:open', async (_e, file) => {
  const p = attachmentPath(file);
  if (!fs.existsSync(p)) return 'File non presente su questo computer';
  return shell.openPath(p); // '' se aperto, altrimenti il messaggio d'errore
});
ipcMain.handle('attachments:reveal', (_e, file) => shell.showItemInFolder(attachmentPath(file)));
ipcMain.handle('attachments:delete', (_e, file) => fs.rmSync(attachmentPath(file), { force: true }));

// ---- Screenshot "siti belli" ----
const THUMBS_DIR = () => path.join(app.getPath('userData'), 'thumbnails');

// Apre la pagina in una finestra nascosta (un vero Chromium: passa anche i controlli anti-bot) e ci esegue fn
async function withHiddenPage(url, fn) {
  const target = new URL(url);
  if (target.protocol !== 'http:' && target.protocol !== 'https:') throw new Error('URL non valido');
  const capWin = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
  });
  try {
    const loaded = new Promise((resolve, reject) => {
      capWin.webContents.once('did-finish-load', resolve);
      capWin.webContents.once('did-fail-load', (_ev, code, desc) => reject(new Error(desc || `load-failed-${code}`)));
    });
    const timeout = new Promise((_resolve, reject) => setTimeout(() => reject(new Error('timeout')), 20000));
    capWin.loadURL(target.toString());
    await Promise.race([loaded, timeout]);
    await new Promise((r) => setTimeout(r, 1200)); // lascia assestare font/animazioni
    return await fn(capWin);
  } finally {
    if (!capWin.isDestroyed()) capWin.destroy();
  }
}

const thumbFileUrl = (file) => pathToFileURL(file).toString() + `?t=${Date.now()}`;

function writeThumb(name, buffer) {
  const dir = THUMBS_DIR();
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  fs.writeFileSync(file, buffer);
  return thumbFileUrl(file);
}

ipcMain.handle('sites:capture', async (_e, { id, url }) => {
  try {
    return await withHiddenPage(url, async (w) => ({ url: writeThumb(`${id}.png`, (await w.webContents.capturePage()).toPNG()) }));
  } catch (err) {
    return { error: String((err && err.message) || err) };
  }
});

// ---- Foglio Google come CSV: serve la condivisione "Chiunque abbia il link può visualizzare" ----
function sheetCsvUrl(input) {
  const u = new URL(String(input).trim());
  if (u.hostname !== 'docs.google.com') throw new Error('Il link deve essere di un foglio Google o dello script Google (script.google.com/…/exec)');
  // Foglio "pubblicato sul web": …/d/e/<id>/pubhtml → …/pub?output=csv
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

// Script Google Apps pubblicato come app web (scripts/pixieset-sheet.gs): il foglio resta privato
// Anche nella forma degli account Google Workspace: /a/macros/<dominio>/s/<id>/exec
const isAppsScriptUrl = (u) => u.hostname === 'script.google.com'
  && /^\/(a\/macros\/[\w.-]+|macros)\/s\/[\w-]+\/exec$/.test(u.pathname);

async function fetchAppsScript(u, key) {
  u.searchParams.set('key', String(key || ''));
  const res = await net.fetch(u.toString(), { cache: 'no-store' });
  const type = res.headers.get('content-type') || '';
  if (!res.ok || !type.includes('application/json')) {
    return { error: 'Script non raggiungibile: in "Chi ha accesso" deve essere impostato "Chiunque"' };
  }
  const data = await res.json();
  if (data.error) return { error: `Script Google: ${data.error}` };
  // Lo script attuale restituisce tutte le schede; la prima versione solo { sheet, rows }
  if (Array.isArray(data.sheets)) {
    return { sheets: data.sheets.filter((s) => Array.isArray(s.rows)).map((s) => ({ name: String(s.name || 'Foglio'), rows: s.rows })) };
  }
  return Array.isArray(data.rows) ? { sheets: [{ name: String(data.sheet || 'Foglio'), rows: data.rows }] } : { error: 'Risposta dello script non valida' };
}

ipcMain.handle('sheet:fetch', async (_e, { url, key } = {}) => {
  try {
    const u = new URL(String(url).trim());
    if (isAppsScriptUrl(u)) return await fetchAppsScript(u, key);
    const res = await net.fetch(sheetCsvUrl(url), { cache: 'no-store' });
    const type = res.headers.get('content-type') || '';
    if (!res.ok || !type.includes('text/csv')) {
      return { error: 'Il foglio è privato: collegalo tramite lo script Google (indirizzo …/exec e chiave), vedi README' };
    }
    return { csv: await res.text() };
  } catch (err) {
    return { error: String((err && err.message) || err) };
  }
});

ipcMain.handle('data:import', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (canceled || !filePaths[0]) return null;
  try {
    return JSON.parse(fs.readFileSync(filePaths[0], 'utf8'));
  } catch (_) {
    return { __error: 'File non valido' };
  }
});

// ---- Aggiornamenti: confronta la versione installata con l'ultima GitHub Release ----
// Si legge latest.json, pubblicato da scripts/release.sh insieme agli installer, dall'indirizzo di download
// delle release: a differenza dell'API GitHub non ha il limite di 60 richieste/ora per IP (condiviso in ufficio).
const RELEASES_URL = 'https://github.com/mgallo-solferino3/SMM-Agency-Dashboard/releases';
const LATEST_MANIFEST_URL = `${RELEASES_URL}/latest/download/latest.json`;

function isNewerVersion(candidate, current) {
  const a = candidate.split('.').map(Number);
  const b = current.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
  }
  return false;
}

// Controllo frequente per avvisare appena esce una release
const UPDATE_POLL_MS = 5 * 60 * 1000;
const UPDATE_FOCUS_MIN_GAP_MS = 60 * 1000;
let latestUpdate = null;
let lastUpdateCheck = 0;
let notifiedVersion = null;
let updateNotification = null; // tenuta in vita: se viene raccolta dal garbage collector il clic non arriva più

// { version, mac, win }: nomi degli installer dell'ultima release
async function fetchLatestManifest() {
  const res = await net.fetch(LATEST_MANIFEST_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`latest.json non disponibile (${res.status})`);
  return res.json();
}

const ASSET_NAME = /^[\w.-]+\.(dmg|exe)$/;

function updateFromManifest(m) {
  const version = String(m?.version || '');
  if (!/^\d+\.\d+\.\d+$/.test(version) || !isNewerVersion(version, app.getVersion())) return null;
  const asset = IS_WIN ? m.win : m.mac;
  if (typeof asset !== 'string' || !ASSET_NAME.test(asset)) return null;
  const tag = `${RELEASES_URL}/download/v${version}`;
  return { version, downloadUrl: `${tag}/${asset}`, notesUrl: `${RELEASES_URL}/tag/v${version}` };
}

function notifyUpdate(update, ready) {
  const key = `${update.version}:${ready}`;
  if (notifiedVersion === key || !Notification.isSupported()) return;
  notifiedVersion = key;
  const n = new Notification({
    title: ready ? 'Riavvia app per concludere aggiornamento' : `${app.getName()} ${update.version} disponibile`,
    body: ready
      ? `${app.getName()} ${update.version} è pronta. ${IS_MAC ? 'Si installa anche quando esci dall\'app (⌘Q).' : 'Si installa anche quando chiudi l\'app.'}`
      : 'Clicca per aprire l\'app e scaricare la nuova versione.',
    icon: customIcon ? nativeImage.createFromDataURL(customIcon) : ICON_PATH,
    // Su Mac la notifica ha anche il pulsante per riavviare subito (su Windows Electron non supporta i pulsanti)
    actions: ready && IS_MAC ? [{ type: 'button', text: 'Riavvia' }] : [],
  });
  n.on('click', () => {
    hideWidget();
    restoreMainWindow();
  });
  n.on('action', () => {
    if (launchPreparedUpdate(true)) quitForUpdate();
  });
  n.show();
  updateNotification = n;
}

// Lo stato mostrato nel banner: download in corso, pronta (si installa alla chiusura) o errore
function updateStatus() {
  if (!latestUpdate) return null;
  const p = preparedUpdate && preparedUpdate.version === latestUpdate.version ? preparedUpdate : null;
  const state = !canAutoUpdate() ? 'manual' : p ? (p.ready ? 'ready' : 'downloading') : updateError ? 'error' : 'downloading';
  return { ...latestUpdate, state, progress: p ? p.progress : -1, error: updateError };
}

function sendUpdate() {
  if (win && !win.isDestroyed()) win.webContents.send('update:available', updateStatus());
}

async function checkForUpdate() {
  lastUpdateCheck = Date.now();
  try {
    latestUpdate = updateFromManifest(await fetchLatestManifest());
  } catch (_) {
    return updateStatus(); // offline o GitHub non raggiungibile: si riprova al prossimo controllo
  }
  if (latestUpdate && canAutoUpdate()) downloadUpdate(latestUpdate).catch(() => {});
  else if (latestUpdate) notifyUpdate(latestUpdate, false);
  sendUpdate();
  installIfIdle();
  return updateStatus();
}

function checkForUpdateIfStale() {
  if (Date.now() - lastUpdateCheck > UPDATE_FOCUS_MIN_GAP_MS) checkForUpdate();
}

ipcMain.handle('update:check', () => checkForUpdate());

// ---- Aggiornamento automatico: si scarica in background e si installa alla chiusura dell'app ----
// Su Mac la sostituzione la fa uno script che parte solo dopo la chiusura dell'app:
// sostituire i file di un'app in esecuzione la blocca ("non risponde").
// La nuova app si copia accanto alla vecchia e poi si scambiano con due rinomine: se il Mac
// si spegne durante la copia, l'app installata resta integra.
const MAC_INSTALL_SCRIPT = `#!/bin/bash
# Argomenti: pid dell'app, nuova app, app da sostituire, cartella temporanea, 1 per riaprire l'app
PID="$1"; SRC="$2"; DEST="$3"; TMP="$4"; REOPEN="$5"
for i in $(seq 1 100); do kill -0 "$PID" 2>/dev/null || break; sleep 0.2; done
kill -9 "$PID" 2>/dev/null
NEW="$(dirname "$DEST")/.$(basename "$DEST").nuova"
OLD="$(dirname "$DEST")/.$(basename "$DEST").precedente"
rm -rf "$NEW" "$OLD"
if ditto "$SRC" "$NEW"; then
  xattr -cr "$NEW"
  if [ ! -e "$DEST" ] || mv "$DEST" "$OLD"; then
    if mv "$NEW" "$DEST"; then rm -rf "$OLD"; elif [ -e "$OLD" ]; then mv "$OLD" "$DEST"; fi
  fi
fi
rm -rf "$NEW"
[ "$REOPEN" = 1 ] && open "$DEST"
rm -rf "$TMP"
`;

// Si installa anche con l'app aperta se il computer è inattivo da un'ora (es. di notte):
// su Mac molti non escono mai dall'app, chiudono solo la finestra.
const UPDATE_IDLE_INSTALL_S = 60 * 60;

let preparedUpdate = null; // { version, dir, promise, progress, ready, launch(reopen) }
let updateError = null;
let installingUpdate = false;
let systemShuttingDown = false;

const canAutoUpdate = () => app.isPackaged && (IS_MAC || IS_WIN);

const run = (cmd, args) => new Promise((resolve, reject) => {
  execFile(cmd, args, (err, stdout, stderr) => (err ? reject(new Error(stderr.trim() || err.message)) : resolve(stdout)));
});

async function downloadTo(url, file, onProgress) {
  const res = await net.fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Download non riuscito (errore ${res.status})`);
  const total = Number(res.headers.get('content-length')) || 0;
  const out = fs.createWriteStream(file);
  const reader = res.body.getReader();
  let received = 0;
  let lastPct = -1;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length;
      if (!out.write(Buffer.from(value))) await new Promise((r) => out.once('drain', r));
      const pct = total ? Math.floor((received / total) * 100) : -1;
      if (pct !== lastPct) { lastPct = pct; onProgress(pct); }
    }
  } finally {
    await new Promise((resolve, reject) => { out.on('error', reject); out.end(resolve); });
  }
  if (total && received !== total) throw new Error('Download incompleto, riprova');
}

// L'app da sostituire. Se è aperta dal .dmg o da una copia "traslocata" da Gatekeeper si installa in Applicazioni.
function macInstallTarget() {
  const bundle = path.resolve(process.execPath, '..', '..', '..');
  if (bundle.startsWith('/Volumes/') || bundle.includes('/AppTranslocation/')) return path.join('/Applications', path.basename(bundle));
  return bundle;
}

async function prepareMacInstall(dmg, dir) {
  const target = macInstallTarget();
  try {
    fs.accessSync(path.dirname(target), fs.constants.W_OK);
  } catch (_) {
    throw new Error(`Non ho i permessi per scrivere in ${path.dirname(target)}`);
  }
  const mnt = path.join(dir, 'mnt');
  fs.mkdirSync(mnt);
  await run('hdiutil', ['attach', dmg, '-nobrowse', '-noautoopen', '-noverify', '-mountpoint', mnt]);
  let staged;
  try {
    const appName = fs.readdirSync(mnt).find((n) => n.endsWith('.app'));
    if (!appName) throw new Error('App non trovata nel file scaricato');
    staged = path.join(dir, appName);
    await run('ditto', [path.join(mnt, appName), staged]);
  } finally {
    await run('hdiutil', ['detach', mnt, '-force']).catch(() => {});
  }
  fs.rmSync(dmg, { force: true });
  const script = path.join(dir, 'installa.sh');
  fs.writeFileSync(script, MAC_INSTALL_SCRIPT, { mode: 0o755 });
  return (reopen) => spawn('/bin/bash', [script, String(process.pid), staged, target, dir, reopen ? '1' : '0'],
    { detached: true, stdio: 'ignore' }).unref();
}

// Scarica e prepara l'installazione una sola volta per versione; una versione più nuova sostituisce quella pronta
function downloadUpdate(update) {
  if (preparedUpdate && preparedUpdate.version === update.version) return preparedUpdate.promise;
  if (installingUpdate) return Promise.reject(new Error('Installazione già in corso'));
  if (preparedUpdate) fs.rm(preparedUpdate.dir, { recursive: true, force: true }, () => {});
  const dir = fs.mkdtempSync(path.join(app.getPath('temp'), 'agency-dashboard-update-'));
  const entry = { version: update.version, dir, progress: -1, ready: false, launch: null };
  preparedUpdate = entry;
  updateError = null;
  entry.promise = (async () => {
    const file = path.join(dir, path.basename(new URL(update.downloadUrl).pathname));
    await downloadTo(update.downloadUrl, file, (pct) => { entry.progress = pct; sendUpdate(); });
    // Windows: installer NSIS per utente in modalità silenziosa; --force-run riapre l'app a fine installazione
    entry.launch = IS_MAC
      ? await prepareMacInstall(file, dir)
      : (reopen) => spawn(file, reopen ? ['/S', '--force-run'] : ['/S'], { detached: true, stdio: 'ignore' }).unref();
    entry.ready = true;
    sendUpdate();
    notifyUpdate(update, true);
  })();
  entry.promise.catch((err) => {
    if (preparedUpdate !== entry) return;
    preparedUpdate = null; // si riprova al prossimo controllo
    updateError = String((err && err.message) || err);
    fs.rm(dir, { recursive: true, force: true }, () => {});
    sendUpdate();
  });
  return entry.promise;
}

// Avvia lo script/installer che sostituisce l'app appena questa si chiude
function launchPreparedUpdate(reopen) {
  if (installingUpdate || !preparedUpdate || !preparedUpdate.ready) return false;
  installingUpdate = true;
  preparedUpdate.launch(reopen);
  return true;
}

function quitForUpdate() {
  setTimeout(() => {
    app.quit();
    setTimeout(() => app.exit(0), 5000); // se qualcosa trattiene la chiusura
  }, 300);
}

function installIfIdle() {
  if (powerMonitor.getSystemIdleTime() < UPDATE_IDLE_INSTALL_S) return;
  if (launchPreparedUpdate(true)) quitForUpdate();
}

// Chiusura normale dell'app: si installa senza riaprirla. Allo spegnimento del Mac no, lo script verrebbe interrotto.
app.on('before-quit', () => {
  if (!systemShuttingDown) launchPreparedUpdate(false);
});

// "Riavvia ora": se il download non è ancora finito lo aspetta, poi installa e riapre l'app
ipcMain.handle('update:install', async () => {
  const update = latestUpdate;
  if (!update) return { ok: false, error: 'Nessun aggiornamento disponibile' };
  if (!canAutoUpdate()) return { ok: false, error: 'L\'installazione automatica funziona solo nell\'app installata su Mac o Windows' };
  try {
    await downloadUpdate(update);
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err) };
  }
  if (!launchPreparedUpdate(true)) return { ok: false, error: 'Installazione già in corso' };
  quitForUpdate();
  return { ok: true };
});

// Aperta una seconda volta: si riporta in primo piano questa finestra. Se la nuova copia è una
// versione più recente (es. appena trascinata in Applicazioni), questa si chiude e le lascia il posto.
app.on('second-instance', (_e, _argv, _cwd, data) => {
  const newer = data && typeof data.version === 'string' && /^\d+\.\d+\.\d+$/.test(data.version)
    && isNewerVersion(data.version, app.getVersion());
  if (newer && IS_MAC && typeof data.execPath === 'string') {
    const bundle = path.resolve(data.execPath, '..', '..', '..');
    spawn('/bin/bash', ['-c', 'while kill -0 "$1" 2>/dev/null; do sleep 0.2; done; open -n "$2"', 'riapri', String(process.pid), bundle],
      { detached: true, stdio: 'ignore' }).unref();
    app.quit();
    return;
  }
  hideWidget();
  restoreMainWindow();
});

// ---- Asana: task aperti assegnati a me, con notifica di sistema per quelli nuovi ----
// Token e task stanno in un file a parte, non nei dati della dashboard: così il token non finisce nei backup esportati.
const ASANA_API = 'https://app.asana.com/api/1.0';
const ASANA_FILE = () => path.join(app.getPath('userData'), 'asana.json');
const ASANA_POLL_MS = 2 * 60 * 1000;
const ASANA_FOCUS_MIN_GAP_MS = 30 * 1000;
const ASANA_MAX_PAGES = 5; // fino a 500 task per spazio di lavoro
const ASANA_NOTIFY_MAX = 3; // oltre, una sola notifica col totale
const ASANA_KNOWN_MAX = 5000;
const ASANA_TASK_FIELDS = 'name,due_on,due_at,permalink_url,projects.name,memberships.project.name,memberships.section.name,parent.name,parent.projects.name';
const ASANA_PROJECT_FIELDS = 'name,color,permalink_url,members.gid';
const ASANA_PROJECTS_EVERY_MS = 10 * 60 * 1000; // i progetti cambiano di rado
const ASANA_EMPTY = { token: '', user: '', tasks: [], projects: [], projectsAt: 0, known: [], unseen: [], syncedAt: 0, error: '' };

let asana = { ...ASANA_EMPTY };
let asanaSyncing = false;
let lastAsanaAttempt = 0;

function loadAsana() {
  try {
    asana = { ...ASANA_EMPTY, ...JSON.parse(fs.readFileSync(ASANA_FILE(), 'utf8')) };
  } catch (_) {}
}

function saveAsana() {
  const file = ASANA_FILE();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file + '.tmp', JSON.stringify(asana), 'utf8');
  fs.renameSync(file + '.tmp', file);
}

// Stato per l'interfaccia, senza il token
const asanaPublic = () => ({ connected: !!asana.token, user: asana.user, tasks: asana.tasks, projects: asana.projects, unseen: asana.unseen,
  syncedAt: asana.syncedAt, error: asana.error, syncing: asanaSyncing });

function sendAsana() {
  if (win && !win.isDestroyed()) win.webContents.send('asana:update', asanaPublic());
}

async function asanaGet(pathname, params, token = asana.token) {
  const u = new URL(ASANA_API + pathname);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const res = await net.fetch(u.toString(), { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, cache: 'no-store' });
  if (res.status === 401) throw new Error('Token Asana non valido o revocato: inseriscine uno nuovo');
  if (res.status === 429) throw new Error('Troppe richieste ad Asana: riprovo al prossimo controllo');
  if (!res.ok) throw new Error(`Asana non raggiungibile (${res.status})`);
  return res.json();
}

async function asanaPost(pathname, data, params = {}) {
  const u = new URL(ASANA_API + pathname);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const res = await net.fetch(u.toString(), { method: 'POST', body: JSON.stringify({ data }),
    headers: { Authorization: `Bearer ${asana.token}`, Accept: 'application/json', 'Content-Type': 'application/json' } });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error('Token Asana non valido o revocato: inseriscine uno nuovo');
  if (res.status === 429) throw new Error('Troppe richieste ad Asana: riprova tra poco');
  if (!res.ok) throw new Error(body.errors?.[0]?.message ? `Asana: ${body.errors[0].message}` : `Asana non raggiungibile (${res.status})`);
  return body;
}

// Tutte le pagine di un elenco (al massimo ASANA_MAX_PAGES)
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

// I sotto-task di solito non sono in un progetto: si mostrano col progetto e il nome del task padre
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

// Progetti di cui faccio parte, più i preferiti di Asana (anche se non ne faccio parte)
async function fetchMyAsanaProjects(me) {
  const projects = [];
  for (const ws of me.workspaces || []) {
    const favorites = await asanaGetAll(`/users/me/favorites`, { resource_type: 'project', workspace: ws.gid, opt_fields: 'gid' });
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

// Task non completati assegnati a me, in tutti gli spazi di lavoro
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
  if (!fresh.length || !Notification.isSupported()) return;
  const notifIcon = customIcon ? nativeImage.createFromDataURL(customIcon) : ICON_PATH;
  if (fresh.length > ASANA_NOTIFY_MAX) {
    const n = new Notification({ title: `${fresh.length} nuovi task Asana`,
      body: fresh.slice(0, ASANA_NOTIFY_MAX).map((t) => t.name).join('\n') + '\n…', icon: notifIcon });
    n.on('click', () => {
      hideWidget();
      restoreMainWindow();
    });
    n.show();
    return;
  }
  for (const t of fresh) {
    const where = [t.projects[0], t.parent].filter(Boolean).join(' › ');
    const n = new Notification({ title: 'Nuovo task Asana', body: [t.name, where].filter(Boolean).join('\n'), icon: notifIcon });
    n.on('click', () => openExternalSafe(t.url));
    n.show();
  }
}

async function syncAsana() {
  if (!asana.token || asanaSyncing) return asanaPublic();
  asanaSyncing = true;
  lastAsanaAttempt = Date.now();
  sendAsana();
  const token = asana.token;
  try {
    const { user, tasks, projects } = await fetchMyAsanaTasks();
    // Token cambiato o scollegato durante il controllo: questi task non valgono più
    if (asana.token !== token) {
      asanaSyncing = false;
      return syncAsana();
    }
    // Al primo controllo dopo il collegamento i task già presenti non sono "nuovi"
    const firstSync = !asana.syncedAt;
    const known = new Set(asana.known);
    const fresh = tasks.filter((t) => !known.has(t.gid));
    const open = new Set(tasks.map((t) => t.gid));
    if (!firstSync) notifyAsana(fresh);
    Object.assign(asana, {
      user, tasks, syncedAt: Date.now(), error: '',
      ...(projects ? { projects, projectsAt: Date.now() } : {}),
      // I task già visti restano noti anche se completati: riaperti non tornano "nuovi"
      known: [...new Set([...asana.known, ...open])].slice(-ASANA_KNOWN_MAX),
      unseen: firstSync ? [] : [...asana.unseen.filter((g) => open.has(g)), ...fresh.map((t) => t.gid)],
    });
  } catch (err) {
    if (asana.token !== token) {
      asanaSyncing = false;
      return syncAsana();
    }
    asana.error = String((err && err.message) || err);
  }
  asanaSyncing = false;
  saveAsana();
  sendAsana();
  return asanaPublic();
}

function syncAsanaIfStale() {
  if (Date.now() - lastAsanaAttempt > ASANA_FOCUS_MIN_GAP_MS) syncAsana();
}

ipcMain.handle('asana:get', () => asanaPublic());
// "Aggiorna" a mano rilegge anche i progetti
ipcMain.handle('asana:sync', () => {
  asana.projectsAt = 0;
  return syncAsana();
});
ipcMain.handle('asana:seen', () => {
  asana.unseen = [];
  saveAsana();
  sendAsana();
});
// Persone a cui assegnare un task nel progetto scelto: tutti gli utenti del suo spazio di lavoro
const ASANA_GID = /^\d{1,30}$/;
const ASANA_DATE = /^\d{4}-\d{2}-\d{2}$/;
const asanaUsersCache = new Map(); // gid spazio di lavoro -> utenti, per tutta la sessione
const asanaError = (err) => ({ ok: false, error: String((err && err.message) || err) });

ipcMain.handle('asana:users', async (_e, projectGid) => {
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
    return asanaError(err);
  }
});

ipcMain.handle('asana:create-task', async (_e, t = {}) => {
  const name = String(t.name || '').trim();
  if (!asana.token) return { ok: false, error: 'Asana non è collegato' };
  if (!name) return { ok: false, error: 'Manca il nome del task' };
  if (!ASANA_GID.test(String(t.project))) return { ok: false, error: 'Scegli un progetto' };
  if (t.assignee && !ASANA_GID.test(String(t.assignee))) return { ok: false, error: 'Persona non valida' };
  if (t.due && !ASANA_DATE.test(String(t.due))) return { ok: false, error: 'Data di scadenza non valida' };
  try {
    const task = (await asanaPost('/tasks', {
      name: name.slice(0, 1024), notes: String(t.notes || '').slice(0, 60000), projects: [String(t.project)],
      ...(t.assignee ? { assignee: String(t.assignee) } : {}), ...(t.due ? { due_on: t.due } : {}),
    }, { opt_fields: 'permalink_url' })).data;
    // Un task che mi assegno da solo non deve arrivare come notifica di "nuovo task"
    asana.known = [...asana.known, task.gid].slice(-ASANA_KNOWN_MAX);
    saveAsana();
    syncAsana();
    return { ok: true, gid: task.gid, url: task.permalink_url };
  } catch (err) {
    return asanaError(err);
  }
});

// Token vuoto = scollega
ipcMain.handle('asana:connect', async (_e, token) => {
  token = String(token || '').trim();
  if (token) {
    try {
      await asanaGet('/users/me', { opt_fields: 'name' }, token);
    } catch (err) {
      return { ok: false, error: String((err && err.message) || err) };
    }
  }
  asana = { ...ASANA_EMPTY, token };
  asanaUsersCache.clear();
  saveAsana();
  if (token) await syncAsana();
  else sendAsana();
  return { ok: true };
});

// ---- Account Solferino 3 (Cloudflare): ruoli utente/admin, sincronizzazione dei dati ----
// Ogni computer si collega con un codice monouso generato da un admin (o dall'utente da un altro suo computer).
// Token e stato della sincronizzazione stanno in cloud.json, fuori dai dati e quindi dai backup esportati.
const CLOUD_API = (process.env.S3_CLOUD_URL || 'https://solferino3-dashboard-api.m-gallo.workers.dev').replace(/\/+$/, '');
const CLOUD_FILE = () => path.join(app.getPath('userData'), 'cloud.json');
const CLOUD_POLL_MS = 2 * 60 * 1000; // leggero: i dati si scaricano solo se cambiati (web o altro computer)
const CLOUD_FOCUS_MIN_GAP_MS = 60 * 1000;
const CLOUD_PUSH_DELAY_MS = 3000;
const NOTES_NOTIFY_MAX = 3;
const CLOUD_EMPTY = { token: '', user: null, rev: 0, dirty: false, syncedAt: 0, error: '', sharedTools: null,
  sharedNotes: [], knownNotes: null, unseenNotes: [] }; // knownNotes null = primo controllo: niente avvisi

let cloud = { ...CLOUD_EMPTY };
let cloudSyncing = false;
let cloudSaveSeq = 0; // cresce a ogni salvataggio: dice se ci sono modifiche arrivate durante un invio
let cloudPushTimer;
let lastCloudAttempt = 0;

function loadCloud() {
  try {
    cloud = { ...CLOUD_EMPTY, ...JSON.parse(fs.readFileSync(CLOUD_FILE(), 'utf8')) };
  } catch (_) {}
}

function saveCloud() {
  const file = CLOUD_FILE();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file + '.tmp', JSON.stringify(cloud), 'utf8');
  fs.renameSync(file + '.tmp', file);
}

// Stato per l'interfaccia, senza il token
const cloudPublic = () => ({ connected: !!cloud.token, user: cloud.user, syncedAt: cloud.syncedAt, error: cloud.error,
  dirty: cloud.dirty, syncing: cloudSyncing, sharedTools: cloud.sharedTools,
  sharedNotes: cloud.sharedNotes, unseenNotes: cloud.unseenNotes });

function sendCloud() {
  if (win && !win.isDestroyed()) win.webContents.send('cloud:update', cloudPublic());
}

class CloudError extends Error {
  constructor(status, body) {
    super((body && body.message) || `Server non raggiungibile (${status})`);
    this.status = status;
    this.body = body;
  }
}

async function cloudFetch(method, pathname, body, token = cloud.token) {
  const res = await net.fetch(CLOUD_API + pathname, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => null);
  if (res.status === 401 && token) {
    // Sessione scaduta o utente rimosso: i dati locali restano, serve un nuovo accesso
    cloud = { ...CLOUD_EMPTY, error: (data && data.message) || 'Computer scollegato: inserisci un nuovo codice' };
    saveCloud();
    sendCloud();
  }
  if (!res.ok) throw new CloudError(res.status, data);
  return data;
}

// Le anteprime dei siti sono file su questo computer: non si sincronizzano
function stripForCloud(data) {
  return { ...data, sites: (data.sites || []).map((s) => ({ ...s, thumb: null })) };
}

function readLocalData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE(), 'utf8'));
  } catch (_) {
    return null;
  }
}

// Dati arrivati da un altro dispositivo: si tengono le anteprime locali dei siti con lo stesso id.
// Se qui c'erano modifiche non ancora inviate, prima si salva una copia nella cartella dei dati.
function applyRemoteData(remote, rev, { conflict = false } = {}) {
  const local = readLocalData();
  if (conflict && local) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    fs.writeFileSync(path.join(app.getPath('userData'), `copia-prima-della-sincronizzazione-${stamp}.json`), JSON.stringify(local, null, 2), 'utf8');
  }
  const thumbs = new Map(((local && local.sites) || []).map((s) => [s.id, s]));
  const merged = { ...remote, sites: (remote.sites || []).map((s) => {
    const l = thumbs.get(s.id);
    return l && l.thumb ? { ...s, thumb: l.thumb, capturedAt: l.capturedAt } : s;
  }) };
  writeData(merged);
  cloud.rev = rev;
  cloud.dirty = false;
  if (win && !win.isDestroyed()) win.webContents.send('data:remote', { data: merged, conflict });
}

async function pushCloudData() {
  const local = readLocalData();
  if (!local) return;
  const seq = cloudSaveSeq;
  try {
    const res = await cloudFetch('PUT', '/api/data', { baseRev: cloud.rev, data: stripForCloud(local) });
    cloud.rev = res.rev;
    cloud.dirty = seq !== cloudSaveSeq;
  } catch (err) {
    // Un altro dispositivo ha salvato prima: vince la versione online, quella locale resta in copia
    if (err.status !== 409 || !err.body || !err.body.data) throw err;
    applyRemoteData(err.body.data, err.body.rev, { conflict: true });
  }
}

async function syncCloud() {
  if (!cloud.token || cloudSyncing) return;
  cloudSyncing = true;
  lastCloudAttempt = Date.now();
  sendCloud();
  try {
    cloud.user = await cloudFetch('GET', '/api/me');
    const shared = await cloudFetch('GET', '/api/shared/tools');
    cloud.sharedTools = Array.isArray(shared.data) ? shared.data : null;
    await fetchSharedNotes();
    const remote = await cloudFetch('GET', `/api/data${cloud.rev ? `?rev=${cloud.rev}` : ''}`);
    if (remote.rev && remote.rev !== cloud.rev) applyRemoteData(remote.data, remote.rev, { conflict: cloud.dirty || !cloud.rev });
    else if (!remote.rev) {
      cloud.rev = 0; // nulla online (primo accesso): si caricano i dati di questo computer
      await pushCloudData();
    } else if (cloud.dirty) await pushCloudData();
    cloud.syncedAt = Date.now();
    cloud.error = '';
  } catch (err) {
    if (cloud.token) cloud.error = String((err && err.message) || err);
  } finally {
    cloudSyncing = false;
    if (cloud.token) saveCloud();
    sendCloud();
  }
}

// ---- Appunti condivisi: cache degli appunti miei e ricevuti, avviso per quelli nuovi ricevuti ----
const noteKey = (n) => `${n.owner}/${n.id}`;

async function fetchSharedNotes() {
  const notes = await cloudFetch('GET', '/api/shared-notes');
  if (!Array.isArray(notes)) return;
  const me = cloud.user && cloud.user.email;
  const received = notes.filter((n) => n.owner !== me && !n.deleted);
  const firstCheck = !Array.isArray(cloud.knownNotes);
  const known = new Set(cloud.knownNotes || []);
  const fresh = received.filter((n) => !known.has(noteKey(n)));
  const present = new Set(received.map(noteKey));
  if (!firstCheck) notifyNotes(fresh);
  cloud.sharedNotes = notes;
  cloud.knownNotes = [...present];
  cloud.unseenNotes = firstCheck ? [] : [...new Set([...cloud.unseenNotes.filter((k) => present.has(k)), ...fresh.map(noteKey)])];
}

function notifyNotes(fresh) {
  if (!fresh.length || !Notification.isSupported()) return;
  const notifIcon = customIcon ? nativeImage.createFromDataURL(customIcon) : ICON_PATH;
  const from = (n) => n.ownerName || n.owner.split('@')[0];
  const items = fresh.length > NOTES_NOTIFY_MAX
    ? [{ title: `${fresh.length} appunti condivisi con te`, body: fresh.slice(0, NOTES_NOTIFY_MAX).map((n) => `${from(n)}: ${n.title}`).join('\n') + '\n…' }]
    : fresh.map((n) => ({ title: `${from(n)} ha condiviso un appunto`, body: n.title }));
  for (const it of items) {
    const n = new Notification({ ...it, icon: notifIcon });
    n.on('click', () => {
      hideWidget();
      restoreMainWindow();
      if (win && !win.isDestroyed()) win.webContents.send('cloud:open-notes');
    });
    n.show();
  }
}

// Salva un appunto condiviso (proprietario o destinatario) e aggiorna la cache; in caso di conflitto
// restituisce la versione online, che l'app tiene, salvando a parte quella appena scritta
async function saveSharedNote(n) {
  const body = { title: String(n.title || ''), date: String(n.date || ''), html: String(n.html || ''), baseRev: Number(n.baseRev) || 0 };
  if (Array.isArray(n.sharedWith)) body.sharedWith = n.sharedWith;
  const replace = (note) => {
    const key = `${n.owner}/${n.id}`;
    cloud.sharedNotes = cloud.sharedNotes.filter((x) => noteKey(x) !== key);
    if (note) cloud.sharedNotes.push(note);
    saveCloud();
    sendCloud();
  };
  try {
    const res = await cloudFetch('PUT', `/api/shared-notes/${encodeURIComponent(n.owner)}/${encodeURIComponent(n.id)}`, body);
    replace(res.note);
    return { ok: true, note: res.note };
  } catch (err) {
    if (err.status === 409 && err.body && err.body.note) {
      replace(err.body.note);
      return { ok: false, conflict: true, note: err.body.note, error: err.message };
    }
    if (err.status === 403) replace(null); // non più condiviso con me
    return { ok: false, error: String((err && err.message) || err) };
  }
}

function syncCloudIfStale() {
  if (Date.now() - lastCloudAttempt > CLOUD_FOCUS_MIN_GAP_MS) syncCloud();
}

function markCloudDirty() {
  if (!cloud.token) return;
  cloudSaveSeq++;
  if (!cloud.dirty) {
    cloud.dirty = true;
    saveCloud();
  }
  clearTimeout(cloudPushTimer);
  cloudPushTimer = setTimeout(async function push() {
    if (cloudSyncing) return (cloudPushTimer = setTimeout(push, CLOUD_PUSH_DELAY_MS));
    cloudSyncing = true;
    try {
      await pushCloudData();
      cloud.syncedAt = Date.now();
      cloud.error = '';
    } catch (err) {
      if (cloud.token) cloud.error = String((err && err.message) || err);
    } finally {
      cloudSyncing = false;
      if (cloud.token) saveCloud();
      sendCloud();
    }
    if (cloud.dirty && !cloud.error) cloudPushTimer = setTimeout(push, CLOUD_PUSH_DELAY_MS);
  }, CLOUD_PUSH_DELAY_MS);
}

// Collega questo computer con un codice: al primo sync, se online ci sono già dati, vincono quelli
// (i dati locali restano in copia); se no si caricano quelli di questo computer.
async function cloudRedeem(code) {
  try {
    const res = await cloudFetch('POST', '/auth/redeem', { code: String(code || ''), device: os.hostname() }, '');
    cloud = { ...CLOUD_EMPTY, token: res.token, user: res.user };
    saveCloud();
    await syncCloud();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err) };
  }
}

const cloudCall = (fn) => async (_e, ...args) => {
  try {
    return { ok: true, result: await fn(...args) };
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err) };
  }
};

ipcMain.handle('cloud:get', () => cloudPublic());
ipcMain.handle('cloud:sync', () => syncCloud());
ipcMain.handle('cloud:redeem', (_e, code) => cloudRedeem(code));
ipcMain.handle('cloud:my-code', cloudCall(() => cloudFetch('POST', '/api/me/code')));
ipcMain.handle('cloud:logout', async () => {
  if (cloud.token) cloudFetch('POST', '/auth/logout').catch(() => {});
  clearTimeout(cloudPushTimer);
  cloud = { ...CLOUD_EMPTY };
  saveCloud();
  sendCloud();
  return true;
});
// Amministrazione (il Worker verifica comunque il ruolo)
ipcMain.handle('cloud:users', cloudCall(() => cloudFetch('GET', '/api/users')));
ipcMain.handle('cloud:invite', cloudCall((email, name, role) => cloudFetch('POST', '/api/users', { email: String(email), name: String(name || ''), role })));
ipcMain.handle('cloud:user-code', cloudCall((email) => cloudFetch('POST', `/api/users/${encodeURIComponent(email)}/code`)));
ipcMain.handle('cloud:set-role', cloudCall((email, role) => cloudFetch('PATCH', `/api/users/${encodeURIComponent(email)}`, { role })));
ipcMain.handle('cloud:remove-user', cloudCall((email) => cloudFetch('DELETE', `/api/users/${encodeURIComponent(email)}`)));
// Appunti condivisi: il proprietario pubblica la copia per i colleghi scelti (lista vuota = non più condiviso)
ipcMain.handle('cloud:team', cloudCall(() => cloudFetch('GET', '/api/team')));
ipcMain.handle('cloud:save-note', (_e, n) => (cloud.token ? saveSharedNote(n) : { ok: false, error: 'Account non collegato' }));
// Proprietario: elimina (i destinatari ne tengono una copia). Destinatario: lo toglie dalla propria lista.
ipcMain.handle('cloud:delete-note', cloudCall(async (owner, id) => {
  await cloudFetch('DELETE', `/api/shared-notes/${encodeURIComponent(owner)}/${encodeURIComponent(id)}`);
  cloud.sharedNotes = cloud.sharedNotes.filter((x) => noteKey(x) !== `${owner}/${id}`);
  saveCloud();
  sendCloud();
}));
ipcMain.handle('cloud:notes-seen', () => {
  if (!cloud.unseenNotes.length) return;
  cloud.unseenNotes = [];
  saveCloud();
  sendCloud();
});
ipcMain.handle('cloud:publish-tools', cloudCall(async (tools) => {
  await cloudFetch('PUT', '/api/shared/tools', { data: tools });
  cloud.sharedTools = tools;
  saveCloud();
  sendCloud();
}));

app.whenReady().then(() => {
  if (!isPrimaryInstance || renameOldMacBundle()) return;
  migrateOldUserData();
  const settings = readSettings();
  if (THEME_SOURCES.includes(settings.theme)) nativeTheme.themeSource = settings.theme;
  applyIcon(settings.iconData);
  if (IS_WIN) {
    app.setAppUserModelId('agency.solferino3.dashboard.smm'); // icona e raggruppamento corretti nella barra delle applicazioni
    nativeTheme.on('updated', () => {
      if (win && !win.isDestroyed()) win.setTitleBarOverlay(titleBarOverlay());
    });
  }
  createWindow();
  // Il controllo gira nel processo principale: funziona anche con la finestra chiusa (Mac) o ridotta a icona
  setInterval(checkForUpdate, UPDATE_POLL_MS);
  powerMonitor.on('resume', checkForUpdateIfStale);
  powerMonitor.on('shutdown', () => { systemShuttingDown = true; });
  loadCloud();
  syncCloud();
  setInterval(syncCloud, CLOUD_POLL_MS);
  powerMonitor.on('resume', syncCloudIfStale);
  loadAsana();
  syncAsana();
  setInterval(syncAsana, ASANA_POLL_MS);
  powerMonitor.on('resume', syncAsanaIfStale);
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (!IS_MAC) app.quit();
});
