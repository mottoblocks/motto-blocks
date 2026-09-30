# Feature Spec: SDD-026
Version: 0.4
Status: Active
Owner: Styler Core
Last Updated: 2026-08-05

## 1. Goal
Eliminate the extra REST round-trip the block editor pays to resolve `motto_css_class` records, which currently shows up as a multi-second delay before a block's attached-class edit/detach controls and canvas styles appear — most visible on slower shared hosting (observed on GoDaddy).

## 2. Scope
In scope:
- Collapse `collectMottoCssClassRecords()` to a single REST request signature by dropping the `getEntityRecordsTotalPages` probe (see §3 — it resolved under a different cache key than the actual page fetch, doubling the requests this triggers even before preloading).
- Add a `block_editor_rest_api_preload_paths` filter for that single `motto_css_class` collection query, so its response ships in the initial editor payload (`_wpAPIDataPreload`) instead of firing as a live HTTP request after JS mounts.
- Document why the query's `status` filter includes `private`/`draft`/`pending`/`future` alongside `publish` (previously undocumented), so the preload path is kept in lockstep with that behavior instead of accidentally narrowing it.
- Fix a second, independent redundant fetch: opening the "Edit class" popup called `getEntityRecord` (singular) for the class id, which has its own resolver cache separate from the `getEntityRecords` (list) resolver that already fetched the same record in bulk — see §3.1.

Out of scope:
- Splitting the query into a light `id/slug/title` fetch plus a separate `meta`-only fetch scoped to classes actually used in the current post. Deferred — at the current class count the `meta` payload isn't large enough to justify the added complexity (two resolvers, block-tree scanning to determine which classes are "in use"). Revisit if the site's class count or per-class `meta` size grows substantially.
- Narrowing `status` to `publish` only. The broader list guards against orphaned edit/detach controls when a class post ends up in a non-publish status via native wp-admin editing, and against duplicate-slug collisions in the Create Class modal missing non-published classes. Kept as-is.
- Object cache / transient wrapping of the underlying `WP_Query` on the PHP side.

## 3. Current Behavior (pre-SDD-026)
`StylerPanel` mounts once per block via `editor.BlockEdit` (`src/styler/runtime/register-panel.jsx:157,392`) and calls `useCssClassRegistry()` (`src/styler/classes/use-css-class-registry.js:7-26`), which resolves through `collectMottoCssClassRecords()` (`src/styler/classes/css-class-registry-maps.js`) against `wp/v2/motto_css_class` using the shared `CLASS_QUERY_BASE` constant: `per_page: 100`, `status: [publish, private, draft, pending, future]`, `context: "edit"`, `_fields: [id, slug, title, meta]`.

Because `CLASS_QUERY_BASE` is a shared module-level object, `@wordpress/core-data`'s resolver dedupes all block instances calling it into the same cache key — there is no per-block fan-out. However, the pre-SDD-026 implementation still triggered **two** separate REST requests on cold load, not one: it first called `coreStore.getEntityRecordsTotalPages("postType", "motto_css_class", CLASS_QUERY_BASE)` (query with no `page` key) to compute how many pages to loop over, then called `getEntityRecords(...)` per page with an explicit `page` key. `getEntityRecordsTotalPages` is implemented in `@wordpress/core-data` as `forward_resolver_default("getEntityRecords")` (`wp-includes/js/dist/core-data.js:17860`) — it resolves the *same* underlying `getEntityRecords` resolver, but under the query object *without* `page`, which core-data's resolver cache treats as a distinct signature from `{...CLASS_QUERY_BASE, page: 1}`. Two distinct cache keys means two real HTTP requests, fired close to concurrently.

Neither request was part of the editor's preloaded REST payload (no `block_editor_rest_api_preload_paths` filter existed for either query anywhere in the plugin), so both fired fresh after the editor's JS mounted, each incurring a full extra WP bootstrap. On hosts with cold PHP-FPM and no persistent object cache (e.g. GoDaddy shared hosting), this could take seconds — and since preloading only one of the two signatures would still leave the other as a live round trip on the critical path, a correct fix required addressing both, not just adding a single preload path.

