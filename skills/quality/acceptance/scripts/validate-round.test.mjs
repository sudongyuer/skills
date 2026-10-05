import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  latestReviews,
  looksLikeGate,
  newRound,
  priceTrace,
  renderReport,
  sealRound,
  validateRound,
} from './validate-round.mjs';

const SCRIPT = fileURLToPath(new URL('./validate-round.mjs', import.meta.url));
const REQUIREMENT = 'Users can export their notes as a single archive.';

let root;
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'acceptance-test-'));
});
afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

function writeAsset(dir, name, content = 'observed output\n') {
  fs.writeFileSync(path.join(dir, 'assets', name), content);
  return `assets/${name}`;
}

function exportCase(dir, overrides = {}) {
  return {
    id: 'export-archive',
    title: 'Export produces an archive containing every note',
    category: 'Export',
    surface: 'cli',
    verifier: 'program',
    method: 'Run `notes export --out x.zip` against a 3-note fixture and list the archive',
    expected: 'Archive lists 3 note files',
    requiredEvidence: ['text'],
    status: 'pass',
    observation: 'Archive listed 3 note files',
    evidence: [{ type: 'text', path: writeAsset(dir, 'export.txt'), caption: 'archive listing', provenance: 'cli' }],
    ...overrides,
  };
}

function writeResult(dir, round, cases, extra = {}) {
  const result = {
    schema: 'acceptance-round@1',
    requirement: REQUIREMENT,
    round,
    title: 'Verify note export',
    subject: { branch: 'feat/export', commit: '0123456789abcdef' },
    surfaces: ['cli'],
    cases,
    summary: { verdict: cases.every((c) => c.status === 'pass') ? 'pass' : 'partial', conclusion: 'Export works.' },
    ...extra,
  };
  fs.writeFileSync(path.join(dir, 'result.json'), JSON.stringify(result, null, 2));
  return result;
}

describe('newRound', () => {
  test('allocates consecutive round dirs and seeds a catch-all .gitignore', () => {
    const base = path.join(root, '.acceptance');
    const first = newRound(base, 'note-export');
    const second = newRound(base, 'note-export');
    assert.equal(path.basename(first), 'round-1');
    assert.equal(path.basename(second), 'round-2');
    assert.ok(fs.statSync(path.join(second, 'assets')).isDirectory());
    assert.equal(fs.readFileSync(path.join(base, '.gitignore'), 'utf8'), '*\n');
  });

  test('never reuses an existing round directory', () => {
    const base = path.join(root, '.acceptance');
    fs.mkdirSync(path.join(base, 'note-export', 'round-3'), { recursive: true });
    assert.equal(path.basename(newRound(base, 'note-export')), 'round-4');
  });

  test('rejects a non-kebab slug', () => {
    assert.throws(() => newRound(path.join(root, '.acceptance'), 'Bad Slug'), /kebab-case/);
  });
});

