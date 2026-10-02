import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  compareTokens,
  expandGlobs,
  globToRegExp,
  normalizeValue,
  parseCheatsheet,
  parseCssTokens,
  parseTsTokens,
  run,
  scanText,
} from './check.mjs';

const roots = [];
after(() => roots.forEach((r) => rmSync(r, { recursive: true, force: true })));

/** Create a temp project from a { relativePath: contents } map. */
function project(files) {
  const root = mkdtempSync(join(tmpdir(), 'ds-check-'));
  roots.push(root);
  for (const [path, contents] of Object.entries(files)) {
    const full = join(root, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, typeof contents === 'string' ? contents : JSON.stringify(contents));
  }
  return root;
}

const SHEET = `# Cheatsheet
| Token | Light | Dark | Use |
|---|---|---|---|
| \`--color-accent\` | \`#3B5BDB\` | \`#748ffc\` | accent |
| \`--text-body\` | \`16px\` | | body |
| \`--font-sans\` | platform stack | | presence only |
`;
const CSS = `:root {
  --color-accent: #3b5bdb;
  --text-body: 16px;
  --font-sans: system-ui, sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) { --color-accent: #748ffc; }
}
:root[data-theme='dark'] { --color-accent: #748ffc; }
@media (prefers-reduced-motion: reduce) { :root { --text-body: 0; } }
`;
const TS = `export const vars = {
  '--color-accent': '#3b5bdb',
  '--text-body': 16,
  '--font-sans': 'System',
} as const;
export const darkVars: Partial<Record<string, string>> = {
  '--color-accent': '#748ffc',
};
`;

function drift(sheet, parsed) {
  return compareTokens(parseCheatsheet(sheet), parsed, { cheatsheetFile: 'C.md', tokenFile: 't' });
}

describe('parsing', () => {
  test('normalizeValue equates CSS, TS and Markdown spellings', () => {
    assert.equal(normalizeValue('16px'), normalizeValue(16));
    assert.equal(normalizeValue('200ms'), '200');
    assert.equal(normalizeValue('#3B5BDB'), '#3b5bdb');
    assert.equal(normalizeValue('cubic-bezier(0.2, 0, 0, 1)'), normalizeValue('cubic-bezier(0.2,0,0,1)'));
  });

  test('parseCheatsheet reads light, dark and presence-only rows with line numbers', () => {
    const { tokens } = parseCheatsheet(SHEET);
    assert.deepEqual(tokens.get('--color-accent'), { name: '--color-accent', line: 4, light: '#3B5BDB', dark: '#748ffc' });
    assert.equal(tokens.get('--text-body').light, '16px');
    assert.equal(tokens.get('--text-body').dark, undefined);
    assert.equal(tokens.get('--font-sans').light, undefined);
  });

  test('parseCheatsheet reads several token/value pairs in one row and ignores code fences', () => {
    const md = '| body | `--text-body` | `16px` | `--text-body--line-height` | `24px` |\n```\n| `--ghost` | `1` |\n```\n';
    const { tokens } = parseCheatsheet(md);
    assert.equal(tokens.get('--text-body').light, '16px');
    assert.equal(tokens.get('--text-body--line-height').light, '24px');
    assert.equal(tokens.has('--ghost'), false);
  });

  test('parseCheatsheet reports a token documented with two different values', () => {
    const { conflicts } = parseCheatsheet('| `--x` | `1px` |\n| `--x` | `2px` |\n');
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0].line, 2);
  });

  test('parseCssTokens splits default and dark scopes and ignores other media blocks', () => {
    const parsed = parseCssTokens(CSS);
    assert.equal(parsed.default.get('--color-accent').value, '#3b5bdb');
    assert.equal(parsed.default.get('--color-accent').line, 2);
    assert.equal(parsed.dark.get('--color-accent').value, '#748ffc');
    assert.equal(parsed.default.get('--text-body').value, '16px');
    assert.deepEqual(parsed.conflicts, []);
  });

  test('parseCssTokens flags two dark blocks that disagree', () => {
    const parsed = parseCssTokens(`@media (prefers-color-scheme: dark) { :root { --a: #111; } }\n[data-theme=dark] { --a: #222; }`);
    assert.equal(parsed.conflicts.length, 1);
    assert.match(parsed.conflicts[0].message, /--a/);
  });

  test('parseTsTokens reads vars and darkVars literals', () => {
    const parsed = parseTsTokens(TS);
    assert.equal(parsed.default.get('--text-body').value, '16');
    assert.equal(parsed.default.get('--text-body').line, 3);
    assert.equal(parsed.dark.get('--color-accent').value, '#748ffc');
  });
});

