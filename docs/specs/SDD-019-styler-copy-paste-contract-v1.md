# Feature Spec: SDD-019 — Styler Copy/Paste Contract v1
Version: 0.1
Status: Active
Owner: Styler Core
Last Updated: 2026-07-16

## 1. Goal
Define one consistent contract for every copy/paste action in the Styler UI — what gets confirmed before overwriting, what gets merged vs. replaced, and why — and fix the two places where the implementation diverged from that contract (a rule-list paste that wasn't rendering until an unrelated re-render, and a whole-block paste that silently replaced instead of merging).

## 2. Scope
In scope:
- Block-level paste: "Copy/Paste all styles" and "Copy/Paste classes" (topbar dropdown, `register-panel.jsx`).
- List-level paste: "Copy/Paste rules" on a single breakpoint's CSS rule list (`StylerCssList`), which is the same component/handler reused for a block's main styles list, a Styler CSS class's rule list (`ClassEditorPanel`), and an individual block/inner selector's nested rule list (`InnerSelectorItem`).
- The shared clipboard utility and payload contract (`utils/clipboard.js`).
- The render-invalidation fix in `StylerCssList` so a pasted (or otherwise `persistRows`-applied) result is visible on the same tick it's applied.
- The per-breakpoint remount fix for the class editor's rule list.
- Documenting Block Selectors ("Paste selectors", `BlockSelectorsList`) as a deliberate exception to the merge rule.

Out of scope:
- The existing TODO "avoid confirm pasting when there are no rules" (coarse "has content" checks over-triggering `window.confirm()` in some cases) — unrelated UX nuance, tracked separately.
- New paste surfaces (e.g. pasting individual wildcard/dynamic-content bindings).

> **Update (v0.3):** §4 rule 4 originally rejected merging Block Selectors set-level paste, citing a cross-breakpoint `id` divergence risk. That risk was specific to matching per breakpoint independently (the way `mergeInnerSelectorRows` is applied in `pasteMainStyles`). It doesn't apply when matching happens once on the flat selector-list shape, where each logical selector already carries exactly one `id` shared by all its breakpoints' css. `mergeBlockSelectorsSelectorList` (`utils/block-selectors-list-helpers.js`) merges on that shape, so a match always keeps one id and can't split across breakpoints. Rule 4 below is superseded — see the v0.3 change log entry.

## 3. Current Behavior
Before this spec, two conceptually distinct paste levels existed with inconsistent, partly buggy implementations:

- **List-level rule paste** (`StylerCssList.handlePaste`) already merged via `mergeCssRows` (matching by property `name`; pasted value wins on conflict, non-matching rows are appended) and already confirmed before merging into a non-empty list. However, the `list` memo that renders visible rows depended only on `[draftRow, resolvedRows]`, not on the ref (`rowsRef.current`) that `persistRows` actually mutates. When `persistRows` ran from `handlePaste`'s async continuation (after `await readClipboard()` and a blocking `window.confirm()`), the prop round-trip that would normally invalidate that memo didn't reliably land in time — the data was correctly persisted (visible after reload, and the live canvas preview updated immediately via the entity-record store) but the rule list itself stayed stale until an unrelated `persistRows` call (e.g. reordering rows) forced a recompute. Separately, `ClassEditorPanel`'s `StylerCssList` had no `key={mode}`, so switching breakpoints while the class editor was open didn't remount it — internal ref state from one breakpoint's paste could resurface after a breakpoint switch, visibly mismatched against the canvas.
- **Block-level "Paste all styles"** (`register-panel.jsx.pasteMainStyles`) fully replaced `css` (all breakpoints), `blockSelectors`, and `html` with the clipboard's data, discarding anything not present in the clipboard. Its confirm text even said "Replace all styles?" — contradicting the merge behavior one level down (list-level rule paste) and its sibling action ("Paste classes", which already merged via `mergeClasses`).

## 4. Target Behavior
1. Two paste levels exist, both built on the same clipboard utility and typed payloads (`createClipboardPayload(type, data)` / `readClipboard()` / `writeClipboard()` in `utils/clipboard.js`):
   - **Block level** — "Copy/Paste all styles" (`css` for every breakpoint, `blockSelectors`, `html.attributes`) and "Copy/Paste classes" (`cssClasses` references). Both live in the block toolbar dropdown (`register-panel.jsx`).
   - **List level** — "Copy/Paste rules", scoped to exactly one breakpoint's CSS rule list. Copying while viewing `tablet` copies only `tablet`'s rows; nothing from other breakpoints is included. This is the same `StylerCssList` component and `handleCopy`/`handlePaste` pair used for a block's main styles, a Styler class's rules, and one selector's nested rules — pasting a list copied from any of these into any of the others is supported and behaves identically.
2. **Confirm before overwrite**: any paste that could touch existing content shows a native `window.confirm()` before applying. The check is coarse ("does the target already have any content?" — `hasMainStyles()`, `cssClasses.length > 0`, `rowsRef.current.length > 0`), not a per-property overlap check. If the target is empty, no confirm dialog appears.
3. **Merge, never replace**, for every paste that lands on property/rule-shaped data:
   - CSS rows and HTML attributes merge per breakpoint via `mergeCssRows` (`utils/css-row-list-helpers.js`): matched by `name` (case-insensitive, trimmed); on a match the pasted value overwrites the existing one but keeps the existing row's `id`; unmatched pasted rows are appended with a new `id`.
   - Class references merge via `mergeClasses` (`register-panel.jsx`): union by `id`/`slug`, no value to overwrite since a class reference has no mutable payload of its own.
4. ~~**Exception — Block Selectors set-level paste**~~ **(superseded in v0.3, see below).** `BlockSelectorsList.handlePasteSelectors` ("Paste selectors (Pro)") now **merges**, matching rule 3. A block-selector entry's `id` must be identical across all four breakpoints (`applySharedSelectorListToBreakpoints` enforces this invariant so a selector's per-breakpoint CSS payloads stay linked to one logical selector). The original concern was that merging by matching selector text *per breakpoint independently* (the way `mergeInnerSelectorRows` merges preset data in `pasteMainStyles`) can assign a different `id` to the same logical selector in different breakpoints when merging against live, possibly-diverged data. `mergeBlockSelectorsSelectorList` (`utils/block-selectors-list-helpers.js`) avoids this by matching once on the flat selector-list shape (one `id` per logical selector, css already keyed by breakpoint under it) instead of per breakpoint: on a match it keeps the existing entry's single `id` and merges its css per breakpoint via `mergeCssRows`; on no match it appends the incoming selector once with one freshly-generated `id` shared by all its breakpoints. `blockSelectorsSelectorListOverlap` gates the confirm dialog the same way rule 2 does elsewhere (only prompt when an incoming selector actually collides with an existing one). Pasting the CSS *inside* one selector, via the nested `StylerCssList`, is unaffected and already followed rule 3.
5. Any mutation applied through `persistRows` (list level) must be visible in the rendered list on the same tick it's applied, regardless of whether the owning state round-trips back through parent props before the next paint. `StylerCssList` tracks this with a local `rowsVersion` counter bumped inside `persistRows`, included in the `list` memo's dependencies.
6. `ClassEditorPanel`'s `StylerCssList` remounts (`key={mode}`) when the active breakpoint changes, matching the main styles panel's existing behavior, so no ref-based row state leaks from one breakpoint into another.

