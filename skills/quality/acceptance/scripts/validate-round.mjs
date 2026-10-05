#!/usr/bin/env node
// Acceptance round tool — no dependencies, Node 18+.
//
//   node validate-round.mjs new <slug> [--root .acceptance]   allocate the next round dir
//   node validate-round.mjs check <round-dir>                 validate, print coverage
//   node validate-round.mjs seal <round-dir>                  validate, render report.md, freeze
//   node validate-round.mjs pr-body <round-dir> [--asset-base <url>]
//                                                             print report.md; with --asset-base links are
//                                                             remote, without it they stay round-relative
//                                                             for `gh ... --attach` to rewrite
//   node validate-round.mjs pr-assets <round-dir>             list evidence files `gh --attach` can upload
//
// Contract: references/report.md. Exit code 1 on any error.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCHEMA = 'acceptance-round@1';
export const TRACE_SCHEMA = 'klm-trace@1';
export const EVIDENCE_TYPES = [
  'screenshot',
  'gif',
  'video',
  'audio',
  'text',
  'markdown',
  'dom_snapshot',
  'transcript',
];
export const STATUSES = ['pass', 'fail', 'blocked', 'uncertain'];
export const VERIFIERS = ['human', 'program'];
export const SURFACES = ['web', 'desktop', 'cli', 'mobile', 'native', 'bot'];
export const PROVENANCE = ['agent-browser', 'cdp', 'cli', 'program'];
export const VERDICTS = ['pass', 'fail', 'partial'];
export const SEAL_FILE = '.sealed.json';
const ROUND_RE = /^round-(\d+)$/;
const IMAGE_TYPES = new Set(['screenshot', 'gif']);
const ATTACHABLE_EXT = /\.(png|jpe?g|gif|webp|mp4|mov|webm)$/i;

// Programmatic gates are never acceptance checks. Matched on title, category, AND method.
export const GATE_PATTERNS = [
  /\b(unit|integration|regression|snapshot|e2e|component)\s+tests?\b/i,
  /\btests?\s+(pass|passes|passed|green|succeed)/i,
  /\btest\s+suite\b/i,
  /\b(test|code)\s+coverage\b|\bcoverage\s+(report|threshold|gate)\b/i,
  /\btype-?check(s|ing)?\b|\btsc\b|\bmypy\b|\bpyright\b/i,
  /\blint(s|ing|er)?\b|\beslint\b|\boxlint\b|\bclippy\b|\bbiome\b/i,
  /\bformat(ting|ter)?\s+(check|passes|clean)|\bprettier\b|\boxfmt\b/i,
  /\bcompiles?\b|\bcompilation\s+succeeds?\b/i,
  /\bbuild\s+(passes|succeeds|is\s+green|is\s+clean|works)\b|\bclean\s+build\b/i,
  /\bCI\b.*\b(green|passes|passing)\b/i,
  /\b(pnpm|npm|yarn|bun)\s+(run\s+)?(test|lint|typecheck|type-check|check|format|build)\b/i,
  /\b(vitest|jest|mocha|pytest|cargo\s+test|go\s+test|xcodebuild\s+test)\b/i,
];

export function looksLikeGate(c) {
  for (const field of ['title', 'category', 'method']) {
    const value = typeof c?.[field] === 'string' ? c[field] : '';
    for (const re of GATE_PATTERNS) {
      const m = value.match(re);
      if (m) return { field, match: m[0] };
    }
  }
  return null;
}

function listRounds(acceptanceDir) {
  if (!fs.existsSync(acceptanceDir)) return [];
  return fs
    .readdirSync(acceptanceDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && ROUND_RE.test(d.name))
    .map((d) => Number(d.name.match(ROUND_RE)[1]))
    .sort((a, b) => a - b);
}

export function newRound(root, slug) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug || '')) {
    throw new Error(`slug must be kebab-case [a-z0-9-], got ${JSON.stringify(slug)}`);
  }
  fs.mkdirSync(root, { recursive: true });
  const ignore = path.join(root, '.gitignore');
  if (!fs.existsSync(ignore)) fs.writeFileSync(ignore, '*\n');
  const acceptanceDir = path.join(root, slug);
  fs.mkdirSync(acceptanceDir, { recursive: true });
  const rounds = listRounds(acceptanceDir);
  const n = rounds.length ? rounds[rounds.length - 1] + 1 : 1;
  const dir = path.join(acceptanceDir, `round-${n}`);
  // Non-recursive mkdir throws EEXIST: a round directory is never reused.
  fs.mkdirSync(dir);
  fs.mkdirSync(path.join(dir, 'assets'));
  return dir;
}