Until these requests resolved, `resolveLinkedClassRef` couldn't map a block's class reference to a CPT id, so `AttachedClassesSection` (`src/styler/classes/components/AttachedClassesSection.jsx:42,102-123`) showed only the class name with no edit/detach button, and `css-class-style-runtime.jsx` had no `meta` to derive canvas CSS from — the block rendered unstyled. This is the reported symptom.

The `status` array's non-publish entries have no documented rationale in git history (first introduced in `5cb646a` with no comment). Investigation found `motto_css_class` is a full post type with `show_ui => true` (`includes/class-post-type.php:80-97`), so a class post can end up in a non-publish state via the native wp-admin editor even though the plugin's own creation flow (`handleCreateClass`, `src/styler/hooks/use-class-management.jsx:216-218`) always publishes. The same status list is repeated in the admin class list query, the admin preview-CSS builder, and the Create Class modal's duplicate-slug check — narrowing it would silently break slug-collision detection and could leave a block referencing a non-published class unresolved.

### 3.1 Edit-class popup redundant fetch (pre-SDD-026)
Even with the block already rendered *with* its class styles applied — meaning the bulk `getEntityRecords` fetch had already resolved and the class record was in the `core-data` store — clicking "Edit class" still paid a fresh REST round trip. `useInlineCssClassEditor` (`src/styler/classes/use-inline-css-class-editor.js:33-39`) resolved the popup's record via:

```js
select("core")?.getEntityRecord?.("postType", "motto_css_class", editingClassId)
```

`getEntityRecord` (singular) and `getEntityRecords` (list) are resolved independently in `@wordpress/core-data` — each has its own `hasStartedResolution` cache keyed by selector name + args. The normalized entity for that id already sat in `state.entities.records` from the bulk fetch, but `getEntityRecord` had never been "resolved" for that specific id, so its default resolver fired `apiFetch({ path: "/wp/v2/motto_css_class/{id}?context=edit" })` on first read — every time, since `editingClassId` changes on each popup open. `StylerPanel.jsx:114-121` already had `classRecordsById` in scope (from the same `useCssClassRegistry()` call) but only forwarded it to `useClassManagement`, not to `useInlineCssClassEditor`. This is the same redundant-request shape `css-class-style-runtime.jsx:68-73` documents avoiding elsewhere in the codebase, just not applied here.

### 3.2 `editEntityRecord` crash introduced by the v0.3 fix
The v0.3 fix above (skip `getEntityRecord` when the id is already in `classRecordsById`) introduced a real regression: editing a CSS row inside the class popup started throwing `Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'meta')` inside `core-data.min.js`, from `use-inline-css-class-editor.js`'s `updateEditingClassMottoStyler` dispatching `editEntityRecord` on every row change.

Root cause, traced in `wp-includes/js/dist/core-data.js`: `editEntityRecord`'s action creator (line ~16667) reads `const record = select5.getRawEntityRecord(kind, name, recordId)` **without a `context` argument**, and `getRawEntityRecord` (line ~15910) looks up `state.entities.records[kind][name].queriedData.items["default"]?.[recordId]` — the `"default"` context bucket specifically, defaulting `query?.context` to `"default"` when none is passed. `CLASS_QUERY_BASE` always fetches with `context: "edit"`, so bulk-fetched class records only ever populate the `"edit"` bucket, never `"default"`. Before v0.3, every popup open called `getEntityRecord(id)` with no context override, which — as a side effect of resolving — populated the `"default"` bucket for that id, masking the gap. After v0.3 started skipping that call for bulk-map hits, the `"default"` bucket for those ids was never populated, so `getRawEntityRecord` returned `undefined`, and `record[key]` (line ~16693, `key = "meta"`) threw on the very next row edit.

