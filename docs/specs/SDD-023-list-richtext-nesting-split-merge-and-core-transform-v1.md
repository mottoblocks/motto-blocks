# Feature Spec: SDD-023
Version: 0.3
Status: Proposed
Owner: Blocks
Last Updated: 2026-08-03

## 1. Goal
Bring `motto/list`/`motto/list-item` up to feature parity with `core/list`/`core/list-item` on three foundational points — `content` as a `rich-text` attribute, nested sub-lists via real `InnerBlocks`, and Enter/Backspace item split/merge — then add a `transforms.from` on `motto/list` so a `core/list` can be converted to `motto/list` from the block toolbar. The block family is confirmed in use on only 2 sites (per user confirmation), so all attribute-shape changes ship as a clean break with no `deprecated` entry, matching the precedent set in `SDD-022`.

## 2. Scope
In scope:
- `motto/list-item`'s `content` attribute: `type: "string"`/`source: "html"` → `type: "rich-text"`/`source: "rich-text"`, matching `core/list-item`'s own contract.
- `motto/list-item` gains a real `InnerBlocks` slot (`allowedBlocks: ["motto/list"]`) so a `motto/list` can be nested inside an item as a sub-list, matching `core/list-item`'s `allowedBlocks: ["core/list"]`.
- `motto/list-item`'s `edit()` wires `onSplit`/`onReplace`/`onMerge`/`onRemove` on its `RichText` so Enter creates a new sibling item and Backspace at the start of an item merges it into the previous one — the standard WP block-splitting contract, currently entirely absent from this block.
- A new `transforms.from` entry on `motto/list` (`blocks: ["core/list"]`) that maps `ordered`/`start` → `bulletOptions` (`counter`/`default`) and recursively converts each `core/list-item` (content + any nested `core/list`) into a `motto/list-item`, reusing the nesting support added above.
- A matching `transforms.to` entry (`blocks: ["core/list"]`) for the reverse direction — converting `motto/list` back to `core/list` — added mid-implementation per explicit request. Lossy for any `bulletOptions.type` other than `default`/`counter` (image/icon/svg/none bullets have no `core/list` equivalent and fall back to a plain unordered list).
- `block.json`/`README.md` updates for `list` and `list-item` reflecting the new contract.
- `npm run build` to refresh tracked build artifacts.

Out of scope:
- Tab/Shift+Tab keyboard indent-to-nest UX (what `core/list-item` uses to create a sub-list by pressing Tab). Nesting is reachable via the block inserter/appender inside an item once the `InnerBlocks` slot exists; the keyboard shortcut is a separate, larger feature deferred to a follow-up.
- `reversed` and the legacy `type` (HTML `1`/`a`/`A`/`i`/`I`) attributes on `core/list` — `reversed` has no `bulletOptions` equivalent and is dropped silently; `type` is rarely populated by the current Gutenberg UI (the dropdown that used to set it was removed) and, when present, is not mapped in v1.
- A `deprecated` entry for the `content` attribute-shape change — confirmed low-usage (2 sites) per user; and, independently, changing `source: "html"` → `source: "rich-text"` on the same selector does not change what `save()` serializes (both paths render through `RichText.Content value={content}`), so this is expected to be a non-event for existing saved content. Verified empirically per §9 before shipping past local testing.

## 3. Current Behavior (pre-SDD-023)
- `src/blocks/list-item/block.json` declares `content` as:
  ```json
  "content": {
    "type": "string",
    "source": "html",
    "selector": ".motto-list-item__text"
  }
  ```
  `edit()`/`save()` (`src/blocks/list-item/index.jsx`) render it via a single `<RichText tagName="span" value={content} onChange={...} />` — a plain string round-trip.
