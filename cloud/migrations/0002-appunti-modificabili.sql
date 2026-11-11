-- 1.14.0: appunti condivisi modificabili da chi li riceve e copia per i destinatari quando il proprietario li elimina.
-- Da eseguire una sola volta sul database creato con lo schema della 1.13.0:
--   npx wrangler d1 execute solferino3-dashboard --remote --file=migrations/0002-appunti-modificabili.sql
ALTER TABLE shared_notes ADD COLUMN rev INTEGER NOT NULL DEFAULT 1;
ALTER TABLE shared_notes ADD COLUMN updated_by TEXT NOT NULL DEFAULT '';
ALTER TABLE shared_notes ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0;