describe('validateRound', () => {
  test('a complete round passes with full coverage', () => {
    const dir = newRound(path.join(root, '.acceptance'), 'note-export');
    writeResult(dir, 1, [exportCase(dir)]);
    const v = validateRound(dir);
    assert.deepEqual(v.errors, []);
    assert.deepEqual(v.coverage, { complete: 1, required: 1 });
  });

  test('evidence pointing at a missing file is an error', () => {
    const dir = newRound(path.join(root, '.acceptance'), 'note-export');
    const c = exportCase(dir);
    c.evidence[0].path = 'assets/nope.txt';
    writeResult(dir, 1, [c]);
    assert.match(validateRound(dir).errors.join('\n'), /file not found: assets\/nope\.txt/);
  });

  test('evidence outside the round directory is an error', () => {
    const dir = newRound(path.join(root, '.acceptance'), 'note-export');
    fs.writeFileSync(path.join(root, 'outside.txt'), 'x');
    const c = exportCase(dir);
    c.evidence[0].path = '../../../outside.txt';
    writeResult(dir, 1, [c]);
    assert.match(validateRound(dir).errors.join('\n'), /escapes the round directory/);
  });

  test('a pass missing a declared evidence type fails; the same case as uncertain only warns', () => {
    const dir = newRound(path.join(root, '.acceptance'), 'note-export');
    writeResult(dir, 1, [exportCase(dir, { requiredEvidence: ['text', 'screenshot'] })]);
    const failing = validateRound(dir);
    assert.match(failing.errors.join('\n'), /required evidence missing \(screenshot\)/);

    writeResult(dir, 1, [exportCase(dir, { requiredEvidence: ['text', 'screenshot'], status: 'uncertain' })]);
    const held = validateRound(dir);
    assert.deepEqual(held.errors, []);
    assert.match(held.warnings.join('\n'), /holds the delivery at uncertain/);
    assert.deepEqual(held.coverage, { complete: 0, required: 1 });
  });

  test('a pass with no evidence at all is an error', () => {
    const dir = newRound(path.join(root, '.acceptance'), 'note-export');
    writeResult(dir, 1, [exportCase(dir, { requiredEvidence: [], evidence: [] })]);
    assert.match(validateRound(dir).errors.join('\n'), /no evidence, no claim/);
  });

  test('programmatic gates are rejected by title or by method; a gates-only round has no checks', () => {
    const dir = newRound(path.join(root, '.acceptance'), 'note-export');
    const gateByTitle = exportCase(dir, { id: 'unit', title: 'Unit tests pass', method: 'run the suite' });
    const gateByMethod = exportCase(dir, { id: 'types', title: 'Export module is sound', method: 'run `pnpm run typecheck`' });
    writeResult(dir, 1, [gateByTitle, gateByMethod]);
    const errors = validateRound(dir).errors.join('\n');
    assert.match(errors, /unit.*programmatic gate/);
    assert.match(errors, /types.*programmatic gate/);
    assert.match(errors, /round has no acceptance checks/);
  });

  test('a command-asserted product behavior is not a gate', () => {
    assert.equal(
      looksLikeGate({ title: 'CLI prints the version string', method: 'run `notes --version`' }),
      null,
    );
    assert.equal(looksLikeGate({ title: 'Date format renders as YYYY-MM-DD' }), null);
  });

  test('requirement must match round 1 exactly', () => {
    const base = path.join(root, '.acceptance');
    const r1 = newRound(base, 'note-export');
    writeResult(r1, 1, [exportCase(r1)]);
    const r2 = newRound(base, 'note-export');
    writeResult(r2, 2, [exportCase(r2)], { requirement: 'Something narrower.' });
    assert.match(validateRound(r2).errors.join('\n'), /requirement is immutable/);
  });

  test('round field must equal the directory index', () => {
    const dir = newRound(path.join(root, '.acceptance'), 'note-export');
    writeResult(dir, 2, [exportCase(dir)]);
    assert.match(validateRound(dir).errors.join('\n'), /round must equal the directory index \(1\)/);
  });

  test('a pass verdict with a failing case is an error', () => {
    const dir = newRound(path.join(root, '.acceptance'), 'note-export');
    writeResult(dir, 1, [exportCase(dir, { status: 'fail' })], {
      summary: { verdict: 'pass', conclusion: 'x' },
    });
    assert.match(validateRound(dir).errors.join('\n'), /requires every case to pass/);
  });
});

describe('reviews.json and repair rounds', () => {
  test('warns when an accepted case is re-included and when a rejected case is dropped', () => {
    const base = path.join(root, '.acceptance');
    const r1 = newRound(base, 'note-export');
    writeResult(r1, 1, [exportCase(r1), exportCase(r1, { id: 'export-empty', title: 'Export with no notes shows a message' })]);
    fs.writeFileSync(
      path.join(base, 'note-export', 'reviews.json'),
      JSON.stringify({
        reviews: [
          { round: 1, caseId: 'export-archive', action: 'accept' },
          { round: 1, caseId: 'export-empty', action: 'reject', note: 'message is cut off' },
        ],
      }),
    );
    const r2 = newRound(base, 'note-export');
    writeResult(r2, 2, [exportCase(r2)]);
    const warnings = validateRound(r2).warnings.join('\n');
    assert.match(warnings, /export-archive was accepted in round 1/);
    assert.match(warnings, /export-empty was rejected in round 1/);
  });

  test('a successor that declares supersedes satisfies a rejected case', () => {
    const base = path.join(root, '.acceptance');
    const r1 = newRound(base, 'note-export');
    writeResult(r1, 1, [exportCase(r1)]);
    fs.writeFileSync(
      path.join(base, 'note-export', 'reviews.json'),
      JSON.stringify({ reviews: [{ round: 1, caseId: 'export-archive', action: 'reject' }] }),
    );
    const r2 = newRound(base, 'note-export');
    writeResult(r2, 2, [exportCase(r2, { id: 'export-archive-v2', supersedes: ['export-archive'] })]);
    const v = validateRound(r2);
    assert.deepEqual(v.errors, []);
    assert.deepEqual(v.warnings, []);
  });

  test('the latest review for a case wins', () => {
    const acc = path.join(root, 'acc');
    fs.mkdirSync(acc);
    fs.writeFileSync(
      path.join(acc, 'reviews.json'),
      JSON.stringify({
        reviews: [
          { round: 1, caseId: 'a', action: 'reject' },
          { round: 2, caseId: 'a', action: 'accept' },
        ],
      }),
    );
    assert.equal(latestReviews(acc).get('a').action, 'accept');
  });
});