- `motto/list-item`'s `edit()` has no `InnerBlocks`/`useInnerBlocksProps` at all — the return value is `<li>` containing only the bullet `<span>` and the `RichText`. There is no structural way to nest anything inside an item today; this isn't a permissive-but-unused case, the slot doesn't exist.
- `motto/list-item`'s `edit()` signature is `({ attributes, setAttributes, context = {} })` — it does not destructure `onReplace`, `mergeBlocks`, `onRemove`, or `clientId`, and its `<RichText>` has no `onSplit`/`onReplace`/`onMerge`/`onRemove` props. Pressing Enter inside an item's text does not create a new item (Enter is not wired to any block-splitting behavior); Backspace at the start of an item's text does not merge into the previous item.
- `motto/list` (`src/blocks/list/index.jsx`) declares no `transforms` at all, so `core/list` cannot be converted to it from the block toolbar's "Transform to" control. `motto/container` (`src/blocks/container/index.jsx:251-279`) is the existing in-repo precedent for how `transforms.from` is wired for a block-to-block conversion.
- `motto/list-item.bulletOptions` (`normalizeBulletOptions`, `src/components/controls/bullets/bullet-options.js`) supports `type: "default" | "image" | "icon" | "svg" | "counter" | "none"`, with `counter.style` in `decimal | decimal-leading-zero | lower-alpha | upper-alpha | lower-roman | upper-roman`. `"default"` renders a plain round dot (`list.scss:55-61`), a close visual match for `core/list`'s native unordered marker; `counter.style` values already cover the full vocabulary of the legacy HTML `type` attribute (`1`/`a`/`A`/`i`/`I`) core `<ol>` used historically.
- `core/list` (`wp-includes/blocks/list/block.json`) attributes: `ordered` (boolean), `values` (deprecated pre-list-item legacy HTML), `type` (string, rarely populated by current Gutenberg UI), `start` (number), `reversed` (boolean).
- `core/list-item` (`wp-includes/blocks/list-item/block.json`) attributes: `content` (`type: "rich-text"`, `source: "rich-text"`, `selector: "li"`), `placeholder` (string). `allowedBlocks: ["core/list"]` — a `core/list-item` may already contain a nested `core/list` as a real, structurally-supported sub-list.

## 4. Target Behavior

### 4.1 `content` as `rich-text`
- `list-item/block.json`:
  ```json
  "content": {
    "type": "rich-text",
    "source": "rich-text",
    "selector": ".motto-list-item__text",
    "role": "content"
  }
  ```
- No `edit()`/`save()` code changes required — `<RichText value={content} onChange={(value) => setAttributes({ content: value })} />` and `<RichText.Content value={content} />` already accept/emit a `RichTextData` transparently regardless of the attribute's declared `type`.
- `role: "content"` is added to match `core/list-item`'s own contract (relevant to future block-bindings/content-locking compatibility); no functional dependency on it in this spec.

### 4.2 Nested sub-lists via `InnerBlocks`
- `list-item/block.json`: add `"allowedBlocks": ["motto/list"]` at the top level (mirrors `core/list-item`'s own `block.json`; `useInnerBlocksProps`/`InnerBlocks` without an explicit `allowedBlocks` prop falls back to `getBlockType(name).allowedBlocks`).
- `edit()`: add `useInnerBlocksProps` on (or as a sibling slot inside) the `<li>`, with `allowedBlocks: ["motto/list"]`, `template: []` (no forced default — a sub-list only appears if the user inserts one via the appender), rendered **after** the `RichText` span, matching `core/list-item`'s DOM order (`<li>text<ul>…</ul></li>`).
- `save()`: mirror with `useInnerBlocksProps.save()` / `InnerBlocks.Content` in the same position.
- `motto/list`'s existing `providesContext: { "motto/bulletOptions": "bulletOptions" }` already scopes correctly to a nested `motto/list` — a sub-list configures its own `bulletOptions` independently of its parent, the same way `core/list` nesting resets marker style per level.
- CSS counters: `list.scss`'s `counter-reset: motto-list-item 0` is declared on `.motto-list` itself, so a nested `.motto-list` gets its own counter scope per standard CSS counter nesting semantics — expected to work with no CSS changes, **to be verified empirically** (§9) since it has never been exercised with real nested markup before.

### 4.3 Enter/Backspace split and merge
- `list-item/block.json`: `supports.splitting: true` added, matching `core/list-item`'s own declaration.
- `list-item/index.jsx` `edit()` signature gains `onReplace`, `mergeBlocks`, `onRemove`, `clientId`.
- `<RichText>` gains `identifier="content"` (required — see the merge risk below) plus:
  ```js
  onSplit={(value, isOriginal) => {
    const block = createBlock("motto/list-item", { content: value });
    if (isOriginal) block.clientId = clientId;
    return block;
  }}
  onReplace={onReplace}
  onMerge={mergeBlocks}
  onRemove={onRemove}
  ```
  — the standard `core/paragraph`-style split/merge contract; no custom logic beyond it. A newly split-off item gets `content` only, so `overrideBullet`/`bulletOptions` fall back to `block.json`'s own defaults (non-override, inherits parent list's `bulletOptions` via context) — consistent with how `TEMPLATE`-seeded items already behave in `motto/list`.
