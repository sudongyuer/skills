import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { checkFeatureMap, matches, parseFeatureMap, touchedFeatures } from './check-feature-map.mjs';

const SCRIPT = fileURLToPath(new URL('./check-feature-map.mjs', import.meta.url));
const TEMPLATE = fileURLToPath(new URL('../templates/FEATURES.md', import.meta.url));
const HEADER = '| Feature | Surface | Entry | Files | Verify |\n| --- | --- | --- | --- | --- |\n';

let root;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'features-'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

function write(path, text = 'x') {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
}

const messages = (text) => checkFeatureMap(text, root).problems.map((p) => p.message);

test('a map whose paths all exist passes', () => {
  write('src/notes/export.ts');
  write('src/ui/menus/Export.tsx');
  const map = `${HEADER}| Export | web | /notes/:id → Export | \`src/notes/export.ts\`, \`src/ui/menus/\` | export a note |\n| Menus | web | any page | \`src/ui/**/*.tsx\` | open the menu |\n`;
  assert.deepEqual(messages(map), []);
});

test('missing paths, unmatched globs, empty cells, bare paths and placeholders are reported', () => {
  const map = `${HEADER}| Export | web | /notes | \`src/gone.ts\` | x |\n| Menus | web | x | \`src/**/*.vue\` | x |\n| Search | | x | src/search.ts | x |\n`;
  assert.deepEqual(messages(map), [
    '"Search": empty surface',
    '"Search": files must be backticked paths',
    '"Export": missing src/gone.ts',
    '"Menus": no file matches src/**/*.vue',
  ]);
  assert.ok(checkFeatureMap(readFileSync(TEMPLATE, 'utf8'), root).problems.some((p) => p.message.includes('placeholder path')));
});

test('a wrong header and an empty map are reported', () => {
  assert.deepEqual(parseFeatureMap('| Name | Files |\n| --- | --- |\n').problems.map((p) => p.message)[0], 'table header must be: feature | surface | entry | files | verify');
  assert.deepEqual(parseFeatureMap('# nothing\n').problems.map((p) => p.message), ['no feature rows found']);
});

test('path patterns match files, directories and globs', () => {
  assert.ok(matches('src/a.ts', 'src/a.ts'));
  assert.ok(matches('src/ui/', 'src/ui/x/y.tsx'));
  assert.ok(matches('src/**/*.tsx', 'src/ui/x/y.tsx'));
  assert.ok(matches('src/*.ts', 'src/a.ts'));
  assert.ok(!matches('src/*.ts', 'src/ui/a.ts'));
  assert.ok(!matches('src/a.ts', 'src/a.tsx'));
});

test('touched lists the features a change hits and the changed files no feature lists', () => {
  const { rows } = parseFeatureMap(`${HEADER}| Export | web | e | \`src/export/\` | v |\n| Search | web | e | \`src/search.ts\` | v |\n`);
  const { touched, unmapped } = touchedFeatures(rows, ['src/export/a.ts', 'README.md']);
  assert.deepEqual(touched.map((r) => r.feature), ['Export']);
  assert.deepEqual(unmapped, ['README.md']);
});

test('the CLI touched command reads the diff against a base ref', () => {
  const git = (...args) => spawnSync('git', ['-c', 'user.email=t@example.com', '-c', 'user.name=t', ...args], { cwd: root, encoding: 'utf8' });
  git('init', '-q', '-b', 'main');
  write('src/export/a.ts');
  write('.agents/acceptance/FEATURES.md', `${HEADER}| Export | web | /notes → Export | \`src/export/\` | export a note |\n`);
  git('add', '-A');
  git('commit', '-qm', 'init');
  write('src/export/a.ts', 'changed');
  write('src/other.ts');
  const res = spawnSync('node', [SCRIPT, 'touched', '--root', root, '--base', 'main'], { encoding: 'utf8' });
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /^Export \[web\] entry: \/notes → Export \| verify: export a note/m);
  assert.match(res.stdout, /src\/other\.ts/);
  const check = spawnSync('node', [SCRIPT, 'check', '--root', root], { encoding: 'utf8' });
  assert.equal(check.status, 0, check.stderr);
});

test('runs when invoked through a symlinked skill directory', () => {
  write('src/a.ts');
  write('.agents/acceptance/FEATURES.md', `${HEADER}| A | cli | run a | \`src/a.ts\` | run it |\n`);
  const link = join(root, 'linked-scripts');
  symlinkSync(dirname(SCRIPT), link);
  const res = spawnSync('node', [join(link, 'check-feature-map.mjs'), 'check', '--root', root], { encoding: 'utf8' });
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /ok: 1 feature/);
});

test('touched reports a missing base ref instead of crashing', () => {
  write('.agents/acceptance/FEATURES.md', `${HEADER}| A | cli | run a | \`.agents/\` | run it |\n`);
  spawnSync('git', ['init', '-q'], { cwd: root });
  const res = spawnSync('node', [SCRIPT, 'touched', '--root', root, '--base', 'no-such-ref'], { encoding: 'utf8' });
  assert.equal(res.status, 1);
  assert.match(res.stderr, /cannot diff against "no-such-ref"/);
});
