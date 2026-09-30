# Feature Spec: SDD-021
Version: 0.5
Status: Proposed
Owner: Blocks
Last Updated: 2026-08-07

## 1. Goal
Give `motto/container` the same "Inner blocks use content width" toggle that `core/group` ships: an opt-in constraint that clamps direct children to the active theme's `contentSize`, lets individual children marked `alignwide`/`alignfull` break out to `wideSize`/100%, and gates children's toolbar Wide/Full alignment options on the parent's constrained state — by opting into WP core's native `supports.layout` block support, the same mechanism `core/group` itself uses.

## 2. Scope
In scope:
- `motto/container` declares `"layout": true` in `supports` (bare boolean form). WP core auto-manages the `layout` attribute, injects its own native "Layout" inspector panel (toggle + Content/Wide width overrides + Justification), adds `is-layout-constrained`/`is-layout-flow` + a unique `wp-container-content-*` class to the root element, and generates the constraining CSS from the active theme's `theme.json` `settings.layout.contentSize`/`wideSize` (`mottoblock-theme` defines `60rem`/`80rem`).
- `edit()` deriving `usedLayout` from `attributes.layout` and passing it to `useInnerBlocksProps`, so nested children's toolbar Wide/Full alignment options correctly gate on the parent's constrained state — confirmed empirically to be required and sufficient for this gating, independent of whatever the native inspector panel itself renders.
- Defending Motto's own internal decorative layers (`.motto-container__bg-media`, `__bg-overlay`, `__link-overlay`) against WP's generated constrained CSS, which targets *any* non-`align*` direct child indiscriminately — these are absolutely-positioned, `inset: 0` full-cover elements, not real content children, and must keep covering 100% of the container regardless of the constrained toggle.
- Documenting the interaction between this new "children width" axis and Motto's existing `mottoBaseLayout`/Styler-driven "container's own display" axis (they are orthogonal and both apply).

Out of scope:
- Any Motto-built replacement UI for WP core's native "Layout" panel — it renders with WP's own component styling, not Motto's `motto-panels` primitives. This was explicitly tried and reverted (see §7 History) before landing back on the native panel.
- Any Pro gating — this ships as a 100% Free capability, matching `core/group`'s own license-free status.
- Any other Motto block gaining this support (e.g. `motto/tab-container`) — container only, for now.
- A `deprecated` entry — deliberately not added upfront; ship and verify empirically first (see §4.2, §9).