describe('drift', () => {
  test('consistent cheatsheet, CSS and TS produce no findings', () => {
    assert.deepEqual(drift(SHEET, parseCssTokens(CSS)), []);
    assert.deepEqual(drift(SHEET, parseTsTokens(TS)), []);
  });

  test('value mismatch reports cheatsheet line and token file line', () => {
    const findings = drift(SHEET, parseCssTokens(CSS.replace('--text-body: 16px', '--text-body: 15px')));
    assert.equal(findings.length, 1);
    assert.equal(findings[0].file, 'C.md');
    assert.equal(findings[0].line, 5);
    assert.match(findings[0].message, /--text-body: cheatsheet `16px` vs t:3 `15px`/);
  });

  test('dark mismatch, missing token and undocumented token are all reported', () => {
    const css = `:root { --color-accent: #3b5bdb; --font-sans: x; --extra: 1px; }\n[data-theme=dark] { --color-accent: #000; }`;
    const messages = drift(SHEET, parseCssTokens(css)).map((f) => f.message);
    assert.ok(messages.some((m) => m.includes('--color-accent (dark)')));
    assert.ok(messages.some((m) => m.includes('--text-body is documented but not declared')));
    assert.ok(messages.some((m) => m.includes('--extra is declared but not documented')));
  });

  test('a dark override the cheatsheet does not document is reported', () => {
    const ts = TS.replace("'--color-accent': '#748ffc',", "'--color-accent': '#748ffc', '--text-body': 18,");
    const findings = drift(SHEET, parseTsTokens(ts));
    assert.equal(findings.length, 1);
    assert.match(findings[0].message, /--text-body has a dark override/);
  });
});

describe('scan', () => {
  const rules = (text, opts) => scanText(text, 'f', opts).map((f) => `${f.line}:${f.col}:${f.rule}`);

  test('flags raw hex and rgb colors with line and column', () => {
    assert.deepEqual(rules('a {\n  color: #FF0000;\n  box-shadow: 0 1px rgba(0,0,0,.1);\n}'), [
      '2:10:raw-color',
      '3:21:raw-color',
    ]);
  });

  test('flags raw font sizes in CSS, Tailwind and React Native styles', () => {
    const text = [
      'p { font-size: 13px; }',
      '<p class="text-[13px]">',
      'const s = { fontSize: 13 };',
      '<Text fontSize={13} />',
      'b { font: 600 12px/1 sans-serif; }',
    ].join('\n');
    assert.deepEqual(
      rules(text).map((r) => r.split(':')[2]),
      Array(5).fill('raw-font-size'),
    );
  });

  test('flags hardcoded font families in CSS and React Native', () => {
    assert.equal(rules("h1 { font-family: 'Georgia', serif; }").length, 1);
    assert.equal(rules("const s = { fontFamily: 'Menlo' };").length, 1);
  });

  test('accepts token references, relative sizes and anchors', () => {
    const text = [
      'p { color: var(--color-neutral-9); font-size: var(--text-body); font-family: var(--font-sans); }',
      'small { font-size: 0.875em; font: inherit; }',
      '<a href="#fade">jump</a>',
      'const s = { fontSize: type.body.size, color: token("--color-accent") };',
    ].join('\n');
    assert.deepEqual(rules(text), []);
  });

  test('allowHex, ds-allow and custom forbid patterns', () => {
    assert.deepEqual(rules('color: #fff;', { allowHex: ['#FFF'] }), []);
    assert.deepEqual(rules('color: #123456; /* ds-allow: brand asset */'), []);
    const found = scanText('<p class="text-neutral-500">', 'f', {
      forbid: [{ id: 'tw-palette', pattern: '\\btext-neutral-\\d{2,3}\\b', message: 'use --color-neutral-N' }],
    });
    assert.equal(found.length, 1);
    assert.equal(found[0].rule, 'tw-palette');
  });
});

