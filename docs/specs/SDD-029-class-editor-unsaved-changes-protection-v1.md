# Feature Spec: SDD-029
Version: 0.1
Status: Active
Owner: Styler Core
Last Updated: 2026-08-08

## 1. Goal
Make WordPress's native unsaved-changes protection (the `beforeunload` browser warning, and the "Update" button's multi-entity `EntitiesSavedStates` review panel) aware of edits made inside the inline CSS class editor popover (`ClassEditorPanel.jsx`), so a user can no longer lose an in-progress class edit silently by closing the tab, reloading, or navigating away without an explicit warning.

## 2. Scope
In scope:
- Re-registering the class editor popup's row edits with `@wordpress/core-data` via `editEntityRecord`, fixing the root cause of the crash that led `SDD-026` (§3.2, §4, v0.4) to remove that call entirely.
- Explicit discard-on-cancel so cancelling the popup doesn't leave a phantom dirty entity.
- A small visual "unsaved changes" indicator on the class chip (`AttachedClassesSection.jsx`) so a class edit orphaned by a block-selection change (which unmounts the popup with no explicit save/cancel) is still visible to the user, not just caught later by `beforeunload`/the save panel.

Out of scope:
- Preventing or intercepting the block-selection change itself (e.g. a "you have unsaved changes, discard?" confirmation before switching blocks). `StylerPanel` — and the popup's local `editingClassDraft` state — is fully unmounted by WP core the instant a block is deselected (`InspectorControlsFill` returns `null` when `mayDisplayControls` is false, per `wp-includes/js/dist/block-editor.js`'s `block-list/block.mjs`/`inspector-controls/fill.mjs`), before any component-level effect could veto it. Intercepting that would require subscribing to and reverting `core/block-editor`'s selection state outside the popup's own React tree — no existing precedent in this codebase, and no longer necessary for correctness now that edits survive the unmount (see §4).
- Any change to `saveEntityRecord`'s call shape in `closeEditingClass` — verified unaffected (see §3).
- Any change to `BlockSelectorsList`/per-selector row editing, class attach/detach, or class creation flows — untouched.

## 3. Current Behavior (pre-SDD-029)
`useInlineCssClassEditor` (`src/styler/classes/use-inline-css-class-editor.js`) keeps its edit session entirely in local React state: `editingClassDraft` (`useState`, line 24) is mutated on every field change by `updateEditingClassMottoStyler` (lines 161-175), and persisted once via a single explicit `saveEntityRecord("postType", "motto_css_class", { id, meta })` call in `closeEditingClass` (lines 184-232) when the user clicks Save. Cancelling (`cancelEditingClass`, lines 234-242) just clears the local state.