Fix: removed `editEntityRecord`/`saveEditedEntityRecord` from `use-inline-css-class-editor.js` entirely. Row edits now only update local `editingClassDraft` state (already the source of truth for the popup's live preview); persistence happens once, at close/save time, via `saveEntityRecord("postType", "motto_css_class", { id, meta })`. Verified `saveEntityRecord` doesn't hit the same gap: it also calls `getRawEntityRecord` (line ~16843) without context, but the resulting `persistedRecord` is only dereferenced inside `entityConfig.__unstablePrePersist`, a hook `motto_css_class`'s entity config doesn't define — so an `undefined` `persistedRecord` there is inert. This isn't a workaround that moves the crash elsewhere; it removes the only code path that depended on the `"default"`-context bucket being populated. `cancelEditingClass` no longer needs to revert anything in `core-data`, since nothing is staged there anymore — it only clears local state.

## 4. Target Behavior
- `collectMottoCssClassRecords()` (`src/styler/classes/css-class-registry-maps.js`) no longer calls `getEntityRecordsTotalPages`. It fetches page 1 directly (`{...CLASS_QUERY_BASE, page: 1}`) and only continues to page 2+ in a `do...while` loop if the previous page came back exactly `per_page` (100) records long — i.e. pagination is now opportunistic instead of pre-probed. With the site's current class count, this always resolves in exactly one REST request.
- On block editor init, WordPress preloads a response for that single query into `window._wpAPIDataPreload`, via a `block_editor_rest_api_preload_paths` filter (`motto_blocks_preload_css_class_registry_paths()`) registered alongside the `motto_css_class` post type registration in `includes/class-post-type.php`.
- The preloaded path is built with `add_query_arg()` against `/wp/v2/motto_css_class` using: `per_page: 100`, `status: [publish, private, draft, pending, future]`, `context: edit`, `_fields: 'id,slug,title,meta'`, `page: 1`. The `_fields` value is a comma-joined **string**, not an array — `@wordpress/core-data`'s `getEntityRecords` resolver (`wp-includes/js/dist/core-data.js:17692-17702`) transforms an incoming `_fields` array into a deduped, comma-joined string (also guaranteeing the entity's primary key is present) before building the outgoing request, so the preload path must match that transformed shape, not the raw JS array.
- `@wordpress/core-data`'s resolver reads this preloaded entry on the `getEntityRecords("postType", "motto_css_class", {...CLASS_QUERY_BASE, page: 1})` call and does not issue a live network request on initial editor load.
- Edit/detach controls in `AttachedClassesSection` and canvas class styles are available as soon as the editor paints blocks, without waiting on any REST round trip.
- `core-data`'s preload-matching middleware (`createPreloadingMiddleware`, via `normalizePath()`) parses and alphabetizes query params before comparing, so param **order** doesn't need to match between the PHP path and the JS-generated request — only the resulting set of key/value pairs does. Drift in the actual keys/values (e.g. someone changes `CLASS_QUERY_BASE` without updating the PHP filter) silently falls back to a live fetch rather than erroring.
- The `status` filter's non-publish values remain unchanged; this spec preloads the same query the editor already runs, it does not alter what the query returns.
- The filter applies to every block-editor context, not just the post editor: WP core's `block_editor_rest_api_preload()` (`wp-includes/block-editor.php:680-691`) is invoked from `edit-form-blocks.php` (post editor), `site-editor.php` (Site Editor — templates, template parts, and patterns), and `widgets-form-blocks.php` (Widgets screen) without any post-type check. Since the filter callback doesn't scope by `$block_editor_context->post`, it preloads identically across all of them — a class attached to a block inside a template or pattern gets the same fix with no extra code.
- `useInlineCssClassEditor` (`src/styler/classes/use-inline-css-class-editor.js`) accepts a `classRecordsById` param (passed from `StylerPanel.jsx`'s existing `useCssClassRegistry()` call) and reads `classRecordsById.get(editingClassId)` first when resolving the popup's record, falling back to `getEntityRecord` only if the id isn't in the bulk map (new class not yet reflected in the list, or beyond an already-fetched page) — mirroring the bulk-preferring pattern in `css-class-style-runtime.jsx`'s `hydrateClassRecordMaps`.
- While the popup is open, row edits update only local `editingClassDraft` state — `editEntityRecord`/`saveEditedEntityRecord` are no longer called on every keystroke (see §3.2). The draft is saved in one shot via `saveEntityRecord` when the popup closes; canceling just discards local state, with nothing staged in `core-data` to revert.

## 5. Data Contract
- Inputs:
  - `WP_Block_Editor_Context` passed into `block_editor_rest_api_preload_paths` (not used for scoping in this spec — the preloaded path is static, not derived from the post being edited).
  - `CLASS_QUERY_BASE` (`src/styler/classes/css-class-registry-maps.js:4-9`) — the JS-side source of truth the PHP preload path must mirror, at the `page: 1` request shape specifically (not the removed total-pages-probe shape).
- Persistence: none. Read-only performance optimization; no new attributes, meta, or options.
- Outputs:
  - `window._wpAPIDataPreload["/wp/v2/motto_css_class?..."]` consumed transparently by `@wordpress/api-fetch`'s preloading middleware.

## 6. Acceptance Criteria
- [ ] Opening the block editor on a post with ≥1 block carrying an attached class shows the edit/detach button with no observable delay under throttled network conditions (DevTools "Slow 3G").
- [ ] DevTools Network panel shows no live XHR to `/wp/v2/motto_css_class` matching `CLASS_QUERY_BASE` on initial editor load — the request is served from `_wpAPIDataPreload`.
- [ ] The PHP-side preloaded query string is byte-for-byte identical to `CLASS_QUERY_BASE`'s serialized form (verified manually, since a silent mismatch degrades gracefully rather than erroring).
- [ ] Duplicate-slug detection in the Create Class modal still catches collisions against draft/private/pending/future classes (regression check — status list untouched).
- [ ] Canvas class styles render without a flash-of-unstyled-block on initial editor load.
- [ ] Same result (no delay, no extra XHR) holds when editing a template or template part with an attached-class block in the Site Editor, and when editing a pattern that contains one.
- [ ] Clicking "Edit class" on an already-rendered (styled) block opens the popup with no `getEntityRecord` XHR to `/wp/v2/motto_css_class/{id}` in the Network panel — the record comes from `classRecordsById`.
- [x] Editing a CSS row inside the class popup no longer throws `Cannot read properties of undefined (reading 'meta')` — verified via `npm run lint` + `npm run build` after removing `editEntityRecord` usage; live-editor confirmation still pending.

## 7. Risks and Mitigations
- Risk: preload query drifts out of sync with `CLASS_QUERY_BASE` after a future edit to one but not the other, silently losing the optimization (not a functional bug — falls back to the pre-existing live fetch).
  - Mitigation: cross-referencing comments in both `css-class-registry-maps.js` and `motto_blocks_preload_css_class_registry_paths()` point at each other.
- Risk: a site that crosses 100 classes reintroduces a second live request for page 2+ (the opportunistic pagination in `collectMottoCssClassRecords` still works correctly, it just isn't preloaded past page 1).
  - Mitigation: acceptable — page 2+ is the rare/large-library case already called out as the trigger for revisiting this design (see Scope); page 1 (the common case) stays fully preloaded.
- Risk: preloading grows the initial editor HTML payload by the full `meta` (styler JSON) size of every class on the site, since the query is not scoped to classes used in the current post.
  - Mitigation: acceptable at the site's current class count; documented as the trigger condition for the deferred split-query design (see Scope).
- Risk: broad `status` list means the preloaded payload includes non-published class posts, which could look surprising to someone auditing preloaded data.
  - Mitigation: intentional, pre-existing behavior unrelated to this change — documented in §3 rather than altered.

## 8. Test Plan
Automated:
- `npm run lint` and `npm run build` pass (verified — no functional test coverage exists for editor preload payloads or `collectMottoCssClassRecords`'s pagination behavior; not adding new automated tests for a PHP filter registration or a pagination-loop-shape change).

Manual (not yet performed — pending):
- Open a post with ≥1 attached class in wp-admin, DevTools Network tab open, throttled to "Slow 3G".
- Confirm edit/detach controls and applied canvas styles appear immediately on block paint, with no visible loading flash.
- Confirm no `/wp/v2/motto_css_class` request appears in the Network panel on initial load (check `_wpAPIDataPreload` in page source instead).
- Confirm the same holds when editing a template/template part in the Site Editor and when editing a pattern.
- Create a new class via the Create Class modal using a slug that collides with an existing draft/private class; confirm the duplicate-slug warning still fires (regression check — status list untouched).
- Sanity-check that a post referencing a class still resolves it correctly (no regressions from the pagination-loop rewrite) even for a site well under 100 classes.
- Open "Edit class" for a class right after creating it (before the bulk list re-resolves) and confirm it still opens correctly via the `getEntityRecord` fallback.

## 9. Rollout Plan
Phase A:
- Rewrite `collectMottoCssClassRecords()` to a single-request opportunistic-pagination shape (done — `src/styler/classes/css-class-registry-maps.js`).
- Add the `block_editor_rest_api_preload_paths` filter in `includes/class-post-type.php`, mirroring the rewritten query exactly, including the `_fields` array→string transform (done — `motto_blocks_preload_css_class_registry_paths()`).
- Route the edit-class popup's record lookup through `classRecordsById` instead of `getEntityRecord` (done — `use-inline-css-class-editor.js`, `StylerPanel.jsx`).
- Remove `editEntityRecord`/`saveEditedEntityRecord` usage from the popup's row-edit path to fix the v0.3-introduced `getRawEntityRecord` context-bucket crash (done — `use-inline-css-class-editor.js`).
- `npm run build` to regenerate `build/`/`assets/` (done).
- Manual verification per Test Plan (pending).

Phase B:
- Confirm the fix on the affected GoDaddy-hosted site under real network conditions.

Rollback:
- Remove the filter — falls back to a live fetch, no data migration involved. The `collectMottoCssClassRecords` pagination rewrite is independently safe to keep even without the filter (it already reduces the pre-existing implementation from two requests to one).

## 10. Change Log
- v0.1: Initial draft, based on GoDaddy slow-load investigation (attached-class edit/detach button and styles delayed behind an unpreloaded REST round trip).
- v0.2: Implemented. Discovered mid-implementation that the pre-existing code fired two REST requests, not one (`getEntityRecordsTotalPages` resolved under a different cache key than the actual page fetch) — a single preload path would have only masked half the delay. Rewrote `collectMottoCssClassRecords` to a single opportunistic-pagination request shape first, then preloaded that. Pending manual browser verification.
- v0.3: Fixed a second redundant fetch reported after v0.2 shipped — opening the "Edit class" popup (`useInlineCssClassEditor`) called `getEntityRecord` unconditionally instead of reusing `classRecordsById` from the same `useCssClassRegistry()` already in scope in `StylerPanel.jsx`, costing a live REST round trip on every popup open even for a block already rendered with its class styles.
- v0.4: Fixed a crash the v0.3 change introduced — skipping `getEntityRecord` for bulk-map hits left the `"default"`-context bucket `editEntityRecord` reads from (via `getRawEntityRecord`) unpopulated, so editing a CSS row threw `Cannot read properties of undefined (reading 'meta')` on every keystroke. Removed `editEntityRecord`/`saveEditedEntityRecord` from the row-edit path entirely — the popup's local draft state was already the real source of truth during editing, so core-data only needs a single `saveEntityRecord` call at close time. See §3.2.
- v0.5 (2026-08-08): Note — `SDD-029` re-introduces `editEntityRecord` staging on the row-edit path removed in v0.4 above, this time fixing the actual root cause (warming the `"default"`-context bucket via `resolveSelect` when a class is opened, rather than avoiding `editEntityRecord` altogether), in order to wire the popup into WP's native unsaved-changes protection (`beforeunload`, multi-entity save panel). §3.2, §4's row-edit bullet, and the "Fix" text above describe the pre-`SDD-029` state; see `SDD-029` for the current behavior. No further changes to this spec's own scope (REST preload performance) were needed — the two specs touch the same function for different reasons.