describe('globs', () => {
  test('globToRegExp supports **, * and braces', () => {
    const re = globToRegExp('src/**/*.{ts,tsx}');
    assert.ok(re.test('src/a.ts'));
    assert.ok(re.test('src/x/y/b.tsx'));
    assert.ok(!re.test('src/a.css'));
    assert.ok(!re.test('lib/a.ts'));
  });

  test('expandGlobs walks from the static prefix and honours ignore', () => {
    const root = project({ 'src/a.css': '', 'src/deep/b.css': '', 'src/c.ts': '', 'src/gen/d.css': '' });
    const files = expandGlobs(['src/**/*.css'], root, ['src/gen/**']).map((f) => f.slice(root.length + 1));
    assert.deepEqual(files, ['src/a.css', 'src/deep/b.css']);
  });
});

describe('cli', () => {
  const config = {
    cheatsheet: 'CHEATSHEET.md',
    tokensCss: 'tokens.css',
    tokensTs: 'tokens.ts',
    scan: ['src/**/*.{css,tsx}'],
  };

  test('exits 0 on a clean project using design-system.config.json from cwd', () => {
    const root = project({
      'design-system.config.json': config,
      'CHEATSHEET.md': SHEET,
      'tokens.css': CSS,
      'tokens.ts': TS,
      'src/ok.css': '.a { color: var(--color-accent); }',
    });
    const result = run([], root);
    assert.equal(result.code, 0, result.lines.join('\n'));
    assert.match(result.lines.at(-1), /3 documented tokens in sync; 1 file\(s\) scanned/);
  });

  test('exits 1 and prints file:line for drift and forbidden patterns', () => {
    const root = project({
      'design-system.config.json': config,
      'CHEATSHEET.md': SHEET,
      'tokens.css': CSS.replace('#3b5bdb', '#3b5bdc'),
      'tokens.ts': TS,
      'src/bad.tsx': 'export const s = {\n  color: "#ff0000",\n};\n',
    });
    const result = run([], root);
    assert.equal(result.code, 1);
    const out = result.lines.join('\n');
    assert.match(out, /CHEATSHEET\.md:4 {2}drift {2}--color-accent: cheatsheet `#3B5BDB` vs tokens\.css:2 `#3b5bdc`/);
    assert.match(out, /src\/bad\.tsx:2:11 {2}raw-color/);
  });

  test('positional files replace scan globs; --config and --no-drift work', () => {
    const root = project({
      'cfg/ds.json': { cheatsheet: '../missing.md', scan: ['../src/**/*.css'] },
      'src/a.css': 'a { font-size: 12px; }',
      'other.css': 'a { color: var(--x); }',
    });
    assert.equal(run(['--config', 'cfg/ds.json', '--no-drift'], root).code, 1);
    assert.equal(run(['--config', 'cfg/ds.json', '--no-drift', 'other.css'], root).code, 0);
  });

  test('exits 2 on usage and config errors', () => {
    const root = project({ 'design-system.config.json': '{ not json' });
    assert.equal(run([], root).code, 2);
    assert.equal(run(['--bogus'], root).code, 2);
    assert.equal(run(['--config', 'nope.json'], root).code, 2);
  });

  test('the skill itself (example tokens, cheatsheet, templates) passes', () => {
    const skill = join(dirname(fileURLToPath(import.meta.url)), '..');
    const result = run(
      [
        '--cheatsheet', join(skill, 'CHEATSHEET.md'),
        '--tokens-css', join(skill, 'tokens/tokens.example.css'),
        '--tokens-ts', join(skill, 'tokens/tokens.example.ts'),
        '--scan', join(skill, 'templates/**/*.html'),
      ],
      project({}),
    );
    assert.equal(result.code, 0, result.lines.join('\n'));
    assert.match(result.lines.at(-1), /65 documented tokens in sync; 9 file\(s\) scanned clean/);
  });
});
