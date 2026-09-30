# Feature Spec: SDD-030 — Tabs URL Hash Sync
Version: 0.1
Status: Proposed
Owner: Blocks
Last Updated: 2026-08-10

## 1. Goal
Let a visitor deep-link to a specific tab of a `motto/tabs` block via the URL hash (e.g. `#pricing`), and have clicking a tab update the hash so the link is shareable/bookmarkable — opt-in per block, fully manual (no slug auto-generation, no cross-block namespacing), keeping the change additive and low-risk.

## 2. Scope
In scope:
- New `syncUrlHash` boolean attribute on `motto/tabs` (default `false`), toggle in its Inspector.
- New `urlSlug` string attribute on `motto/tab-button` (default `""`), manual text field in its Inspector, shown only when the parent's `syncUrlHash` is on.
- `tabs-frontend.js`: read `location.hash` on init to pick the initial active tab (falls back to today's first-tab behavior); write the hash via `history.replaceState` on tab click.
- New `motto/tabs-syncUrlHash` block context (mirrors the existing `motto/tabs-activeTabId` context) so `tab-button` can conditionally render its slug field.

Out of scope:
- Auto-generating `urlSlug` from the tab-button's text (WP's anchor-field pattern) — explicitly rejected in favor of a plain manual field.
- Enforcing slug uniqueness, globally or per-page — matches the existing `tabId` model, which is only unique per `motto/tabs` instance (see that block's README).
- Any namespacing/prefixing mechanism (e.g. via the block's `anchor`) to disambiguate multiple `motto/tabs` blocks sharing a slug on the same page — deliberately not built; see §7.
- Query-param-based sync (`?active-tab=`) — hash was chosen instead specifically to avoid fragmenting full-page-cache cache keys (query strings) and because the value never needs to reach the server.
- ARIA/keyboard-nav work (tracked separately in `motto/tabs`' README TODO).
- Editor canvas behavior — `activeTabId`/context continue to drive the editor preview exactly as today; this feature only changes frontend markup and `tabs-frontend.js`.

## 3. Current Behavior
Per `motto/tabs`' README and `assets/js/tabs-frontend.js`: `activeTabId` is editor-only preview state, never serialized by `save()`. On the frontend, `initTabs()` always defaults to the first `.motto-tab-button`'s (or first `.motto-tab`'s) `data-tab-id` on load, with no awareness of the URL. Clicking a button only toggles `.is-active`/`hidden` locally; nothing touches `location`.

## 4. Target Behavior
1. `motto/tabs` gains `syncUrlHash: boolean` (default `false`), exposed as a single `ToggleControl` in its Inspector. `providesContext` adds `"motto/tabs-syncUrlHash": "syncUrlHash"` alongside the existing `activeTabId` entry.
2. `Save()` renders `data-sync-url-hash="true"` on the `.motto-tabs` wrapper only when `syncUrlHash` is `true`; when `false` (default), markup is byte-identical to today.
3. `motto/tab-button` gains `urlSlug: string` (default `""`), declares `usesContext: ["motto/tabs-activeTabId", "motto/tabs-syncUrlHash"]`, and shows a single `TextControl` ("URL slug") in a minimal Inspector `PanelBody`, rendered only when `context["motto/tabs-syncUrlHash"]` is true. No slugify/normalize beyond a trim (reuse `normalizeTabId`-style trimming, not its ID-generation logic) — whatever the user types is used verbatim.
4. `save()` renders `data-tab-slug="<urlSlug>"` on the `<button>` only when `urlSlug` is non-empty; omitted otherwise (mirrors how `data-tab-id` is always present but this new attribute is conditional).
5. `tabs-frontend.js` `initTabs()`:
   - Builds a `slug -> tabId` map from any `[data-tab-slug]` buttons.
   - If the wrapper has `data-sync-url-hash="true"` and `location.hash` (minus `#`) matches an entry in that map, `activate()` that `tabId` instead of `firstTabId`. Otherwise, behavior is unchanged (first tab).
   - On every button click, `activate()` runs as today; additionally, if the wrapper is sync-enabled and the clicked button has `data-tab-slug`, call `history.replaceState(null, "", "#" + slug)`. A click on a button with no slug leaves the current URL/hash untouched.
6. No slug uniqueness enforcement and no namespacing: if two sync-enabled `motto/tabs` blocks on the same page share a slug, both activate on matching hash and both update the hash on click of either. This is an accepted, documented limitation, not a bug — see §7.

## 5. Data Contract
- Inputs:
  - `motto/tabs.attributes.syncUrlHash` (boolean, default `false`) — editor-set, drives `data-sync-url-hash` in `save()`.
  - `motto/tab-button.attributes.urlSlug` (string, default `""`) — editor-set, drives `data-tab-slug` in `save()`.
  - `location.hash` at page load and `click` events on `.motto-tab-button` at runtime (frontend only).
- Persistence:
  - Both new attributes persist in block markup (`block.json` attributes), same as `tabId`/`activeTabId` today. No `meta`, no options, no REST changes.
- Outputs:
  - Frontend DOM: `data-sync-url-hash` on `.motto-tabs`, `data-tab-slug` on qualifying `.motto-tab-button` elements.
  - Frontend runtime: initial active tab selection, and `history.replaceState` hash writes on click — both scoped to sync-enabled instances only.
  - No change to editor canvas rendering or to `activeTabId`'s existing editor-only role.

## 6. Acceptance Criteria
- [ ] `syncUrlHash` off (default): frontend markup for `.motto-tabs` and its buttons is unchanged from pre-feature output; behavior identical to today.
- [ ] `syncUrlHash` on, no `urlSlug` set on any button: behavior identical to today (no slug to match or write).
- [ ] `syncUrlHash` on, a button has `urlSlug` set: frontend `<button>` carries `data-tab-slug`.
- [ ] Loading the page with `#<slug>` matching a `data-tab-slug` on a sync-enabled block activates that tab on load instead of the first tab.
- [ ] Loading with a hash that matches nothing, or on a block with sync off, falls back to first-tab (unchanged).
- [ ] Clicking a slugged button on a sync-enabled block updates the URL hash via `replaceState`: no scroll jump, no new browser-history entry (back button doesn't step through tab clicks).
- [ ] Clicking a non-slugged button on a sync-enabled block activates the tab without touching the current hash.
- [ ] tab-button's "URL slug" Inspector field is visible only when the parent tabs block has `syncUrlHash` enabled.
- [ ] Two sync-enabled `motto/tabs` blocks sharing a slug both react to the same hash (documented, not treated as a bug in this pass).

## 7. Risks and Mitigations
- Risk: two sync-enabled `motto/tabs` blocks on one page share a `urlSlug`, so a hash intended for one activates both.
  - Mitigation: accepted by design (§2, §4.6) — no auto-namespacing was chosen deliberately to keep the feature simple; author resolves by picking distinct slugs manually if it matters to them.
- Risk: `history.replaceState` on every click could conflict with other scripts/plugins managing `location.hash` on the same page.
  - Mitigation: opt-in per block (`syncUrlHash` default `false`) and scoped strictly to clicks on `.motto-tab-button[data-tab-slug]` inside sync-enabled `.motto-tabs` wrappers.
- Risk: JS blocked/not yet run when the page loads with a hash — same as today's general degrade path (`assets/css/blocks/tabs.css` only hides inactive panels once `data-motto-tabs-init` is set), so hash sync simply doesn't apply; not a new failure mode.
- Risk: none of `motto/tabs`' existing content needs migration — both new attributes default to values that reproduce current `save()` output exactly, so no `deprecated`/`migrate()` entry is needed.

## 8. Test Plan
Automated:
- Extend `tests/e2e/tabs.spec.mjs`: toggle `syncUrlHash` + set a slug, assert `data-sync-url-hash`/`data-tab-slug` in rendered markup; load with `#slug` and assert the matching tab is active; click a slugged button and assert `location.hash` updated with no new history entry.

Manual:
- Build a tabs block, enable sync, set slugs on two of three buttons, publish, and verify: direct load with each valid hash opens the right tab; load with an invalid hash and with no hash both open the first tab; clicking the un-slugged button doesn't touch the URL; browser back button after several tab clicks doesn't step through them.

## 9. Rollout Plan
Phase A:
- Add `syncUrlHash`/`urlSlug` attributes, context, and Inspector UI only (editor-only change, zero frontend behavior difference since `tabs-frontend.js` isn't touched yet — safe to ship independently).

Phase B:
- Update `tabs-frontend.js` with the hash-read-on-init and hash-write-on-click logic described in §4.5.

Rollback:
- Either phase can be reverted independently; both are purely additive (new optional attributes, default-off), so no data migration or `deprecated` entry is needed in either direction.

## 10. Change Log
- v0.1: Initial draft, from debate on hash vs. query param, manual-only slugs (no auto-generation, no namespacing), and `replaceState` over `location.hash =`.
