#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SKIP_DIRS = new Set(['.git', 'node_modules', 'vendor', 'Pods', 'dist', 'build', 'out', '.next', 'coverage', 'DerivedData', '.acceptance']);
const SKIP_FILE = /(?:\.min\.|\.lock$|-lock\.json$|\.snap$|\.map$)/;
const TEXT_EXT = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts', '.swift', '.m', '.mm', '.h', '.kt', '.java', '.py', '.rb', '.go', '.rs', '.c', '.cc', '.cpp', '.cs', '.php', '.sh', '.bash', '.zsh', '.css', '.scss', '.vue', '.svelte', '.yml', '.yaml', '.md']);
const MAX_BYTES = 512 * 1024;
const TICKET = /(?:#\d+|\b[A-Z][A-Z0-9]+-\d+\b|https?:\/\/\S+)/;

export const CATEGORIES = [
  {
    id: 'suppression',
    label: 'Suppressed check without a reason',
    test: (line) => {
      const m = /(eslint-disable(?:-next-line|-line)?|@ts-ignore|@ts-nocheck|@ts-expect-error|#\s*noqa|#\s*type:\s*ignore|swiftlint:disable(?::next|:this)?|biome-ignore|NOLINT(?:NEXTLINE)?|@SuppressWarnings)(.*)$/.exec(line);
      if (!m) return false;
      return !/(?:\s--\s*[A-Za-z]{3,}|:\s*[A-Za-z]{3,}\s+[A-Za-z]{2,}|\bbecause\b|\breason\b|^\s+[A-Za-z]{3,}\s+[A-Za-z]{3,}\s+[A-Za-z]{2,})/i.test(m[2]);
    },
  },
  {
    id: 'untracked-todo',
    label: 'TODO / FIXME / HACK / XXX without a ticket',
    test: (line) => /(?:\/\/|#|\/\*|\*|<!--|--)\s*(?:TODO|FIXME|HACK|XXX)\b/.test(line) && !TICKET.test(line),
  },
  {
    id: 'workaround-comment',
    label: 'Comment defending a temporary workaround',
    test: (line) => /(?:\/\/|#|\/\*|\*)\s*.*\b(?:workaround|temporary|temporarily|for now|quick fix|quick hack|hacky|band-?aid|monkey-?patch|don'?t touch|do not touch|no idea why|magic number)\b/i.test(line) && !TICKET.test(line),
  },
  {
    id: 'skipped-test',
    label: 'Skipped, focused or quarantined test',
    test: (line) => /\b(?:it|test|describe|context)\.(?:skip|only|fixme|todo)\s*\(|\bx(?:it|describe|test)\s*\(|\bf(?:it|describe)\s*\(|@pytest\.mark\.skip|@unittest\.skip|XCTSkip\s*\(|\.disabled\(\s*["']/.test(line),
  },
  {
    id: 'timing-hack',
    label: 'Sleep or fixed timeout standing in for a condition',
    test: (line) => /\b(?:waitForTimeout|sleep|usleep|Thread\.sleep|time\.sleep|asyncAfter)\s*\(\s*(?:deadline:\s*\.now\(\)\s*\+\s*)?\d|setTimeout\s*\([^,]+,\s*\d{3,}\s*\)/.test(line),
  },
];

function listFiles(root) {
  try {
    const out = execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
    return out.split('\n').filter(Boolean).filter((f) => !f.split('/').some((part) => SKIP_DIRS.has(part)));
  } catch {
    const files = [];
    const walk = (dir) => {
      for (const name of readdirSync(dir)) {
        if (SKIP_DIRS.has(name)) continue;
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else files.push(relative(root, path));
      }
    };
    walk(root);
    return files;
  }
}

export function scan(root, { categories = CATEGORIES.map((c) => c.id) } = {}) {
  const active = CATEGORIES.filter((c) => categories.includes(c.id));
  const hits = [];
  const seen = new Map();
  for (const file of listFiles(root)) {
    if (!TEXT_EXT.has(extname(file)) || SKIP_FILE.test(file)) continue;
    const path = join(root, file);
    let stat;
    try { stat = statSync(path); } catch { continue; }
    if (!stat.isFile() || stat.size > MAX_BYTES) continue;
    const lines = readFileSync(path, 'utf8').split(/\r?\n/);
    lines.forEach((line, i) => {
      for (const category of active) {
        if (category.id === 'suppression' && extname(file) === '.md') continue;
        if (!category.test(line)) continue;
        const text = line.trim().slice(0, 160);
        hits.push({ category: category.id, file, line: i + 1, text });
        const key = `${category.id}\u0000${text}`;
        seen.set(key, (seen.get(key) ?? 0) + 1);
      }
    });
  }
  for (const hit of hits) hit.copies = seen.get(`${hit.category}\u0000${hit.text}`);
  const summary = active.map((c) => ({ category: c.id, label: c.label, count: hits.filter((h) => h.category === c.id).length, files: new Set(hits.filter((h) => h.category === c.id).map((h) => h.file)).size }));
  return { summary, hits };
}

function main(argv) {
  const json = argv.includes('--json');
  const only = argv.find((a) => a.startsWith('--only='))?.slice(7).split(',');
  const root = resolve(argv.find((a) => !a.startsWith('--')) ?? '.');
  const result = scan(root, only ? { categories: only } : undefined);
  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  for (const s of result.summary) console.log(`${String(s.count).padStart(5)}  ${s.category.padEnd(20)} ${s.files} file(s)  ${s.label}`);
  for (const s of result.summary) {
    const group = result.hits.filter((h) => h.category === s.category);
    if (!group.length) continue;
    console.log(`\n## ${s.category}`);
    for (const h of group) console.log(`${h.file}:${h.line}${h.copies > 1 ? `  (x${h.copies})` : ''}  ${h.text}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href || fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? '')) main(process.argv.slice(2));