function walk(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, base));
    else if (entry.isFile()) out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out.sort();
}

export function hashRound(dir) {
  const hashes = {};
  for (const rel of walk(dir)) {
    if (rel === SEAL_FILE) continue;
    hashes[rel] = crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, rel))).digest('hex');
  }
  return hashes;
}

function sealDrift(dir) {
  const sealPath = path.join(dir, SEAL_FILE);
  if (!fs.existsSync(sealPath)) return null;
  const sealed = JSON.parse(fs.readFileSync(sealPath, 'utf8')).files || {};
  const now = hashRound(dir);
  const changed = [...new Set([...Object.keys(sealed), ...Object.keys(now)])].filter(
    (k) => sealed[k] !== now[k],
  );
  return changed;
}

function readJson(file, errors, label) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    errors.push(`${label}: ${e.code === 'ENOENT' ? 'missing' : `invalid JSON (${e.message})`}`);
    return null;
  }
}

const isStr = (v) => typeof v === 'string' && v.trim().length > 0;

export function validateRound(roundDir) {
  const errors = [];
  const warnings = [];
  const dir = path.resolve(roundDir);
  const m = path.basename(dir).match(ROUND_RE);
  const coverage = { complete: 0, required: 0 };
  if (!m) {
    errors.push(`round directory must be named round-<n>, got ${path.basename(dir)}`);
    return { errors, warnings, coverage, result: null };
  }
  const index = Number(m[1]);
  const acceptanceDir = path.dirname(dir);

  const drift = sealDrift(dir);
  if (drift && drift.length) {
    errors.push(
      `round is sealed and immutable; changed since sealing: ${drift.join(', ')}. ` +
        'Revert them and put the re-verification in a NEW round (validate-round.mjs new).',
    );
  }

  const result = readJson(path.join(dir, 'result.json'), errors, 'result.json');
  if (!result) return { errors, warnings, coverage, result };

  if (result.schema !== SCHEMA) errors.push(`schema must be "${SCHEMA}"`);
  if (!isStr(result.requirement)) errors.push('requirement: one-sentence business goal is required');
  if (result.round !== index) errors.push(`round must equal the directory index (${index})`);
  if (!isStr(result.title)) errors.push('title is required');
  if (result.subject !== undefined && (typeof result.subject !== 'object' || result.subject === null)) {
    errors.push('subject must be an object ({ branch, commit, pullRequest, dirty })');
  }
  if (result.surfaces !== undefined) {
    if (!Array.isArray(result.surfaces) || result.surfaces.some((s) => !SURFACES.includes(s))) {
      errors.push(`surfaces must be a subset of ${SURFACES.join('|')}`);
    }
  }

  if (index > 1) {
    const first = path.join(acceptanceDir, 'round-1', 'result.json');
    if (fs.existsSync(first)) {
      try {
        const firstReq = JSON.parse(fs.readFileSync(first, 'utf8')).requirement;
        if (isStr(result.requirement) && firstReq !== result.requirement) {
          errors.push('requirement is immutable: it must match round-1 exactly');
        }
      } catch {
        warnings.push('round-1/result.json is unreadable; requirement not compared');
      }
    }
    if (!fs.existsSync(path.join(acceptanceDir, `round-${index - 1}`))) {
      warnings.push(`round-${index - 1} is missing; rounds should be consecutive`);
    }
  }

  const cases = Array.isArray(result.cases) ? result.cases : null;
  if (!cases || cases.length === 0) {
    errors.push('cases must be a non-empty array');
  }
  const ids = new Set();
  let gates = 0;
  for (const [i, c] of (cases || []).entries()) {
    const label = `cases[${i}]${isStr(c?.id) ? ` (${c.id})` : ''}`;
    if (!c || typeof c !== 'object') {
      errors.push(`${label}: must be an object`);
      continue;
    }
    if (!isStr(c.id) || !/^[A-Za-z0-9._-]+$/.test(c.id)) errors.push(`${label}: id must match [A-Za-z0-9._-]+`);
    else if (ids.has(c.id)) errors.push(`${label}: duplicate id`);
    else ids.add(c.id);
    if (!isStr(c.title)) errors.push(`${label}: title is required`);
    if (!VERIFIERS.includes(c.verifier)) errors.push(`${label}: verifier must be ${VERIFIERS.join('|')}`);
    if (!STATUSES.includes(c.status)) errors.push(`${label}: status must be ${STATUSES.join('|')}`);
    if (c.surface !== undefined && !SURFACES.includes(c.surface)) {
      errors.push(`${label}: surface must be ${SURFACES.join('|')}`);
    }
    if (!isStr(c.observation)) errors.push(`${label}: observation is required`);

    const gate = looksLikeGate(c);
    if (gate) {
      gates += 1;
      errors.push(
        `${label}: looks like a programmatic gate (${gate.field} matches "${gate.match}"). ` +
          'Remove it from cases[]; report it as one line under notes "Verification".',
      );
    }

    const required = c.requiredEvidence ?? [];
    if (!Array.isArray(required) || required.some((t) => !EVIDENCE_TYPES.includes(t))) {
      errors.push(`${label}: requiredEvidence must be an array of ${EVIDENCE_TYPES.join('|')}`);
    }
    const evidence = Array.isArray(c.evidence) ? c.evidence : null;
    if (!evidence) errors.push(`${label}: evidence must be an array`);
    const present = new Set();
    for (const [j, e] of (evidence || []).entries()) {
      const el = `${label}.evidence[${j}]`;
      if (!e || typeof e !== 'object') {
        errors.push(`${el}: must be an object`);
        continue;
      }
      if (!EVIDENCE_TYPES.includes(e.type)) errors.push(`${el}: type must be ${EVIDENCE_TYPES.join('|')}`);
      if (!isStr(e.caption)) errors.push(`${el}: caption is required`);
      if (!PROVENANCE.includes(e.provenance)) errors.push(`${el}: provenance must be ${PROVENANCE.join('|')}`);
      let fileOk = false;
      if (!isStr(e.path) || path.isAbsolute(e.path)) {
        errors.push(`${el}: path must be relative to the round directory`);
      } else {
        const full = path.resolve(dir, e.path);
        if (!full.startsWith(dir + path.sep)) errors.push(`${el}: path escapes the round directory`);
        else if (!fs.existsSync(full) || !fs.statSync(full).isFile()) errors.push(`${el}: file not found: ${e.path}`);
        else if (fs.statSync(full).size === 0) errors.push(`${el}: file is empty: ${e.path}`);
        else fileOk = true;
      }
      if (e.comparison !== undefined) {
        const cmp = e.comparison;
        if (!cmp || !isStr(cmp.id) || !['before', 'after'].includes(cmp.role)) {
          errors.push(`${el}: comparison needs { id, role: before|after }`);
        } else if (cmp.layout !== undefined && !['horizontal', 'vertical'].includes(cmp.layout)) {
          errors.push(`${el}: comparison.layout must be horizontal|vertical`);
        }
      }
      if (fileOk && EVIDENCE_TYPES.includes(e.type)) present.add(e.type);
    }

    if (['pass', 'fail'].includes(c.status) && evidence && evidence.length === 0) {
      errors.push(`${label}: no evidence, no claim — a ${c.status} case links at least one artifact`);
    }
    if (Array.isArray(required) && required.length) {
      coverage.required += 1;
      const missing = required.filter((t) => !present.has(t));
      if (missing.length === 0) coverage.complete += 1;
      else if (['pass', 'fail'].includes(c.status)) {
        errors.push(`${label}: required evidence missing (${missing.join(', ')}); capture it or mark the case uncertain`);
      } else {
        warnings.push(`${label}: required evidence missing (${missing.join(', ')}) — case holds the delivery at ${c.status}`);
      }
    }

    if (c.supersedes !== undefined) {
      if (!Array.isArray(c.supersedes) || c.supersedes.some((s) => !isStr(s))) {
        errors.push(`${label}: supersedes must be an array of case ids`);
      } else if (c.supersedes.includes(c.id)) {
        errors.push(`${label}: a case cannot supersede itself`);
      }
    }
  }
  if (cases && cases.length && gates === cases.length) {
    errors.push('round has no acceptance checks: every case is a programmatic gate');
  }

  const s = result.summary;
  if (!s || typeof s !== 'object') errors.push('summary { verdict, conclusion } is required');
  else {
    if (!VERDICTS.includes(s.verdict)) errors.push(`summary.verdict must be ${VERDICTS.join('|')}`);
    if (!isStr(s.conclusion)) errors.push('summary.conclusion is required');
    if (s.verdict === 'pass' && (cases || []).some((c) => c?.status !== 'pass')) {
      errors.push('summary.verdict "pass" requires every case to pass');
    }
  }

  checkReviews(acceptanceDir, index, cases || [], warnings, errors);
  return { errors, warnings, coverage, result };
}

