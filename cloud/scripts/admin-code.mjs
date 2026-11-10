// Crea (se manca) un amministratore e stampa un codice per collegare un suo computer.
// Serve per il primo admin, o se nessun admin ha più un computer collegato.
//   node scripts/admin-code.mjs nome@solferino3.it ["Nome"] [--local]
import { execFileSync } from 'node:child_process';
import { createHash, randomInt } from 'node:crypto';

const args = process.argv.slice(2);
const local = args.includes('--local');
const [email, name = ''] = args.filter((a) => a !== '--local').map((a, i) => (i === 0 ? a.trim().toLowerCase() : a));
if (!/^[^@\s]+@[^@\s]+$/.test(email || '')) {
  console.error('Uso: node scripts/admin-code.mjs nome@solferino3.it ["Nome"] [--local]');
  process.exit(1);
}

// Stesso formato e stesso hash del Worker (src/index.js: newCode, codeKey, sha256url)
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const raw = Array.from({ length: 12 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
const code = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`;
const hash = createHash('sha256').update(raw).digest('base64url');
const now = Date.now();
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

const sql = `INSERT INTO users (email, name, role, created_at) VALUES (${q(email)}, ${q(name)}, 'admin', ${now})
  ON CONFLICT (email) DO UPDATE SET role = 'admin';
INSERT INTO codes (code_hash, email, created_by, created_at, expires_at) VALUES (${q(hash)}, ${q(email)}, 'terminale', ${now}, ${now + 7 * 864e5});`;

execFileSync('npx', ['wrangler', 'd1', 'execute', 'solferino3-dashboard', local ? '--local' : '--remote', '--command', sql], { stdio: 'ignore' });
console.log(`\n${email} è amministratore.\nCodice per collegare il computer (valido 7 giorni, monouso):\n\n    ${code}\n`);
