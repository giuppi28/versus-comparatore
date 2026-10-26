#!/usr/bin/env node
// PreToolUse hook (Bash) — blocks destructive or forbidden commands, even with --dangerously-skip-permissions.
// Exit code 2 blocks the call and shows the reason to Claude.
import fs from 'node:fs';

let input;
try { input = JSON.parse(fs.readFileSync(0, 'utf8')); } catch { process.exit(0); }
const cmd = String(input?.tool_input?.command ?? '');
if (!cmd) process.exit(0);

const block = (reason) => {
  process.stderr.write(`Blocked by bash-guard: ${reason}`);
  process.exit(2);
};

// Folders that may be removed recursively (build output, caches).
const RM_OK = /^(node_modules|\.next|dist|build|out|coverage|\.turbo|\.cache|\.vercel\/output)(\/.*)?$|^\/tmp\//;

const segments = cmd.split(/&&|\|\||;|\||\n/).map((s) => s.trim()).filter(Boolean);
for (const seg of segments) {
  const tokens = seg.split(/\s+/);
  const args = tokens[0] === 'sudo' ? tokens.slice(1) : tokens;
  if (args[0] === 'rm') {
    const flags = args.filter((t) => t.startsWith('-'));
    const recursive = flags.some((f) => f === '--recursive' || /^-[a-zA-Z]*[rR]/.test(f));
    const targets = args.slice(1).filter((t) => !t.startsWith('-'))
      .map((t) => t.replace(/^['"]|['"]$/g, '').replace(/^\.\//, '').replace(/(.)\/$/, '$1'));
    if (recursive && targets.some((t) => !RM_OK.test(t))) {
      block(`recursive rm outside build/cache folders (${targets.join(' ')}). Delete specific files instead, or ask Giuseppe.`);
    }
  }
}

const rules = [
  [/\bsudo\b/, 'sudo is not allowed.'],
  [/\bgit\s+push\b/, 'pushing is Giuseppe\'s step at phase end, after his check. Commit locally and continue.'],
  [/\bgit\s+reset\s+--hard\b/, 'git reset --hard can destroy work. Ask Giuseppe.'],
  [/\bgit\s+clean\s+-\w*f/, 'git clean -f deletes untracked files. Ask Giuseppe.'],
  [/\bgit\s+branch\s+-D\b/, 'force-deleting branches is not allowed.'],
  [/\bgit\s+remote\s+(add|set-url|remove|rm|rename)\b/, 'changing git remotes needs Giuseppe\'s OK.'],
  [/\bgit\s+(checkout|switch)\s+(-\w+\s+)*main\b/, 'work happens on dev; main is production. Ask Giuseppe.'],
  [/\bgit\s+merge\b[^\n]*\bmain\b|\bgit\s+rebase\b[^\n]*\bmain\b/, 'merging/rebasing main is a production step for Giuseppe.'],
  [/\bsupabase\s+db\s+reset\b[^\n]*(--linked|--db-url)/, 'resetting a remote Supabase database is not allowed.'],
  [/\bdrop\s+(database|schema)\b/i, 'dropping a database or schema is not allowed.'],
  [/\bvercel\b[^\n]*(--prod\b|\bpromote\b|\brollback\b)/, 'production deploys are Giuseppe\'s step.'],
  [/\bvercel\s+env\b/, 'Vercel environment variables are managed by Giuseppe.'],
  [/(^|[\s'"=/<>])\.env(\.(?!example\b)[\w.-]+)?(?=$|[\s'";|&)<>])/, '.env files hold secrets: agents never read or write them. Use .env.example for variable names.'],
];

for (const [re, reason] of rules) if (re.test(cmd)) block(reason);
process.exit(0);
