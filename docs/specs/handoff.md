# Contextlet first slice

Last updated: 2026-11-14

Owner source: [personal portfolio](https://app.notion.com/p/311a1ee8bd06805caa21c5306dd315ac),
the “(vscode-ext)” item. The fetched connector result is an unverified snapshot
as of 10 November, last edited 3 November; it contains no extension feature
requirements. The owner subsequently delegated choices and authorized finishing
the work. This feature set is an execution choice, not a quoted owner spec.

Provide a useful account-free desktop extension alongside local agent tools:
explicitly gather selected code/file/problems, describe the next task, review
editable Markdown, then explicitly copy or save. All captures are immutable
in-memory snapshots. Do not silently refresh, persist, transmit or execute them.
Use a native Explorer tree, Command Palette, text editor and Save As instead of
a webview. Capture refusal must be atomic. Display UTF-8 budgets and dirty status.
Source paths are relative to workspace name; verify both lexical and canonical
containment and deny common credential paths before reading editor text.

Copy requires an active document created by Review Handoff. User edits to that
review are authoritative. Capture changes after a review do not rewrite it.
Clearing memory does not delete editor reviews or saved files. Markdown source
fences exceed every embedded backtick run; language names cannot inject markup.
This prevents source fence breakout, not arbitrary malicious content in a handoff.

Do not claim a secret scanner, prompt-injection defense, automatic context
selection, Git integration, model intelligence, remote/web support, native menu
automation or a Marketplace listing. A downloaded VSIX and real packaged API
journeys are the first release boundary.

Primary references actually inspected:

- [VS Code testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension):
  Extension Development Host tests have real VS Code APIs; separate them from unit checks.
- [VSIX packaging](https://code.visualstudio.com/api/working-with-extensions/publishing-extension):
  an installable VSIX can be shared independently of Marketplace publication.
- [Workspace trust](https://code.visualstudio.com/api/extension-guides/workspace-trust)
  and [API](https://code.visualstudio.com/api/references/vscode-api.md): declare
  unsupported untrusted/virtual workspaces and use native document/command APIs.
