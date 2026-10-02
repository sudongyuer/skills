#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const DOMAINS = ['workflow', 'quality', 'mobile', 'design', 'research', 'infrastructure'];
const ALLOWED_KEYS = ['name', 'description', 'argument-hint'];
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TEXT_EXT = new Set(['.md', '.mjs', '.js', '.ts', '.json', '.sh', '.py', '.html', '.css', '.yml', '.yaml', '.txt', '']);
const SKIP_DIRS = new Set(['.git', 'node_modules', '.acceptance', 'out', 'dist']);

export const PRIVACY_PATTERNS = [
  ['macOS home path', /\/Users\/(?!you\b|<)[A-Za-z0-9._-]+/],
  ['Linux home path', /\/home\/(?!user\b|<)[A-Za-z0-9._-]+/],
  ['GitHub token', /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}|\bgithub_pat_[A-Za-z0-9_]{20,}/],
  ['API key', /\bsk-(?:ant-)?[A-Za-z0-9_-]{20,}/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['email address', /\b[A-Za-z0-9._%+-]+@(?!example\.(?:com|org)\b|users\.noreply\.github\.com\b)[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/],
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

export function frontmatterKeys(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  if (!match) return null;
  const keys = {};
  let current = null;
  for (const line of match[1].split(/\r?\n/)) {
    const top = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (top) {
      current = top[1];
      keys[current] = top[2].trim();
    } else if (current && /^\s+\S/.test(line)) {
      keys[current] = `${keys[current]} ${line.trim()}`.trim();
    }
  }
  for (const key of Object.keys(keys)) keys[key] = keys[key].replace(/^[>|]-?\s*/, '').replace(/^["']|["']$/g, '');
  return keys;
}

function readmeRows(readme) {
  const rows = new Map();
  let heading = null;
  for (const line of readme.split(/\r?\n/)) {
    const h = /^### (\S+)\s*$/.exec(line);
    if (h) heading = h[1].toLowerCase();
    const link = /\]\((skills\/([^/]+)\/([^/]+)\/SKILL\.md)\)/.exec(line);
    if (link && line.trim().startsWith('|')) {
      const key = `${link[2]}/${link[3]}`;
      rows.set(key, [...(rows.get(key) ?? []), heading]);
    }
  }
  return rows;
}

function checkLinks(root, file, text, report) {
  const withoutCode = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
  for (const [, target] of withoutCode.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^(?:[a-z]+:|#|mailto:)/i.test(target) || target.includes('<')) continue;
    const path = decodeURIComponent(target.split('#')[0]);
    if (!path) continue;
    const resolved = resolve(dirname(file), path);
    if (!existsSync(resolved)) report(relative(root, file), `broken link: ${target}`);
  }
}

export function validateRepo(root, { privacy = false, denylist = [] } = {}) {
  const problems = [];
  const report = (file, message) => problems.push({ file, message });
  const skillsDir = join(root, 'skills');
  const skills = [];

  for (const domain of existsSync(skillsDir) ? readdirSync(skillsDir) : []) {
    const domainDir = join(skillsDir, domain);
    if (!statSync(domainDir).isDirectory()) continue;
    if (!DOMAINS.includes(domain)) report(`skills/${domain}`, `unknown domain (expected ${DOMAINS.join(', ')})`);
    for (const name of readdirSync(domainDir)) {
      const dir = join(domainDir, name);
      if (!statSync(dir).isDirectory()) continue;
      const rel = `skills/${domain}/${name}`;
      skills.push(`${domain}/${name}`);
      if (!KEBAB.test(name)) report(rel, 'directory name must be kebab-case');
      const skillFile = join(dir, 'SKILL.md');
      if (!existsSync(skillFile)) {
        report(rel, 'missing SKILL.md');
        continue;
      }
      const text = readFileSync(skillFile, 'utf8');
      const keys = frontmatterKeys(text);
      if (!keys) {
        report(`${rel}/SKILL.md`, 'missing frontmatter');
        continue;
      }
      if (keys.name !== name) report(`${rel}/SKILL.md`, `frontmatter name "${keys.name ?? ''}" must equal "${name}"`);
      if (!keys.description) report(`${rel}/SKILL.md`, 'frontmatter description is empty');
      const extra = Object.keys(keys).filter((key) => !ALLOWED_KEYS.includes(key));
      if (extra.length) report(`${rel}/SKILL.md`, `frontmatter may only contain ${ALLOWED_KEYS.join(', ')} (found ${extra.join(', ')})`);
      const lines = text.split(/\r?\n/).length;
      if (lines > 500) report(`${rel}/SKILL.md`, `${lines} lines; keep SKILL.md under 500 and move detail to references/`);
      for (const sub of readdirSync(dir)) {
        const subDir = join(dir, sub);
        if (statSync(subDir).isDirectory() && readdirSync(subDir).length === 0) report(`${rel}/${sub}`, 'empty resource directory');
      }
    }
  }

  const readmePath = join(root, 'README.md');
  if (!existsSync(readmePath)) report('README.md', 'missing');
  else {
    const rows = readmeRows(readFileSync(readmePath, 'utf8'));
    for (const key of skills) {
      const headings = rows.get(key) ?? [];
      const [domain] = key.split('/');
      if (headings.length === 0) report('README.md', `no row for skills/${key}`);
      else if (headings.length > 1) report('README.md', `skills/${key} is listed ${headings.length} times`);
      else if (headings[0] !== domain) report('README.md', `skills/${key} is listed under "${headings[0]}" instead of "${domain}"`);
    }
    for (const key of rows.keys()) if (!skills.includes(key)) report('README.md', `row for missing skill skills/${key}`);
  }

  for (const file of walk(root)) {
    if (extname(file) === '.md') checkLinks(root, file, readFileSync(file, 'utf8'), report);
  }

  if (privacy) {
    const patterns = [...PRIVACY_PATTERNS, ...denylist.map((word) => [`denylisted term "${word}"`, new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')])];
    for (const file of walk(root)) {
      if (!TEXT_EXT.has(extname(file))) continue;
      const lines = readFileSync(file, 'utf8').split(/\r?\n/);
      lines.forEach((line, i) => {
        if (line.includes('privacy-allow')) return;
        for (const [label, pattern] of patterns) if (pattern.test(line)) report(`${relative(root, file)}:${i + 1}`, label);
      });
    }
  }
  return problems;
}

export function loadDenylist(env = process.env) {
  const path = env.PRIVACY_DENYLIST ?? join(homedir(), '.config', 'skills', 'privacy-denylist');
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8').split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#'));
}

function main(argv) {
  const privacy = argv.includes('--privacy');
  const rootArg = argv.find((arg) => !arg.startsWith('--'));
  const root = resolve(rootArg ?? join(dirname(fileURLToPath(import.meta.url)), '..'));
  const problems = validateRepo(root, { privacy, denylist: privacy ? loadDenylist() : [] });
  for (const { file, message } of problems) console.error(`${file}: ${message}`);
  if (problems.length) {
    console.error(`\n${problems.length} problem(s)`);
    return 1;
  }
  console.log(privacy ? 'ok (structure, links, privacy)' : 'ok (structure, links)');
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exitCode = main(process.argv.slice(2));