// reviews.json: { "reviews": [{ round, caseId, action: accept|reject, note?, at? }] } in file order.
export function latestReviews(acceptanceDir, errors = []) {
  const file = path.join(acceptanceDir, 'reviews.json');
  if (!fs.existsSync(file)) return new Map();
  const data = readJson(file, errors, 'reviews.json');
  const latest = new Map();
  for (const r of data?.reviews || []) {
    if (!isStr(r?.caseId) || !['accept', 'reject'].includes(r.action) || !Number.isInteger(r.round)) {
      errors.push(`reviews.json: invalid entry ${JSON.stringify(r)}`);
      continue;
    }
    latest.set(r.caseId, r);
  }
  return latest;
}

function caseIdsInRound(acceptanceDir, n) {
  try {
    const r = JSON.parse(fs.readFileSync(path.join(acceptanceDir, `round-${n}`, 'result.json'), 'utf8'));
    return new Set((r.cases || []).map((c) => c.id));
  } catch {
    return new Set();
  }
}

function checkReviews(acceptanceDir, index, cases, warnings, errors) {
  const latest = latestReviews(acceptanceDir, errors);
  if (!latest.size) return;
  const here = new Set(cases.map((c) => c?.id));
  const superseded = new Set(cases.flatMap((c) => (Array.isArray(c?.supersedes) ? c.supersedes : [])));
  for (const [id, r] of latest) {
    if (r.round >= index) continue;
    if (r.action === 'accept' && here.has(id)) {
      warnings.push(`case ${id} was accepted in round ${r.round}; omit it from repair rounds`);
    }
    if (r.action === 'reject' && !here.has(id) && !superseded.has(id)) {
      let stale = false;
      for (let n = r.round + 1; n < index; n += 1) if (caseIdsInRound(acceptanceDir, n).has(id)) stale = true;
      if (!stale) {
        warnings.push(`case ${id} was rejected in round ${r.round}; re-verify it under the same id or declare supersedes`);
      }
    }
  }
}

