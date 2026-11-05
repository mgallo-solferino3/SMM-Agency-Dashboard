// Agency Dashboard SMM: legge le schede del foglio delle gallerie Pixieset e le restituisce all'app in JSON.
// Il foglio resta privato: lo script gira con i permessi di chi lo pubblica e risponde solo a chi conosce la chiave.
// Restituisce tutte le schede visibili (es. una per fotografo); per ogni cella il testo visibile e,
// se c'è, il link collegato al testo.
//
// Installazione (dal foglio): Estensioni → Apps Script → incolla questo file → imposta KEY → salva →
// Esegui il deployment → Nuovo deployment → App web → Esegui come: Me → Chi ha accesso: Chiunque.
// Per aggiornarlo: Gestisci deployment → matita → Versione: Nuova versione (l'URL resta lo stesso).
// Niente commenti a blocchi né barre rovesciate: si perdono facilmente nel copia-incolla.
const KEY = 'INCOLLA_QUI_LA_CHIAVE'; // la stessa chiave va inserita nell'app

function doGet(e) {
  const params = (e && e.parameter) || {};
  if (!KEY || KEY === 'INCOLLA_QUI_LA_CHIAVE' || params.key !== KEY) return json({ error: 'Chiave non valida' });
  const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets()
    .filter((s) => !s.isSheetHidden() && (!params.gid || String(s.getSheetId()) === String(params.gid)));
  return json({ sheets: sheets.map((s) => ({ name: s.getName(), gid: s.getSheetId(), rows: readRows(s) })) });
}

function readRows(sheet) {
  const range = sheet.getDataRange();
  const values = range.getDisplayValues();
  const rich = range.getRichTextValues();
  const formulas = range.getFormulas();
  return values.map((row, r) => row.map((v, c) => ({ v, u: linkOf(rich[r][c], formulas[r][c]) })));
}

// Link della cella: testo collegato (tutto o in parte) oppure formula =HYPERLINK("…")
function linkOf(richText, formula) {
  if (richText) {
    const whole = richText.getLinkUrl();
    if (whole) return whole;
    const run = richText.getRuns().find((x) => x.getLinkUrl());
    if (run) return run.getLinkUrl();
  }
  const f = String(formula || '');
  const marker = 'HYPERLINK("';
  const start = f.toUpperCase().indexOf(marker);
  if (start < 0) return null;
  const end = f.indexOf('"', start + marker.length);
  return end > start + marker.length ? f.slice(start + marker.length, end) : null;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