describe('sealRound', () => {
  test('renders report.md, then refuses any later change to the round', () => {
    const dir = newRound(path.join(root, '.acceptance'), 'note-export');
    writeResult(dir, 1, [exportCase(dir)]);
    const sealed = sealRound(dir);
    assert.equal(sealed.alreadySealed, false);
    const report = fs.readFileSync(path.join(dir, 'report.md'), 'utf8');
    assert.match(report, /# Verify note export/);
    assert.match(report, /\[archive listing\]\(assets\/export\.txt\)/);
    assert.equal(sealRound(dir).alreadySealed, true);

    writeAsset(dir, 'export.txt', 'edited after sealing\n');
    assert.match(validateRound(dir).errors.join('\n'), /sealed and immutable.*assets\/export\.txt/);
    assert.throws(() => sealRound(dir), /already sealed and changed/);
  });

  test('refuses to seal an invalid round and writes nothing', () => {
    const dir = newRound(path.join(root, '.acceptance'), 'note-export');
    writeResult(dir, 1, [exportCase(dir, { title: 'Lint passes' })]);
    assert.throws(() => sealRound(dir), /programmatic gate/);
    assert.equal(fs.existsSync(path.join(dir, 'report.md')), false);
    assert.equal(fs.existsSync(path.join(dir, '.sealed.json')), false);
  });
});

describe('renderReport', () => {
  test('renders comparison pairs and rewrites asset links for a PR body', () => {
    const dir = newRound(path.join(root, '.acceptance'), 'note-export');
    const before = writeAsset(dir, 'before.png', 'png-bytes');
    const after = writeAsset(dir, 'after state.png', 'png-bytes');
    const result = writeResult(dir, 1, [
      exportCase(dir, {
        id: 'row-height',
        surface: 'web',
        verifier: 'human',
        requiredEvidence: ['screenshot'],
        evidence: [
          { type: 'screenshot', path: before, caption: 'before', provenance: 'agent-browser', comparison: { id: 'row', role: 'before', label: 'before: 11px' } },
          { type: 'screenshot', path: after, caption: 'after', provenance: 'agent-browser', comparison: { id: 'row', role: 'after', label: 'after: 12px' } },
        ],
      }),
    ]);
    assert.deepEqual(validateRound(dir).errors, []);
    const md = renderReport(result, { assetBase: 'https://example.com/raw/abc/' });
    assert.match(md, /\| Before \| After \|/);
    assert.match(md, /!\[after\]\(https:\/\/example\.com\/raw\/abc\/assets\/after%20state\.png\)<br>after: 12px/);
    assert.doesNotMatch(md, /\]\(assets\//);
  });
});

describe('priceTrace', () => {
  test('prices operators with the pinned model and charges blocked atoms nothing', () => {
    const lines = [
      { schema: 'klm-trace@1', type: 'action', phase: { id: 'login', label: 'Sign in' }, klm: { category: 'action', operators: { P: 1, K: 1 } }, durationMs: 800 },
      { schema: 'klm-trace@1', type: 'action', phase: { id: 'login' }, klm: { category: 'blocked', operators: { P: 5 } } },
      { schema: 'other@1', klm: { operators: { M: 9 } } },
      { schema: 'klm-trace@1', type: 'mental_estimate', phase: { id: 'first-view', label: 'First view' }, klm: { category: 'mental', operators: { M: 2 } } },
    ].map((l) => JSON.stringify(l));
    const cost = priceTrace(lines.join('\n'));
    assert.equal(cost.userSeconds, 4.08); // P 1.1 + K 0.28 + 2 × M 1.35
    assert.equal(cost.blockedAtoms, 1);
    assert.equal(cost.ignoredAtoms, 1);
    assert.deepEqual(
      cost.phases.map((p) => [p.id, p.seconds]),
      [
        ['login', 1.38],
        ['first-view', 2.7],
      ],
    );
  });

  test('a trace with nothing priceable yields no cost section', () => {
    const line = JSON.stringify({ schema: 'klm-trace@1', klm: { category: 'blocked', operators: {} } });
    assert.equal(priceTrace(line), null);
  });
});

describe('CLI', () => {
  test('check exits 1 on errors and prints the coverage line', () => {
    const dir = newRound(path.join(root, '.acceptance'), 'note-export');
    writeResult(dir, 1, [exportCase(dir)]);
    const ok = spawnSync(process.execPath, [SCRIPT, 'check', dir], { encoding: 'utf8' });
    assert.equal(ok.status, 0);
    assert.match(ok.stdout, /Coverage: 1\/1 cases with requiredEvidence, all required evidence present/);

    fs.rmSync(path.join(dir, 'assets', 'export.txt'));
    const bad = spawnSync(process.execPath, [SCRIPT, 'check', dir], { encoding: 'utf8' });
    assert.equal(bad.status, 1);
    assert.match(bad.stderr, /file not found/);
  });

  test('pr-body without --asset-base keeps round-relative links and pr-assets lists attachable files', () => {
    const dir = newRound(path.join(root, '.acceptance'), 'note-export');
    writeAsset(dir, 'export-dialog.png', 'png');
    writeAsset(dir, 'flow.mp4', 'mp4');
    const c = exportCase(dir);
    c.requiredEvidence = [...(c.requiredEvidence || []), 'screenshot', 'video'];
    c.evidence = [
      ...c.evidence,
      { type: 'screenshot', path: 'assets/export-dialog.png', caption: 'Export dialog', provenance: 'agent-browser' },
      { type: 'video', path: 'assets/flow.mp4', caption: 'Export flow', provenance: 'cdp' },
    ];
    writeResult(dir, 1, [c]);

    const body = spawnSync(process.execPath, [SCRIPT, 'pr-body', dir], { encoding: 'utf8' });
    assert.equal(body.status, 0, body.stderr);
    assert.match(body.stdout, /!\[Export dialog\]\(assets\/export-dialog\.png\)/);
    assert.doesNotMatch(body.stdout, /https?:\/\//);

    const assets = spawnSync(process.execPath, [SCRIPT, 'pr-assets', dir], { encoding: 'utf8' });
    assert.equal(assets.status, 0, assets.stderr);
    assert.deepEqual(assets.stdout.trim().split('\n'), ['assets/export-dialog.png', 'assets/flow.mp4']);
    assert.match(assets.stderr, /not attachable with gh --attach .*: assets\/export\.txt/);
  });

  test('runs when invoked through a symlinked skill directory', () => {
    const link = path.join(root, 'linked-scripts');
    fs.symlinkSync(path.dirname(SCRIPT), link);
    const dir = newRound(path.join(root, '.acceptance'), 'note-export');
    writeResult(dir, 1, [exportCase(dir)]);
    const run = spawnSync(process.execPath, [path.join(link, 'validate-round.mjs'), 'check', dir], {
      encoding: 'utf8',
    });
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /Coverage: 1\/1 cases/);
  });

  test('new prints the allocated directory under --root', () => {
    const res = spawnSync(process.execPath, [SCRIPT, 'new', 'note-export', '--root', path.join(root, '.acceptance')], {
      encoding: 'utf8',
    });
    assert.equal(res.status, 0);
    assert.equal(res.stdout.trim(), path.join(root, '.acceptance', 'note-export', 'round-1'));
  });
});
