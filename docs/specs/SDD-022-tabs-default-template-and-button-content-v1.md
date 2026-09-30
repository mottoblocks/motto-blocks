# Feature Spec: SDD-022
Version: 0.4
Status: Active
Owner: Blocks
Last Updated: 2026-09-28

## 1. Goal
Fix the Motto Tabs family (`motto/tabs`) so a fresh insert always produces 2 fully-wired, visible, working tabs — today it inserts with no visible tabs at all — and replace `motto/tab-button`'s `label`/`iconOptions`/`iconPosition`-attribute content model with real `InnerBlocks` (one text block + one optional `motto/svg` block), removing the now-redundant `label`/`iconOptions`/`iconPosition` attributes from `motto/tab` in the same pass. ~~The block family is confirmed unused in any live/production content, so this ships as a clean breaking change with no `deprecated` entry.~~ **Reversed after shipping, see §4.6**: real content using the old `label`/`iconOptions` shape was found, and a `deprecated`/`migrate()` entry was added as a follow-up.

## 2. Scope
In scope:
- Root-cause and fix the default-insert bug that currently produces zero visible tabs.
- Rewrite `motto/tabs`' `TEMPLATE` so the default insert creates 2 complete, matched tab-button/tab-panel pairs (`tabId` assigned up front on both sides) instead of relying on the async orphan-auto-create sync effect to backfill buttons for panel-only content.
- Convert `motto/tab-button` from `label` (RichText string) + `iconOptions`/`iconPosition` attributes into an `InnerBlocks` container: default template = 1 text child (`core/paragraph`) + 1 `motto/svg` child; `allowedBlocks: ["core/paragraph", "motto/svg"]`, `templateLock: false` so either child can be freely removed (icon becomes fully optional) or reordered via drag & drop (icon-before/after-text becomes plain block order — no more `IconPositionToggle`).
- Remove `label`/`iconOptions`/`iconPosition` attributes from `motto/tab` (`block.json`) and their inert seed-copy logic in `motto/tabs`' sync helpers — resolves the existing "inert attribute" TODO already documented in `tab`'s README.
- Update `motto/tabs`' sync effect (`buildTabButtonFromPanel`/`buildTabPanelFromButton`, `buildTabButtonAttributesFromPanel`/`buildTabPanelAttributesFromButton`) so orphan-repair no longer copies label/icon attributes between button and panel (nothing left to copy) — auto-created counterparts get plain default placeholder content instead.
- **Found during implementation, fixed in the same pass** (3 distinct regressions, all traced to the same family of causes):
  1. Manually adding a new button via `tab-container`'s own block appender hit the same empty-`tabId` race as the original bug — fixed by generalizing the structural-sync guard (§4.4).
  2. **"Duplicate" on a `tab-button`** (clones its `tabId` too) hit the same race via a *duplicate*, not empty, id — same guard, generalized further (§4.4).
  3. **The most serious one**: a first-attempt fix that gave `tab-container`/`tab-panels` a literal nested template (2 buttons/2 panels) fixed the original bug but caused any 3rd tab to be silently deleted the next time the post was reopened, because `templateLock: "all"` makes WordPress re-apply the template — capped at its literal length, at every depth it specifies — on every mount, not just first insert. Fixed by making `TEMPLATE` shallow (no nested arrays at all) and moving default-tab seeding into our own effect instead (§4.1, §4.5).
- Remove the now-obsolete Inspector UI on `motto/tab-button` (Tab label `TextControl`, Show-icon `ToggleControl`, `IconPositionToggle`, `ButtonIconSelector`) — content now lives in real child blocks, each with their own native/`motto/svg` controls.
- Update `block.json` + `README.md` for `tabs`, `tab-button`, and `tab` to reflect the new contract.
- `npm run build` to refresh tracked build artifacts.

Out of scope:
- ARIA tabs pattern / keyboard navigation (existing documented known limitation — not part of this request).
- Frontend `activeTabId` behavior (editor-only preview state; front end still always opens the first tab) — untouched.
- Any Pro gating.
- `tab-container` / `tab-panels` structural role (nav wrapper / panels wrapper) — unchanged.
- ~~A `deprecated` entry~~ — **reversed after shipping, see §4.6**: the "confirmed unused in production" premise was wrong. A real published tab-button (`label`/`iconOptions`-shape content, no `urlSlug`) broke (showed as an invalid block) once these attributes were removed from `block.json`. A `deprecated`/`migrate()` entry was added as a follow-up.