- **Two requirements beyond the `RichText` props, found empirically during implementation (not obvious from WP's own docs) — Backspace-merge silently did nothing without both**:
  1. `<RichText identifier="content" ...>` — without it, WP logs `"The RichText identifier prop does not match any attributes defined by the block."` and can't resolve which attribute holds the selection for cursor restoration across the merge.
  2. A top-level `merge(attributes, attributesToMerge)` function on the block registration itself (sibling to `edit`/`save`, **not** a `RichText` prop):
     ```js
     merge(attributes, attributesToMerge) {
       return {
         ...attributes,
         content: `${attributes.content ?? ""}${attributesToMerge.content ?? ""}`,
       };
     }
     ```
     Confirmed by reading WP core's own `mergeBlocks` action (`wp-includes/js/dist/block-editor.js`): `if (!blockAType.merge) { ...dispatch.selectBlock(blockA.clientId); return; }` — without a registered `merge` function, `mergeBlocks()` (and therefore `onMerge`/Backspace-at-start) is a **complete no-op** on the block-editor store (just reselects the previous block), regardless of what the `RichText`'s own `onMerge` callback does. `core/list-item` itself defines the identical `merge()` shape (`content: attributes.content + attributesToMerge.content`, confirmed in `wp-includes/js/dist/block-library.js`).
- Interaction with §4.2's nested `InnerBlocks`: `onSplit` only ever fires from the text `RichText`, so a split at the end of an item that already has a nested sub-list leaves the sub-list attached to the original (now-first) item, with the new empty item inserted as the next sibling **after** it in the parent list — confirmed via `npx playwright test tests/e2e/list.spec.mjs` (§9).

### 4.4 `transforms.from`/`transforms.to` on `motto/list`
- `list/index.jsx`, added to the `registerBlockType(metadata.name, { ... })` call, following the `container`-block precedent (`src/blocks/container/index.jsx:251-279`):
  ```js
  function transformCoreListItem(item) {
    const content = String(item.attributes.content ?? "");
    const nestedList = item.innerBlocks?.find((child) => child.name === "core/list");
    const innerBlocks = nestedList ? [transformCoreList(nestedList)] : [];
    return createBlock("motto/list-item", { content }, innerBlocks);
  }

  function transformCoreList(block) {
    const { ordered, start } = block.attributes;
    const bulletOptions = normalizeBulletOptions(
      ordered
        ? { type: "counter", counter: { style: "decimal", start: start || 1 } }
        : { type: "default" }
    );
    return createBlock(
      "motto/list",
      { bulletOptions },
      (block.innerBlocks || []).map(transformCoreListItem)
    );
  }

  function transformMottoListItemToCore(item) {
    const content = String(item.attributes.content ?? "");
    const nestedMottoList = item.innerBlocks?.find((child) => child.name === "motto/list");
    const innerBlocks = nestedMottoList ? [transformMottoListToCore(nestedMottoList)] : [];
    return createBlock("core/list-item", { content }, innerBlocks);
  }

  function transformMottoListToCore(block) {
    const bulletOptions = normalizeBulletOptions(block.attributes.bulletOptions);
    const isOrdered = bulletOptions.type === "counter";
    const attrs = isOrdered
      ? { ordered: true, start: bulletOptions.counter.start }
      : { ordered: false };
    return createBlock(
      "core/list",
      attrs,
      (block.innerBlocks || []).map(transformMottoListItemToCore)
    );
  }

  // ...
  transforms: {
    from: [
      {
        type: "block",
        blocks: ["core/list"],
        transform: (attributes, innerBlocks = []) =>
          transformCoreList({ attributes, innerBlocks }),
      },
    ],
    to: [
      {
        type: "block",
        blocks: ["core/list"],
        transform: (attributes, innerBlocks = []) =>
          transformMottoListToCore({ attributes, innerBlocks }),
      },
    ],
  },
  ```
- `String(item.attributes.content ?? "")` relies on `RichTextData.prototype.toString()` returning the HTML string — confirmed by the `@wordpress/rich-text` contract; **to be verified empirically** (§9) that formatting (bold/links/etc.) survives the round trip in both directions unchanged.
- Recursion through `transformCoreList`/`transformCoreListItem` and their `transformMottoList*ToCore` mirrors is what lets a nested sub-list survive the conversion in either direction — this only works because §4.2 ships first in the same spec.
- `transforms.to`'s bullet mapping is intentionally simpler than `from`'s: only `bulletOptions.type === "counter"` maps to `ordered: true`; every other type (`default`, `image`, `icon`, `svg`, `none`) collapses to `ordered: false`, since `core/list` has no marker system beyond ordered/unordered. This is a deliberate, accepted lossy conversion for non-default/non-counter bullet types.

## 5. Data Contract
- Inputs: `motto/list-item.content` changes representation (string → `RichTextData`) but not meaning; no new attributes added. `motto/list-item` gains an `InnerBlocks` area (`allowedBlocks: ["motto/list"]`), no new attribute backs it (children are just child blocks, same as `motto/list`'s own item children).
- Persistence: `content` continues to serialize as the same inner HTML on `.motto-list-item__text` (§4.1); a nested `motto/list` serializes as ordinary nested block markup inside the `<li>`, after the text span.
- Outputs:
  - Editor: Enter inside an item's text creates a new sibling item with focus moved to it; Backspace at the start of an item's text merges it into the previous item; an item's appender allows inserting a nested `motto/list` sub-list.
  - Toolbar: a selected `core/list` shows "Motto List" as a transform target; converting produces a `motto/list` with matching bullet numbering/style and one `motto/list-item` per original item, preserving nested sub-lists. A selected `motto/list` shows "List" (core) as a transform target; converting produces a `core/list` with `ordered` derived from `bulletOptions.type === "counter"`, losing any non-default/non-counter bullet styling.

## 6. Acceptance Criteria
- [ ] Existing `motto/list`/`motto/list-item` content on both live sites opens in the editor with no "invalid block"/"attempt recovery" warning after the `content` attribute-shape change (§4.1). Not yet checked against the 2 real sites' actual saved content — only fresh-inserted content was exercised by `tests/e2e/list.spec.mjs`.
- [ ] Typing/formatting (bold, links, italics) inside a list item's text still works identically after the `rich-text` migration. Not covered by `tests/e2e/list.spec.mjs` (all test content is plain text); manual spot-check still pending.
- [x] A `motto/list` block can have a `motto/list` inserted inside one of its items via the block appender; the nested list renders correctly nested in the editor. Verified via `tests/e2e/list.spec.mjs` ("a nested Motto List can be inserted inside an item"). Frontend rendering and independent bullet/counter configuration across nesting levels not yet checked.
- [x] Pressing Enter at the end of a list item's text creates a new sibling item below it with focus in the new item. Verified via e2e ("Enter creates a new sibling item...").
- [x] Pressing Backspace at the very start of a (non-first) item's text merges its content into the end of the previous item and removes the now-empty item. Verified via e2e — this initially failed until two additional requirements were found and fixed (§4.3, §7): a top-level `merge()` function on the block registration, and `identifier="content"` on the `RichText`.
- [x] Selecting a `core/list` block in the editor shows "Motto List" in the block-transform toolbar; converting an unordered list produces a `motto/list` with `bulletOptions.type: "default"` and one item per original `<li>`, preserving text. Verified via e2e ("a core List can be converted to Motto List (unordered)").
- [x] Converting an ordered `core/list` produces a `motto/list` with `bulletOptions.type: "counter"`, `counter.style: "decimal"`. Verified via e2e ("an ordered core List converts to Motto List with a counter bullet"); the `counter.start` value itself (vs. just the type/style) wasn't separately asserted.
- [ ] Converting a `core/list` containing a nested `core/list` inside one item preserves that nesting as a `motto/list` nested inside the corresponding `motto/list-item`. Not covered by `tests/e2e/list.spec.mjs` — same recursion path as the covered from-transform tests, but not independently exercised.
- [x] Selecting a `motto/list` shows "List" in the block-transform toolbar; converting produces a `core/list` with matching item count. Verified via e2e ("a Motto List can be converted back to core List"), using the block's default (non-`counter`) bullet type.
- [ ] Converting a `motto/list` with `bulletOptions.type: "counter"` produces an ordered `core/list` with `start` matching `counter.start`. Not covered by `tests/e2e/list.spec.mjs`.
- [ ] Converting a `motto/list` with a non-default/non-counter bullet type (e.g. `icon`) produces an unordered `core/list` (accepted lossy fallback, not a bug). Not covered by `tests/e2e/list.spec.mjs`.
- [ ] Converting a `motto/list` containing a nested `motto/list` inside one item preserves that nesting as a `core/list` nested inside the corresponding `core/list-item`. Not covered by `tests/e2e/list.spec.mjs`.
- [x] `npm run lint` and `npm run build` pass clean.

## 7. Risks and Mitigations
- Risk: `source: "html"` → `source: "rich-text"` turns out to change `save()`'s serialized output in some edge case (e.g. whitespace/entity normalization differences), invalidating the 2 sites' existing content.
  - Mitigation: verify empirically first (§9) on both real sites before considering this done; if it does invalidate, add a `deprecated` entry reproducing the old `source: "html"` shape before shipping further, rather than accepting silent breakage.
- Risk: nested-list CSS counters (§4.2) don't scope as cleanly as assumed once real nested markup exists (e.g. `--bullet-size`/`--bullet-color` custom properties inherited from the parent `.motto-list` bleeding into a nested list that didn't explicitly override them).
  - Mitigation: manual visual check with a nested sub-list using a different bullet type/counter style than its parent (§9); fix in `list.scss` if custom-property bleed is found — not expected to require attribute-level changes.
- Risk (found, fixed): Backspace-merge silently did nothing on first implementation — `RichText`'s `onMerge={mergeBlocks}` alone is insufficient.
  - Root cause (confirmed by reading WP core's compiled source): WP's `mergeBlocks` store action requires a top-level `merge(attributes, attributesToMerge)` function registered on the block type; without it, the action just reselects the previous block and returns, regardless of the `RichText` wiring. A missing `identifier="content"` on the `RichText` compounded this with a console error blocking selection restoration.
  - Fix: added both (§4.3); re-verified via a standalone diagnostic script and then `tests/e2e/list.spec.mjs` — merge now correctly concatenates content and removes the empty item.
- Risk: `wp.blockEditor.RichText`'s `onSplit` prop logs a deprecation warning ("Please use block.json support key: 'splitting' instead") even after adding `supports.splitting: true` to `list-item/block.json` (§4.3) — the warning persists because `supports.splitting` doesn't replace the need for the manual `onSplit`/`onReplace` wiring in this WP version; it's declared anyway since `core/list-item` declares the identical flag.
  - Mitigation: accepted — functionally confirmed working via e2e despite the console warning; revisit if a future WP version removes the deprecated `onSplit` prop entirely.
- Risk: Enter-split interaction with an item that already has a nested sub-list (§4.3) produces a surprising result (e.g. new empty item landing inside the sub-list instead of after the parent item).
  - Resolved: confirmed via e2e (`tests/e2e/list.spec.mjs`) that the new item lands as the next sibling after the item with the sub-list, not inside it — matches the expected default.
- Risk: `String(RichTextData)` in the transform (§4.4) doesn't round-trip all formatting (e.g. custom format types registered elsewhere in the plugin) faithfully.
  - Mitigation: verified for plain text via e2e; bold/italic/link formatting round-trip not yet independently tested. Fall back to `item.attributes.content?.toHTMLString?.() ?? String(item.attributes.content ?? "")` if `String()` alone proves insufficient.
- Risk: no Tab/Shift+Tab indent shortcut (explicitly out of scope, §2) means nesting is reachable only via the appender — a real UX gap versus `core/list-item`, not a bug.
  - Mitigation: accepted for v1; documented in `list-item/README.md` as a known limitation, revisit as a follow-up spec if requested.
- Risk: `transforms.to`'s bullet collapse (§4.4) silently discards image/icon/svg/none bullet styling when converting to `core/list`, which could surprise a user expecting a lossless round trip after just having converted the other way.
  - Mitigation: accepted, documented in `list/README.md`'s Transforms section; no confirmation dialog planned (matches WP's own no-confirmation convention for other lossy block transforms).

## 8. Test Plan
Automated:
- `npm run lint`
- `npm run build`
- `npx playwright test tests/e2e/list.spec.mjs` — 7 tests against `greenwood.local`, all passing as of this version: fresh-insert 3-item default, Enter-split + Backspace-merge, nested Motto List via the item appender, unordered `core/list` → `motto/list`, ordered `core/list` → `motto/list` (counter bullet), `motto/list` → `core/list` (reverse). Two real bugs were caught and fixed only because this suite exists (see §7): the missing `merge()` function and the missing `identifier="content"`, both of which "looked done" from code review alone (correct-looking `onMerge={mergeBlocks}`) but silently no-opped at runtime.
- Not covered by the suite (gaps carried into §6): formatting round-trip (bold/italic/links) through the `rich-text` migration and through the transforms; nested-`core/list`-to-`motto/list` and nested-`motto/list`-to-`core/list` transform preservation; `counter.start` value fidelity in either transform direction; the two live sites' actual existing content.

Manual (remaining gaps not covered by the automated suite above):
- Open each of the 2 live sites' existing `motto/list` content in the editor after the `content` attribute-shape change; confirm no invalid-block warning.
- Add bold/italic/link formatting to a list item's text; confirm it round-trips through save/reload unchanged, and through both transform directions.
- Set a different bullet type/counter style on a nested `motto/list` than its parent; confirm both render correctly (editor + frontend) with independent, non-colliding counters (the e2e suite only checks structural nesting, not visual/counter independence).
- Insert a `core/list` with a nested `core/list` inside one item; convert; confirm the nested list survives as a nested `motto/list` (and the reverse direction).
- Select a `motto/list` with `bulletOptions.type: "counter"` and a custom `counter.start`; convert to `core/list`; confirm `ordered: true` and `start` match.
- Select a `motto/list` with an `icon`/`image`/`svg` bullet; convert; confirm it falls back to a plain unordered `core/list` (expected lossy behavior, §7).

## 9. Rollout Plan
Phase A:
- `list-item/block.json`: `content` → `rich-text` (§4.1), add `allowedBlocks: ["motto/list"]` (§4.2).
- `list-item/index.jsx`: wire `InnerBlocks` slot (§4.2), `identifier="content"` + `onSplit`/`onReplace`/`onMerge`/`onRemove` (§4.3), and the top-level `merge()` function (§4.3/§7).
- `list/index.jsx`: add `transforms.from`/`transforms.to` (§4.4).
- Update `list/README.md` and `list-item/README.md` for the new contract.
- `npm run build`.

Phase B (done, this session):
- `tests/e2e/list.spec.mjs` written and run against `greenwood.local` — all 7 tests passing (§8).

Phase C (remaining):
- Manual pass on both live sites' existing content, plus the formatting/nested-transform/`counter.start` gaps listed in §8.

Rollback:
- Revert the `block.json`/`index.jsx` changes for `list` and `list-item`; no data-migration concerns expected given the confirmed low usage, pending the §8 empirical check.

## 10. Change Log
- v0.1: Initial draft, combining the 3 foundational list-item changes (rich-text, nesting, split/merge) and the `core/list` transform into a single spec per explicit request, rather than splitting the transform into a dependent follow-up spec.
- v0.2: Added a `transforms.to` mirror (`motto/list` → `core/list`) per explicit request, made mid-implementation. Deliberately lossy for non-default/non-counter bullet types (image/icon/svg/none), since `core/list` has no equivalent marker system — accepted, documented in `list/README.md` and §7.
- v0.3: Implemented and verified via a new `tests/e2e/list.spec.mjs` (7 tests, all passing) against `greenwood.local`. Found and fixed a real bug the code-review-only version of this spec missed: Backspace-merge silently no-opped because `RichText`'s `onMerge={mergeBlocks}` alone isn't sufficient — WP's `mergeBlocks` store action requires a top-level `merge()` function on the block registration (confirmed by reading WP core's compiled source; `core/list-item` itself defines the identical shape), and a missing `identifier="content"` on the `RichText` compounded it with a console error. Both fixed (§4.3, §7). Also added `supports.splitting: true` to `list-item/block.json` (matches `core/list-item`, doesn't remove the still-present `onSplit` deprecation warning but is otherwise harmless). Confirmed via e2e that Enter-split next to an existing nested sub-list lands the new item as the next sibling, not inside the sub-list (previously an open question in §7/§8). Acceptance criteria (§6) updated to reflect exactly what the automated suite does and doesn't cover — nested-list transform preservation, `counter.start` fidelity, formatting round-trip, and the 2 live sites' real content remain manual/unverified gaps.
