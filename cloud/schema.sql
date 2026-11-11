-- Utenti invitati dagli admin
CREATE TABLE IF NOT EXISTS users (
  email      TEXT PRIMARY KEY,
  name       TEXT NOT NULL DEFAULT '',
  role       TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at INTEGER NOT NULL,
  last_seen  INTEGER
);

-- Sessioni dell'app desktop: si salva solo l'hash del token
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  device     TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_email ON sessions (email);

-- Codici per collegare un computer: monouso, generati da un admin (o dall'utente da un computer già collegato)
CREATE TABLE IF NOT EXISTS codes (
  code_hash  TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

-- Dati personali della dashboard (uno per utente, con revisione per evitare sovrascritture)
CREATE TABLE IF NOT EXISTS user_data (
  email      TEXT PRIMARY KEY,
  rev        INTEGER NOT NULL,
  data       TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Contenuti condivisi gestiti dagli admin (es. 'tools' = kit di link Solferino 3)
CREATE TABLE IF NOT EXISTS shared (
  key        TEXT PRIMARY KEY,
  rev        INTEGER NOT NULL,
  data       TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Appunti condivisi dal proprietario con alcuni colleghi, modificabili da tutti (rev evita di sovrascrivere
-- le modifiche altrui). Eliminati dal proprietario restano (deleted = 1) finché ogni destinatario ne ha salvato una copia.
CREATE TABLE IF NOT EXISTS shared_notes (
  owner       TEXT NOT NULL,
  id          TEXT NOT NULL,          -- id dell'appunto nei dati del proprietario
  title       TEXT NOT NULL,
  date        TEXT NOT NULL DEFAULT '',
  html        TEXT NOT NULL,
  shared_with TEXT NOT NULL,          -- array JSON di email
  updated_at  INTEGER NOT NULL,
  rev         INTEGER NOT NULL DEFAULT 1,
  updated_by  TEXT NOT NULL DEFAULT '',
  deleted     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (owner, id)
);
