# AGENTS.md (Shared Motto)


Operational guide for active Motto repos (`motto-blocks`, `motto-dynamics`, `motto-ai`, `motto-animations`). Repo-local `AGENTS.md` files override this for repo-only details.

This file intentionally stays **short**. Conventions live in `CONVENTIONS.md` and `docs/conventions/*`.

## What to read (token budget)

- Start with `CONVENTIONS.md` (index).
- Open **only** the relevant topic file(s) under `docs/conventions/` for the task at hand.

## Repo topology (high level)

- `motto-blocks` owns Blocks + Styler + shared modules (`src/shared/`).
- Consumer repos consume shared exports/contracts and keep their own runtime/build outputs.
- `motto-dynamics` — query and dynamic content blocks (pro).
- `motto-ai` — AI agent layer; generates Motto blocks from natural language prompts (pro). Requires `motto-blocks`; optionally consumes `motto-blocks-pro` and `motto-dynamics`.
- `motto-props` is legacy-only.
- always do assemble when building

## Development path boundary

**Only edit files inside `_dev/`.** Every sibling directory under `plugins/` is an assembled/runtime copy that gets overwritten on the next build.

```
plugins/
  _dev/motto-blocks/          ← SOURCE — edit here
  _dev/motto-dynamics/        ← SOURCE — edit here
  _dev/motto-ai/              ← SOURCE — edit here
  motto-blocks/               ← assembled by assemble-plugin.mjs   (read-only)
  motto-blocks-pro/           ← assembled by assemble-pro.mjs      (read-only)
  motto-ai/                   ← assembled by assemble-plugin.mjs   (read-only)
  ...
```

**Pro add-on** lives alongside the free plugin after assemble (`plugins/motto-blocks-pro/`). Source is still under `_dev/motto-blocks/`:

- **`pro/`** — Pro-only **PHP**: plugin bootstrap (`motto-blocks-pro.php`) and supporting files under `pro/includes/`. `assemble-pro.mjs` copies them into the assembled plugin (root `motto-blocks-pro.php`, `includes/`, etc.).
- **`src/pro/`** — Pro-only **JavaScript**: entry `src/pro/editor-hooks.js` pulls in `src/pro/blocks/*` (Pro blocks + block filters) and `src/pro/styler/*` (Pro Styler sections/filters). **Styler core stays in** `src/styler/` **(free)**; Pro only registers on those hooks. Built by `vite.config.pro.mjs` → `build/motto-blocks-pro.js`; assemble copies to `motto-blocks-pro/assets/motto-blocks-pro.js`. Pro `block.json` files are copied to `build/blocks/<slug>/` by the free Vite `copy-block-json` plugin (`src/blocks` + `src/pro/blocks`). Extra Pro assets are listed in `scripts/assemble-pro.mjs`.

Before editing any file: confirm its path starts with `_dev/`. If it doesn't, find the source equivalent inside `_dev/`.

## Root-cause policy

Fix the source, not the symptom. Avoid outer fallback layers unless they are an explicit, temporary migration step with a removal note.

## Language policy

All tracked repo artifacts in English (code, comments, docs). Spanish in chat only.

## Response style

Give short, precise answers by default and wait for the user to ask for more detail.

## Engineering principles (novel proposals only)

See `docs/conventions/engineering-principles.md`. Open it only when conventions and repo patterns do not already decide the approach.

## Quality gates (all repos, by relevance)

- Production build (`npm run build`).
- Icon registry generation (if icon usage/config changed).
- Value-options validation (if value option data changed and the repo provides a validator).

## SCSS compilation

Do not hand-edit compiled CSS in `assets/css/`. Update the source SCSS and run the build (see `CLAUDE.md` for commands) — `sass:build` is already a `prebuild`/`predev` step, not a separate manual one.

## Performance + styling scope (defaults)

- Memoize heavy lists/maps; avoid per-keystroke recomputation of large datasets.
- Avoid duplicated effects/state loops in editor UI.
- Keep styling changes minimal and structural unless the task explicitly asks for visual polish.

## Conventions single-source-of-truth

Do not duplicate conventions in this file. Use these topic docs instead:

- Engineering principles (gaps only): `docs/conventions/engineering-principles.md`
- Shared modules / image controls SSOT: `docs/conventions/shared-modules.md`
- Editor UI / panels / control naming / SCSS / icon rules: skill `motto-visual-system` (`skills-source/motto-visual-system/`)
- Styler rule-row value control registration/dispatch/component contract: skill `motto-styler-value-controls` (`skills-source/motto-styler-value-controls/`)
- Layout rules: `docs/conventions/block-layout.md`
- Runtime + assets: `docs/conventions/assets-runtime.md`
- General contracts/topology: `docs/conventions/architecture.md`

## Commands

`commands-source/` is the SSOT folder for repo custom commands — tool-agnostic path so any agent (Codex, etc.) can read a command's procedure directly. Claude Code additionally auto-discovers them as `/command-name` via the `.claude/commands` symlink to that folder (same pattern as `skills-source/` → `.claude/skills`).

## Skills

`skills-source/` is the SSOT folder for repo custom skills — tool-agnostic path so any agent (Codex, etc.) can read a skill directly.

## Always-on rules

- Prefer canonical shared implementations (authored under `src/components/`, `src/lib/`, or `config/`, and surfaced via `src/shared/index.js` for consumer repos) over duplicated repo-local logic.
- Use stable IDs for editable rows/entities; never use CSS `name`, `value`, labels, selectors, or array indexes as persistent identity.
- Keep class application order aligned with generated CSS rule order.
- Each block has a `README.md` next to its `block.json` (`src/blocks/<slug>/README.md`, `src/pro/blocks/<slug>/README.md`) documenting current behavior — update it in the same change as any behavior fix for that block. If a bug means the README described the wrong behavior, fix the README first, then make the code match it. This is separate from `docs/specs/`: the README is the current-state contract; a spec is only needed when the change is a decision worth preserving (shared/cross-cutting impact, or a non-obvious tradeoff future readers could otherwise re-litigate).
