# Feature Spec: SDD-008
Version: 0.2
Status: Active
Owner: Architecture + Styler Core
Last Updated: 2026-05-21

This file is a technical annex to `docs/free-pro-strategy-and-boundaries.md`.

It defines hook contracts and extension mechanics only.
It must not redefine the overall Free/Pro strategy, ownership model, or rollout plan.

## 1. Goal
Define stable extension hooks that implement the Free/Pro boundary described in `docs/free-pro-strategy-and-boundaries.md`, so the Pro plugin can add or upgrade Styler UI and runtime behaviors without shipping Pro logic inside Free or forking core code.

## 2. Scope
In scope:
- Hook points for Styler panel composition (sections) and per-section action menus.
- Hook point for derived layout/runtime CSS injection (e.g. Custom Spacing / Block Spacing).
- A consistent “stub-by-ID” pattern: Free provides disabled Pro stubs; Pro upgrades them via filters.
- Stable identifiers for sections/actions to support long-lived upgrades and predictable ordering.
- Single-repo packaging: Pro-only code is versioned in this repo under `src/pro/` (not only in a local WP install).

Out of scope:
- Licensing UI, purchase flows, or server-side license validation.
- Defining the exact distribution channel (two zips vs. other) beyond “Pro bundle is separate”.
- Refactoring unrelated Styler runtime code paths not needed to support hooks.

## 3. Current Behavior
- Styler UI is assembled inside `src/styler/components/StylerPanel.jsx` with direct component composition.
- Some action menus are currently built inside section components (e.g. `StylerCssList` via `extraControls`) or directly in `StylerPanel`.
- Custom Spacing (Block Spacing) is persisted under `mottoStyler.blockSpacing` and applied in runtime via derived CSS rules in `src/styler/runtime/style-engine.jsx`.
- There is no formal hook surface allowing Pro to:
  - replace a whole panel section,
  - add/remove/upgrade actions per section,
  - inject derived runtime CSS in a controlled, testable way.

## 4. Target Behavior
Rules:
- Free defines a stable extension surface and provides visible-but-disabled Pro stubs where appropriate.
- Pro installs filters that upgrade/replace stubs into real behaviors (enabled actions, editable sections, runtime CSS).
- Free must ignore Pro-only persisted values at runtime unless Pro registers the corresponding runtime filter.
- All stubs and upgrades must be keyed by stable IDs (not labels, not array indices).
- Hook contexts should be minimal and stable to avoid performance regressions.
- **Single repo rule**: Pro filter registrations and implementations must live in the repo (`src/pro/`) so they are reviewable and cannot drift as “local-only” files in a WP install.

### 4.1 Stub-by-ID pattern
- Free registers the “existence” of a feature via a stub item with:
  - stable `id`
  - `isDisabled: true`
  - `proBadge: true` (or equivalent render hint)
  - no side-effect `onClick`
- Pro upgrades by mapping the item with the same `id` into an enabled item:
  - `isDisabled: false`
  - `proBadge: false`
  - real `onClick` / behavior

## 5. Data Contract

All Styler hook names are centralized as frozen constants in `src/lib/freepro-ids.js` (`STYLER_HOOKS`).
Block-level hook names live in `src/blocks/freepro/blocks-freepro-ids.js` (`BLOCKS_HOOKS`).
Never use inline hook name strings — always import the constant.

### 5.1 Panel sections hook
Hook name: `STYLER_HOOKS.panelSections` → `"motto.styler.panelSections"`

Inputs:
- Base list of section descriptors from Free core.
- Context: `blockName`, `clientId`, `mode`, `mottoStyler`, `updateMottoStyler`, `attributes`, `setAttributes`

Outputs:
- A list of section descriptors (same shape) or React nodes, keyed by `sectionId`.

### 5.2 Per-section actions hook
Hook name: `STYLER_HOOKS.sectionActions` → `"motto.styler.sectionActions"`

Inputs:
- `actions` array that the UI will render for a section.
- Context: `sectionId`, `mode`, section-local state references (e.g. `rows`, `onRowsChange`)

Outputs:
- New `actions` array (can replace, append, remove).

Action object shape:
- `id: string` (stable — import from `STYLER_ACTION_IDS`, never inline)
- `title: string`
- `icon?: ReactComponent`
- `isDisabled?: boolean`
- `proBadge?: boolean`
- `onClick?: () => void`
- `isHidden?: boolean`

Stable ID registries: `STYLER_ACTION_IDS`, `STYLER_SECTION_IDS`, `STYLER_FEATURE_IDS` (all in `src/lib/freepro-ids.js`).

### 5.3 Derived runtime CSS hook
Hook name: `STYLER_HOOKS.derivedLayoutCss` → `"motto.styler.derivedLayoutCss"`

Inputs:
- `extraCss: string` (initially empty in Free)
- Context: `selector`, `scopedSelector`, `breakpoint`, `displayValue`, `mottoStyler`, `baseLayout`

Outputs:
- `extraCss` string appended into the final CSS output for the current breakpoint.

Runtime rule: Free does not apply Pro-only derived CSS unless Pro registers this filter.

