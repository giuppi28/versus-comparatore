#!/usr/bin/env node
// PostToolUse hook — warns the orchestrator when its context passes the warn/stop thresholds.
// Context % comes from the statusline cache (exact), or from the transcript as a fallback.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const WARN = Number(process.env.CTX_WARN_PCT ?? 30);
const STOP = Number(process.env.CTX_STOP_PCT ?? 35);
const WINDOW = Number(process.env.CTX_WINDOW_TOKENS ?? 200000); // fallback only
const DIR = path.join(os.tmpdir(), 'claude-ctx');

let input;
try { input = JSON.parse(fs.readFileSync(0, 'utf8')); } catch { process.exit(0); }
if (!input?.session_id) process.exit(0);
// Tool calls made inside sub-agents are not the orchestrator's context.
if (input.agent_id || input.agent_type) process.exit(0);

const id = String(input.session_id).replace(/[^\w-]/g, '');

function fromCache() {
  try {
    const c = JSON.parse(fs.readFileSync(path.join(DIR, `${id}.json`), 'utf8'));
    if (typeof c.pct === 'number' && Date.now() - c.ts < 15 * 60 * 1000) return c.pct;
  } catch {}
  return null;
}

function fromTranscript() {
  try {
    const p = input.transcript_path;
    if (!p) return null;
    const { size } = fs.statSync(p);
    const len = Math.min(size, 512 * 1024);
    const buf = Buffer.alloc(len);
    const fd = fs.openSync(p, 'r');
    fs.readSync(fd, buf, 0, len, size - len);
    fs.closeSync(fd);
    const lines = buf.toString('utf8').split('\n').reverse();
    for (const line of lines) {
      if (!line.includes('"usage"')) continue;
      try {
        const e = JSON.parse(line);
        if (e.isSidechain) continue;
        const u = e.message?.usage;
        if (!u) continue;
        const used = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
        return (used / WINDOW) * 100;
      } catch {}
    }
  } catch {}
  return null;
}

const pct = fromCache() ?? fromTranscript();
if (pct == null || pct < WARN) process.exit(0);

const stateFile = path.join(DIR, `${id}.state.json`);
let state = {};
try { state = JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch {}

let msg = null;
const p = Math.round(pct);
if (pct >= STOP) {
  // Repeated on every tool call until the session stops.
  msg = `CONTEXT GUARD (orchestrator only; sub-agents ignore): context at ${p}% — STOP NOW. ` +
    `Finish or checkpoint the current task, commit, update docs/HANDOFF.md and docs/TASKS.md, ` +
    `then tell Giuseppe: "Contesto al ${p}%: ho salvato tutto. Fai /clear e scrivi riprendi." Start nothing new.`;
} else if (!state.warned) {
  state.warned = true;
  msg = `CONTEXT GUARD (orchestrator only; sub-agents ignore): context at ${p}%. ` +
    `Finish the current task, then checkpoint. Don't start a large new task in this session.`;
}

if (!msg) process.exit(0);
try { fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(stateFile, JSON.stringify(state)); } catch {}
process.stdout.write(JSON.stringify({
  hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: msg },
}));
