'use strict';
const vscode = require('vscode');
const fs = require('node:fs/promises');
const path = require('node:path');
const { Handoff, LIMITS, inside } = require('./core.cjs');

function activate(context) {
  const state = new Handoff();
  const reviews = new Set();
  let generation = 0;
  const changed = new vscode.EventEmitter();
  const provider = {
    onDidChangeTreeData: changed.event,
    getChildren: () => state.snapshot().entries,
    getTreeItem: entry => {
      const item = new vscode.TreeItem(`${entry.relative}:${entry.startLine}–${entry.endLine}`);
      item.id = String(entry.id);
      item.description = `${entry.kind} · ${entry.byteLength} B${entry.dirty ? ' · unsaved' : ''}`;
      item.tooltip = `Captured text SHA-256: ${entry.sha256}`;
      item.contextValue = 'capture';
      item.iconPath = new vscode.ThemeIcon(entry.kind === 'problems' ? 'warning' : 'code');
      return item;
    },
  };
  const view = vscode.window.createTreeView('contextlet.handoff', { treeDataProvider: provider });
  function refresh() {
    const snapshot = state.snapshot();
    view.message = snapshot.task ? `Task: ${snapshot.task.replace(/\s+/g, ' ').slice(0, 120)}` : 'Add a task, then review your captures.';
    view.description = `${snapshot.entries.length}/20 captures`;
    changed.fire();
  }
  async function source() {
    const editor = vscode.window.activeTextEditor;
    if (!vscode.workspace.isTrusted || !editor || editor.document.uri.scheme !== 'file' || reviews.has(editor.document)) {
      throw new Error('Open a local text file in a trusted workspace first.');
    }
    const document = editor.document;
    const version = document.version;
    const epoch = generation;
    const selections = editor.selections.map(range => new vscode.Range(range.start, range.end));
    const folder = vscode.workspace.getWorkspaceFolder(document.uri);
    if (!folder || folder.uri.scheme !== 'file') throw new Error('Choose a file inside a local workspace folder.');
    const relative = inside(folder.uri.fsPath, document.uri.fsPath);
    const [canonicalRoot, canonicalFile] = await Promise.all([fs.realpath(folder.uri.fsPath), fs.realpath(document.uri.fsPath)]);
    inside(canonicalRoot, canonicalFile);
    if (generation !== epoch || document.version !== version || editor.document !== document || vscode.window.activeTextEditor !== editor || document.isClosed) throw new Error('The active document or handoff changed. Choose it again.');
    return { document, selections, relative: `${path.basename(folder.uri.fsPath)}/${relative}` };
  }
  function currentReview() {
    const document = vscode.window.activeTextEditor?.document;
    if (!document || !reviews.has(document) || document.isClosed) throw new Error('Open a Contextlet review first. Its current edited text is what gets shared.');
    return document;
  }
  function register(name, action) {
    context.subscriptions.push(vscode.commands.registerCommand(`contextlet.${name}`, async (...args) => {
      try { return await action(...args); }
      catch (error) { void vscode.window.showWarningMessage(`Contextlet: ${error.message}`); return null; }
    }));
  }
  register('addSelection', async () => {
    const { selections, document, relative } = await source();
    const ranges = selections.filter(range => !range.isEmpty);
    const inputs = ranges.map(range => {
      if (document.offsetAt(range.end) - document.offsetAt(range.start) > LIMITS.entryBytes) throw new Error('Each capture must fit within 64 KiB. Select a smaller range.');
      const endLine = range.end.character === 0 && range.end.line > range.start.line ? range.end.line : range.end.line + 1;
      return { relative, text: document.getText(range), startLine: range.start.line + 1, endLine,
        language: document.languageId, kind: 'code', dirty: document.isDirty };
    });
    state.addAll(inputs); refresh(); return true;
  });
  register('addFile', async () => {
    const { document, relative } = await source();
    if (document.getText().length > LIMITS.entryBytes) throw new Error('Each capture must fit within 64 KiB. Select a smaller range.');
    state.addAll([{ relative, text: document.getText(), startLine: 1, endLine: document.lineCount,
      language: document.languageId, kind: 'code', dirty: document.isDirty }]);
    refresh(); return true;
  });
  register('addDiagnostics', async () => {
    const { document, relative } = await source();
    const problems = vscode.languages.getDiagnostics(document.uri).filter(d => d.severity <= vscode.DiagnosticSeverity.Warning);
    if (!problems.length) throw new Error('This file has no errors or warnings to capture.');
    if (problems.length > LIMITS.diagnostics) throw new Error('This file has more than 50 problems. Resolve some before capturing.');
    const text = problems.map(d => `${d.range.start.line + 1}:${d.range.start.character + 1} ${d.severity === 0 ? 'error' : 'warning'}${d.source ? ` [${d.source}]` : ''}: ${d.message}`).join('\n');
    state.addAll([{ relative, text, startLine: 1, endLine: document.lineCount, language: 'text', kind: 'problems', dirty: document.isDirty }]);
    refresh(); return true;
  });
  register('setTask', async () => {
    const task = await vscode.window.showInputBox({ title: 'Contextlet · Task', prompt: 'What should happen next? Include constraints and the expected result.',
      value: state.snapshot().task, ignoreFocusOut: true,
      validateInput: text => Buffer.byteLength(text, 'utf8') > LIMITS.taskBytes ? 'Keep the task within 4,000 UTF-8 bytes.' : undefined });
    if (task === undefined) return false;
    state.setTask(task); refresh(); return true;
  });
  register('review', async () => {
    const document = await vscode.workspace.openTextDocument({ language: 'markdown', content: state.render() });
    reviews.add(document);
    await vscode.window.showTextDocument(document, { preview: false });
    return document.uri.toString();
  });
  register('copyReview', async () => {
    const text = currentReview().getText();
    if (!text.trim()) throw new Error('The review is empty.');
    await vscode.env.clipboard.writeText(text);
    void vscode.window.showInformationMessage('Contextlet: reviewed Markdown copied.');
    return true;
  });
  register('saveReview', async () => {
    const document = currentReview();
    await vscode.commands.executeCommand('workbench.action.files.saveAs');
    return !document.isDirty;
  });
  register('remove', entry => { if (entry && Number.isSafeInteger(entry.id)) state.remove(entry.id); refresh(); });
  register('clear', () => { generation += 1; state.clear(); refresh(); });
  context.subscriptions.push(changed, view, vscode.workspace.onDidCloseTextDocument(document => reviews.delete(document)),
    { dispose() { generation += 1; state.clear(); reviews.clear(); } });
  refresh();
  return { getSnapshot: () => state.snapshot() };
}

module.exports = { activate };
