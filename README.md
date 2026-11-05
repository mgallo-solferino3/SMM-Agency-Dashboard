# Solferino 3 Dashboard

(Fino alla versione 1.3 si chiamava *Agency Dashboard SMM*: aggiornando, dati e impostazioni vengono copiati in automatico nella nuova cartella e la vecchia app in Applicazioni viene sostituita.)

Dashboard locale per Mac e Windows (Electron) con link per cliente, strumenti dell'agenzia e piccole utility.

## Avvio

Serve Node.js (versione 18 o superiore).

```bash
cd agency-dashboard
npm install
npm start
```

## Installare sul Mac (colleghi)

Apri il Terminale, incolla e premi Invio:

```bash
curl -fsSL https://raw.githubusercontent.com/mgallo-solferino3/SMM-Agency-Dashboard/main/scripts/install-mac.sh | bash
```

Scarica l'ultima versione da GitHub con `curl` (senza la "quarantena" del browser, quindi macOS non blocca l'app), chiude l'app se è aperta, la installa in Applicazioni e la apre. Funziona anche per aggiornare. I dati restano quelli di prima.

Se invece si scarica il `.dmg` dal browser, macOS può bloccare l'app (l'icona saltella nel Dock senza aprirsi, "Apri comunque" non funziona) perché non è firmata con un Apple Developer ID. Si sblocca con `xattr -cr "/Applications/Solferino 3 Dashboard.app"` nel Terminale.

Dalla 1.2.2 gli aggiornamenti successivi si installano dall'app con **Installa e riavvia**.

## Creare l'app per il Dock (.dmg)

```bash
npm run dist
```

Il file `.dmg` compare nella cartella `dist/`.

## Creare l'installer per Windows (.exe)

```bash
npm run dist:win
```

Si può lanciare anche dal Mac. Il file `Solferino 3 Dashboard Setup <versione>.exe` compare in `dist/`: un doppio clic installa l'app per l'utente corrente (senza permessi di amministratore) e crea i collegamenti su Desktop e menu Start. L'installer non è firmato: al primo avvio Windows SmartScreen mostra un avviso → **Ulteriori informazioni** → **Esegui comunque**.

Su Windows la tendina "App di Windows" negli strumenti elenca i collegamenti del menu Start.

## Pubblicare una nuova versione

```bash
npm run release            # 1.0.0 → 1.0.1
npm run release -- minor   # 1.0.0 → 1.1.0
npm run release -- major   # 1.0.0 → 2.0.0
```

Lo script aumenta la versione, crea `.dmg` ed `.exe`, chiude l'app se è aperta e la aggiorna in `/Applications` riaprendola, fa commit, tag e push su GitHub e pubblica una Release con i due installer. Serve [GitHub CLI](https://cli.github.com) autenticata (`gh auth login`) e il branch `main`.

L'app controlla da sola se su GitHub c'è una versione più recente: all'avvio, ogni 5 minuti, quando si torna sulla finestra e al risveglio del computer. Quando ne trova una mostra una notifica di sistema e, nella barra laterale, il riquadro **Nuova versione** con il pulsante **Installa e riavvia**: l'app scarica la nuova versione, si chiude, si sostituisce e si riapre da sola (su Mac senza dover ripetere "Apri comunque", su Windows con l'installer in modalità silenziosa). Se l'installazione automatica non riesce compare il link per scaricarla a mano. Le richieste a GitHub sono condizionate (ETag), quindi i controlli senza novità non consumano il limite di richieste.

L'app si può aprire una sola volta: aprendola di nuovo torna in primo piano la finestra già aperta.

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
| Fotografo | Shooting, Pixieset |
| Commerciale | Lead, Preventivi |
| Project Manager | Progetti, Scadenze |

Nelle Impostazioni, sotto **Strumenti**, si possono attivare con una spunta anche gli strumenti degli altri profili (es. un Social Media Manager può aggiungere Palette colori e Font): compaiono nel menu sotto **Altri strumenti**.

**Pixieset**: elenco delle gallerie con cliente, galleria, data e pulsanti per aprirle e copiare link e password, con ricerca. Se il foglio ha più schede (es. una per fotografo) in alto compare la scelta tra le schede.

L'elenco può arrivare da un **foglio Google** (colonne riconosciute: Cliente/Nome, Link, Password, Data, Note; vengono lette tutte le schede visibili). Due modi:

- **Foglio privato (consigliato, obbligatorio se contiene password)**: nel foglio *Estensioni → Apps Script*, incolla [`scripts/pixieset-sheet.gs`](scripts/pixieset-sheet.gs), scrivi una chiave segreta in `KEY`, poi *Distribuisci → Nuova distribuzione → App web* con *Esegui come: Me* e *Chi ha accesso: Chiunque*. Nell'app premi **Collega foglio Google** e incolla l'URL `…/exec` e la chiave. Il foglio resta privato e lo script legge anche i link nascosti dietro un testo.
- **Foglio senza dati riservati**: condividilo come *Chiunque abbia il link può visualizzare* e incolla direttamente il link del foglio (in questo caso i testi con un link collegato vengono persi).

L'app rilegge il foglio quando apri la sezione (al massimo ogni 10 minuti) o con **Aggiorna dal foglio**; le gallerie del foglio si modificano nel foglio, quelle aggiunte a mano nell'app.

Le schede con una data compaiono in Home sotto **In programma**. Un clic sullo stato di una scheda la fa passare allo stato successivo. Cambiando profilo i dati delle altre sezioni restano salvati.

Quando riduci a icona la finestra compare un piccolo **widget flottante** con l'icona dell'app: un clic riapre la dashboard, trascinandolo lo sposti (la posizione viene ricordata).

Premi **Modifica** in alto a destra per modificare o eliminare link, clienti e snippet.

## Dati e backup

I dati sono salvati in locale in
`~/Library/Application Support/Solferino 3 Dashboard/dashboard-data.json` (Mac) o
`%APPDATA%\Solferino 3 Dashboard\dashboard-data.json` (Windows).
Dal menu laterale puoi esportare e importare un backup JSON.

## Struttura

- `main.js` – processo principale (finestra, salvataggio dati, apertura link)
- `preload.js` – ponte sicuro verso l'interfaccia
- `renderer/` – interfaccia (HTML, CSS, JS senza dipendenze)
- `renderer/icons.js` – icone [Font Awesome Free](https://fontawesome.com) 6.7.2 in SVG (licenza icone [CC BY 4.0](https://fontawesome.com/license/free)), incluse nell'app: funzionano anche offline
