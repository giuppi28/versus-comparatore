// One-shot loader for the comuni dataset (prepared by the reviewer).
// Sends each reviewed JSON file, byte-for-byte, to the TEMPORARY RPC public.bootstrap_load_comuni,
// which accepts only these exact 9 files (SHA-256 allow-list) and upserts typed rows.
// Run from app/:  node supabase/bootstrap/load_comuni.mjs
// Reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY from app/.env.local.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const envText = readFileSync(join(here, '..', '..', '.env.local'), 'utf8');
const env = Object.fromEntries(envText.split('\n').filter(l => /^[A-Z_]+=/.test(l))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Missing Supabase URL/key in app/.env.local');

let total = 0;
for (const n of ['01','02','03','04','05','06','07','08','09']) {
  const text = readFileSync(join(here, `comuni_${n}.json`), 'utf8');
  const res = await fetch(`${url}/rest/v1/rpc/bootstrap_load_comuni`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_json: text }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`chunk ${n}: HTTP ${res.status} ${body}`);
  total += Number(body);
  console.log(`chunk ${n}: ${body} rows`);
}
console.log(`TOTAL ${total} (expected 7894)`);