## 3. Current Behavior (pre-SDD-021)
- No block in this plugin declared `supports.layout`, and none referenced `is-layout-constrained`, `contentSize`, `wideSize`, or `--wp--style--global--*` — this was new ground for the plugin.
- `motto/container`'s only layout-related contract was `mottoBaseLayout: "flow"` (`block.json`), which governs the container's **own** `display` (block/flex/grid) via `getMottoBaseLayoutClassName()` and the Styler root-layout resolution order (`docs/conventions/block-layout.md`). It said nothing about how the container constrains its **children**'s width.
- `edit()`/`save()` built the root element by hand via `useBlockProps`/`useBlockProps.save()` with a fixed `className: "motto-container ${BASE_LAYOUT_CLASS}"`, and `useInnerBlocksProps(blockProps)` with no `layout` argument.
- The active theme (`mottoblock-theme/theme.json`) already declared `settings.layout.contentSize: "60rem"` and `settings.layout.wideSize: "80rem"`; WP core already turns those into global `--wp--style--global--content-size`/`--wp--style--global--wide-size` CSS custom properties on every page (confirmed in `wp-includes/class-wp-theme-json.php`, unconditional on any block's layout support) — but this was unconsumed by any Motto CSS.
- Most Motto blocks (container, image, button, buttons, svg, etc.) already declare `supports.align` including `wide`/`full`.

## 4. Target Behavior

### 4.1 `block.json`
- `supports.layout: true` (bare boolean). No `layout`-related attribute is declared manually in `attributes` — WP core injects it automatically via `blocks.registerBlockType`.

### 4.2 Editor UI (native, not Motto-built)
- WP core's `editor.BlockEdit` filter auto-injects its own **"Layout"** `PanelBody` into `InspectorControls`, containing the toggle "Inner blocks use content width" plus (since the active theme defines `contentSize`/`wideSize`) a "Customize" section with numeric Content/Wide width overrides, and a Justification control. This uses WP core's own components, not Motto's `motto-panels`/`FormToggle` conventions — an accepted, explicit tradeoff.
- No `deprecated` entry ships with this change. WP's `layout`-attribute/classname injection changes `save()`'s serialized output for every container (including ones that never touch the toggle — `is-layout-flow` now appears unconditionally). Per project decision, this is shipped first and verified empirically (does opening a pre-existing `motto/container` in the editor show an "invalid block" warning?) before deciding whether a `deprecated` entry reproducing the old `save()` output is actually needed.

### 4.3 Children context wiring (required, not automatic)
- Declaring `supports.layout` does **not** by itself make a custom `edit()` thread layout context to `InnerBlocks` — that still has to be done explicitly, exactly like `core/group`'s own `edit()` does:
  ```js
  const usedLayout = attributes.layout || { type: "default" };
  const innerBlocksProps = useInnerBlocksProps(blockProps, { layout: usedLayout });
  ```
- This is what makes a nested child's toolbar Wide/Full alignment buttons correctly show only when the parent's layout is meaningfully constrained-aware, matching `core/group`'s real observed behavior — **confirmed empirically in this project** (tested before and after adding this line, with a visible behavior change).
- `save()` needs no equivalent change — layout classnames on save are handled by WP core's own save-time filter chain once `supports.layout` is declared; `save()` continues to use plain `InnerBlocks.Content`.

### 4.4 Protecting internal decorative layers
- WP's generated constrained CSS selector (`:where(:not(.alignleft):not(.alignright):not(.alignfull))`) matches *any* direct child without those classes — including Motto's own `.motto-container__bg-media`, `.motto-container__bg-overlay`, and `.motto-container__link-overlay`, none of which carry align classes.
- Without a fix, enabling the constrained toggle would incorrectly clamp these absolutely-positioned, `inset: 0` full-cover layers to `contentSize`, breaking full-bleed backgrounds/overlays/link-overlay hit areas.
- Fix (already applied): `container.scss` adds an explicit `max-width: none` to the existing rules for `.motto-container__bg-media`/`__bg-overlay` (shared base rule) and `.motto-container__link-overlay`. Motto's own selectors have real specificity, so they win over WP's zero-specificity `:where()` rule regardless of stylesheet order.

### 4.5 Interaction with `mottoBaseLayout`
- This is a second, orthogonal axis, not a replacement for `mottoBaseLayout`/Styler: `mottoBaseLayout` (+ Styler `display` overrides) governs what the container **itself** is (block/flex/grid); the native layout support's constrained state governs the **max-width of its direct children**. Both apply simultaneously and independently.
- Known, accepted caveat (identical to `core/group`'s own real-world behavior, not something to fix here): if a container's effective `display` is `flex`/`grid` (via Styler) **and** constrained is on, the `margin-inline: auto` WP's generated CSS applies to children behaves as flex/grid auto-margin alignment, which can look different from the intended "centered block" result. Documented in `README.md`; no code mitigation required for v1.

## 5. Data Contract
- Inputs: none added to Motto's own `attributes` map. WP core auto-manages `attributes.layout` (`{ "type": "constrained", contentSize?, wideSize?, justifyContent? }` when configured, absent/`{ "type": "default" }` otherwise).
- Persistence: `layout` serializes into the block comment delimiter; classnames serialize into the saved inner HTML via WP core's save-time filter chain.
- Outputs:
  - Editor canvas: root element carries `is-layout-flow`/`is-layout-constrained` (+ a unique `wp-container-content-*` class) plus live WP-generated styles; nested children's toolbar alignment options gate correctly per §4.3.
  - Frontend: same classnames plus a WP-core-generated `<style>` block scoped to that container instance, sourced from the active theme's `theme.json` `settings.layout`.

## 6. Acceptance Criteria
- [x] The native "Layout" panel (toggle + Customize width + Justification) appears in the sidebar for `motto/container`, using the `"layout": true` bare-boolean form (the restrictive object form tried earlier produced an empty panel).
- [x] Nested child blocks' toolbar Wide/Full alignment options gate on the parent's constrained state, matching `core/group`'s real behavior (confirmed empirically after wiring `usedLayout` into `useInnerBlocksProps`).
- [ ] Toggle on: plain children clamp to the theme's `contentSize` (60rem on `mottoblock-theme`) and center; a nested block with `align: wide` breaks out to `wideSize` (80rem); a nested block with `align: full` breaks out to 100%. Blocked until v0.5's fix (§12) is confirmed on live re-saved content — was silently failing (editor matched, frontend never clamped) until then.
- [ ] Background media, overlay, and link-overlay layers keep covering 100% of the container regardless of the constrained toggle (verifies §4.4's `max-width: none` fix).
- [ ] Editor canvas rendering and frontend rendering match 1:1 for both toggle states. Root cause of the prior mismatch identified and fixed in v0.5 (§12); still needs live browser confirmation on a re-saved container.
- [ ] Open a `motto/container` saved before this change in the editor; record whether it shows an "invalid block"/"attempt block recovery" warning — this determines whether a `deprecated` entry is still needed (§9).
- [ ] No regression to existing background/overlay/link-container/parallax features, transforms, or `npm run lint` / `npm run build`.

## 7. History (native → custom → native)
This spec went through three implementation attempts before landing on §4:
1. **Native `supports.layout` with a restrictive object** (`{ allowSwitching: false, allowInheriting: false, default: { type: "default" } }`): empirically produced an **empty** "Layout" panel in this project's WP version — no toggle rendered at all. Tried `allowSwitching: true` instead: rendered a flex/grid layout-type switcher on top of the toggle, which the project explicitly doesn't want (that's `mottoBaseLayout`/Styler's job).
2. **Custom Motto-owned attribute (`layoutConstrained`) + toggle + hand-written CSS**: built as a full replacement, avoiding native `supports.layout` entirely (own `FormToggle` in the "Structure" panel, `is-layout-constrained` class added conditionally, `container.scss` rule targeting `--wp--style--global--content-size`/`--wide-size` directly). This worked visually and required no `deprecated` entry (attribute defaulted `false`, so pre-existing `save()` output was untouched). However, it did not replicate `core/group`'s child-toolbar-alignment-gating behavior (Wide/Full buttons on nested blocks reacting to the parent's constrained state) — confirmed missing, then fixed by passing a `layout` object into `useInnerBlocksProps` **without** re-adding `supports.layout` (a targeted, low-risk addition to the custom approach that worked empirically).
3. **Back to full native (`supports.layout: true`, bare boolean)**: once the child-gating trick was confirmed to work standalone, a request to also get WP's native "Customize" width overrides + Justification control (visible in real `core/group` output) led to trying the bare `"layout": true` form — which, unlike the restrictive object in attempt 1, rendered the full expected panel. This spec's final state removes the custom attribute/toggle/CSS from attempt 2 in favor of this, keeping only the `usedLayout` → `useInnerBlocksProps` wiring (still required — native support does not auto-inject that into a custom `edit()`) and the internal-layer `max-width: none` defense (§4.4, not needed by attempt 2's narrower CSS selector, newly required now that WP's own generated selector is in play).

## 8. Risks and Mitigations
- Risk: shipping without a `deprecated` entry could break validation for every existing `motto/container` once this reaches a site with real published content (native `supports.layout` unconditionally changes `save()` output, unlike the abandoned attempt 2).
  - Mitigation: verify empirically first (§9) whether the risk actually materializes before paying the cost of a `deprecated` entry; add it as a fast follow the moment an invalid-block warning is observed on real content, before shipping past local testing.
- Risk: WP's generated constrained CSS clamping Motto's internal decorative layers (bg-media/bg-overlay/link-overlay), breaking full-bleed backgrounds when the toggle is on.
  - Mitigation: `max-width: none` added to those layers' existing rules (§4.4) — real specificity beats WP's zero-specificity `:where()` selector.
  - Residual risk: any *future* internal decorative layer added to this block must remember the same defense; not automatically enforced by any lint rule.
- Risk: interaction with `mottoBaseLayout: flex`/`grid` (via Styler) produces visually confusing auto-margin behavior on children when constrained is also on.
  - Mitigation: documented as a known limitation in `README.md` (mirrors `core/group`'s identical real-world caveat); no functional fix required for v1.
- Risk: children that don't declare `supports.align` can't use the `alignwide`/`alignfull` escape hatch, appearing "stuck" at `contentSize`.
  - Mitigation: none needed — matches `core/group`'s own behavior exactly.

## 9. Test Plan
Automated:
- `npm run lint`
- `npm run build` (confirm no build/registration errors)

Manual:
- Insert a new `motto/container`, confirm the native "Layout" panel (toggle + Customize + Justification) appears.
- Toggle on, add a plain paragraph + a nested `motto/container` set to `align: wide` + one set to `align: full`; confirm visual clamping matches `contentSize`/`wideSize`/full-bleed respectively, and that the nested blocks' own toolbar Wide/Full buttons only meaningfully appear/react per §4.3.
- Enable a background image + overlay + container link on a constrained container; confirm all three still span 100% width (§4.4 regression check).
- Save, view the frontend page: confirm the same visual result and inspect the rendered HTML for `is-layout-constrained` + the WP-generated `<style>` block.
- Open a `motto/container` saved before this change in the editor — **this is the key empirical check**: if it shows "invalid block"/"attempt block recovery", stop and add a `deprecated` entry (reproducing the pre-SDD-021 `save()` output, with `supports: { layout: false }` on that entry) before shipping further; if it opens clean, no entry is needed.
- Set a container's Styler `display` to `flex` and enable the toggle; visually confirm the documented (not fixed) auto-margin caveat, nothing crashes.

## 10. Rollout Plan
Phase A (done) — land and verify:
- `supports.layout: true` in `container/block.json`.
- `usedLayout` → `useInnerBlocksProps` wiring in `edit()`.
- `max-width: none` defense on internal decorative layers in `container.scss`.
- `README.md` updated with the final contract, the native-panel appearance, and the `mottoBaseLayout` interaction caveat.
- `npm run build` to refresh tracked build artifacts.

Phase B — add a `deprecated` entry, only if the manual check in §9 shows an invalid-block warning on pre-existing content:
- Reproduce the pre-SDD-021 `save()` output verbatim, with `supports: { layout: false }` set on that specific deprecated entry.

Rollback:
- Remove `supports.layout` from `block.json`, the `usedLayout` wiring, and the `max-width: none` additions (harmless to leave, but not needed without the feature). If real content already used the toggle, a follow-up `deprecated` entry would be needed to avoid stranding that content invalid.

## 11. Change Log
- v0.1: Initial draft (native `supports.layout` approach, object form).
- v0.2: Deferred the `deprecated` entry to a conditional Phase B pending empirical verification.
- v0.3: Abandoned native `supports.layout` after empirical failure (empty/overloaded "Layout" panel); replaced with a Motto-owned `layoutConstrained` attribute, toggle, and CSS.
- v0.4: Reverted back to native `supports.layout: true` (bare boolean, not the object form) after confirming it renders the full expected panel and after finding attempt v0.3 didn't replicate `core/group`'s child-toolbar-alignment-gating behavior. Kept the `usedLayout` → `useInnerBlocksProps` wiring discovered during v0.3 (still required even with native support declared) and added a new `max-width: none` defense for internal decorative layers, not needed under v0.3's narrower custom CSS but required now that WP's own generated selector applies to all direct children.
- v0.5: Found and fixed the exact reason toggle-on containers rendered constrained in the editor but never clamped on the frontend — see §12.

## 12. Frontend Bug Found & Fixed (v0.5, 2026-08-07)
Reported symptom (real site, `nb-parks`, `single-event`/`single-programming` templates): a `motto/container` with the constrained toggle enabled rendered correctly in the editor but showed unclamped, full-width content on the published page. Initial investigation wrongly suspected the Free plugin's per-post frontend Styler CSS cache (`includes/styler-frontend-render.php`); that cache was verified correct (byte-identical, complete) and unrelated to this bug. Along the way, a real but separate gap was found and fixed in that same cache system: editing a `wp_template` never invalidated the per-post cached CSS of pages using it (only `wp_template_part`/`wp_block`/`motto_css_class` edits did) — fixed by tracking the resolved `wp_template` post id as a cache dependency, same pattern as the existing template-part tracking (see `includes/styler-frontend-render.php`, `motto_styler_get_current_resolved_template_post_id()` and the `templateIds` dependency key).

**Root cause**: WordPress core's `wp_render_layout_support_flag()` (`wp-includes/block-supports/layout.php`) decides which HTML element in a block's saved markup receives the `is-layout-constrained` class and the unique `wp-container-{block}-is-layout-*` class that carries the actual `max-width`/`margin-inline:auto` CSS. It does this by scanning `innerContent[0]` (the raw HTML before the first inner block placeholder) and picking the **last complete opening tag** found there as "the inner block wrapper." `motto/container`'s `save()` rendered `.motto-container__bg-overlay` (a self-closed, `aria-hidden` decorative div) immediately before `<InnerBlocks.Content />` — that div was the last complete tag in the chunk, so WP misapplied both classes to it instead of to the real children. Confirmed directly in a live page's rendered HTML: `.motto-container__bg-overlay` carried `is-layout-constrained wp-block-motto-container-is-layout-constrained`; no real content element did.

This only affected the frontend. The editor wires `layout` via React (`useInnerBlocksProps(blockProps, {layout: usedLayout})`, §4.3) directly onto the intended element — unaffected by this markup-order heuristic — which is why editor and frontend diverged.

**Fix**: reordered `save()` so `<InnerBlocks.Content />` is the first child (before `bg-media`/`bg-overlay`), so the heuristic's scan finds nothing but the root wrapper's own opening tag and targets it correctly. Confirmed safe to reorder because `container.scss` stacks all layers by explicit `z-index` (media 0, overlay 1, real content 2, link-overlay 3), not DOM order. Added a 6th `deprecated` entry reproducing the pre-fix child order verbatim so already-published containers (using the old order) still validate in the editor instead of showing "invalid block."

**Known follow-up, not yet done**: this only fixes `save()` going forward. Already-published `motto/container` content still has the old (broken) order baked into `post_content` and needs to be re-saved (open the page, hit Update) to actually pick up the corrected markup — there is no bulk-migration path. Live-browser confirmation of the fix (checking the two boxes in §6 that reference it) is still outstanding.
