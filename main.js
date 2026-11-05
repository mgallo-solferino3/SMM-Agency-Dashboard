const { app, BrowserWindow, ipcMain, shell, dialog, clipboard, screen, nativeImage, nativeTheme, net, Notification, powerMonitor } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL, fileURLToPath } = require('url');
const { execFile } = require('child_process');

const IS_MAC = process.platform === 'darwin';
const IS_WIN = process.platform === 'win32';

// Hostname -> app desktop da aprire al posto del sito (se installata)
const APP_BY_HOST = [
  { match: (h) => h === 'dash.cloudflare.com', name: 'Cloudflare' },
  { match: (h) => h === 'app.asana.com', name: 'Asana' },
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

function findChromeProfileDir(profileName) {
  try {
    const state = JSON.parse(fs.readFileSync(CHROME_LOCAL_STATE, 'utf8'));
    const cache = state.profile?.info_cache || {};
    for (const [dir, info] of Object.entries(cache)) {
      if (info.name === profileName) return dir;
    }
  } catch (_) {}
  return null;
}

const DATA_FILE = () => path.join(app.getPath('userData'), 'dashboard-data.json');
let win;

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
    ? { color: '#1c1719', symbolColor: '#efeeea', height: 40 }
    : { color: '#fcf2f5', symbolColor: '#1d1d1b', height: 40 };
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
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1c1719' : '#fcf2f5',
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

function openExternalSafe(url) {
  try {
    const u = new URL(url);
    // Scorciatoia a un'app (file:///Applications/Nome.app o file:///C:/…/Nome.lnk)
    if (u.protocol === 'file:') {
      const appPath = fileURLToPath(u);
      if (isAppPath(appPath)) {
        openApp(appPath);
        return true;
      }
      return false;
    }
    const desktopApp = APP_BY_HOST.find((a) => a.match(u.hostname));
    const desktopAppPath = desktopApp && findAppByName(desktopApp.name);
    if (desktopAppPath) {
      openApp(desktopAppPath);
      return true;
    }
    const profileName = CHROME_PROFILE_BY_HOST[u.hostname];
    if (profileName) {
      const profileDir = findChromeProfileDir(profileName);
      if (profileDir && IS_MAC) {
        // -n forza un nuovo processo: senza, se Chrome e' gia' aperto, "open" si limita ad
        // attivarlo ignorando --profile-directory e l'URL finisce nel profilo gia' in uso.
        execFile('open', ['-na', 'Google Chrome', '--args', `--profile-directory=${profileDir}`, u.toString()]);
        return true;
      }
      const chromeExe = IS_WIN && CHROME_EXE_WIN();
      if (profileDir && chromeExe) {
        execFile(chromeExe, [`--profile-directory=${profileDir}`, u.toString()]);
        return true;
      }
    }
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

ipcMain.handle('data:save', (_e, data) => {
  const file = DATA_FILE();
  const tmp = file + '.tmp';
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file); // scrittura atomica
  return true;
});

ipcMain.handle('open:external', (_e, url) => openExternalSafe(String(url)));

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
    defaultPath: `agency-dashboard-smm-backup-${stamp}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (canceled || !filePath) return false;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  return true;
});

// ---- Screenshot "siti belli" ----
const THUMBS_DIR = () => path.join(app.getPath('userData'), 'thumbnails');

ipcMain.handle('sites:capture', async (_e, { id, url }) => {
  let capWin;
  try {
    const target = new URL(url);
    if (target.protocol !== 'http:' && target.protocol !== 'https:') return { error: 'URL non valido' };

    capWin = new BrowserWindow({
      width: 1280,
      height: 800,
      show: false,
      webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
    });

    const loaded = new Promise((resolve, reject) => {
      capWin.webContents.once('did-finish-load', resolve);
      capWin.webContents.once('did-fail-load', (_ev, code, desc) => reject(new Error(desc || `load-failed-${code}`)));
    });
    const timeout = new Promise((_resolve, reject) => setTimeout(() => reject(new Error('timeout')), 20000));

    capWin.loadURL(target.toString());
    await Promise.race([loaded, timeout]);
    await new Promise((r) => setTimeout(r, 1200)); // lascia assestare font/animazioni

    const image = await capWin.webContents.capturePage();
    const dir = THUMBS_DIR();
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${id}.png`);
    fs.writeFileSync(file, image.toPNG());
    return { url: pathToFileURL(file).toString() + `?t=${Date.now()}` };
  } catch (err) {
    return { error: String((err && err.message) || err) };
  } finally {
    if (capWin && !capWin.isDestroyed()) capWin.destroy();
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
const LATEST_RELEASE_API = 'https://api.github.com/repos/mgallo-solferino3/SMM-Agency-Dashboard/releases/latest';

function isNewerVersion(candidate, current) {
  const a = candidate.split('.').map(Number);
  const b = current.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
  }
  return false;
}

// Controllo frequente per avvisare appena esce una release. Le richieste usano l'ETag:
// se non è cambiato niente GitHub risponde 304, che non conta nel limite di 60 richieste/ora per IP.
const UPDATE_POLL_MS = 5 * 60 * 1000;
const UPDATE_FOCUS_MIN_GAP_MS = 60 * 1000;
let releaseEtag = null;
let cachedRelease = null;
let latestUpdate = null;
let lastUpdateCheck = 0;
let notifiedVersion = null;

async function fetchLatestRelease() {
  const headers = { Accept: 'application/vnd.github+json' };
  if (releaseEtag) headers['If-None-Match'] = releaseEtag;
  const res = await net.fetch(LATEST_RELEASE_API, { headers, cache: 'no-store' });
  if (res.status === 304 || !res.ok) return cachedRelease;
  releaseEtag = res.headers.get('etag');
  cachedRelease = await res.json();
  return cachedRelease;
}

function updateFromRelease(release) {
  const version = String(release?.tag_name || '').replace(/^v/, '');
  if (!/^\d+\.\d+\.\d+$/.test(version) || !isNewerVersion(version, app.getVersion())) return null;
  const ext = IS_WIN ? '.exe' : '.dmg';
  const asset = (release.assets || []).find((a) => a.name.endsWith(ext));
  if (!asset) return null; // release senza installer per questa piattaforma (es. ancora in caricamento)
  return { version, downloadUrl: asset.browser_download_url, notesUrl: release.html_url };
}

function notifyUpdate(update) {
  if (notifiedVersion === update.version || !Notification.isSupported()) return;
  notifiedVersion = update.version;
  const n = new Notification({
    title: `Agency Dashboard SMM ${update.version} disponibile`,
    body: 'Clicca per aprire l\'app e scaricare la nuova versione.',
    icon: customIcon ? nativeImage.createFromDataURL(customIcon) : ICON_PATH,
  });
  n.on('click', () => {
    hideWidget();
    restoreMainWindow();
  });
  n.show();
}

async function checkForUpdate() {
  lastUpdateCheck = Date.now();
  try {
    latestUpdate = updateFromRelease(await fetchLatestRelease());
  } catch (_) {
    return latestUpdate; // offline o GitHub non raggiungibile: si riprova al prossimo controllo
  }
  if (win && !win.isDestroyed()) win.webContents.send('update:available', latestUpdate);
  if (latestUpdate) notifyUpdate(latestUpdate);
  return latestUpdate;
}

function checkForUpdateIfStale() {
  if (Date.now() - lastUpdateCheck > UPDATE_FOCUS_MIN_GAP_MS) checkForUpdate();
}

ipcMain.handle('update:check', () => checkForUpdate());

app.whenReady().then(() => {
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
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (!IS_MAC) app.quit();
});
