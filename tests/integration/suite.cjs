'use strict';
// Tier 2: real Extension Host APIs, solely disposable authored files/diagnostics.
const vscode = require('vscode');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

exports.run = async function run() {
  const root = process.env.CONTEXTLET_FIXTURE_ROOT;
  const output = process.env.CONTEXTLET_HOST_RESULT;
  assert.ok(root && output);
  const extension = vscode.extensions.getExtension('alvarovillalbaa.contextlet');
  assert.ok(extension, 'packaged extension is discovered');
  const api = await extension.activate();
  const command = (name, ...args) => vscode.commands.executeCommand(`contextlet.${name}`, ...args);
  const open = async name => vscode.window.showTextDocument(await vscode.workspace.openTextDocument(vscode.Uri.file(path.join(root, name))), { preview: false });
  const rows = [];
  const cases = [
    ['H01 selected dirty snapshots, editable review and actual clipboard', async () => {
      const editor = await open('example.js');
      await editor.edit(edit => edit.insert(new vscode.Position(0, 0), '// unsaved authored line\n'));
      editor.selection = new vscode.Selection(0, 0, 2, 0);
      const captured = editor.document.getText(editor.selection);
      assert.equal(await command('addSelection'), true);
      assert.equal(api.getSnapshot().entries[0].dirty, true);
      assert.equal(api.getSnapshot().entries[0].endLine, 2);
      await editor.edit(edit => edit.replace(new vscode.Range(0, 0, 1, 0), '// later edit\n'));
      await command('review');
      const review = vscode.window.activeTextEditor;
      assert.equal(review.document.languageId, 'markdown');
      assert.ok(review.document.getText().includes(captured));
      assert.ok(!review.document.getText().includes('// later edit'));
      assert.ok(review.document.getText().includes(crypto.createHash('sha256').update(captured).digest('hex')));
      await review.edit(edit => edit.insert(new vscode.Position(0, 0), 'Reviewed by the authored fixture.\n'));
      assert.equal(await command('copyReview'), true);
      assert.equal(await vscode.env.clipboard.readText(), review.document.getText());
      assert.equal(await fs.readFile(path.join(root, 'example.js'), 'utf8'), 'const answer = 42;\nconsole.log(answer);\n');
    }],
    ['H02 actual diagnostics capture and removal', async () => {
      const editor = await open('problems.js');
      const collection = vscode.languages.createDiagnosticCollection('contextlet-authored');
      try {
        collection.set(editor.document.uri, [
          new vscode.Diagnostic(new vscode.Range(0, 0, 0, 1), 'Authored error', vscode.DiagnosticSeverity.Error),
          new vscode.Diagnostic(new vscode.Range(0, 0, 0, 1), 'Authored warning', vscode.DiagnosticSeverity.Warning),
          new vscode.Diagnostic(new vscode.Range(0, 0, 0, 1), 'Authored information', vscode.DiagnosticSeverity.Information),
        ]);
        assert.equal(await command('addDiagnostics'), true);
        const entry = api.getSnapshot().entries[0];
        assert.match(entry.text, /Authored error/); assert.match(entry.text, /Authored warning/);
        assert.ok(!entry.text.includes('Authored information'));
        await command('remove', entry); assert.equal(api.getSnapshot().entries.length, 0);
      } finally { collection.dispose(); }
    }],
    ['H03 actual sensitive paths, symlink escape and foreign file refuse', async () => {
      for (const name of ['.env.local', 'escape.js', '../outside.js']) {
        await open(name); assert.equal(await command('addFile'), null);
        assert.equal(api.getSnapshot().entries.length, 0);
      }
    }],
    ['H04 whole file, empty selection, size refusal and clear', async () => {
      const editor = await open('problems.js');
      editor.selection = new vscode.Selection(0, 0, 0, 0);
      assert.equal(await command('addSelection'), null);
      assert.equal(await command('copyReview'), null);
      assert.equal(await command('addFile'), true);
      assert.equal(api.getSnapshot().entries[0].text, 'const authored = true;\n');
      await open('large.txt'); assert.equal(await command('addFile'), null);
      assert.equal(api.getSnapshot().entries.length, 1);
      await command('clear'); assert.deepEqual(api.getSnapshot(), { task: '', entries: [] });
      assert.equal(await command('review'), null);
    }],
  ];
  for (const [id, body] of cases) {
    await command('clear');
    const started = Date.now();
    try { await body(); rows.push({ id, passed: true, durationMs: Date.now() - started }); }
    catch (error) { rows.push({ id, passed: false, durationMs: Date.now() - started, error: error.stack }); }
    finally { await command('clear'); }
  }
  await fs.writeFile(output, JSON.stringify({ vscodeVersion: vscode.version, extensionPath: extension.extensionPath, rows }, null, 2), { flag: 'wx' });
  for (const row of rows) console.log(JSON.stringify(row));
  assert.ok(rows.every(row => row.passed), 'all four packaged-host scenarios must pass');
};