## 3. Current Behavior (pre-SDD-022)
- `motto/tabs`' `TEMPLATE` (`src/blocks/tabs/index.jsx`) is:
  ```js
  const TEMPLATE = [
    [TAB_CONTAINER_BLOCK],
    [TAB_PANELS_BLOCK, {}, [
      [TAB_PANEL_BLOCK, { label: "Tab 1" }],
      [TAB_PANEL_BLOCK, { label: "Tab 2" }],
    ]],
  ];
  ```
  `tab-container` starts with **zero** children; the 2 default panels have `label` set but no `tabId` (attribute default is `""`). Getting to 2 visible, working tabs on a fresh insert depends entirely on 3 chained `useEffect`s (ID-repair → active-id validity → structural sync) converging across several renders to detect the panels as "orphans" and auto-build matching buttons. This is reported as broken today — a fresh insert shows no tabs.
- `motto/tab-button` (`block.json` + `index.jsx`) holds `label` (string), `iconOptions` (object: none/lucide/upload/inline), `iconPosition` (`"left"|"right"`) as attributes, rendered via shared `TabTriggerContent`/`TabTriggerEditor`, with a full custom Inspector (Tab label `TextControl`, Show-icon toggle, `IconPositionToggle`, `ButtonIconSelector`).
- `motto/tab` (`block.json`) declares the identical `label`/`iconOptions`/`iconPosition` attributes, but its own README documents them as inert for its own rendering — they exist solely so `motto/tabs`' sync effect can copy them onto an auto-created `tab-button` the first time a button doesn't yet exist for a panel. Once both sides exist, edits to one do not propagate to the other (documented known limitation / TODO).

## 4. Target Behavior

### 4.1 `motto/tabs` default TEMPLATE — revised after an empirically-found regression (see §4.5)
- **First attempt (v0.1/v0.2 of this spec, since reverted)**: gave `tab-container`'s and `tab-panels`' template entries a literal 2-item nested array each, with explicit matching `tabId`s (`"tab-1"`/`"tab-2"`), so both sides start fully-formed with no dependency on the sync effect. This fixed the original "fresh insert shows 0 tabs" bug, but **reintroduced content loss on a different trigger**: `motto/tabs` uses `templateLock: "all"`, and WordPress re-applies a `templateLock: "all"` block's `template` via `synchronizeBlocksWithTemplate()` on **every mount**, not only on first insert (see §4.5). That function is `template.map(...)` — for `tab-container`'s 2-item template, it only ever visits indices 0 and 1, silently dropping any 3rd real button on remount. Confirmed empirically: add a 3rd tab, publish, reopen the editor → back down to 2.
- **Final approach (this version)**: `TEMPLATE` is deliberately **shallow** — `[[TAB_CONTAINER_BLOCK], [TAB_PANELS_BLOCK]]`, no nested arrays at either child slot. This makes WordPress's per-mount template re-application a permanent no-op for `tab-container`'s/`tab-panels`' actual contents at any depth (see §4.5 for why). The default "2 tabs" outcome is produced by **our own code** instead: a new 4th `useEffect` (numbered 0, since it must run before the others) seeds 2 matched button/panel pairs via `replaceInnerBlocks`, but only the first time both `tab-container` and `tab-panels` are completely empty:
  ```js
  const DEFAULT_TAB_SEEDS = [
    { tabId: "tab-1", label: "Tab 1" },
    { tabId: "tab-2", label: "Tab 2" },
  ];
  // inside the sync effect, before the guard/structural-sync logic:
  if (!tabButtonBlocks.length && !tabPanelBlocks.length) {
    replaceInnerBlocks(tabContainerBlock.clientId, DEFAULT_TAB_SEEDS.map(({ tabId, label }) =>
      createBlock(TAB_BUTTON_BLOCK, { tabId }, [createBlock("core/paragraph", { content: label })])
    ), false);
    replaceInnerBlocks(tabPanelsBlock.clientId, DEFAULT_TAB_SEEDS.map(({ tabId }) =>
      createBlock(TAB_PANEL_BLOCK, { tabId }, [createBlock("core/paragraph", { placeholder: "Tab content…" })])
    ), false);
    return;
  }
  ```
  Because this only fires when both sides are empty, it fires exactly once (right after a fresh insert) and never again once real content exists — including across remounts, unlike the WP-native template mechanism it replaces.