// GOMS-KLM pricing, pinned model. Seconds per operator (Card, Moran & Newell).
export const KLM_MODEL = { id: 'goms-klm@1', K: 0.28, P: 1.1, H: 0.4, M: 1.35 };

export function priceTrace(text) {
  let seconds = 0;
  let waitMs = 0;
  let agentMs = 0;
  let priced = 0;
  let blocked = 0;
  let foreign = 0;
  const phases = new Map();
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    let atom;
    try {
      atom = JSON.parse(line);
    } catch {
      foreign += 1;
      continue;
    }
    if (atom.schema !== TRACE_SCHEMA) {
      foreign += 1;
      continue;
    }
    agentMs += Number(atom.durationMs) || 0;
    if (atom.klm?.category === 'blocked') {
      blocked += 1;
      continue;
    }
    const ops = atom.klm?.operators || {};
    const cost =
      (ops.K || 0) * KLM_MODEL.K +
      (ops.T_chars || 0) * KLM_MODEL.K +
      (ops.P || 0) * KLM_MODEL.P +
      (ops.H || 0) * KLM_MODEL.H +
      (ops.M || 0) * KLM_MODEL.M;
    waitMs += ops.R_ms || 0;
    if (cost === 0 && !ops.R_ms) continue;
    priced += 1;
    seconds += cost;
    const key = atom.phase?.id || 'unphased';
    const p = phases.get(key) || { id: key, label: atom.phase?.label || key, seconds: 0 };
    p.seconds += cost;
    phases.set(key, p);
  }
  if (priced === 0) return null;
  const round2 = (x) => Math.round(x * 100) / 100;
  return {
    model: KLM_MODEL.id,
    userSeconds: round2(seconds),
    systemWaitSeconds: round2(waitMs / 1000),
    agentSeconds: round2(agentMs / 1000),
    pricedAtoms: priced,
    blockedAtoms: blocked,
    ignoredAtoms: foreign,
    phases: [...phases.values()].map((p) => ({ ...p, seconds: round2(p.seconds) })),
  };
}

function assetUrl(p, base) {
  if (!base) return p.split('/').map(encodeURIComponent).join('/');
  return `${base.replace(/\/+$/, '')}/${p.split('/').map(encodeURIComponent).join('/')}`;
}

