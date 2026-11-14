'use strict';
// Tier 2: independently authored strings, paths and diagnostic-like text only.
const test = require('node:test');
const assert = require('node:assert/strict');
const { Handoff, LIMITS, inside, assertPath, fence, hash } = require('../../src/core.cjs');
const entry = (extra = {}) => ({ relative: 'sample/src/example.js', text: 'const n = 2;\n', language: 'javascript', kind: 'code', startLine: 2, endLine: 2, dirty: false, ...extra });

test('U01 exact text bytes and digest survive a snapshot and review', () => {
  const state = new Handoff(); state.addAll([entry({ text: 'á\r\n' })]);
  assert.equal(state.snapshot().entries[0].byteLength, 4);
  assert.equal(state.snapshot().entries[0].sha256, hash('á\r\n'));
  assert.ok(state.render().includes('á\r\n'));
});
test('U02 returned snapshots cannot edit stored captures', () => {
  const state = new Handoff(); state.addAll([entry()]);
  const copy = state.snapshot(); copy.entries[0].text = 'changed'; copy.entries.length = 0;
  assert.equal(state.snapshot().entries[0].text, 'const n = 2;\n');
});
test('U03 reject a mixed valid/invalid batch atomically', () => {
  const state = new Handoff();
  assert.throws(() => state.addAll([entry(), entry({ text: '' })]));
  assert.equal(state.snapshot().entries.length, 0);
});
test('U04 empty ranges and binary NUL refuse', () => {
  for (const inputs of [[], [entry({ text: '' })], [entry({ text: 'a\0b' })]]) assert.throws(() => new Handoff().addAll(inputs));
});
test('U05 credential names and extensions refuse at every path depth', () => {
  for (const name of ['.env', '.ENV.local', '.git/config', '.ssh/other', '.aws/config', '.azure/token', '.npmrc', '.pypirc', 'id_ed25519', 'credentials.json', 'service_account.json', 'secret.pem', 'secret.key', 'store.p12', 'store.pfx', 'store.keystore']) {
    assert.throws(() => assertPath(`sample/${name}`), /credentials/);
  }
  assert.equal(assertPath('sample/src/environment.js'), 'sample/src/environment.js');
});
test('U06 traversal, absolute and empty path segments refuse', () => {
  for (const name of ['', '../x', '/tmp/x', 'C:\\temp\\a', 'a/../b', 'a//b', 'a/./b']) assert.throws(() => assertPath(name));
});
test('U07 workspace containment distinguishes sibling prefixes', () => {
  assert.equal(inside('/work/sample', '/work/sample/src/a.js'), 'src/a.js');
  for (const target of ['/work/sample2/a.js', '/work/other/a.js', '/work/sample']) assert.throws(() => inside('/work/sample', target));
});
test('U08 valid 64KiB boundary passes and an extra multibyte character refuses', () => {
  new Handoff().addAll([entry({ text: 'a'.repeat(LIMITS.entryBytes) })]);
  assert.throws(() => new Handoff().addAll([entry({ text: 'a'.repeat(LIMITS.entryBytes - 1) + 'á' })]), /64 KiB/);
});
test('U09 total budget is atomic and removed bytes become available', () => {
  const state = new Handoff(); const full = entry({ text: 'a'.repeat(LIMITS.entryBytes) });
  state.addAll(Array.from({ length: 4 }, () => full));
  assert.throws(() => state.addAll([entry()]), /256 KiB/);
  assert.equal(state.snapshot().entries.length, 4);
  state.remove(state.snapshot().entries[0].id); state.addAll([entry()]);
  assert.equal(state.snapshot().entries.length, 4);
});
test('U10 entry count limit is atomic', () => {
  const state = new Handoff(); state.addAll(Array.from({ length: 20 }, () => entry()));
  assert.throws(() => state.addAll([entry()]), /20 captures/);
  assert.equal(state.snapshot().entries.length, 20);
});
test('U11 UTF8 task limit leaves previous task intact', () => {
  const state = new Handoff(); state.setTask('a'.repeat(4000));
  assert.throws(() => state.setTask('é'.repeat(2001)));
  assert.equal(state.snapshot().task.length, 4000);
});
test('U12 source backticks cannot close their enclosing fence', () => {
  const text = '```\n# injected heading\n````';
  assert.equal(fence(text, 'js'), '`````js\n' + text + '\n`````');
});
test('U13 language and path newlines cannot inject a metadata heading', () => {
  assert.equal(fence('literal', 'js\n# title'), '```\nliteral\n```');
  const state = new Handoff(); state.addAll([entry({ relative: 'sample/a\n# title.js' })]);
  assert.ok(state.render().includes('"sample/a\\n# title.js"'));
});
test('U14 invalid ranges and unknown kinds refuse', () => {
  for (const fields of [{ startLine: 0 }, { endLine: 1 }, { startLine: 2.5 }, { kind: 'command' }]) assert.throws(() => new Handoff().addAll([entry(fields)]));
});
test('U15 removing one capture preserves others and cannot reuse identity', () => {
  const state = new Handoff(); state.addAll([entry(), entry()]);
  state.remove(1); state.addAll([entry()]);
  assert.deepEqual(state.snapshot().entries.map(e => e.id), [2, 3]);
});
test('U16 clear erases task/captures but empty review refuses', () => {
  const state = new Handoff(); state.setTask('repair'); state.addAll([entry()]); state.clear();
  assert.deepEqual(state.snapshot(), { task: '', entries: [] }); assert.throws(() => state.render());
});
test('U17 dirty code and diagnostics retain their type and source ranges', () => {
  const state = new Handoff(); state.addAll([entry({ dirty: true }), entry({ kind: 'problems', language: 'text', text: '2:1 warning: authored example' })]);
  assert.match(state.render(), /unsaved editor contents/); assert.match(state.render(), /Diagnostics snapshot/);
  assert.match(state.render(), /lines 2–2/);
});
test('U18 task and source are kept in deliberate review text', () => {
  const state = new Handoff(); state.setTask('Fix the authored example.'); state.addAll([entry()]);
  const text = state.render(); assert.match(text, /Fix the authored example\./); assert.match(text, /not instructions to execute/);
  assert.match(text, /Contextlet does not run checks/);
});