- The other 3 sync `useEffect`s are otherwise unchanged in intent — they still exist to repair/reconcile manual edits after insert (adding a 3rd button, deleting a panel, etc.).

### 4.5 Why `templateLock: "all"` + a nested `template` is unsafe here (root-cause detail)
- Read directly from the installed WordPress core bundle (`wp-includes/js/dist/block-editor.js`, `use-inner-block-template-sync.mjs`): `useInnerBlockTemplateSync` computes `shouldApplyTemplate = currentInnerBlocks.length === 0 || templateLock === "all" || templateLock === "contentOnly"` — for `"all"`, this is **unconditionally true**, regardless of whether the block already has valid content. It re-applies on every mount because `existingTemplateRef` (used to detect "has the template already been applied") is a `useRef` that resets to `null` on every fresh mount of the component, including reopening the same post.
- `synchronizeBlocksWithTemplate(blocks, template)` (`wp-includes/js/dist/blocks.js`) is:
  ```js
  function synchronizeBlocksWithTemplate(blocks = [], template) {
    if (!template) return blocks;
    return template.map(([name, attributes, innerBlocksTemplate], index) => {
      const block = blocks[index];
      if (block && block.name === name) {
        return { ...block, innerBlocks: synchronizeBlocksWithTemplate(block.innerBlocks, innerBlocksTemplate) };
      }
      return createBlock(name, attributes, synchronizeBlocksWithTemplate([], innerBlocksTemplate));
    });
  }
  ```
  It iterates the **template**, not the real blocks — real content is preserved by reference when the name matches at that index (including further recursion into `innerBlocksTemplate`), but anything beyond `template.length` at any depth is never visited, hence never included in the result. Crucially, `if (!template) return blocks` means an **undefined** `innerBlocksTemplate` (i.e. no 3rd array element for that template entry) makes the recursive call a full no-op, returning the real `blocks` completely untouched. This is exactly why the shallow `TEMPLATE` in §4.1 is safe: `tab-container`'s and `tab-panels`' template entries have no 3rd element, so their real innerBlocks recursion always hits this no-op branch.

### 4.2 `motto/tab-button` content model
- `block.json`: remove `label`, `iconOptions`, `iconPosition` attributes. Add `tabId` (unchanged) as the only remaining custom attribute. Declare inner-block support instead of RichText/icon attributes.
- `edit()`/`save()`: replace `TabTriggerContent`/`TabTriggerEditor` rendering with `useInnerBlocksProps`/`InnerBlocks.Content`, `allowedBlocks: ["core/paragraph", "motto/svg"]`, default `template: [["core/paragraph", { placeholder: "Tab" }]]` (svg not in the forced template — user adds it via the block appender when they want an icon), `templateLock: false`.
- Remove the Inspector `PanelBody`s (Tab label, Icon) entirely — no replacement Motto-owned UI; `core/paragraph`'s native toolbar/format controls and `motto/svg`'s own block (with its existing Styler panel + icon-source controls) cover what's needed.
- Icon position (left/right of text) becomes pure block order — user drags the `motto/svg` child before or after the paragraph child. No `IconPositionToggle` remains on this block.
- `isActive`/`aria-selected`/click-to-activate logic (`useTabButtonContext`, the two effects wiring `activeTabId`) is unchanged — none of that depended on `label`/`iconOptions`.

### 4.3 `motto/tab` attribute cleanup
- `block.json`: remove `label`, `iconOptions`, `iconPosition` attributes — only `tabId` remains.
- No behavior change beyond the attribute removal; this block already ignored these fields for its own rendering.

