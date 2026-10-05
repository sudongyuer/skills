#!/usr/bin/env node
// Frame-stepped capture of a web replica: one PNG per 1/fps of page time,
// independent of how fast the browser renders. The page must expose
//   window.__capture()   reset to t = 0 and pause the real-time loop
//   window.__step(ms)    advance the page clock, springs and every CSS animation by ms
// (see references/capture.md for the harness).
//
// Usage:
//   node step_capture.mjs --url file:///abs/page.html --out frames --frames 443 \
//     --selector .phone --inset 10 --ref-width 402 [--scale 3] [--fps 60] [--from 0]
//
// --ref-width makes the captured element exactly scale x ref-width pixels wide,
// so replica pixels line up with reference points (402 for an iPhone 17 Pro).
// Requires the `playwright` package: a local install, or NODE_PATH pointing at a global one.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function args(argv) {
  const o = { fps: 60, scale: 1, inset: 0, from: 0 };
  for (let i = 0; i < argv.length; i += 2) o[argv[i].replace(/^--/, '').replace(/-(\w)/g, (_, c) => c.toUpperCase())] = argv[i + 1];
  for (const k of ['fps', 'scale', 'inset', 'from', 'frames', 'refWidth']) if (o[k] !== undefined) o[k] = Number(o[k]);
  for (const k of ['url', 'out', 'frames', 'selector', 'refWidth']) if (o[k] === undefined) throw new Error(`missing --${k}`);
  return o;
}

const o = args(process.argv.slice(2));
// ESM ignores NODE_PATH; fall back to CommonJS resolution from the working directory (which honours it)
async function loadPlaywright() {
  try { return await import('playwright'); } catch {
    return import(pathToFileURL(createRequire(path.join(process.cwd(), 'noop.js')).resolve('playwright')).href);
  }
}
const pw = await loadPlaywright();
const chromium = pw.chromium ?? pw.default.chromium; // the CommonJS entry arrives as a default export
fs.rmSync(o.out, { recursive: true, force: true });
fs.mkdirSync(o.out, { recursive: true });

const browser = await chromium.launch();
// measure the element once at DPR 1 to derive the device scale factor
const probe = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
await probe.goto(o.url);
const w = (await probe.locator(o.selector).boundingBox()).width - 2 * o.inset;
await probe.close();

const ctx = await browser.newContext({ viewport: { width: 1200, height: 1000 }, deviceScaleFactor: (o.scale * o.refWidth) / w });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(o.url);
await page.waitForTimeout(200);
await page.evaluate(() => window.__capture());
const box = await page.locator(o.selector).boundingBox();
const clip = { x: box.x + o.inset, y: box.y + o.inset, width: box.width - 2 * o.inset, height: box.height - 2 * o.inset };
for (let i = 0; i < o.frames; i++) {
  if (i) await page.evaluate((ms) => window.__step(ms), 1000 / o.fps);
  if (i >= o.from) await page.screenshot({ path: path.join(o.out, `${String(i).padStart(4, '0')}.png`), clip });
}
await browser.close();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else console.log(`${o.frames - o.from} frames -> ${o.out}`);