function renderEvidence(e, base) {
  const url = assetUrl(e.path, base);
  const cap = e.caption.replace(/[[\]]/g, '');
  if (IMAGE_TYPES.has(e.type)) return `![${cap}](${url})\n\n_${cap}_ · ${e.type} · ${e.provenance}`;
  return `- [${cap}](${url}) · ${e.type} · ${e.provenance}`;
}

const cell = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

export function attachableAssets(result) {
  const seen = new Set();
  const attach = [];
  const other = [];
  for (const c of result.cases || []) {
    for (const e of c.evidence || []) {
      if (!e?.path || seen.has(e.path)) continue;
      seen.add(e.path);
      (ATTACHABLE_EXT.test(e.path) ? attach : other).push(e.path);
    }
  }
  return { attach, other };
}

export function renderReport(result, { assetBase, interactionCost } = {}) {
  const cases = result.cases || [];
  const count = (st) => cases.filter((c) => c.status === st).length;
  const sub = result.subject || {};
  const out = [];
  out.push(`# ${result.title}`, '');
  out.push(`**Requirement:** ${result.requirement}`, '');
  const meta = [`Round ${result.round}`, `verdict **${result.summary.verdict}**`];
  if (result.createdAt) meta.push(result.createdAt);
  if (sub.branch) meta.push(`branch \`${sub.branch}\``);
  if (sub.commit) meta.push(`commit \`${String(sub.commit).slice(0, 12)}\`${sub.dirty ? ' (dirty)' : ''}`);
  if (sub.pullRequest) meta.push(`PR ${sub.pullRequest}`);
  if (result.surfaces?.length) meta.push(`surfaces: ${result.surfaces.join(', ')}`);
  out.push(meta.join(' · '), '');
  out.push(
    `${cases.length} cases — ${count('pass')} pass, ${count('fail')} fail, ${count('blocked')} blocked, ${count('uncertain')} uncertain`,
    '',
    result.summary.conclusion,
    '',
  );
  out.push('| Case | Title | Verifier | Status |', '| --- | --- | --- | --- |');
  for (const c of cases) out.push(`| ${cell(c.id)} | ${cell(c.title)} | ${c.verifier} | ${c.status} |`);
  out.push('');

  for (const c of cases) {
    out.push(`## ${c.id} — ${c.title} · ${c.status.toUpperCase()}`, '');
    const facts = [];
    if (c.category) facts.push(`**Category:** ${c.category}`);
    if (c.surface) facts.push(`**Surface:** ${c.surface}`);
    facts.push(`**Verifier:** ${c.verifier}`);
    if (c.requiredEvidence?.length) facts.push(`**Required evidence:** ${c.requiredEvidence.join(', ')}`);
    if (c.supersedes?.length) facts.push(`**Supersedes:** ${c.supersedes.join(', ')}`);
    out.push(facts.join(' · '), '');
    if (c.method) out.push(`**Method:** ${c.method}`, '');
    if (c.expected) out.push(`**Expected:** ${c.expected}`, '');
    out.push(`**Observation:** ${c.observation}`, '');

    if (c.table?.columns?.length) {
      out.push(`| ${c.table.columns.map(cell).join(' | ')} |`, `| ${c.table.columns.map(() => '---').join(' | ')} |`);
      for (const row of c.table.rows || []) out.push(`| ${row.map(cell).join(' | ')} |`);
      out.push('');
    }

    const pairs = new Map();
    const loose = [];
    for (const e of c.evidence || []) {
      if (e.comparison) {
        const p = pairs.get(e.comparison.id) || { layout: e.comparison.layout || 'horizontal' };
        p[e.comparison.role] = e;
        pairs.set(e.comparison.id, p);
      } else loose.push(e);
    }
    for (const [id, p] of pairs) {
      const side = (e, role) =>
        e ? `![${role}](${assetUrl(e.path, assetBase)})<br>${cell(e.comparison.label || e.caption)}` : '_missing_';
      out.push(`**Comparison: ${id}**`, '');
      if (p.layout === 'vertical') {
        out.push(`Before — ${side(p.before, 'before').replace('<br>', '\n\n')}`, '');
        out.push(`After — ${side(p.after, 'after').replace('<br>', '\n\n')}`, '');
      } else {
        out.push('| Before | After |', '| --- | --- |', `| ${side(p.before, 'before')} | ${side(p.after, 'after')} |`, '');
      }
    }
    for (const e of loose) out.push(renderEvidence(e, assetBase), '');
  }

  const cost = result.interactionCost || interactionCost;
  if (cost) {
    out.push('<details><summary>Interaction cost (user-equivalent)</summary>', '');
    out.push(
      `Model \`${cost.model}\`: ${cost.userSeconds}s of user actions, ${cost.systemWaitSeconds ?? 0}s measured wait` +
        (cost.agentSeconds !== undefined ? ` (agent wall-clock ${cost.agentSeconds}s)` : ''),
      '',
    );
    for (const p of cost.phases || []) out.push(`- ${p.label}: ${p.seconds}s`);
    out.push('', '</details>', '');
  }
  if (isStr(result.notes)) out.push('## Notes', '', result.notes.trim(), '');
  return out.join('\n');
}

