# Backend Cloudflare – Solferino 3 Dashboard

Worker + D1 su `https://solferino3-dashboard-api.m-gallo.workers.dev`: ruoli utente/admin, sincronizzazione dei dati personali, kit di link condiviso.
Non fa parte del build Electron.

## Accesso: codice per dispositivo

Ogni computer si collega con un codice monouso (`XXXX-XXXX-XXXX`, valido 7 giorni), da inserire in Impostazioni → Account Solferino 3.
- Un admin genera il codice da Impostazioni → Amministrazione (all'invito o con "Codice" accanto alla persona).
- Un utente già collegato genera il codice per un suo altro computer con "Collega un altro computer".
- Primo admin, o se nessun admin ha più un computer collegato:
  ```sh
  npm run admin-code -- nome@solferino3.it "Nome"
  ```

Rimuovere una persona scollega tutti i suoi computer; i suoi dati restano e li ritrova se viene invitata di nuovo.

## Pubblicazione

```sh
npm install
npx wrangler login
npm run db:init     # solo la prima volta (o dopo modifiche a schema.sql compatibili)
npm run deploy
```

Aggiornamenti del database: i file in `migrations/` vanno eseguiti una sola volta, in ordine, prima del deploy
(es. `npx wrangler d1 execute solferino3-dashboard --remote --file=migrations/0002-appunti-modificabili.sql`).
`schema.sql` contiene già tutto per un database nuovo.

## Appunti condivisi

Il proprietario sceglie i colleghi; chi li riceve viene avvisato (notifica di sistema) e può modificarli.
La copia online è quella di riferimento: ogni salvataggio porta la revisione letta, e se nel frattempo qualcun altro
ha salvato vince la versione online e quella scritta resta come appunto a parte. Se il proprietario elimina l'appunto,
ognuno dei destinatari ne salva una copia nei propri appunti; togliendo la spunta a un collega, invece, lui non lo vede più.

## Prove in locale

```sh
npm run db:init:local
node scripts/admin-code.mjs nome@solferino3.it "Nome" --local
npx wrangler dev --port 8799
S3_CLOUD_URL=http://localhost:8799 npx electron .. --user-data-dir=/percorso/temporaneo
```