Because none of this ever calls `@wordpress/core-data`'s `editEntityRecord`, the class post is never marked as a dirty entity. WP core's native protections — verified directly against this install's `wp-includes/js/dist/editor.js` — are driven entirely by `@wordpress/core-data`'s `__experimentalGetDirtyEntityRecords()`:
- The `UnsavedChangesWarning` component's `beforeunload` handler checks that selector and does nothing if it's empty.
- `hasNonPostEntityChanges` (which gates the "Update" button's multi-entity `EntitiesSavedStates` review panel — the same UI WP core already uses for reusable blocks edited inline in the post editor) checks the same selector.

Net effect: closing the tab, reloading, or clicking "Update" while a class edit is pending gives no warning at all — the edit is either silently lost (tab close) or silently skipped (Update only saves the post, not the class). A second, distinct hazard: `StylerPanel` (and therefore this hook's state) fully unmounts when the block loses selection (`mayDisplayControls` in `wp-includes/js/dist/block-editor.js`'s `BlockListBlockProvider`, derived from `core/block-editor`'s `isBlockSelected`), which wipes `editingClassDraft` with no save/cancel ever having run.

This module previously did call `editEntityRecord` on every keystroke (from the initial implementation through commit `22dfdd2`), but it was removed in `6d1d1ed` (`SDD-026` v0.4) after it crashed with `Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'meta')`. Root cause, re-verified against `wp-includes/js/dist/core-data.js` (WP 7.0.1) for this spec:
- `editEntityRecord`'s action creator (`core-data.js:16667-16698`) calls `select5.getRawEntityRecord(kind, name, recordId)` with exactly 3 arguments — no `context`/query — so it always resolves against the `"default"` context bucket (`getRawEntityRecord`, `core-data.js:15910-15936`, `const context = query?.context ?? "default"` at line 15929).
- The class list is fetched via `CLASS_QUERY_BASE` (`src/styler/classes/css-class-registry-maps.js:4-9`) with `context: "edit"`, which the entities reducer stores under a sibling, separate key (`items["edit"][id]`, never `items["default"][id]`) — confirmed in the reducer's context-keyed storage (`core-data.js:14911-14932`, `getContextFromAction`/`getQueryParts` at `core-data.js:14874-14881`, `646-666`).
- `getRawEntityRecord`'s primary selector has no guard for a missing record (`record && Object.keys(...)`, `core-data.js:15910-15912`), so `editEntityRecord` (`core-data.js:16693`, `const recordValue = record[key]`) threw on `undefined`.
- `SDD-026`'s fix removed `editEntityRecord`/`saveEditedEntityRecord` from the row-edit path entirely, reasoning the local draft was already the real source of truth during editing. That decision is correct for the crash, but as a side effect also removed the only mechanism that could make WP's native dirty-tracking aware of the edit — a consequence not evaluated in that spec (its goal was REST-request performance, not save-state UX).

## 4. Target Behavior
- On popup open (`editingClassId` set), a `useEffect` fires `resolveSelect("core").getEntityRecord("postType", "motto_css_class", editingClassId)` — no `context` argument, so it resolves into the `"default"` bucket `editEntityRecord` reads from. `resolveSelect`'s own resolver cache makes repeat opens of an already-warmed class free (no duplicate network request). This is not the pattern `SDD-026` rejected: that rejection (§3.1) was specifically about avoiding an unconditional per-open `getEntityRecord` call when the record was *already available* in the bulk-fetched `classRecordsById` map (a redundant-fetch/performance concern for the common case). This fetch is a different one — it targets the `"default"` context bucket specifically, which the bulk map's `context: "edit"` fetch never populates regardless of whether the id is already in `classRecordsById`.
- `updateEditingClassMottoStyler` (lines 161-175) continues to update local `editingClassDraft` exactly as before (unchanged — zero risk to typing/rendering), and additionally stages the same change in `core-data`:
  ```js
  resolveSelect("core").getEntityRecord("postType", "motto_css_class", classId).then(() => {
    dispatch("core").editEntityRecord("postType", "motto_css_class", classId, {
      meta: buildEditingClassMeta(editingClassMottoStylerRef.current),
    });
  });
  ```
  Reading `editingClassMottoStylerRef.current` at resolution time (not a value captured in the closure at call time) means rapid keystrokes issued before the warm-up resolves still converge on the latest draft — no stale overwrite, no extra dedup logic needed.
- `cancelEditingClass` (lines 234-242) explicitly discards the staged edit before clearing local state: `dispatch("core").editEntityRecord("postType", "motto_css_class", editingClassId, { meta: undefined })`. `core-data`'s `EDIT_ENTITY_RECORD` reducer (`core-data.js:15198-15211`) deletes a key from the tracked edits when its value is `undefined` — the only public way to discard a staged edit, since there's no separate "revert" action. Safe to call even if nothing was ever staged (no-op).
- `closeEditingClass`'s existing `saveEntityRecord({ id, meta })` call is unchanged. Verified it already clears the newly-staged `editEntityRecord` edit as a side effect of a successful save: `saveEntityRecord`'s non-autosave path (`core-data.js:16916-16939`) dispatches `receiveEntityRecords(kind, name, updatedRecord, void 0, true, edits)` on success — `query` is `void 0`, so `getContextFromAction` defaults to `"default"`, and the `edits` reducer's `RECEIVE_ITEMS` branch (`core-data.js:15156-15197`) prunes any staged edit whose value now matches the persisted response. Also re-verified `saveEntityRecord`'s own same-shaped `getRawEntityRecord` call (`core-data.js:16843`) stays inert for this entity: it's only dereferenced behind `entityConfig.__unstablePrePersist` (`core-data.js:16918-16925`), a hook `motto_css_class`'s entity config doesn't define.
- Once staged, the edit is visible everywhere `hasEditsForEntityRecord("postType", "motto_css_class", id)` is read — including a new small dot indicator on the class chip in `AttachedClassesSection.jsx`'s `renderClassTag`, rendered by a dedicated `UnsavedClassIndicator` subcomponent (kept separate from the inline `.map()` callback deliberately, since hooks can't be called conditionally/variably inside a loop body — each tag needs its own stable component instance to call `useSelect`).
- Switching blocks still unmounts `StylerPanel`/`editingClassDraft` (§2, out of scope to prevent), but the edit is no longer lost when that happens: it lives in `core-data`'s `edits` state, which is not part of the React tree and survives the unmount. Reopening the same class (from any block that references it) rehydrates the draft automatically — `editingClassMottoStyler`'s existing `useMemo` (lines 82-96) already prefers `resolveClassMetaStyler(editingClassRecordEdits?.meta)` over the raw record; this fallback pre-dates this spec but was rarely exercised since nothing wrote to `core-data` before now.

## 5. Data Contract
- Inputs:
  - `editingClassId` (popup's currently-open class post id) — existing.
  - `buildEditingClassMeta(nextMottoStyler)` (lines 73-80) — existing, reused unchanged as the `meta` shape sent to both `editEntityRecord` and `saveEntityRecord`.
- Persistence: none new. `core-data`'s in-memory `edits` tree is transient (cleared on save, on explicit cancel, or on a full page reload — the last case being exactly what `beforeunload` now warns about).
- Outputs:
  - `wp.data.select("core").hasEditsForEntityRecord("postType", "motto_css_class", id)` → `true` while a class has a pending, unsaved edit staged; `false` after Save, Cancel, or before any edit.
  - Native `beforeunload` warning and `EntitiesSavedStates` review panel inclusion, as a direct consequence of the above (no plugin-owned UI for these two).

## 6. Acceptance Criteria
- [x] Editing a CSS row inside the class popup no longer throws `Cannot read properties of undefined (reading 'meta')` — verified live in-editor (not just lint/build) by the user on 2026-08-08.
- [x] `wp.data.select('core').hasEditsForEntityRecord('postType','motto_css_class', id)` returns `true` after editing a row, and `false` after Cancel or after Save.
- [x] Closing/reloading the tab with a pending class edit triggers the native browser "leave site" warning.
- [x] Clicking "Update" on the post with a pending class edit shows WP's native multi-entity save review panel listing the class.
- [x] Switching to a different block mid-edit (no save/cancel) and reopening the same class afterward preserves the unsaved draft instead of reverting to last-saved.
- [ ] Regression: create/attach/detach a class, and edit per-selector rows (`BlockSelectorsList`) — confirmed unaffected by code inspection (no shared code path touched); not re-verified live as part of this spec's manual pass.

## 7. Risks and Mitigations
- Risk: a future change to `CLASS_QUERY_BASE`'s `context` value, or to `motto_css_class`'s meta `show_in_rest` schema restricting `motto_styler` to `context: ["edit"]` only, would make the `"default"`-context warm-up fetch (§4) return a record missing that meta key, silently reintroducing a variant of the original crash risk.
  - Mitigation: `MOTTO_STYLER_CLASS_META_KEY`'s `register_meta` call (`includes/class-post-type.php:486-504`) has no `context` restriction in its `show_in_rest` schema, so it's exposed in both `view`/`default` and `edit` contexts today — verified for this spec. Any future edit narrowing that should re-check this spec's §3/§4.
  - Note: `MOTTO_STYLER_CLASS_CONDITIONAL_META_KEY` (`includes/class-post-type.php:515`) is `show_in_rest => false` entirely (not exposed via REST in any context) — unrelated to this popup's `motto_styler` meta key, called out here only to avoid confusing the two during future work.
- Risk: staging edits on every keystroke via `editEntityRecord` reintroduces per-keystroke dispatch overhead into `core-data`'s reducer, previously removed by `SDD-026` v0.4 for crash-avoidance (not performance) reasons.
  - Mitigation: accepted — this is the same per-keystroke cost every other meta-editing panel in Gutenberg core pays (e.g. `PostClassStylerPanel.jsx`'s `editPost()` call, which already does this for the class CPT's own native edit screen); no reported performance issue from that existing path.
- Risk: the `UnsavedClassIndicator` subcomponent adds a `useSelect` subscription per rendered class chip; on a block with many attached classes this is N additional store subscriptions.
  - Mitigation: `hasEditsForEntityRecord` is a cheap, already-memoized `core-data` selector; accepted as proportional to the (already small) number of classes a block typically carries.

## 8. Test Plan
Automated:
- `npm run lint` and `npm run build` (verified — no functional test coverage exists for `core-data` dirty-state integration or `beforeunload` behavior; not adding new automated coverage for browser-native warning dialogs).

Manual (performed 2026-08-08 by the user):
- Edited a class's CSS row; confirmed `hasEditsForEntityRecord` → `true` in console, no crash.
- Attempted tab reload with a pending edit; confirmed native browser warning appeared.
- Clicked "Update" with a pending edit; confirmed the multi-entity save review panel listed the class.
- Cancelled the popup; confirmed `hasEditsForEntityRecord` → `false`.
- Saved normally; confirmed styles persisted and `hasEditsForEntityRecord` → `false`.
- Switched blocks mid-edit, reselected, reopened the same class; confirmed the unsaved draft was still present.
- User-reported result: "funciona perfecto" (works perfectly) — no further issues surfaced.

## 9. Rollout Plan
Phase A:
- Add the `"default"`-bucket warm-up effect, the parallel `editEntityRecord` staging call, and the explicit cancel-discard to `use-inline-css-class-editor.js` (done).
- Add the `UnsavedClassIndicator` chip badge to `AttachedClassesSection.jsx`, plus its `.motto-class-tag-unsaved-dot` style in `_class-editor.scss` (done).
- `npm run build` to regenerate `build/`/`assets/` (done).
- Manual verification per Test Plan (done, live editor).

Phase B: none planned — feature is complete as scoped.

Rollback:
- Revert the three call sites in `use-inline-css-class-editor.js` back to `SDD-026` v0.4's shape (local-state-only, no `editEntityRecord`) — no data migration involved, since `core-data`'s `edits` tree is transient and not persisted.

## 10. Change Log
- v0.1: Initial implementation and verification. Re-adds `editEntityRecord` staging to the class editor popup's row-edit path (removed by `SDD-026` v0.4 after a crash), this time fixing the actual root cause — the `"default"`-context bucket `editEntityRecord` depends on was never populated for classes bulk-fetched under `context: "edit"`. Fixed by warming that specific bucket via `resolveSelect` when a class is opened for editing, scoped to one record (not the rejected pattern from `SDD-026` §3.1, which was about avoiding a redundant fetch across the whole bulk list). Also adds a chip-level unsaved-changes indicator. Live-verified working by the user with no regressions reported.
