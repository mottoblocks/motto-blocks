# Feature Spec: SDD-003 — Styler Defaults Auto Apply On Insert v1
Version: 0.3
Status: Approved
Owner: Styler Core + Blocks
Last Updated: 2026-08-01

## 1. Goal
Automatically apply block-level `mottoDefaults` to a Styler-enabled block only once, at pristine insert time, so users start from sensible defaults without requiring a manual reset action.

## 2. Scope
In scope:
- Detect first pristine insert for Styler-enabled blocks.
- Apply `mottoDefaults` into `mottoStyler` once per inserted instance.
- Preserve current manual `Reset to defaults` behavior.
- `block.json`'s `mottoDefaults.presetSlug` indirection: resolve `mottoDefaults` from a named `PRESETS` entry instead of inline `css`/`blockSelectors` (added v0.3).

Out of scope:
- Other changes to `mottoDefaults` schema beyond the `presetSlug` indirection.
- Final cleanup of legacy `mottoProps` migration writes.
- New style controls unrelated to defaults initialization.
- Live/synced binding between a block instance and its source preset (resolution is one-time, at block-registration time only).

## 3. Current Behavior
- `Reset to defaults` works when `mottoDefaults` exists.
- Automatic defaults apply on insert is currently disabled.
- New block instances can start without expected defaults until user manually clicks reset.

## 4. Target Behavior
1. On first insertion of a pristine block instance, if effective `mottoDefaults` has content, initialize `mottoStyler` with those defaults.
2. Do not re-apply defaults after user edits, duplication, transform, or subsequent reloads.
3. Keep manual reset available and unchanged.
4. Keep legacy read fallback behavior unaffected.

## 5. Data Contract
- Input source priority for defaults, resolved by `resolveBlockTypeMottoDefaultsSource` (`src/styler/data/default-motto-styler.js`) at `blocks.registerBlockType` filter time (`register-attributes.js`), i.e. once per block type, not per instance:
  1. `blockType.mottoDefaults`
  2. `blockType.attributes.mottoDefaults.default`
  3. `blockType.attributes.mottoStyler.default`
- `presetSlug` indirection: if the resolved raw value is `{ "presetSlug": "<slug>" }`, it fully replaces the raw object with `PRESETS.find(p => p.slug === presetSlug).mottoStyler` (`src/styler/data/motto-css-presets.json`, re-exported via `motto-css-presets.js`) before normalization. Any sibling `css`/`blockSelectors` keys alongside `presetSlug` are ignored — no merge.
  - Unknown slug → falls back to `{}` and logs `console.error("[<blockName>] mottoDefaults.presetSlug \"<slug>\" not found in PRESETS.")`; block registration still succeeds with no defaults.
  - Resolution is a one-time copy at registration time, not a live reference — editing a preset afterward does not affect already-registered block defaults or already-inserted instances (no sync/connection back to the preset).
- Effective content check uses current Styler content predicates (main + inner selectors).
- Persistence target: `mottoStyler` only.
- Marker requirement: each instance must carry a stable signal that defaults were auto-applied once.

## 6. Acceptance Criteria
- [ ] Inserting a block with non-empty defaults auto-populates `mottoStyler` exactly once.
- [ ] Inserting a block with empty defaults does not write initialization payload.
- [ ] Manual reset still applies defaults after insertion.
- [ ] Existing content is never overwritten by auto-apply.
- [ ] Unit/integration coverage locks first-insert-only semantics.
- [ ] A block with `mottoDefaults.presetSlug` set to a valid `PRESETS` slug auto-applies that preset's `mottoStyler` exactly as if it had been inlined (verified for `motto/button` → `standard-button`).
- [ ] A block with an unknown `presetSlug` registers with empty defaults and logs a `console.error` naming the block and slug, without throwing.

## 7. Risks and Mitigations
- Risk: auto-apply triggers on non-pristine states (duplicate/transform/reload).
  - Mitigation: gate strictly on pristine-instance detection and one-time marker.
- Risk: race with editor initialization effects causing duplicate writes.
  - Mitigation: idempotent guard and single write path in runtime panel/attributes layer.
- Risk: hidden regressions in block insertion UX.
  - Mitigation: targeted manual smoke tests for all Styler-enabled MVP blocks.

## 8. Test Plan
Automated:
- `npm run test:unit`
- `npm run build`

Manual:
- Insert each Styler-enabled block on empty post; verify defaults appear immediately.
- Edit rules, reload editor, verify no re-application.
- Use Reset to defaults and verify behavior is unchanged.
- Validate editor/frontend parity for initialized defaults.

## 9. Rollout Plan
Phase A:
- Implement behind runtime guard with explicit one-time marker.
- Add tests for pristine insert and non-pristine no-op.

Phase B:
- Enable by default for Styler-enabled MVP blocks.
- Observe manual QA across core workflows (insert, duplicate, transform, detach).

Rollback:
- Disable auto-apply guard path while retaining manual reset behavior.

## 10. Open Questions
1. Should transformed blocks preserve marker state or recompute pristine status?

## 11. Change Log
- v0.3: Added `mottoDefaults.presetSlug` indirection so `block.json` can reference a `PRESETS` entry instead of inlining `css`/`blockSelectors`; resolved once at block-registration time (not synced/live), with fallback to `{}` + `console.error` on unknown slug. Migrated `motto-css-presets.js` from a JS literal to a JSON-backed data file (`motto-css-presets.json`) so preset entries can be pasted directly from a `block.json`'s `mottoDefaults` object. First consumer: `motto/button` → `standard-button` preset.
- v0.2: Implemented one-time auto-apply with marker `mottoStyler.ui.defaults.appliedOnInsert`; no re-apply after first insert.
- v0.1: Initial draft from current workflow and known gap.