## 5. Data Contract
- Inputs:
  - Clipboard payload shape: `{ version, type, data, ts }`, produced by `createClipboardPayload(type, data)`.
  - `type` values in use: `"main-styles"` (plus legacy aliases `"main-rules"`, `"styles"`), `"classes"`, `"css-rules-list"`, `"block-selectors-list"`.
  - `readClipboard()` tries `navigator.clipboard.readText()` first (requires a user gesture/permission), falling back to a `localStorage` mirror (`readClipboardLocal()`) written alongside every `writeClipboard()` call.
- Persistence:
  - No new persisted fields. Every paste funnels into the same write paths as manual edits: `persistMottoStyler()` → `setAttributes` (block instance) or `updateEditingClassMottoStyler()` → `editEntityRecord()` (Styler CSS class).
- Outputs:
  - Block attributes / CSS class post meta (`mottoStyler.css`, `.blockSelectors`, `.html`, `.cssClasses`), identical shape to any other edit.
  - Editor UI (`StylerCssList`, `BlockSelectorsList`) reflects the merged (or, for Block Selectors, replaced) result immediately, without requiring a reload or an unrelated interaction.

## 6. Acceptance Criteria
- [x] Pasting rules into a Styler class's rule list that already has rules shows the merged result immediately, with no need to reorder or edit another row first.
- [x] Switching breakpoint while the class editor popup is open does not carry over the previous breakpoint's rule list.
- [x] "Paste all styles" on a block that already has styles prompts confirm, then merges: existing properties absent from the clipboard remain; properties present in both get the clipboard's value; clipboard-only properties are added. Verified for `css` (per breakpoint), `blockSelectors`, and `html.attributes`.
- [ ] "Paste classes" continues to union class references without duplicates (pre-existing behavior, unchanged).
- [x] "Paste selectors" (Block Selectors) merges by logical selector (v0.3): non-colliding selectors from both sides survive, colliding selectors merge css per breakpoint (clipboard value wins per property), confirm only appears on an actual collision, and its behavior/rationale is documented at the call site (not just in this spec).
- [ ] Copying a single selector's rule list and pasting it elsewhere (nested `StylerCssList` inside `InnerSelectorItem`) merges the same way as the main/class rule lists (pre-existing behavior, unchanged by this spec).

## 7. Risks and Mitigations
- Risk: A future contributor "fixes" Block Selectors paste to merge like everything else, unaware of the shared cross-breakpoint `id` invariant, corrupting selector sync between breakpoints.
  - Mitigation: the exception and its failure mode are documented here (rule 4); add a short code comment at `handlePasteSelectors` pointing back to this spec.
