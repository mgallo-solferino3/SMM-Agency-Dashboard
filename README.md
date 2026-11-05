# Agency Dashboard SMM

Dashboard locale per Mac e Windows (Electron) con link per cliente, strumenti dell'agenzia e piccole utility.

## Avvio

Serve Node.js (versione 18 o superiore).

```bash
cd agency-dashboard
npm install
npm start
```

## Creare l'app per il Dock (.dmg)

```bash
npm run dist
```

Il file `.dmg` compare nella cartella `dist/`. L'app non è firmata: la prima volta apri con tasto destro → Apri.

## Creare l'installer per Windows (.exe)

```bash
npm run dist:win
```

Si può lanciare anche dal Mac. Il file `Agency Dashboard SMM Setup 1.0.0.exe` compare in `dist/`: un doppio clic installa l'app per l'utente corrente (senza permessi di amministratore) e crea i collegamenti su Desktop e menu Start. L'installer non è firmato: al primo avvio Windows SmartScreen mostra un avviso → **Ulteriori informazioni** → **Esegui comunque**.

Su Windows la tendina "App di Windows" negli strumenti elenca i collegamenti del menu Start.

## Cosa contiene

- **Home**: ricerca globale (⌘K su Mac, Ctrl+K su Windows) su strumenti e link dei clienti, scorciatoie, to-do aperti.
- **Clienti**: un blocco per cliente con i suoi link (sito, admin, Analytics, ecc.).
- **Strumenti**: link dell'agenzia raggruppati per categoria.
- **To-do**, **Note** (salvataggio automatico), **Generatore UTM**, **Snippet** copiabili con un clic.

Quando riduci a icona la finestra compare un piccolo **widget flottante** con l'icona dell'app: un clic riapre la dashboard, trascinandolo lo sposti (la posizione viene ricordata).

Premi **Modifica** in alto a destra per modificare o eliminare link, clienti e snippet.

## Dati e backup

I dati sono salvati in locale in
`~/Library/Application Support/Agency Dashboard SMM/dashboard-data.json` (Mac) o
`%APPDATA%\Agency Dashboard SMM\dashboard-data.json` (Windows).
Dal menu laterale puoi esportare e importare un backup JSON.

## Struttura

- `main.js` – processo principale (finestra, salvataggio dati, apertura link)
- `preload.js` – ponte sicuro verso l'interfaccia
- `renderer/` – interfaccia (HTML, CSS, JS senza dipendenze)