function traceCost(dir) {
  const file = path.join(dir, 'interaction-trace.jsonl');
  return fs.existsSync(file) ? priceTrace(fs.readFileSync(file, 'utf8')) : null;
}

export function sealRound(roundDir) {
  const dir = path.resolve(roundDir);
  if (fs.existsSync(path.join(dir, SEAL_FILE))) {
    const drift = sealDrift(dir);
    if (drift.length) throw new Error(`round already sealed and changed since: ${drift.join(', ')}; open a new round`);
    return { dir, alreadySealed: true };
  }
  const v = validateRound(dir);
  if (v.errors.length) {
    const err = new Error(`round is invalid:\n- ${v.errors.join('\n- ')}`);
    err.validation = v;
    throw err;
  }
  fs.writeFileSync(path.join(dir, 'report.md'), renderReport(v.result, { interactionCost: traceCost(dir) }));
  fs.writeFileSync(
    path.join(dir, SEAL_FILE),
    `${JSON.stringify({ sealedAt: new Date().toISOString(), files: hashRound(dir) }, null, 2)}\n`,
  );
  return { dir, alreadySealed: false, validation: v };
}

export function coverageLine({ coverage, result }) {
  const n = result?.cases?.length ?? 0;
  if (coverage.required === 0) return `Coverage: ${n} cases, none declare requiredEvidence`;
  const all = coverage.complete === coverage.required;
  return `Coverage: ${coverage.complete}/${coverage.required} cases with requiredEvidence${all ? ', all required evidence present' : ' — MISSING evidence, delivery held'}`;
}

function main(argv) {
  const [cmd, target, ...rest] = argv;
  const flag = (name) => {
    const i = rest.indexOf(name);
    return i >= 0 ? rest[i + 1] : undefined;
  };
  const report = (v) => {
    for (const w of v.warnings) console.error(`warning: ${w}`);
    for (const e of v.errors) console.error(`error: ${e}`);
  };
  try {
    if (cmd === 'new') {
      console.log(newRound(flag('--root') || '.acceptance', target));
      return 0;
    }
    if (cmd === 'check') {
      const v = validateRound(target);
      report(v);
      console.log(coverageLine(v));
      return v.errors.length ? 1 : 0;
    }
    if (cmd === 'seal') {
      const r = sealRound(target);
      if (r.validation) report(r.validation);
      console.log(r.alreadySealed ? `already sealed: ${r.dir}` : `sealed: ${r.dir}`);
      if (r.validation) console.log(coverageLine(r.validation));
      return 0;
    }
    if (cmd === 'pr-body') {
      const base = flag('--asset-base');
      const v = validateRound(target);
      report(v);
      if (v.errors.length) return 1;
      process.stdout.write(renderReport(v.result, { assetBase: base, interactionCost: traceCost(path.resolve(target)) }));
      return 0;
    }
    if (cmd === 'pr-assets') {
      const v = validateRound(target);
      report(v);
      if (v.errors.length) return 1;
      const { attach, other } = attachableAssets(v.result);
      for (const p of attach) console.log(p);
      for (const p of other) console.error(`not attachable with gh --attach (inline it or use the evidence branch): ${p}`);
      return 0;
    }
    console.error('usage: validate-round.mjs new <slug> [--root dir] | check <round-dir> | seal <round-dir> | pr-body <round-dir> [--asset-base <url>] | pr-assets <round-dir>');
    return 2;
  } catch (e) {
    console.error(`error: ${e.message}`);
    return 1;
  }
}

// Skills are usually reached through a symlinked directory; compare real paths
// or the CLI silently does nothing when invoked through the link.
const isEntryPoint = () => {
  try {
    return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
};

if (process.argv[1] && isEntryPoint()) {
  process.exitCode = main(process.argv.slice(2));
}
