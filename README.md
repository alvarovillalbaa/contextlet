# Contextlet

Last updated: 2026-11-14

Small, explicit context for the next person or agent. Select code, collect the
current file's problems, and review an editable Markdown handoff before copying
or saving it. Runs inside desktop VS Code without an account, service or AI call.

## Use

1. Open a trusted local workspace and a text file.
2. Select text and run **Contextlet: Add Selection** from the Command Palette
   or editor context menu. Multiple selections are captured together. Use
   **Add Current File** when you deliberately want the whole file.
3. Optionally run **Add Current File Problems** and **Describe Task**.
4. Inspect/remove captures in **Explorer → Contextlet**, then choose
   **Review Handoff** from its toolbar or the Command Palette.
5. Edit the Markdown document. **Copy Reviewed Markdown** copies its current
   edited text. **Save Reviewed Markdown As…** opens VS Code's native Save As.

Captures retain source-relative names, line ranges, exact text SHA-256 and an
unsaved-editor marker. Later source edits never silently change a capture.
Each review is an independent document; clearing captures leaves existing
reviews intact. Closing the window loses in-memory captures/task. VS Code may
retain opened unsaved reviews through its own editor backup settings.

## Install

The first preview is being qualified. The public GitHub release will supply
`contextlet-0.1.0.vsix`; use **Extensions → … → Install from VSIX…** or:

```sh
code --install-extension contextlet-0.1.0.vsix
```

The package uses the publisher identifier `alvarovillalbaa` for local VSIX
identity. It does not imply a registered Marketplace publisher or store listing.

## Boundaries

Only the active local `file:` document inside a workspace can be captured.
Canonical paths reject symlink escapes and common credential locations.
Maximums: 20 captures, 64 KiB each, 256 KiB captured text, 4,000 task bytes and
50 errors/warnings from the active file. Refused batches add nothing. These are
UTF-8 byte limits. Information/hints and other files' diagnostics are excluded.

Path checks are a guard, not automatic secret redaction. Ordinary source and
diagnostics can contain secrets or absolute paths; review before sharing.
Code is fenced as literal text. Contextlet never runs it, sends it, scans the
workspace, reads environment variables or invokes a model. The extension has no
runtime dependencies, webview or telemetry. Remote/virtual workspaces are not
supported in this first slice. Save As and clipboard remain native editor/OS
operations; other extensions and VS Code itself have their own behavior.

## Develop and verify

No dependency installation or compilation is needed for runtime or core checks.
Use **Run → Start Debugging** with a VS Code Extension Development Host configured
for this folder, or launch `code --extensionDevelopmentPath=/path/to/contextlet`.

```sh
npm run check
npm test
git diff --check
```

The [contract](docs/specs/handoff.md) records the delegated feature choice and
constraints. The [qualification plan](docs/plans/2026/11-14/preview.md) separates
18 core cases, four real packaged Extension Host scenarios, packaging and public
delivery. Native dialog use, macOS/Windows, physical accessibility and Marketplace
publication remain separate from Linux host checks. No Vercel/Supabase is needed.

MIT licensed. [Source](https://github.com/alvarovillalbaa/contextlet).