- Risk: the `rowsVersion` counter fix (rule 5) is a reliable patch but doesn't pin down why the parent-prop round trip failed to invalidate the memo after an async continuation in the first place — the underlying React/`@wordpress/data` timing interaction is not fully understood.
  - Mitigation: the fix only adds a local invalidation signal and doesn't change data flow, so it's safe regardless of the exact upstream cause; flagged here in case similar staleness resurfaces in other `useMemo`-over-a-mutable-ref patterns.
- Risk: coarse "has any content" confirm checks can prompt even when the specific incoming paste wouldn't actually overwrite anything (or skip detail on exactly what will be overwritten).
  - Mitigation: none in this spec — this was the separate, already-tracked TODO ("avoid confirm pasting when are no rules"); resolved out-of-band afterward (see §10 v0.2).

## 8. Test Plan
Automated:
- `npm run lint`
- `npm run build`

Manual:
- Copy a block's "all styles" (with content in more than one breakpoint), paste onto another block that already has its own styles in overlapping and non-overlapping properties; confirm the dialog appears, and verify the result is a merge (overlapping properties take the pasted value, non-overlapping properties from both sides survive) across every breakpoint, plus `blockSelectors` and `html.attributes`.
- Copy a block's "all styles" onto an empty block; verify no confirm dialog appears and all data lands correctly.
- Copy a Styler class's rule list (non-empty), open a different class that already has rules, paste; verify the merged rows appear immediately without reordering, editing, or reloading.
- With the class editor popup open, paste into its rule list, then switch breakpoints via the device control and back; verify the rule list matches the canvas at every step (no stale cross-breakpoint rows).
- Copy one selector's rule list (from `InnerSelectorItem`'s nested list) and paste it into a different selector's rule list; verify merge-by-property-name semantics.
- Copy a block's full selector set, paste onto a block that already has some overlapping and some non-overlapping selectors; verify the confirm dialog only appears due to the overlap, non-overlapping selectors from both sides survive, and overlapping selectors merge their css per breakpoint (clipboard property values win, target-only properties survive).
- Copy a block's full selector set, paste onto a block with no selectors at all; verify no confirm dialog appears.

## 9. Rollout Plan
Phase A (shipped with this spec):
- `StylerCssList.jsx`: add `rowsVersion` state, bump it in `persistRows`, include it in the `list` memo's dependencies.
- `ClassEditorPanel.jsx`: add `key={mode}` to its `StylerCssList`.
- `register-panel.jsx.pasteMainStyles`: replace the wholesale-replace logic with per-breakpoint `mergeCssRows` for `css`, `mergeInnerSelectorRows` (via `normalizeBlockSelectorsByBreakpoint`) for `blockSelectors`, and `mergeCssRows` for `html.attributes`; update the confirm copy from "Replace all styles?" to "Merge with clipboard styles?".

Phase B (shipped separately, see §10 v0.2):
- Add a short code comment at `BlockSelectorsList.handlePasteSelectors` referencing this spec's §4 rule 4, so the replace-not-merge choice doesn't read as an oversight to the next contributor. (Done — comment already in place at that call site.)
- Revisit the "confirm when there's nothing to overwrite" TODO as its own spec or fix, if it turns out to matter in practice. (Done — see §10 v0.2.)

Rollback:
- Revert the Phase A commit(s); this restores the pre-spec replace behavior for "Paste all styles" and the render-staleness bug in `StylerCssList`. No data migration involved either direction — all changes are read/write logic only.

## 10. Change Log
- v0.1: Initial draft, written alongside the `StylerCssList` render-invalidation fix, the `ClassEditorPanel` breakpoint-remount fix, and the `pasteMainStyles` replace→merge fix. Block Selectors set-level paste reviewed and explicitly kept as replace (not a gap).
- v0.2: Resolved the "avoid confirm pasting when are no rules" TODO. Added `cssRowsOverlap` / `innerSelectorRowsOverlap` (`utils/css-row-list-helpers.js`) and switched the coarse "target has any content" confirm gates to actual per-property/per-selector overlap checks in `StylerCssList.handlePaste` and `register-panel.jsx.pasteMainStyles` — pasting non-conflicting rules/styles no longer prompts. `pasteClasses` confirm removed entirely: `mergeClasses` only unions by id/slug and never overwrites existing data, so no confirm was ever protecting anything there. Block Selectors (`BlockSelectorsList.handlePasteSelectors`) confirm is unchanged — it's a full replace, not a merge, so "target has any content" remains the correct check (§4 rule 4).
- v0.3: Reversed §4 rule 4. Added `mergeBlockSelectorsSelectorList` / `blockSelectorsSelectorListOverlap` (`utils/block-selectors-list-helpers.js`), which merge Block Selectors set-level paste by matching each logical selector once on the flat selector-list shape (one `id` per selector, css keyed by breakpoint underneath it) instead of independently per breakpoint. This resolves the original cross-breakpoint `id` divergence concern without giving up the merge behavior every other paste action has. `BlockSelectorsList.handlePasteSelectors` now uses these instead of the old full-replace + `idMap` remap, and its confirm dialog only fires on an actual selector-name collision, matching rule 2/v0.2's overlap-gated pattern.