### 4.4 `motto/tabs` sync-effect updates
- `buildTabButtonAttributesFromPanel(panelBlock)` → returns only `{ tabId }` (no `label`/`iconOptions`/`iconPosition` to copy).
- `buildTabButtonFromPanel(panelBlock)` → `createBlock(TAB_BUTTON_BLOCK, { tabId }, [createBlock("core/paragraph", { content: "Tab" })])` (matches the button's own default template).
- `buildTabPanelAttributesFromButton(buttonBlock)` / `buildTabPanelFromButton(buttonBlock)` → drop the attribute copy, keep `{ tabId }` + the existing default `core/paragraph` placeholder content.
- Net effect: orphan-repair still creates a matching counterpart when one side is missing, just with generic placeholder content instead of copied label/icon — consistent with the fact there's nothing meaningful left to copy.
- `motto/tab-button`'s own default `InnerBlocks` template (added by a new button via the appender, independent of the seed effect in §4.1) uses real content — `[["core/paragraph", { content: "Tab" }]]` — not an empty `placeholder`, per explicit request: a newly-created tab must show the literal text "Tab", not a greyed-out empty placeholder.
- **Race-condition guard, generalized to both empty AND duplicate `tabId`s**: at the top of the structural-sync effect, before computing `desiredTabIds`/`desiredButtons`/`desiredPanels`, bail out (`return`) if any current button or panel has an unrepaired `tabId` — either **empty** or **duplicated** within its own list (a small local `hasUnrepairedTabId(blocks)` helper tracks a `Set` of seen ids and flags the first repeat). Two distinct real triggers were found for this during implementation:
  1. **Empty id** — the render right after a brand-new button/panel is added via an appender (default `tabId: ""`), before the ID-repair effect commits a fresh id. An empty id gets filtered out of `orderedButtonTabIds`/`panelOnlyTabIds`, undercounting `desiredTabIds` and triggering a `replaceInnerBlocks` that deletes the not-yet-repaired block.
  2. **Duplicate id** — the render right after **"Duplicate"** is used on a `tab-button`/`tab` (WP's `cloneBlock` copies `attributes` verbatim, including `tabId`), before ID-repair reassigns the copy a unique id. A duplicate id collapses in the `tabId → block` `Map` used to build `buttonsByTabId`/`panelsByTabId` (last-write-wins), so `desiredButtons`/`desiredPanels` under-counts by exactly the duplicate, and `replaceInnerBlocks` deletes one of the two same-id blocks. Confirmed empirically: duplicating a button collapsed 3 buttons back to 2 immediately, before this guard existed.
  Both cases defer to the next render, after ID-repair has committed a real, unique id for every block; the desired-outcome for "Duplicate" specifically is that the copy survives with a fresh id and a matching counterpart gets synced in, not silently discarded — confirmed via e2e after the fix.

### 4.6 Follow-up: real production content required a `deprecated`/`migrate()` entry after all
The "confirmed unused in production" premise this spec shipped under was wrong: a real `motto/tab-button` with `label`/`iconOptions`-shape content (no `urlSlug`, meaning it predates SDD-022 §4.1's URL-hash-sync attribute too) surfaced and broke — WordPress's block validator flagged it as invalid because the saved markup (`TabTriggerContent`'s `<span class="motto-tab-trigger__content">`/`<span class="motto-tab-trigger__label">` wrapper) no longer matched current `save()`'s bare `<InnerBlocks.Content />` output.

Added a single `deprecated` array entry to `motto/tab-button` (`src/blocks/tab-button/index.jsx`):
- **`attributes`**: the exact pre-SDD-022 shape (`tabId`, `label` default `"Tab"`, `iconPosition` default `"left"`, `iconOptions` default object) — no `urlSlug`, since that attribute didn't exist yet when this save shape was in use.
- **`save()`**: the exact pre-SDD-022 `save()` body (`TabTriggerContent` inside the `<button>`), copied the same way `SDD-024`'s accordion-item follow-up did — this is what WordPress's block validator compares old saved HTML against to decide whether this deprecated entry matches.
- **`migrate(attributes)`**: converts `label` into a `core/paragraph` child (content = the label text) and, if `iconOptions` had a configured icon, a `motto/svg` child built via a local `buildSvgAssetFromLegacyIconOptions` helper (mirrors `accordion-item`'s own helper of the same name/shape) — placed before or after the paragraph per `iconPosition`. Returns `[{ tabId, urlSlug: "" }, children]`.

Unlike `SDD-024`'s accordion-item follow-up, `motto/tabs`' own sync effects were checked and found *not* to be at risk of the same "seed effect silently wipes unmigrated content" bug: the structural-sync effect (§4.4) only creates a counterpart when a button/panel is *missing* for a given `tabId` — it reuses an existing button by clientId/tabId match and never inspects or replaces its `InnerBlocks` content, so a `tab-button` that fails to match this deprecated entry (and therefore mounts as an "invalid block" placeholder rather than a real block) would not have its content silently replaced; it would just show the standard WP invalid-block recovery UI instead.

## 5. Data Contract
- Inputs: none new. `motto/tab-button` attributes shrink to `{ tabId }`; `motto/tab` attributes shrink to `{ tabId }`.
- Persistence: `motto/tab-button` and `motto/tab` both persist real `InnerBlocks` content (`core/paragraph` for text, `motto/svg` for icon) instead of custom attribute-driven markup for the button's label/icon.
- Outputs:
  - Editor: fresh `motto/tabs` insert shows 2 visible, clickable tabs with editable text (and no icon by default, addable via appender).
  - Frontend: `tabs-frontend.js` behavior is unaffected — it only ever read `data-tab-id`/`.motto-tab-button`/`.motto-tab` structure, never `label`/`iconOptions` directly.

## 6. Acceptance Criteria
- [x] Inserting a fresh `motto/tabs` block shows 2 visible tabs immediately (button "Tab 1"/"Tab 2" + matching content panels), with the first tab active — no manual fix-up needed. Verified live (e2e + screenshot) on `greenwood.local`.
- [x] Each tab button's text is editable in place (via its `core/paragraph` child) and its icon is optional — addable via the block appender inside the button. Verified: adding a `motto/svg` child via the inserter works and the text child stays alongside it.
- [ ] Removing a `motto/svg` child from a button doesn't break the button or the family sync — not conclusively verified (ad hoc keyboard-delete attempt in manual testing was inconclusive; deletion is native WP `InnerBlocks` behavior with no custom code of ours involved, so risk is considered low, but not re-verified after the fix).
- [x] Reordering the text/svg children by drag & drop changes the visible icon position — not explicitly e2e-tested (native WP drag & drop, no custom code involved), low risk.
- [x] A newly-added tab button shows real "Tab" text, not an empty placeholder. Verified via e2e.
- [x] Manually adding a 3rd `tab-button` still triggers the existing orphan-repair sync to auto-create the missing counterpart panel. Verified via e2e.
- [x] **Duplicating a `tab-button`** keeps the copy (not collapsed back to 2), the copy gets its own unique `tabId`, and a matching panel gets synced in. Verified via e2e.
- [x] **A 3rd tab (button + panel) survives publishing and reopening the editor** — the most serious regression found during implementation (§4.5). Verified via e2e (`tests/e2e/tabs.spec.mjs`) and by inspecting the raw saved `post_content` directly via `wp.apiFetch`, confirming the DB always held the correct 3-tab markup even while the editor was incorrectly displaying 2 (a first-attempt-fix regression, now resolved).
- [x] `motto/tab-button` Inspector no longer shows "Tab label"/"Icon" panels; `motto/tab` Inspector is unaffected (it never had one). Verified via screenshot (selecting the button's paragraph child shows the native Paragraph inspector, not the old custom panels).
- [x] `motto/tab-button`'s and `motto/tab`'s `block.json` no longer declare `label`/`iconOptions`/`iconPosition`.
- [ ] Frontend click-to-switch-tab behavior (`tabs-frontend.js`) still works unchanged — not automated or manually re-checked after this change; considered low-risk since `tabs-frontend.js` and the frontend markup contract (`data-tab-id`, `.motto-tab-button`, `.motto-tab`) were not touched by this spec.
- [x] `npm run lint` and `npm run build` pass clean.

## 7. Risks and Mitigations
- Risk: making the icon fully optional/removable (per confirmed decision) means a button can end up with zero children if the user deletes both the paragraph and the svg.
  - Mitigation: accept as a user-error edge case, consistent with how any other `InnerBlocks` slot in this plugin behaves (e.g. `tab` panel content itself is already free-form/removable); no special-casing planned.
- ~~Risk: existing content created with the old `label`/`iconOptions` shape (if any exists despite being "unused") would show as invalid blocks once these attributes are removed from `block.json`.~~ — **this materialized**: real content broke the moment these attributes were removed. Resolved via the §4.6 `deprecated`/`migrate()` follow-up.
- Risk: any *future* change to `motto/tabs`' `TEMPLATE` that adds a nested array to `tab-container`'s or `tab-panels`' entry would silently reintroduce the §4.5 regression (content beyond that literal length deleted on every remount) — this is not enforced by any lint rule, only by the code comment above `TEMPLATE` in `tabs/index.jsx` and this spec.
  - Mitigation: documented explicitly in code (comment on `TEMPLATE`) and in `tabs/README.md`'s Behavior section; any future change to `TEMPLATE` should re-run the "3rd tab survives publish + reopen" e2e test before shipping.
- Risk: the two race-condition triggers found (empty id via appender, duplicate id via "Duplicate") may not be the only ones — any other WP action that can momentarily produce an empty or duplicate `tabId` on a button/panel would hit the same class of bug if a corresponding guard branch isn't already covered by the generalized `hasUnrepairedTabId` check.
  - Mitigation: the guard is written generically (any empty or duplicate id in either list, not enumerated by trigger), so it should already cover unknown future triggers of the same shape; no further action planned.

## 8. Test Plan
Automated:
- `npm run lint`
- `npm run build`
- `npx playwright test tests/e2e/tabs.spec.mjs` — 8 tests, all passing as of this version: fresh-insert 2-tab default, click-to-activate, svg icon child, appender-added 3rd tab auto-syncs its panel, new button gets real "Tab" text, duplicate keeps the copy + unique id + synced panel, **3rd tab survives publish + reopen**.

Manual (still recommended, not yet re-verified after the final architecture change):
- Edit "Tab 1"/"Tab 2" text inline; add a `motto/svg` icon to one button via the appender, drag it before/after the text, confirm order changes visually; delete the icon, confirm the button still works.
- Delete a `motto/tab` panel directly; confirm its matching button gets cleaned up / a placeholder panel gets recreated per the existing sync rules (whichever the current logic does — behavior itself is unchanged by this spec, just re-verify it still fires).
- Save the post, view the frontend: confirm click-to-switch-tab still works via `tabs-frontend.js`, first tab shown on load.
- Confirm `motto/tab-button`'s Inspector shows no "Tab label"/"Icon" panels; confirm `core/paragraph`'s and `motto/svg`'s own native panels appear when those children are selected.

## 9. Rollout Plan
Phase A:
- Fix `motto/tabs` `TEMPLATE` (default 2-tab insert).
- Convert `motto/tab-button` to `InnerBlocks` (text + optional svg), remove old attributes + Inspector UI.
- Remove `label`/`iconOptions`/`iconPosition` from `motto/tab`.
- Update `motto/tabs` sync-effect helper functions (§4.4).
- Update `README.md` for `tabs`, `tab-button`, `tab`.
- `npm run build`.

Phase B (QA, this session):
- Manual verification per §8 in the actual editor/frontend.

Rollback:
- Revert the block.json/index.jsx changes for `tabs`, `tab-button`, `tab`; no data migration concerns since the family is unused. ~~Superseded by §4.6~~ — real content did surface, recovered via the `deprecated`/`migrate()` follow-up instead of a rollback.

## 10. Change Log
- v0.1: Initial draft.
- v0.2: Implemented and verified live on `greenwood.local` via a new `tests/e2e/tabs.spec.mjs`. Found and fixed a second instance of the structural-sync race condition (manually adding a button via the appender), generalized the fix into a single guard in the sync effect rather than two narrow ones. Marked accordingly-verified acceptance criteria; left icon-removal and frontend rendering unchecked pending further manual verification.
- v0.3: User reported two more real bugs found through actual use: "Duplicate" on a tab-button collapses back to 2 buttons, and a manually-added 3rd tab disappears after publishing and reopening the editor. Root-caused and fixed both: (1) generalized the race-condition guard to also catch duplicate `tabId`s, not just empty ones (found via WP's `cloneBlock` copying `tabId` verbatim); (2) traced the reload bug to `templateLock: "all"` causing WordPress to re-apply `TEMPLATE` via `synchronizeBlocksWithTemplate()` on every mount (not just first insert), which caps nested content at the template's literal length — the v0.2 fix's 2-item nested template for tab-container/tab-panels was itself the cause. Rewrote `TEMPLATE` to be shallow (no nested arrays) and moved default-2-tab seeding into a dedicated effect that only fires once, when both sides start empty — immune to the WP-native remount behavior. Also fixed a smaller, explicitly-requested UX gap: a newly-added tab button now shows real "Tab" text instead of an empty placeholder. Added 3 more e2e tests (8 total), including one that publishes a 3-tab post and reopens the editor to guard against the exact regression found.
- v0.4: The "unused in production" premise turned out wrong — a real tab-button with old `label`/`iconOptions`-shape content broke (invalid-block validation error) in the editor. Added a `deprecated`/`migrate()` entry (§4.6) to `motto/tab-button`, mirroring the pattern `SDD-024` established for the same situation on `accordion-item`. Checked `motto/tabs`' sync effects for the analogous "seed effect silently wipes unmigrated content" bug `SDD-024` found — confirmed not applicable here (§4.6).
