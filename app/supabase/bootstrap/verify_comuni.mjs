// Read-only verification of the comuni dataset in the REAL Supabase project, using the
// publishable key over REST (anon can read public.comuni under RLS).
// Run from app/:  node supabase/bootstrap/verify_comuni.mjs
// Reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY from app/.env.local.
// Exit code 0 = all checks passed, 1 = at least one failure.
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

const headers = { apikey: key, Authorization: `Bearer ${key}` };
let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}: ${JSON.stringify(actual)}${ok ? '' : ` (expected ${JSON.stringify(expected)})`}`);
}

/** Exact row count for a PostgREST filter (query string without leading '?'). */
async function count(filter = '') {
  const res = await fetch(`${url}/rest/v1/comuni?select=istat_code${filter ? `&${filter}` : ''}`, {
    method: 'HEAD',
    headers: { ...headers, Prefer: 'count=exact', Range: '0-0' },
  });
  if (!res.ok && res.status !== 206) throw new Error(`count(${filter}): HTTP ${res.status}`);
  const range = res.headers.get('content-range') ?? '';
  return Number(range.split('/')[1]);
}

async function get(query) {
  const res = await fetch(`${url}/rest/v1/comuni?${query}`, { headers });
  if (!res.ok) throw new Error(`GET ${query}: HTTP ${res.status} ${await res.text()}`);
  return res.json();
}

// ---- totals and climate zones
check('total comuni', await count(), 7894);
const zones = {};
for (const z of ['A', 'B', 'C', 'D', 'E', 'F']) zones[z] = await count(`climate_zone=eq.${z}`);
zones.null = await count('climate_zone=is.null');
check('per climate_zone', zones, { A: 2, B: 158, C: 981, D: 1566, E: 4159, F: 1007, null: 21 });

// ---- full scan (paged): provinces, regions, CAPs
const rows = [];
for (let from = 0; ; from += 1000) {
  const res = await fetch(`${url}/rest/v1/comuni?select=istat_code,province_code,region,caps&order=istat_code`, {
    headers: { ...headers, Range: `${from}-${from + 999}` },
  });
  if (!res.ok && res.status !== 206) throw new Error(`page ${from}: HTTP ${res.status}`);
  const page = await res.json();
  rows.push(...page);
  if (page.length < 1000) break;
}
check('rows fetched', rows.length, 7894);
check('distinct provinces', new Set(rows.map(r => r.province_code)).size, 110);
check('distinct regions', new Set(rows.map(r => r.region)).size, 20);
check('comuni without CAP', rows.filter(r => !Array.isArray(r.caps) || r.caps.length === 0).length, 0);

// ---- spot checks (istat_code -> name, zone)
const spots = [
  ['015146', 'Milano', 'E'],
  ['058091', 'Roma', 'D'],
  ['084020', 'Lampedusa e Linosa', 'A'],
  ['025006', 'Belluno', 'F'],
  ['063049', 'Napoli', 'C'],
  ['082053', 'Palermo', 'B'],
];
const spotRows = await get(`select=istat_code,name,climate_zone&istat_code=in.(${spots.map(s => s[0]).join(',')})`);
for (const [code, name, zone] of spots) {
  const r = spotRows.find(x => x.istat_code === code);
  check(`spot ${name}`, r ? [r.name, r.climate_zone] : null, [name, zone]);
}

// ---- accent-insensitive search on name_search
const cefalu = await get('select=name,name_search,province_code&name_search=ilike.*cefalu*');
check('search "cefalu"', cefalu.map(r => `${r.name} (${r.province_code})`), ['Cefalù (PA)']);
const forli = await get('select=name,name_search&name_search=eq.forli');
check('name_search "forli"', forli.map(r => r.name), ['Forlì']);

console.log(failures === 0 ? 'ALL COMUNI CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
