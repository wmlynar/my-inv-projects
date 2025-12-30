# Repository Guidelines

## Project Structure & Module Organization
- `seal/` is the CLI implementation (CommonJS) and core logic (`seal/src/**`).
- `example/` is a sample web app used for local “sealed” testing, with config in `example/seal-config/configs/` and assets in `example/public/`.
- `docs/seal_docset/` contains the v0.5 docset and reference material.
- Root `package.json` defines the workspace entry points for `seal` and `example`.

## Build, Test, and Development Commands
- `npm install` installs workspace dependencies.
- `npm run dev` runs the example app via the workspace script (same as `npm --workspace example run dev`).
- `npm run release` builds a sealed release from the example app (`npm --workspace example run seal:release`).
- `npx seal check` runs CLI preflight checks against the current project.
- `npx seal release` builds a sealed artifact; output lands in `example/seal-out/`.

## Coding Style & Naming Conventions
- JavaScript, CommonJS modules in `seal/`; Node.js >= 20 (24 recommended per README).
- Indentation: 2 spaces; prefer double quotes as seen in `seal/src/**`.
- File naming follows lowerCamelCase for JS modules (e.g., `runLocal.js`).
- No repo-wide formatter or linter is configured; keep changes consistent with existing files.

## Testing Guidelines
- No automated test runner or test scripts are defined in this repo.
- If you add tests, keep them colocated (e.g., `src/__tests__/` or `test/`) and document how to run them.

## Commit & Pull Request Guidelines
- Git history is not available in this repo snapshot, so no commit message convention can be inferred.
- PRs should include: a concise summary, steps to verify, and screenshots for `example/` UI changes.
- Link related issues or docs when changes affect CLI behavior or deployment flow.

## Security & Configuration Tips
- Runtime configs live in `example/seal-config/configs/*.json5` and are managed via `seal config ...`.
- Sealed build artifacts are stored in `example/seal-out/` and unpacked to `example/seal-out/release/`.

## Configuration Notes
- Project metadata lives in `example/seal.json5` (or in your app’s `seal.json5`).
  - `build.frontendObfuscation` is **enabled by default** and obfuscates `public/**/*.js` (except `*.min.js`).
  - `build.frontendMinify` is **enabled by default** (level: `safe`) and safely minifies `public/**/*.html` and `public/**/*.css` (except `*.min.html`/`*.min.css`).
  - `build.protection` is **enabled by default**:
    - SEA: can pack the main bundle into a compressed loader (so the SEA blob has no plaintext JS).
    - bundle: can gzip-pack the backend bundle behind a small loader.
    - thin-split: ELF packer defaults to `kiteshield` (`-n`) on the launcher.
    - SEA/thin-single ignore `strip`/ELF packer (auto-disabled).

## Helpful Commands (end-to-end)
- `npx seal verify --explain` prints a human-readable verification checklist.
- `npx seal run-local --sealed` runs the latest sealed build from `seal-out/release`.
- `npx seal deploy local --bootstrap` deploys and installs the example as a **user** systemd service (`seal-example-sandbox.service`).

## Long-Running Commands
- Use the idle-timeout wrapper with a 120s threshold for long-running commands:
  - `tools/seal/seal/scripts/run-with-idle-timeout.sh 120 <command...>`
