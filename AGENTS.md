# Contextlet

Last updated: 2026-11-14

- Owner direction: finish the portfolio, choose the unfinished VS Code brief,
  publish each project to personal GitHub. The brief specifies no feature set;
  the chosen first slice is explicit local code-to-Markdown handoff.
- Read README.md and docs/specs/handoff.md before changes. Preserve user work.
- Runtime is CommonJS, VS Code API and Node built-ins only. No network,
  execution of project code, recursive discovery, telemetry or persistence.
- Capture only explicitly chosen text from local workspace documents. Keep
  lexical/canonical workspace and sensitive-path checks, finite UTF-8 budgets,
  immutable snapshots and review-before-copy. These checks are not a secret scanner.
- Tests use authored T2 fixtures only. Standing owner approval covers focused
  core/native-host checks, free temporary public CI, packaging and GitHub preview
  publication. Marketplace/account creation, paid resources and live user data
  are outside this release. No Vercel/Supabase service is required.
- Local Storage Guard blocks heavy installs/builds. Do not bypass it. Native
  host/package qualification runs in owned free CI with bounded teardown.
- Keep failure receipts. Separate core, packaged Extension Host, native dialogs,
  physical/remote platform and Marketplace acceptance. Retire temporary CI.
- Run focused syntax/core checks and git diff --check; update owning evidence.
