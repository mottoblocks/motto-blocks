# Feature Spec: SDD-017 — Class Editor Device Control Scope v1
Version: 0.1
Status: Proposed
Owner: Styler Core
Last Updated: 2026-07-15

## 1. Goal
Make the breakpoint/device control behave correctly when a Styler CSS class is opened for editing (inline popup or standalone CPT editor): the control must reflect and target the class's own `mottoStyler.css.<breakpoint>` content instead of silently inheriting whatever breakpoint the block instance happened to be on, and must restore the instance's breakpoint when editing ends.

## 2. Scope
In scope:
- Scoping of the `motto-styler/preview` `mode` between "block instance" and "class being edited" while `ClassEditorPanel` is open.
- Auto-selecting the initial breakpoint on popup open based on which of the class's `css.<breakpoint>` entries are non-empty.
- Restoring the block instance's prior `mode` on popup close, for every close path (Esc, close button, outside click, manager-triggered close).
- Same auto-select-on-load rule for the standalone CPT class editor (`PostClassStylerPanel`), without a "restore" step since there is no encapsulating instance.
- A visual per-breakpoint "has content" indicator on `DeviceToggleControl`.

Out of scope:
- Splitting `motto-styler/preview` into multiple independent stores.
- Changes to the core Gutenberg device-preview sync mechanism (`core-device.jsx` / `core-device-select.jsx`) beyond letting it follow the scoped `mode` as it already does.
- New breakpoint definitions or changes to `BREAKPOINT_KEYS`.

## 3. Current Behavior
`DeviceToggleControl` reads/writes a single global `mode` in the `motto-styler/preview` store (default `"desktop"`), shared by the block's main styles panel, the inline class editor popup (`ClassEditorPanel`), and the standalone CPT class editor (`PostClassStylerPanel`). `openEditingClass` (`use-inline-css-class-editor.js`) does not read the class's `mottoStyler.css` before opening, so the popup opens on whatever `mode` the block was already on. `ClassEditorPanel` filters displayed rows with `editingClassMottoStyler?.css?.[mode] || []`, so a class with rules only in `tablet`/`phone` renders empty when `mode` is `"desktop"`. Closing the popup leaves `mode` at whatever value the user last selected while editing the class, which then silently carries over to the block's main styles view. `DeviceToggleControl` has no prop or visual affordance indicating which breakpoints actually hold rules.

## 4. Target Behavior
1. On `openEditingClass`, capture the block instance's current `mode` before any scope change.
2. Immediately after opening, `mode` auto-selects the first breakpoint (in `BREAKPOINT_KEYS` order) whose `css.<breakpoint>` is non-empty for the class being edited. If the class has no content in any breakpoint, `mode` keeps its current value (default `"desktop"`).
3. While the popup is open, changes made via `DeviceToggleControl` apply to the class's editing scope only.
4. On popup close, via any close path (Esc, close button, outside click, manager-triggered close), `mode` restores to the value captured in step 1.
5. `PostClassStylerPanel` (standalone CPT editor, no encapsulating popup) applies rule 2 on load; rule 4 (restore) does not apply there since there is no instance scope to return to.
6. `DeviceToggleControl` accepts an optional per-breakpoint "has content" map and renders a visual indicator (e.g. a dot) on each breakpoint icon that has non-empty rows, in both the block-instance and class-editing contexts.

## 5. Data Contract
- Inputs:
  - `mottoStyler.css.<breakpoint>` for `breakpoint` in `BREAKPOINT_KEYS` (`desktop`, `tablet`, `landscapePhone`, `phone`), read from the class record being edited (`editingClassMottoStyler`) and from the active block's styles.
  - Non-empty determination reuses the existing `hasNonEmptyCssRows` logic (`src/styler/utils/motto-content.js`) — no new "has content" logic is introduced.
- Persistence:
  - No new persisted fields. Scope capture/restore and the initial breakpoint selection are ephemeral editor-session state only (`motto-styler/preview` store), never written to post meta.
- Outputs:
  - `DeviceToggleControl` displayed `mode` and per-breakpoint content indicators.
  - `ClassEditorPanel` row list (`rows={editingClassMottoStyler?.css?.[mode]}`) matches a non-empty breakpoint on open whenever one exists.

## 6. Acceptance Criteria
- [ ] Opening the class editor popup for a class with content only in non-desktop breakpoints shows that content immediately, without a manual device-control click.
- [ ] Opening the class editor popup for a class with content in multiple breakpoints selects the first one in `BREAKPOINT_KEYS` order.
- [ ] Opening the class editor popup for a class with no content anywhere leaves `mode` unchanged.
- [ ] Closing the popup via Esc, close button, and outside click all restore the block instance's prior `mode`.
- [ ] `DeviceToggleControl` shows a visual indicator on every breakpoint icon that has non-empty `css` rows, in both instance and class-editing contexts.
- [ ] `PostClassStylerPanel` auto-selects the first non-empty breakpoint on load; no restore behavior is expected there.
- [ ] No regression to the existing core Gutenberg device-preview sync (canvas viewport still follows `mode` changes).

## 7. Risks and Mitigations
- Risk: Restoring `mode` on close also snaps the Gutenberg canvas viewport back, which could surprise a user who intentionally wanted the editor to stay on the breakpoint they last used inside the popup.
  - Mitigation: Treat viewport-follows-mode as the existing, expected behavior (SDD-001 scope does not change); call this out explicitly in the manual test plan so reviewers can confirm it feels right before shipping, not implicitly assume it.
- Risk: Nested or rapid open/close cycles (opening a second class before closing the first, or reopening after a fast close) could capture the wrong "previous mode" if capture/restore isn't stack-safe.
  - Mitigation: Capture previous mode only on transition from "no class open" to "class open"; ignore capture if a class editing session is already active.
- Risk: Divergent "has content" logic between the new indicator and existing content checks could drift over time.
  - Mitigation: Reuse `hasNonEmptyCssRows` / `hasAnyMottoContent` from `src/styler/utils/motto-content.js` rather than reimplementing.
- Risk: No spec previously covered this area, so scope creep into a full per-class independent preview store is tempting.
  - Mitigation: Explicit out-of-scope line above; this spec only covers scoping/restore + indicator, not a store rearchitecture.

## 8. Test Plan
Automated:
- `npm run test:unit`
- `npm run build`

Manual:
- Create/open a class with rules only in `tablet`; open its editor from a block currently in `desktop` mode; verify the popup opens already showing `tablet` rules with the control highlighting `tablet`.
- Close the popup (Esc, close button, outside click — each separately); verify the block's device control and canvas viewport return to `desktop` each time.
- Open a class with content in `tablet` and `phone`; verify indicator dots appear on both icons, and the popup opens on `tablet` (first in canonical order).
- Open a class with no content in any breakpoint; verify `mode` stays wherever it was (no forced jump to `desktop`).
- Open the standalone CPT class editor (`PostClassStylerPanel`) directly for a class with content only in `phone`; verify it loads on `phone` without needing a restore step.

## 9. Rollout Plan
Phase A:
- Implement previous-mode capture on popup open and restore on all close paths.
- Implement auto-select-first-non-empty-breakpoint on popup open and on `PostClassStylerPanel` load.

Phase B:
- Add the `hasContentByBreakpoint` indicator to `DeviceToggleControl` and wire it in both usage sites (`StylerPanel`, `PostClassStylerPanel`).

Rollback:
- Revert to the single shared `mode` with no scope capture/restore and no indicator (git revert of the Phase A/B commits).

## 10. Change Log
- v0.1: Initial draft, covering diagnosis of the device-control/class-editor sync bug.
