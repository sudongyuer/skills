import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { checkSpecs } from './check-specs.mjs';

const script = fileURLToPath(new URL('./check-specs.mjs', import.meta.url));
let dir;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'specs-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const record = `
## Implementation Record (2026-09-16)

### What was built
- x (abc123)

### Deviations from the design
None.

### Bugs fixed during implementation
None.

### Verification
- pnpm test → pass

### Known limits
None.
`;

function spec(name, fields, body = '\n# Spec\n') {
  const lines = Object.entries({ title: name, created: '2026-09-01', ...fields }).map(([k, v]) => `${k}: ${v}`);
  writeFileSync(join(dir, name), `---\n${lines.join('\n')}\n---\n${body}`);
}

function index(rows) {
  const lines = rows.map(([file, status]) => `| 2026-09-01 | [${file}](${file}) | ${status} | |`);
  writeFileSync(join(dir, 'README.md'), `| Date | Spec | Status | Relation |\n| --- | --- | --- | --- |\n${lines.join('\n')}\n`);
}

const messages = () => checkSpecs(dir).map((p) => `${p.file}: ${p.message}`);

test('a consistent set of specs passes', () => {
  spec('a.md', { status: 'proposed' });
  spec('b.md', { status: 'implemented', approved: '2026-09-02', implemented: '2026-09-03' }, record);
  spec('c.md', { status: 'superseded', approved: '2026-09-02', 'superseded-by': 'd.md' });
  spec('d.md', { status: 'approved', approved: '2026-09-04', supersedes: 'c.md' });
  index([['a.md', 'proposed'], ['b.md', 'implemented'], ['c.md', 'superseded'], ['d.md', 'approved']]);
  assert.deepEqual(messages(), []);
});

test('files starting with an underscore are templates and are ignored', () => {
  writeFileSync(join(dir, '_template.md'), '---\ntitle: <name>\nstatus: proposed\ncreated: YYYY-MM-DD\n---\n');
  spec('a.md', { status: 'proposed' });
  index([['a.md', 'proposed']]);
  assert.deepEqual(messages(), []);
});

test('rejects an unknown status and missing required dates', () => {
  spec('a.md', { status: 'done' });
  spec('b.md', { status: 'approved' });
  index([['a.md', 'done'], ['b.md', 'approved']]);
  const out = messages();
  assert.ok(out.some((m) => m.startsWith('a.md: invalid status "done"')));
  assert.ok(out.some((m) => m === 'b.md: status approved requires approved: YYYY-MM-DD'));
});

test('implemented specs need a complete Implementation Record', () => {
  spec('a.md', { status: 'implemented', approved: '2026-09-02', implemented: '2026-09-03' });
  spec('b.md', { status: 'implemented', approved: '2026-09-02', implemented: '2026-09-03' }, record.replace('### Known limits\nNone.\n', ''));
  index([['a.md', 'implemented'], ['b.md', 'implemented']]);
  const out = messages();
  assert.ok(out.includes('a.md: status is implemented but no "## Implementation Record" section'));
  assert.ok(out.some((m) => m.startsWith('b.md:') && m.includes('missing "### Known limits"')));
});

test('superseded specs need a valid two-way link', () => {
  spec('old.md', { status: 'superseded', 'superseded-by': 'missing.md' });
  spec('other.md', { status: 'superseded', 'superseded-by': 'new.md' });
  spec('new.md', { status: 'proposed' });
  index([['old.md', 'superseded'], ['other.md', 'superseded'], ['new.md', 'proposed']]);
  const out = messages();
  assert.ok(out.includes('old.md: superseded-by points to missing spec "missing.md"'));
  assert.ok(out.includes('other.md: "new.md" does not declare supersedes: other.md'));
});

test('the index must list every spec once with the matching status', () => {
  spec('a.md', { status: 'proposed' });
  spec('b.md', { status: 'approved', approved: '2026-09-02' });
  spec('c.md', { status: 'proposed' });
  index([['a.md', 'proposed'], ['a.md', 'proposed'], ['b.md', 'proposed'], ['gone.md', 'proposed']]);
  const out = messages();
  assert.ok(out.includes('README.md: no index row for c.md'));
  assert.ok(out.includes('README.md: a.md is listed 2 times'));
  assert.ok(out.includes('README.md: row links to missing spec "gone.md"'));
  assert.ok(out.includes('README.md: status for b.md is "proposed" in the index but "approved" in the file'));
});

test('CLI exits non-zero with file-prefixed findings and zero when clean', () => {
  spec('a.md', { status: 'proposed' });
  const failing = spawnSync(process.execPath, [script, '--dir', dir], { encoding: 'utf8' });
  assert.equal(failing.status, 1);
  assert.match(failing.stderr, /README\.md: index file is missing/);

  index([['a.md', 'proposed']]);
  const passing = spawnSync(process.execPath, [script, '--dir', dir], { encoding: 'utf8' });
  assert.equal(passing.status, 0, passing.stderr);
});
