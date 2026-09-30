# Motto Engineering Conventions

This file is the lightweight entry point for Motto engineering conventions. Read this file first, then open only the topic file relevant to the current task.

## Token Budget Rule

- Do not load every convention file by default.
- For routine work, read this index plus the repo-local `CONVENTIONS.md`.
- Open topic files only when the task touches that area.
- If two files conflict, the more specific repo-local rule wins; otherwise these shared conventions are the baseline.

## Repo Scope (Free + Pro)

- This `/_dev/motto-blocks` repo is the development source for both Free (`motto-blocks`) and Pro addon outputs (`motto-blocks-pro`).
- Free/Pro code can coexist here (for example under `src/` and `src/pro/`), following boundary rules in the topic docs.
- Paths above `/_dev` are assembled/runtime copies and are not source of truth for development edits.

## Free/Pro Implementation Rules

- Keep this file short; Free/Pro implementation details live in:
  - `docs/freepro-strategy.md` (product/rollout/contract)
  - `docs/specs/SDD-007-free-pro-infra-v1.md` (structure/boundaries/workflow)
  - `docs/specs/SDD-008-pro-extensibility-hooks-v1.md` (stub-by-ID + hooks contract)
- For any Pro feature/block change, follow those docs as the source of truth instead of duplicating rules here.

## Topic Index

- `docs/conventions/engineering-principles.md`: durable structure vs patches, conventions as leverage, testing hypotheses — only when other convention docs are silent.
- `docs/conventions/architecture.md`: repo topology, shared module boundaries, naming, and data contracts.
- `docs/conventions/block-layout.md`: block root layout, block spacing, child block roles, synced patterns, and editor/frontend runtime split.
- `docs/conventions/assets-runtime.md`: asset registration, frontend public dependency resolution, accessibility, performance, validation, and packaging.
- `docs/conventions/shared-modules.md`: image controls SSOT, shared module contracts, consumer repo overrides, and rollout process.
- `docs/conventions/styler-css-classes.md`: Styler reusable class CPT, block `cssClasses` ref shape, resolution/dedup rules, and stable `uid` (UUID) contract for cross-environment identity.
- `docs/conventions/styler-css-loading.md`: the three CSS delivery paths (public frontend, editor canvas, BlockPreview iframes), which PHP hooks and JS modules own each path, and which path to extend for new contexts.
- **Skill** `skills-source/motto-visual-system/`: visual/design-system rules for editor UI — panel structure, `*Control` naming, buttons, popups, SCSS, and Lucide icon usage/sizing. Loads automatically for editor UI tasks; open `SKILL.md` directly if you need it outside that trigger.
- **Skill** `skills-source/motto-styler-value-controls/`: how to build/register a Styler rule-row value control — `styler-css-value-options.json` registration, `value-control-registry.jsx` dispatch, the `value`/`onChange` component contract, and code/visual view wiring. Loads automatically for Styler control work.

Animation note: prefer GSAP and its plugins/extensions for animation behavior in both editor previews and frontend/runtime code.

## Quick pointers (no duplication)

If you’re looking for “the rule” for something, it should exist in exactly one topic doc:

- **Judgment when docs are silent (engineering principles)**: `docs/conventions/engineering-principles.md`
- **Topology / naming / data contracts / `controls` vs `primitives` vs `src/shared`**: `docs/conventions/architecture.md`
- **Layout + child roles**: `docs/conventions/block-layout.md`
- **Panel structure / control naming / buttons / popups / SCSS / icon sizing (visual design system)**: skill `motto-visual-system`
- **Styler value-control registration/dispatch/component contract**: skill `motto-styler-value-controls`
- **Assets / runtime / packaging**: `docs/conventions/assets-runtime.md`
- **Image controls SSOT + shared modules**: `docs/conventions/shared-modules.md`
- **Styler CPT class refs + stable `uid` contract**: `docs/conventions/styler-css-classes.md`