### 5.4 Block Spacing section hook
Hook name: `STYLER_HOOKS.blockSpacingSection` → `"motto.styler.blockSpacing.section"`

Dedicated hook for the Block Spacing Pro section. Pro injects `BlockSpacingSection` component via this filter. Free shows a disabled stub when no filter is registered.

### 5.5 Feature enabled hook
Hook name: `STYLER_HOOKS.isFeatureEnabled` → `"motto.styler.isFeatureEnabled"`

Inputs: `featureId: string` (use `STYLER_FEATURE_IDS` constants), `defaultEnabled: boolean`
Outputs: `boolean` — Pro can override per feature.

### 5.6 Pro CTA URL hook
Hook name: `STYLER_HOOKS.proCtaUrl` → `"motto.styler.proCtaUrl"`

Inputs: `url: string` (default empty)
Outputs: `string` — Pro provides the upgrade URL for badges and CTAs.

### 5.7 Block-level Pro controls (Pattern B)
Hook names defined in `src/blocks/freepro/blocks-freepro-ids.js` (`BLOCKS_HOOKS`):

- `BLOCKS_HOOKS.imageSourceDynamicSection` → `"motto.blocks.imageSource.dynamicSection"` — Pro injects `ImageSourceDynamicControl` into the Image block.
- `BLOCKS_HOOKS.linkSourceDynamicSection` → `"motto.blocks.linkSource.dynamicSection"` — Pro injects `LinkSourceDynamicControl` into Container and Button blocks.

Pattern: Free calls `applyFilters(BLOCKS_HOOKS.hookName, null, context)`. If return value is `null`, Free renders a disabled stub. Pro registers via `addFilter()` in `src/pro/blocks/register-pro-block-filters.js`.

This is distinct from the stub-by-ID pattern (§5.2): there are no stable action IDs involved — the whole section is replaced atomically.

## 6. Acceptance Criteria
- [x] Free shows Pro-only options (sections/actions) as disabled stubs with a visible Pro badge.
- [x] Installing Pro upgrades the same stubs (by `id`) into enabled actions/sections without changing Free core code.
- [x] In Free-only installs, persisted `mottoStyler.blockSpacing` does not affect output CSS (no “ghost spacing”).
- [x] Hook contexts are minimal, stable, and documented in this spec.
- [x] A concrete example is supported:
  - Block Spacing (Custom Spacing): Pro supplies runtime CSS via `derivedLayoutCss` and UI via `panelSections`.
  - “Sort A–Z”: Pro upgrades a disabled action via `sectionActions`.

## 7. Risks and Mitigations
- Risk: Performance regressions due to filters running in hot paths (editor CSS regeneration).
  - Mitigation: Single hook call per breakpoint; keep context small; no deep clones; document no heavy work inside filters.
- Risk: ID drift causes Pro upgrades to fail silently.
  - Mitigation: Centralize IDs as constants; enforce with tests; treat IDs as public contract.
- Risk: Free accidentally ships Pro logic.
  - Mitigation: Free provides only stubs and hook points; Pro owns enabling logic and runtime CSS injection.
- Risk: CSS ordering inconsistencies between Free and Pro.
  - Mitigation: Inject derived CSS at a single, deterministic point in the CSS pipeline.

## 8. Test Plan
Automated:
- `npm test` (or the repo’s unit test command) covering:
  - `style-engine` output without Pro filters (Block Spacing ignored).
  - `style-engine` output with a test-registered `derivedLayoutCss` filter (Block Spacing applied).

Manual:
- Free only: open block editor, confirm Pro stubs are visible but disabled (badge shown).
- Free only: paste content containing `mottoStyler.blockSpacing`; confirm no spacing output is applied.
- Pro installed: confirm stubs are upgraded (sorting enabled; block spacing editable and applied).

## 9. Rollout Plan

Phase A — Core hook scaffolding: ✓ done
- Hook surfaces added in `style-engine.jsx` and Styler panel components.
- Disabled Pro stubs added (Sort A–Z, Block Spacing section).
- All hook names centralized in `src/lib/freepro-ids.js`.

Phase B — First Pro features: ✓ done
- Pro filters implemented for Sort A–Z, Block Spacing UI + runtime CSS.
- Block-level Pro controls implemented: `ImageSourceDynamicControl`, `LinkSourceDynamicControl`.
- All Pro filters registered from `src/pro/styler/register-pro-styler-filters.js` and `src/pro/blocks/register-pro-block-filters.js`.

Rollback:
- Disable Pro filters in the Pro plugin; Free core remains functional with disabled stubs.

## 10. Change Log
- v0.1: Initial draft (stub-by-ID + three hook points for Free/Pro extensibility).
- v0.2: Status → Active. All acceptance criteria met. Added `isFeatureEnabled`, `proCtaUrl`, and `blockSpacingSection` hook names (reflected in `src/lib/freepro-ids.js`). Block-level hooks (`BLOCKS_HOOKS.imageSourceDynamicSection`, `linkSourceDynamicSection`) live in `src/blocks/freepro/blocks-freepro-ids.js` — same pattern, different registry file.
