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

## Pubblicare una nuova versione

```bash
npm run release            # 1.0.0 → 1.0.1
npm run release -- minor   # 1.0.0 → 1.1.0
npm run release -- major   # 1.0.0 → 2.0.0
```

Lo script aumenta la versione, crea `.dmg` ed `.exe`, aggiorna l'app in `/Applications`, fa commit, tag e push su GitHub e pubblica una Release con i due installer. Serve [GitHub CLI](https://cli.github.com) autenticata (`gh auth login`) e il branch `main`.

L'app controlla da sola (all'avvio e ogni 6 ore) se su GitHub c'è una versione più recente: in quel caso nella barra laterale compare il riquadro **Nuova versione** con il pulsante per scaricare l'installer giusto per Mac o Windows.

## Cosa contiene

- **Home**: ricerca globale (⌘K su Mac, Ctrl+K su Windows) su strumenti e link dei clienti, scorciatoie, to-do aperti.
- **Clienti**: un blocco per cliente con i suoi link (sito, admin, Analytics, ecc.).
- **Strumenti**: link dell'agenzia raggruppati per categoria.
- **To-do**, **Note** (salvataggio automatico), **Appunti**, **Snippet** copiabili con un clic.
- **Impostazioni**: profilo, tema (automatico, chiaro, scuro), palette di colori, colore principale e icona dell'app (varianti di colore o immagine propria).

### Profili

Le sezioni qui sopra ci sono per tutti. Il profilo scelto nelle Impostazioni aggiunge le sue:

| Profilo | Sezioni |
| --- | --- |
| Social Media Manager | Generatore UTM, Calendario editoriale |
| Grafico | Palette colori, Font |
| Fotografo | Shooting |
| Commerciale | Lead, Preventivi |
| Project Manager | Progetti, Scadenze |

Le schede con una data compaiono in Home sotto **In programma**. Un clic sullo stato di una scheda la fa passare allo stato successivo. Cambiando profilo i dati delle altre sezioni restano salvati.

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
