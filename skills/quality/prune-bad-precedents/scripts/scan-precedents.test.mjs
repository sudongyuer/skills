import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';

import { scan } from './scan-precedents.mjs';

let root;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'precedents-'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

function write(path, lines) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), lines.join('\n'));
}

const found = (category) => scan(root).hits.filter((h) => h.category === category).map((h) => `${h.file}:${h.line}`);

test('suppressions without a reason are flagged, explained ones are not', () => {
  write('src/a.ts', [
    '// eslint-disable-next-line no-console',
    '// eslint-disable-next-line no-console -- startup banner is intentional',
    '// @ts-ignore',
    '// @ts-expect-error upstream types miss the overload',
  ]);
  assert.deepEqual(found('suppression'), ['src/a.ts:1', 'src/a.ts:3']);
  write('src/b.py', ['x = 1  # noqa: E501']);
  assert.ok(found('suppression').includes('src/b.py:1'));
});

test('TODOs need a ticket and workaround comments need a link', () => {
  write('src/a.ts', [
    '// TODO: clean up',
    '// TODO(#42): clean up',
    '// FIXME ABC-12 handle retries',
    '// temporary workaround until the API is fixed',
    '// workaround for https://bugs.example.com/1',
    'const forNow = 1',
  ]);
  assert.deepEqual(found('untracked-todo'), ['src/a.ts:1']);
  assert.deepEqual(found('workaround-comment'), ['src/a.ts:4']);
});

test('skipped tests and fixed sleeps are flagged', () => {
  write('e2e/a.spec.ts', [
    "test.skip('flaky search', async () => {})",
    "test.fixme(true, 'flaky')",
    "it('works', () => {})",
    'await page.waitForTimeout(5000)',
    'setTimeout(done, 1500)',
    'setTimeout(done, 0)',
  ]);
  assert.deepEqual(found('skipped-test'), ['e2e/a.spec.ts:1', 'e2e/a.spec.ts:2']);
  assert.deepEqual(found('timing-hack'), ['e2e/a.spec.ts:4', 'e2e/a.spec.ts:5']);
});

test('identical hits are counted as copies and vendored directories are skipped', () => {
  write('a.ts', ['// @ts-ignore']);
  write('b.ts', ['// @ts-ignore']);
  write('node_modules/x/c.ts', ['// @ts-ignore']);
  const { hits, summary } = scan(root);
  assert.deepEqual(hits.map((h) => [h.file, h.copies]), [['a.ts', 2], ['b.ts', 2]]);
  assert.equal(summary.find((s) => s.category === 'suppression').files, 2);
});

test('categories can be narrowed', () => {
  write('a.ts', ['// @ts-ignore', '// TODO later']);
  assert.deepEqual(scan(root, { categories: ['untracked-todo'] }).hits.map((h) => h.category), ['untracked-todo']);
});
