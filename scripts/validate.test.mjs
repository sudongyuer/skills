import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';

import { validateRepo } from './validate.mjs';

let root;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'skills-repo-'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

function write(path, text) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
}

function skill(domain, name, frontmatter = `name: ${name}\ndescription: >\n  Does a thing. Use when asked.`, body = '\n# x\n') {
  write(`skills/${domain}/${name}/SKILL.md`, `---\n${frontmatter}\n---\n${body}`);
}

function readme(sections) {
  const text = Object.entries(sections)
    .map(([heading, names]) => `### ${heading}\n\n| Skill | 用途 |\n| --- | --- |\n${names.map((n) => `| [\`${n.split('/')[1]}\`](skills/${n}/SKILL.md) | x |`).join('\n')}\n`)
    .join('\n');
  write('README.md', `# skills\n\n${text}`);
}

const messages = (opts) => validateRepo(root, opts).map((p) => `${p.file}: ${p.message}`);

test('a well-formed repository passes', () => {
  skill('workflow', 'session-handoff');
  skill('quality', 'spec-lifecycle', undefined, '\nSee [ref](references/a.md).\n');
  write('skills/quality/spec-lifecycle/references/a.md', '# a\n');
  readme({ Workflow: ['workflow/session-handoff'], Quality: ['quality/spec-lifecycle'] });
  assert.deepEqual(messages(), []);
});

test('frontmatter must hold only a matching name and a description', () => {
  skill('workflow', 'alpha', 'name: beta\ndescription: x\nmetadata:\n  author: someone');
  skill('workflow', 'gamma', 'name: gamma');
  readme({ Workflow: ['workflow/alpha', 'workflow/gamma'] });
  const out = messages();
  assert.ok(out.includes('skills/workflow/alpha/SKILL.md: frontmatter name "beta" must equal "alpha"'));
  assert.ok(out.includes('skills/workflow/alpha/SKILL.md: frontmatter may only contain name, description, argument-hint, disable-model-invocation (found metadata)'));
  assert.ok(out.includes('skills/workflow/gamma/SKILL.md: frontmatter description is empty'));
});

test('disable-model-invocation is allowed only as true', () => {
  skill('quality', 'manual', 'name: manual\ndescription: x\ndisable-model-invocation: true');
  skill('quality', 'wrong', 'name: wrong\ndescription: x\ndisable-model-invocation: yes');
  readme({ Quality: ['quality/manual', 'quality/wrong'] });
  assert.deepEqual(messages(), ['skills/quality/wrong/SKILL.md: frontmatter disable-model-invocation must be true when present']);
});

test('README rows must exist once, under the right domain, for real skills', () => {
  skill('workflow', 'a');
  skill('quality', 'b');
  skill('design', 'c');
  readme({ Workflow: ['workflow/a', 'workflow/a', 'quality/b'], Design: ['design/gone'] });
  const out = messages();
  assert.ok(out.includes('README.md: skills/workflow/a is listed 2 times'));
  assert.ok(out.includes('README.md: skills/quality/b is listed under "workflow" instead of "quality"'));
  assert.ok(out.includes('README.md: no row for skills/design/c'));
  assert.ok(out.includes('README.md: row for missing skill skills/design/gone'));
});

test('a body-level "When to use" section is reported, other headings and code blocks are not', () => {
  skill('workflow', 'triggers', undefined, '\n# x\n\n## When to use\n\n- asked\n');
  skill('workflow', 'fine', undefined, '\n# x\n\n## When NOT to use\n\n```md\n## When to use\n```\n');
  readme({ Workflow: ['workflow/triggers', 'workflow/fine'] });
  assert.deepEqual(messages(), ['skills/workflow/triggers/SKILL.md: body has a "When to use" section; move trigger conditions into the description']);
});

test('unknown domains, bad names, empty resource dirs and broken links are reported', () => {
  skill('misc', 'Bad_Name');
  mkdirSync(join(root, 'skills/misc/Bad_Name/scripts'));
  write('templates/x.md', '[missing](nope.md) and `[code](ignored.md)` and [web](https://example.com)');
  readme({ Misc: ['misc/Bad_Name'] });
  const out = messages();
  assert.ok(out.some((m) => m.startsWith('skills/misc: unknown domain')));
  assert.ok(out.includes('skills/misc/Bad_Name: directory name must be kebab-case'));
  assert.ok(out.includes('skills/misc/Bad_Name/scripts: empty resource directory'));
  assert.ok(out.includes('templates/x.md: broken link: nope.md'));
  assert.ok(!out.some((m) => m.includes('ignored.md')));
});

test('privacy scan flags personal paths, tokens, emails and denylisted terms only when enabled', () => {
  skill('workflow', 'a', undefined, '\nRun from /Users/alice/git and ~/.cache.\nToken ghp_abcdefghijklmnopqrstuvwxyz0123.\nMail bob@corp.io or dev@example.com.\nBuilt for AcmeCorp.\n'); // privacy-allow: fixture
  readme({ Workflow: ['workflow/a'] });
  assert.deepEqual(messages(), []);
  const out = messages({ privacy: true, denylist: ['acmecorp'] });
  const file = 'skills/workflow/a/SKILL.md';
  assert.ok(out.includes(`${file}:7: macOS home path`));
  assert.ok(out.includes(`${file}:8: GitHub token`));
  assert.ok(out.includes(`${file}:9: email address`));
  assert.ok(out.includes(`${file}:10: denylisted term "acmecorp"`));
  assert.equal(out.filter((m) => m.startsWith(`${file}:9`)).length, 1);
});

test('lines marked privacy-allow are skipped by the privacy scan', () => {
  skill('workflow', 'a', undefined, '\nExample path /Users/alice/demo <!-- privacy-allow: sample -->\n');
  readme({ Workflow: ['workflow/a'] });
  assert.deepEqual(messages({ privacy: true }), []);
});
