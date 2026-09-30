# Feature Spec: SDD-025
Version: 0.7
Status: Proposed
Owner: Blocks
Last Updated: 2026-08-04

## 1. Goal
Make `motto/image` support native Gutenberg Pattern Overrides — the same "Enable overrides" / edit-in-place capability `core/image` already has — so a pattern containing a `motto/image` can have its picture replaced per-instance without detaching the pattern.

## 2. Scope
In scope:
- Flatten the static image source out of the single nested `image` object attribute into top-level `block.json` attributes, mirroring `core/image`'s shape (`wp-includes/blocks/image/block.json`):
  - `mediaId` (number, `role: "content"`, no `source` — block-comment persisted, same as core's `id`).
  - `url` (string, `source: "attribute"`, `selector: ".motto-image__media"`, `attribute: "src"`, `role: "content"`).
  - `alt` (string, `source: "attribute"`, `selector: ".motto-image__media"`, `attribute: "alt"`, default `""`, `role: "content"`).
  - `title` (string, `source: "attribute"`, `selector: ".motto-image__media"`, `attribute: "title"`, `role: "content"`).
  - `width`, `height`, `sizeSlug`, `sizes` stay as plain (no `source`, no `role`) block-level attributes — same treatment core gives its own `width`/`height`/`sizeSlug`.
- `objectPosition` is unaffected (already top-level, non-content — same status as core's `focalPoint`).
- A `deprecated` entry + `migrate()` in `image/index.jsx` converting existing saved content (nested `image` object) into the new flat attributes, so pre-existing posts/patterns load without a validation/recovery notice.
- Updating `edit()`/`save()` read/write sites (`handlePlaceholderSelect`, `staticImageSection`'s `onChange`, `getImageDimensionsAttributes`, `canvasContent`, `save()`) to the new flat attributes. `<img>` markup output (class, `src`, `alt`, `title`, `style`, dimensions) stays byte-identical to today.
- `mottoAI.description` in `block.json` and `image/README.md`'s attributes-contract section updated to describe the new shape.

Out of scope:
- Any change to `motto/container`'s background/image attribute shape (different block, not requested).
- Making `objectPosition`, `imageParallax`, `imageDynamic`, or any Pro field overridable — v1 only covers the same fields `core/image` exposes (`url`/`alt`/`title`/`id`).
- Building custom override UI. Gutenberg's "Enable overrides" entry point and edit-in-place UX are native chrome that activates automatically once a block type has `role: "content"` attributes — nothing to build here beyond the attribute schema.
- `motto/list-item`'s bullet `image` field or any other block's use of `ImageSourceControl`/`ImageSourcePositionControl` — precedent only, not touched.

## 3. Current Behavior
`motto/image` (`src/blocks/image/block.json`) is a static block (no `render.php`) storing the entire image selection in one `image` attribute of `type: "object"` with no `source`, so it's serialized as JSON inside the block comment rather than derived from the saved markup. `edit()`/`save()` in `image/index.jsx` read/write this object wholesale via `normalizeMediaSelection()`/`normalizeImageSourcePositionValue()` and render a single `<img className="motto-image__media" src alt title style {...dimensions} />`.

`core/image` (`wp-includes/blocks/image/block.json`), by contrast, exposes `url`, `alt`, `title` as top-level attributes with `source: "attribute"` (derived straight from the saved `<img>` markup) and `id` as a top-level (comment-persisted) attribute — each marked `role: "content"`. That `role: "content"` marking on flat, addressable attributes is the actual mechanism Pattern Overrides binds to; it's what's missing from `motto/image` today. (Precedent for `role: "content"` already exists in this repo on `motto/list-item`'s `content` rich-text attribute, `src/blocks/list-item/block.json:14-19` — just never applied to an image field.)

## 4. Target Behavior

### 4.1 Attribute schema (`image/block.json`)
Replace the single `image` object attribute with the flat set described in §2, keeping `mottoStyler`, `objectPosition`, `imageDynamic`, `imageParallax`, `imageParallaxOffset` unchanged.

### 4.2 Deprecation / migration
Add a `deprecated` array entry reproducing the *current* attribute definitions (nested `image` object) and current `save()` output, with a `migrate(attributes)` that:
- Reads `attributes.image.{id,url,alt,title,width,height,sizeSlug,sizes}`.
- Returns the new flat attribute set (`mediaId`, `url`, `alt`, `title`, `width`, `height`, `sizeSlug`, `sizes`), dropping the old `image` key.
No markup-shape change is needed in the deprecated `save()` — the `<img>` tag already contains `src`/`alt`/`title` today, so those three fields are actually re-parseable straight from existing saved HTML; `migrate()` exists primarily to recover `mediaId`/`width`/`height`/`sizeSlug`/`sizes`, which only ever lived in the block comment.

### 4.3 Read/write call sites (`image/index.jsx`)
- `handlePlaceholderSelect` and the `ImageSourcePositionControl`'s `onChange` currently call `setAttributes({ image: {...} })` — change to `setAttributes({ mediaId, url, alt, title, width, height, sizeSlug, sizes })` (flat).
- Since `ImageSourcePositionControl`/`normalizeMediaSelection` (`src/components/controls/image/ImageSourceControl.jsx`) operate on a single `image`-shaped value and are shared beyond this block, `image/index.jsx` keeps a small local adapter: assemble a synthetic `{ id: mediaId, url, alt, title, width, height, sizeSlug, sizes, position: objectPosition }` object to pass in as `value`, and destructure the control's `onChange` payload back into the flat `setAttributes(...)` call. The shared component's own contract is not changed.
- `getImageDimensionsAttributes(image)` takes the same adapter object, no signature change needed.
- `save()` mirrors the same flattening for its own local `image` shape before rendering `<img>`.

### 4.4 Dynamic mode interaction
When `imageDynamic` resolves a source (`isDynamicEnabled`), there is no static markup value to bind — `url` stays empty and `hasSource` is driven by `hasImageSource({ url, dynamic })` as today. No attribute-schema change is needed for this case; whether Gutenberg's native override UI should be suppressed for dynamic-only instances is called out as an open question in Risks, to resolve during implementation rather than block this spec.

## 5. Data Contract
- Inputs: `MediaPlaceholder`/`MediaUpload` selection (via `normalizeMediaSelection`), unchanged.
- Persistence:
  - `mediaId: number` (default `0`), `role: "content"`, block-comment persisted.
  - `url: string` (default `""`), `alt: string` (default `""`), `title: string` (default `""`) — all `source: "attribute"` off `.motto-image__media`, `role: "content"`.
  - `width`, `height` — plain, no `source`, unchanged semantics from today's `image.width`/`image.height`.
  - `sizeSlug: string`, `sizes: array` — plain, no `source`, unchanged semantics.
  - `objectPosition` — unchanged, unaffected.
  - `deprecated[0]` — old nested `image` object shape + `migrate()` per §4.2.
- Outputs: `<div class="motto-image ..."><img class="motto-image__media" src alt title style width height /></div>` — identical DOM shape to today for any non-dynamic image. Gutenberg's native "Enable overrides" option becomes available on the block once at least one `role: "content"` attribute exists (verified mechanism against `wp-includes/blocks/image/block.json`'s `url`/`alt`/`title`/`id`).

## 6. Acceptance Criteria
- [ ] Fresh insert: selecting/replacing/removing an image via the Inspector works identically to pre-change behavior (no UX regression in `ImageSourcePositionControl`) — code-complete, needs manual click-through.
- [ ] A real pre-change post/pattern containing `motto/image` (nested `image` object markup) loads with no "block contains unexpected or invalid content" / recovery notice; Inspector fields (alt, title, size selector) reflect the original values after migration — `deprecated`/`migrate()` implemented, needs manual verification against a real pre-change fixture.
- [x] A pattern containing a static (non-dynamic) `motto/image` shows "Enable overrides" in the block's Options menu; enabling it and inserting the pattern into a post allows replacing that instance's image in place, without detaching from the pattern — verified side-by-side against `core/image` in the same pattern (v0.3's `block_bindings_supported_attributes_motto/image` filter). The `group="content"` Inspector panel (v0.5) now also lets the override be edited from the instance's own sidebar, at parity with `core/image`.
- [x] Frontend and editor `<img>` markup (`src`/`alt`/`title`/`width`/`height`/`style`/class) is byte-identical to pre-change output for any non-dynamic image — `save()` renders from the same flat fields, markup shape unchanged.
- [x] Pro dynamic-mode (`imageDynamic`) behavior is unaffected; no broken/misleading override affordance appears for a dynamic-only image with no static `url` — the override toggle still appears (can't be conditionally suppressed, §7), but a `motto-section-help` note now explains it's a no-op while dynamic mode is active.
- [x] `npm run lint` and `node scripts/validate-import-boundaries.mjs` pass with no new cross-boundary imports.
- [x] `image/README.md`'s attributes-contract section is updated to describe the flat attributes, `role: "content"`, and Pattern Overrides support.

## 7. Risks and Mitigations
- Risk: `migrate()` mismatch silently drops `mediaId`/`width`/`height`/`sizeSlug`/`sizes` for pre-existing content, since only `url`/`alt`/`title` are markup-derivable — the image could still render but with `mediaId: 0`, breaking the Inspector's size-slug switcher on reopen.
  - Mitigation: explicit `deprecated` entry + `migrate()` reading the old comment-persisted `image` object directly (still recoverable at migration time, since WP passes the old attributes into `migrate()` before re-parsing); add a manual/e2e check that specifically reopens a pre-change fixture and exercises the size-slug switcher.
- Risk: Gutenberg's native override UI may not distinguish `motto/image`'s dynamic mode from its static mode, potentially surfacing an "edit image" affordance on a dynamic-only instance that does nothing useful.
  - Resolved (v0.4): confirmed — the "Enable overrides" toggle is injected purely by block-type eligibility (see the new risk below); it can't be conditionally hidden per instance from a third-party block, and `core/image`'s one hardcoded exception (linked images) isn't reusable elsewhere. If dynamic mode resolves a source, `render_block_motto/image` (`includes/image-render.php`) always overwrites the override's markup — so an enabled override on a dynamic instance is inert on the frontend, not broken, just a no-op. Accepted for v1 via the fallback option this risk already named: `staticImageSection` (`image/index.jsx`) now shows a `motto-section-help` note instead of nothing when `imageDynamic` is active, explaining that overrides won't take effect.
- Risk (found during implementation, not anticipated at v0.1): `role: "content"` in `block.json` is necessary but not sufficient in this WP version. WP core (since 6.9.0) hardcodes an eligible-block-types allowlist in `get_block_bindings_supported_attributes()` (`wp-includes/block-bindings.php`), gating both the "Enable overrides" control and render-time binding resolution — without it the `role: "content"` schema alone is inert.
  - Mitigation (v0.3): `includes/image-render.php` hooks the `block_bindings_supported_attributes_motto/image` filter — core's own extension point for this — adding `mediaId`/`url`/`alt`/`title` to the allowlist. Documented as a reusable recipe in `docs/conventions/block-layout.md`'s "Native Pattern Overrides" section for other blocks that want this later.
- Risk (found during implementation): even with the allowlist fixed, the block's own Inspector panel doesn't appear while editing the block as a synced-pattern instance — Gutenberg's "content only" editing mode hides every Inspector tab except one registered via `<InspectorControls group="content">`, and `motto/image`'s panel today uses the default/ungrouped `InspectorControls`.
  - Resolved (v0.5): `edit()` now renders `staticImageSection` (image source/alt/title/position) in its own `<InspectorControls group="content">`, and `imageDynamic`/`imageParallax*` (not overridable, belong to the pattern's shared definition) in a separate default-group `InspectorControls`. Mirrors `core/image`'s split between its "Media" (content group) and "Dimensions"/other (non-content groups) panels.
- Risk: `ImageSourcePositionControl`/`normalizeMediaSelection` are shared beyond this block; changing their contract to match `motto/image`'s new flat shape would ripple into other consumers unnecessarily.
  - Mitigation: per CONVENTIONS "surgical changes," keep the flattening local to `image/index.jsx` via an adapter object (§4.3); confirm no other consumer needs touching before implementation.

## 8. Test Plan
Automated:
- `npm run lint`
- `node scripts/validate-import-boundaries.mjs`
- New `tests/e2e/image.spec.mjs` (doesn't exist yet): insert + select image, save/reload roundtrip on a fresh post; load a fixture built from the pre-change (nested `image` object) markup and confirm no validation error plus correct field values post-migration.

Manual:
- Build a pattern containing a static `motto/image`; confirm "Enable overrides" appears and behaves like `core/image` in the same pattern (edit-in-place replace, no detach, per-instance override persists correctly).
- Open a real pre-existing post/pattern authored before this change; confirm no recovery notice and correct Inspector field values.
- Enable Pro dynamic mode on an image block inside a pattern; confirm no broken override affordance.

## 9. Rollout Plan
Phase A:
- Flatten `image/block.json` attributes per §4.1.
- Add `deprecated` entry + `migrate()` per §4.2.
- Update `edit()`/`save()`/`handlePlaceholderSelect`/adapter code in `image/index.jsx` per §4.3.
- Update `mottoAI.description` and `image/README.md`.

Phase B:
- Verify Pattern Overrides end-to-end in a real pattern (Acceptance Criteria); resolve the dynamic-mode open question from Risks.
- Decide whether this warrants a `config/features.json` entry (likely not — this reads as parity/bugfix-shaped rather than a discrete togglable feature, but confirm during Phase A).

Rollback:
- Revert `block.json`/`index.jsx` changes. Since target `save()` DOM output is unchanged in shape from today's, rollback carries no further deprecation burden — the forward migration's `deprecated` entry simply becomes unused.

## 10. Change Log
- v0.1: Initial draft.
- v0.2: Phase A implemented — `block.json` flattened per §4.1, `deprecated`/`migrate()` added per §4.2, `index.jsx` read/write sites (`handlePlaceholderSelect`, `ImageSourcePositionControl.onChange`, `save()`, `transforms.from`) updated per §4.3, `README.md` updated. Phase B (manual "Enable overrides" verification against a real pattern, and the dynamic-mode override-UI open question) not yet done — no browser/editor access from the implementing session.
- v0.3: §2's "nothing to build here beyond the attribute schema" assumption was wrong for this WP version. `role: "content"` is necessary but not sufficient: WP core (since 6.9.0) also hardcodes an allowlist of eligible block types in `get_block_bindings_supported_attributes()` (`wp-includes/block-bindings.php`), which gates both the editor's "Enable overrides" control and the bindings' render-time resolution (`WP_Block::process_block_bindings()`, `class-wp-block.php:283`) — confirmed by live testing: `wp.blocks.getBlockType('motto/image').attributes` showed the correct flat/`role:"content"` schema, yet "Enable overrides" still didn't appear, while `core/image` (present in the hardcoded list) did. Fixed by hooking the `block_bindings_supported_attributes_motto/image` filter (added `includes/image-render.php`) to add `mediaId`/`url`/`alt`/`title` to the allowlist — this is WP core's own extension point for third-party blocks, added alongside the same 6.9.0 release that introduced the allowlist. Still pending: live verification that "Enable overrides" now appears and functions end-to-end.
- v0.4: Live-verified — "Enable overrides" now appears on `motto/image` and functions, confirmed by the user against a real synced pattern. Follow-up finding: `motto/image`'s own Inspector panel is invisible while editing the block *as a synced-pattern instance* (Gutenberg's "content only" editing mode keeps only the `InspectorControls group="content"` tab, and our panel is ungrouped/default) — `core/image` avoids this by registering its media/alt-text controls under `group="content"`. Also closed the dynamic-mode open question from v0.1: the override toggle can't be conditionally suppressed per instance (no extension point for that), so instead `staticImageSection` (`image/index.jsx`) now shows a `motto-section-help` note when `imageDynamic` is active, explaining overrides won't take effect. The whole mechanism (allowlist filter + `group="content"` requirement + the per-instance-suppression limitation) is now documented generically in `docs/conventions/block-layout.md`'s "Native Pattern Overrides" section for reuse on other blocks.
- v0.5: Implemented the `group="content"` split flagged in v0.4 — `edit()` now renders two separate `InspectorControls`: `staticImageSection` (image source/alt/title/position — the actual overridable content) under `group="content"`, and `imageDynamic`/`imageParallax*` (not overridable, belong to the pattern's shared definition) under the default group. `motto/image`'s Inspector now behaves like `core/image`'s split between its "Media" panel (content group) and its other, non-content panels.
- v0.6: Found and fixed while doing the equivalent work for `motto/container` (SDD-032) — the exact same frontend-splice gap flagged there as a likely-also-affects-`motto/image` risk turned out to apply here too, and the user confirmed it live: overriding an image in a placed pattern instance changed the value in the editor but the frontend kept showing the original image. Root cause: `url`/`alt`/`title`'s `selector` (`.motto-image__media`) is a CSS class selector, but WP core's private render-time write-back (`WP_Block::replace_html()`, `wp-includes/class-wp-block.php`) locates the target via `WP_HTML_Tag_Processor::next_tag(['tag_name' => $selector])`, which only ever matches a bare HTML tag name — confirmed against the real installed `core/image`/`core/button` (`wp-includes/blocks/*/block.json`), which use `"selector": "img"`/`"selector": "a"` (bare tags), not classes. Unlike `motto/container` (which needed a Free-owned PHP splice filter, because its link overlay sits among arbitrary inner blocks that might have their own `<a>` tags), `motto/image`'s entire saved output is exactly one `<img>` element with no nested blocks — so there's no ambiguity risk in matching by bare tag name. Fixed by simply changing `selector` from `.motto-image__media` to `img` for `url`/`alt`/`title` in `block.json`; this doesn't change which element is targeted (still the same, only `<img>`), doesn't affect the editor-side JS attribute-source parser (which already supports both class and tag selectors via `hpq`), and needs no custom PHP filter — WP core's own generic mechanism now works correctly once the selector is a bare tag name. `mediaId` (no `source`) still has nothing to write back on the frontend either way, same as before — it was never represented in the rendered markup. `npm run build` re-run to redeploy. Not yet independently re-verified in the browser after this fix.
- v0.7: Applied the same panel-naming/duplication fix `motto/container` got in SDD-032 v0.4 — v0.5's split had rendered the content-group and default-group panels both permanently, both titled "Image", regardless of whether an override was actually active (the exact same confusing-empty-duplicate problem found and fixed for `motto/container`'s "Container Link"). `edit()` now computes `hasImageOverride` from `attributes.metadata?.bindings.__default?.source === "core/pattern-overrides"` and renders a single "Image Source" panel (`staticImageSection`) that lives in `group="content"` only while an override is active, otherwise inline in the default group in its usual spot — a normal image (no pattern involvement) sees one panel, unchanged from before this feature existed. `imageDynamic`/`imageParallax*` split apart into two separate always-default-group panels ("Dynamic Image", "Parallax") instead of sharing one — each Pro-gated stub's inner heading was simplified from "Dynamic source"/"Parallax" to "Enable" since the panel title already supplies that context (kept the "PRO" badge). `npm run lint`, `node scripts/validate-import-boundaries.mjs`, and `npm run build` all pass; not yet re-verified live in the browser.
