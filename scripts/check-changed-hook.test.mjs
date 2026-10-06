import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, test } from 'node:test';

const HOOK = join(dirname(fileURLToPath(import.meta.url)), '..', 'templates', 'project', '.claude', 'hooks', 'check-changed.sh');

let root;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'hook-'));
  const git = (...args) => spawnSync('git', args, { cwd: root });
  git('init', '-q');
  git('-c', 'user.email=t@example.com', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'init');
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

function install(checks) {
  const text = readFileSync(HOOK, 'utf8').replace('CHECKS=(\n)', `CHECKS=(\n${checks.map((c) => `  '${c}'`).join('\n')}\n)`);
  const path = join(root, '.claude', 'hooks', 'check-changed.sh');
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
  chmodSync(path, 0o755);
  return path;
}

function run(path, input = '{"hook_event_name":"Stop","stop_hook_active":false}') {
  return spawnSync('bash', [path], { input, env: { ...process.env, CLAUDE_PROJECT_DIR: root }, encoding: 'utf8' });
}

test('the shipped template has no checks and lets the agent stop', () => {
  writeFileSync(join(root, 'a.ts'), 'x');
  assert.equal(run(HOOK).status, 0);
});

test('a failing check on a changed matching file blocks with exit 2 and reports it', () => {
  writeFileSync(join(root, 'a.ts'), 'bad');
  const hook = install(['*.ts|! grep -l bad']);
  const res = run(hook);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /Check failed \(exit 1\): ! grep -l bad/);
});

test('checks receive only matching changed files and are skipped when none match', () => {
  writeFileSync(join(root, 'notes.md'), 'bad');
  const hook = install(['*.ts|! grep -l bad']);
  assert.equal(run(hook).status, 0);
});

test('a "-" glob runs the command once without file arguments', () => {
  writeFileSync(join(root, 'a.ts'), 'x');
  const hook = install(['-|test $# -eq 0 && false']);
  assert.equal(run(hook).status, 2);
});

test('a re-entered stop does not block again', () => {
  writeFileSync(join(root, 'a.ts'), 'bad');
  const hook = install(['*.ts|false']);
  assert.equal(run(hook, '{"stop_hook_active": true}').status, 0);
});

test('an entry without a glob runs once without file arguments', () => {
  writeFileSync(join(root, 'a.ts'), 'x');
  const hook = install(['test $# -eq 0 && false']);
  assert.equal(run(hook).status, 2);
});
