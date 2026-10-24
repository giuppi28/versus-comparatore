#!/usr/bin/env node
// Statusline — shows model, context % and git branch; caches context % for the context-guard hook.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const WARN = Number(process.env.CTX_WARN_PCT ?? 30);
const STOP = Number(process.env.CTX_STOP_PCT ?? 35);

let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8')); } catch {}

const pct = Number(input.context_window?.used_percentage ?? NaN);
const model = input.model?.display_name ?? 'Claude';

if (input.session_id && Number.isFinite(pct)) {
  try {
    const dir = path.join(os.tmpdir(), 'claude-ctx');
    fs.mkdirSync(dir, { recursive: true });
    const id = String(input.session_id).replace(/[^\w-]/g, '');
    fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify({ pct, ts: Date.now() }));
  } catch {}
}

let branch = '';
try {
  const root = input.workspace?.project_dir ?? input.cwd ?? process.cwd();
  const head = fs.readFileSync(path.join(root, '.git', 'HEAD'), 'utf8').trim();
  branch = head.startsWith('ref: refs/heads/') ? head.slice(16) : head.slice(0, 7);
} catch {}

const color = !Number.isFinite(pct) ? '' : pct >= STOP ? '\x1b[31m' : pct >= WARN ? '\x1b[33m' : '\x1b[32m';
const reset = color ? '\x1b[0m' : '';
const ctx = Number.isFinite(pct) ? `${color}ctx ${Math.round(pct)}%${reset}` : 'ctx –';
process.stdout.write([model, ctx, branch].filter(Boolean).join(' · '));
