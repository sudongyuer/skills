import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { clearFrames, parseArgs } from './step_capture.mjs';

const base = ['--url', 'file:///x.html', '--out', 'f', '--frames', '10', '--selector', '.p', '--ref-width', '402'];

test('parseArgs fills defaults and converts numbers', () => {
  const o = parseArgs(base);
  assert.equal(o.frames, 10);
  assert.equal(o.refWidth, 402);
  assert.equal(o.fps, 60);
  assert.equal(o.scale, 1);
});

test('parseArgs rejects missing and malformed options', () => {
  assert.throws(() => parseArgs(base.slice(0, -2)), /missing --ref-width/);
  assert.throws(() => parseArgs([...base, '--fps', 'fast']), /--fps must be/);
  assert.throws(() => parseArgs([...base, '--from', '10']), /--from must be smaller/);
  assert.throws(() => parseArgs([...base, 'stray']), /--name value pairs/);
});

test('clearFrames removes only numbered frames and keeps everything else', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frames-'));
  for (const name of ['0000.png', '0441.png', 'notes.md', 'ref.png']) fs.writeFileSync(path.join(dir, name), '');
  fs.mkdirSync(path.join(dir, 'sub'));
  assert.equal(clearFrames(dir), 2);
  assert.deepEqual(fs.readdirSync(dir).sort(), ['notes.md', 'ref.png', 'sub']);
  fs.rmSync(dir, { recursive: true });
});

test('clearFrames creates a missing directory', () => {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'frames-')), 'new');
  assert.equal(clearFrames(dir), 0);
  assert.ok(fs.statSync(dir).isDirectory());
});
