#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const COLUMNS = ['feature', 'surface', 'entry', 'files', 'verify'];

function cells(line) {
  return line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
}

export function parseFeatureMap(text) {
  const rows = [];
  const problems = [];
  const lines = text.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, '')).split(/\r?\n/);
  let header = null;
  lines.forEach((line, i) => {
    if (!line.trim().startsWith('|')) {
      header = null;
      return;
    }
    const row = cells(line);
    if (!header) {
      header = row.map((c) => c.toLowerCase());
      if (COLUMNS.some((c, j) => header[j] !== c)) problems.push({ line: i + 1, message: `table header must be: ${COLUMNS.join(' | ')}` });
      return;
    }
    if (row.every((c) => /^:?-{3,}:?$/.test(c))) return;
    const [feature, surface, entry, files, verify] = row;
    const paths = [...(files ?? '').matchAll(/`([^`]+)`/g)].map((m) => m[1]);
    const record = { line: i + 1, feature, surface, entry, verify, paths };
    for (const [name, value] of Object.entries({ feature, surface, entry, files, verify })) {
      if (!value) problems.push({ line: i + 1, message: `"${feature || '?'}": empty ${name}` });
    }
    if (files && paths.length === 0) problems.push({ line: i + 1, message: `"${feature}": files must be backticked paths` });
    rows.push(record);
  });
  if (rows.length === 0 && problems.length === 0) problems.push({ line: 0, message: 'no feature rows found' });
  return { rows, problems };
}

function globToRegExp(pattern) {
  const body = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*\/?/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]').replace(/\u0000/g, '.*');
  return new RegExp(`^${body}$`);
}

export function matches(pattern, file) {
  if (pattern.endsWith('/')) return file.startsWith(pattern);
  if (/[*?]/.test(pattern)) return globToRegExp(pattern).test(file);
  return file === pattern;
}

function listFiles(root) {
  try {
    return execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 }).split('\n').filter(Boolean);
  } catch {
    const out = [];
    const walk = (dir) => {
      for (const name of readdirSync(dir)) {
        if (name === '.git' || name === 'node_modules') continue;
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else out.push(relative(root, path));
      }
    };
    walk(root);
    return out;
  }
}

export function checkFeatureMap(text, root) {
  const { rows, problems } = parseFeatureMap(text);
  let files = null;
  for (const row of rows) {
    for (const path of row.paths) {
      if (path.includes('<')) {
        problems.push({ line: row.line, message: `"${row.feature}": placeholder path ${path}` });
        continue;
      }
      if (/[*?]/.test(path)) {
        files ??= listFiles(root);
        if (!files.some((f) => matches(path, f))) problems.push({ line: row.line, message: `"${row.feature}": no file matches ${path}` });
      } else if (!existsSync(join(root, path))) {
        problems.push({ line: row.line, message: `"${row.feature}": missing ${path}` });
      }
    }
  }
  return { rows, problems };
}

export function touchedFeatures(rows, changed) {
  const touched = rows.filter((row) => changed.some((file) => row.paths.some((p) => matches(p, file))));
  const unmapped = changed.filter((file) => !rows.some((row) => row.paths.some((p) => matches(p, file))));
  return { touched, unmapped };
}

function changedFiles(root, base) {
  const run = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
  const mergeBase = run(['merge-base', base, 'HEAD'])[0];
  return [...new Set([...run(['diff', '--name-only', mergeBase]), ...run(['ls-files', '--others', '--exclude-standard'])])];
}

function main(argv) {
  const [command, ...rest] = argv;
  const flag = (name) => {
    const i = rest.indexOf(name);
    return i >= 0 ? rest[i + 1] : undefined;
  };
  const root = resolve(flag('--root') ?? '.');
  const mapPath = resolve(flag('--map') ?? join(root, '.agents/acceptance/FEATURES.md'));
  if (!['check', 'touched'].includes(command)) {
    console.error('usage: check-feature-map.mjs check|touched [--root <repo>] [--map <FEATURES.md>] [--base <ref>]');
    process.exit(2);
  }
  if (!existsSync(mapPath)) {
    console.error(`no feature map at ${relative(process.cwd(), mapPath) || mapPath}`);
    process.exit(1);
  }
  const { rows, problems } = checkFeatureMap(readFileSync(mapPath, 'utf8'), root);
  if (command === 'check') {
    for (const p of problems) console.error(`${relative(process.cwd(), mapPath)}:${p.line}: ${p.message}`);
    if (problems.length) process.exit(1);
    console.log(`ok: ${rows.length} feature(s), every path exists`);
    return;
  }
  const { touched, unmapped } = touchedFeatures(rows, changedFiles(root, flag('--base') ?? 'origin/HEAD'));
  for (const row of touched) console.log(`${row.feature} [${row.surface}] entry: ${row.entry} | verify: ${row.verify}`);
  if (!touched.length) console.log('no mapped feature touched');
  if (unmapped.length) console.log(`\nchanged files no feature lists (add a row or extend one if user-visible):\n${unmapped.map((f) => `  ${f}`).join('\n')}`);
  if (problems.length) {
    for (const p of problems) console.error(`${relative(process.cwd(), mapPath)}:${p.line}: ${p.message}`);
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href || fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? '')) main(process.argv.slice(2));
