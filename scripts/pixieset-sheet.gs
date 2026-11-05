/**
 * Agency Dashboard SMM – legge il foglio delle gallerie Pixieset e lo restituisce all'app in JSON.
 *
 * Il foglio resta privato: lo script gira con i permessi di chi lo pubblica e risponde solo
 * a chi conosce la chiave. Per ogni cella restituisce il testo visibile e, se c'è, il link
 * collegato al testo (anche quando la cella mostra un titolo invece dell'URL).
 *
 * Installazione (dal foglio): Estensioni → Apps Script → incolla questo file → imposta KEY →
 * Distribuisci → Nuova distribuzione → tipo "App web" → Esegui come: Me →
 * Chi ha accesso: Chiunque → Distribuisci → copia l'URL che finisce con /exec.
 */
const KEY = 'INCOLLA_QUI_LA_CHIAVE'; // la stessa chiave va inserita nell'app
const SHEET_GID = null; // id della scheda (il numero dopo "gid=" nel link), null = la prima scheda

function doGet(e) {
  const params = (e && e.parameter) || {};
  if (!KEY || KEY === 'INCOLLA_QUI_LA_CHIAVE' || params.key !== KEY) return json({ error: 'Chiave non valida' });
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const gid = params.gid || SHEET_GID;
  const sheet = (gid && ss.getSheets().find((s) => String(s.getSheetId()) === String(gid))) || ss.getSheets()[0];
  const range = sheet.getDataRange();
  const values = range.getDisplayValues();
  const rich = range.getRichTextValues();
  const formulas = range.getFormulas();
  const rows = values.map((row, r) => row.map((v, c) => ({ v, u: linkOf(rich[r][c], formulas[r][c]) })));
  return json({ sheet: sheet.getName(), rows });
}

// Link della cella: testo collegato (tutto o in parte) oppure formula =HYPERLINK("…")
function linkOf(richText, formula) {
  if (richText) {
    const whole = richText.getLinkUrl();
    if (whole) return whole;
    const run = richText.getRuns().find((x) => x.getLinkUrl());
    if (run) return run.getLinkUrl();
  }
  const m = /HYPERLINK\(\s*"([^"]+)"/i.exec(formula || '');
  return m ? m[1] : null;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
