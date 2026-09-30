# Feature Spec: SDD-028
Version: 0.3
Status: Removed
Owner: Blocks
Last Updated: 2026-09-29

## 0. Removal Note (2026-09-29)
Product decided not to ship this feature. Removed from the repo: `includes/block-patterns.php`, `patterns/` (all three pattern files), `assets/images/pattern-placeholder.svg`, the `require_once` in `motto-blocks.php`, and the `patterns/` entry in `scripts/assemble-plugin.mjs`'s `COPY_PATHS`. `motto/pattern-ref` (SDD-027) is unaffected — it's a separate, still-active feature. The rest of this document describes the removed feature as it existed before removal.

## 1. Goal
Ship a small, plugin-owned gallery of ready-made block patterns (Free) so users can insert a section from WordPress's native inserter and freely edit/detach it — distinct from `motto/pattern-ref` (SDD-027), which is a read-only reference to a *theme's own* patterns and does not apply here.

## 2. Scope
In scope:
- A generic loader (`includes/block-patterns.php`) that registers a `motto` pattern category and scans a filterable list of directories for `.php` pattern files (Title/Slug/Categories header, same file contract WP core uses for a theme's `patterns/` directory), loading each via output buffering.
- `motto_blocks_pattern_dirs` filter exposing the scanned directory list, so a future Pro pattern pack can register its own directory without modifying this file (mirrors the Free/Pro extensibility spirit of `SDD-008`, applied to a plain PHP filter instead of a JS hook since this is a server-side registry).
- Three starter patterns under `patterns/`, built from Motto's own blocks wherever one exists — `motto/container` (section wrapper), `motto/image`, `motto/buttons`/`motto/button`, `motto/classic-menu` — so the gallery actually showcases the product rather than reimplementing core's own pattern library. `core/social-links`/`core/social-link` is the one deliberate exception (see §4.5): Motto has no bundled brand-icon set, and core's `social-link` icons come from WordPress core's own maintained brand-logo library.
- A bundled placeholder image (`assets/images/pattern-placeholder.svg`) for the media pattern's image slot, referenced via `MOTTO_BLOCKS_URL` so the pattern renders a real thumbnail in the inserter instead of a blank/broken image.
- All patterns ship in Free (per product decision — no Pro split for this initial set).

Out of scope:
- Any Pro-only pattern pack (deferred; the `motto_blocks_pattern_dirs` filter is the seam for it, no Pro code added here).
- WP core's native `supports.layout` attribute (the `layout: {type: "flex", ...}` value that drives WP's own "Layout" Inspector panel — Direction/Justification/Align) on any Motto block in these patterns, even though `motto/container` technically supports it (`SDD-021`). Per product direction, layout/display arrangement on Motto blocks is Styler's job (`mottoBaseLayout` + `mottoStyler` CSS), not WP core's competing layout mechanism — mixing the two would give the same block two independent, potentially-conflicting sources of truth for its own display behavior. An earlier draft of this spec used native `layout: flex` on the header and media patterns' outer containers to fake a side-by-side row without touching Styler; that was wrong and has been reverted to plain `motto-base-layout-flow` (stacked) containers.
- Hand-authoring real `mottoStyler` CSS (instanceId + per-breakpoint `css` rules + `blockSelectors`) for the shipped patterns — this is a real subsystem (see `docs/conventions/styler-css-classes.md` / `styler-css-loading.md`) that should be authored by actually using the Styler panel in the editor and exporting the result, not guessed. `motto/media-and-content` picked this up mid-spec (built live in the editor, not hand-written — see §4.6); `motto/social-media-links` and `motto/header-logo-navigation` still ship with no `mottoStyler` at v0.2, stacking by default until the user applies their own Styler CSS.
- A custom pattern-picker UI. Native inserter "Patterns" tab only.
- Synced ("reusable") patterns or Pattern Overrides — these are meant to be freely edited/detached, not centrally managed.

## 3. Current Behavior
No plugin-owned patterns exist. `motto/pattern-ref` (Pro, SDD-027) only surfaces patterns already registered by the active theme's own `patterns/` directory — it does not apply to plugin-shipped patterns and is out of scope here.

## 4. Target Behavior
1. `motto_blocks_register_patterns()` (hooked on `init`) calls `register_block_pattern_category( 'motto', ... )`, then resolves `apply_filters( 'motto_blocks_pattern_dirs', [ MOTTO_BLOCKS_DIR . 'patterns' ] )` and scans each directory.
2. Per file: `get_file_data()` reads the header block (`Title`, `Slug`, `Description`, `Categories`, `Keywords`, `Viewport Width`, `Block Types`, `Inserter`); files missing `Title`/`Slug` are skipped. Already-registered slugs (`WP_Block_Patterns_Registry::is_registered()`) are skipped, so a Pro pack redeclaring the same slug can't double-register.
3. Content is captured via `ob_start(); include $file; ob_get_clean();` — pattern files may contain PHP (e.g. building the placeholder image URL), matching WP core's own theme-pattern loading contract.
4. `register_block_pattern( $slug, $args )` is called with `categories` defaulting to `['motto']` when the header omits `Categories`.
5. The three starter patterns insert as ordinary, fully editable blocks (no `core/pattern` sync, no `wp:block` ref):
   - `motto/media-and-content`: outer `motto/container` (`tagName: section`, `align: wide`) containing `motto/image` (static source pointed at the bundled placeholder, `800×600`) and an inner `motto/container` with `core/heading` + `core/paragraph` + `motto/buttons` > `motto/button`. As of v0.2 this pattern's `mottoStyler` (real flex-with-wrap/columns CSS + `blockSelectors`) was authored live in the block editor, not hand-written — see §4.6.
   - `motto/social-media-links`: `motto/container` (`tagName: section`) wrapping `core/social-links` > four `core/social-link` (facebook/instagram/x/linkedin) — see §4.5 for why this one pattern uses a core block for the icons.
   - `motto/header-logo-navigation`: `motto/container` (`align: full`, plain — no `layout` attribute, see §4.7) containing `motto/image` (logo, placeholder source, `800×600`) and a bare `motto/classic-menu` (dynamic block, `save() === null`; its own `menuLocation`/`menuSlug` self-populate on insert exactly as a fresh manual insert would, via the block's existing `useEffect`). Stacks vertically by default; a side-by-side row is left to the user's own Styler CSS (§4.7).

### 4.5 Why `core/social-links` and not a Motto block
Motto's block set has no bundled brand-logo icon library: `motto/svg` only renders generic/inline/media SVG (no built-in icon catalog), and `motto/button`'s Lucide icon option is a general UI icon set that deliberately excludes brand marks (Lucide's own project policy). `core/social-link`'s icons are rendered server-side from WordPress core's own maintained brand-icon set (`render_block_core_social_link`). Forcing a generic icon to stand in for "Facebook"/"Instagram" would misrepresent the pattern rather than showcase Motto, so this one pattern keeps the section wrapper on `motto/container` and defers the icons themselves to core.

### 4.6 `motto/media-and-content`'s `mottoStyler` was authored live, not hand-written
Unlike the other two patterns, `motto/media-and-content`'s outer `motto/container` carries a real `mottoStyler` payload (CSS custom properties `--columns`/`--gap`, a responsive `display:flex`/`flex-wrap` rule set per breakpoint, and a `blockSelectors` entry sizing direct children via `flex: 0 0 calc(...)`). This was built by editing the pattern live in the block editor's own Styler panel and exporting the resulting block markup back into the `.php` file — the correct way to get a real `mottoStyler` payload (per-instance `instanceId`, breakpoint `css` arrays, `blockSelectors` `id`s) right, instead of guessing its shape (see §7, formerly listed as explicitly out of scope for hand-authoring).

### 4.7 Layout arrangement is Styler's responsibility, not WP core's
An earlier draft of this spec set `"layout":{"type":"flex","justifyContent":"space-between"}` (WP core's native block-supports layout attribute — the same one `core/group` uses) on the header and media patterns' outer `motto/container` instances, to get a side-by-side row without touching Styler. That was reverted: per product direction, arranging a Motto block's own children (`display`, `flex-direction`, `gap`, etc.) is `mottoStyler`'s job — `motto/container` already carries a `mottoBaseLayout` baseline (`"flow"`) precisely so Styler is the single source of truth for a block's display behavior. Layering WP core's own competing `layout` attribute/Inspector panel on top would give the same block two independent, potentially-conflicting places to configure the same thing. `motto/header-logo-navigation` therefore ships stacked (plain `motto-base-layout-flow`) at v0.2; a side-by-side arrangement is left to the user's own Styler CSS after inserting, same as `motto/social-media-links`.

## 5. Data Contract
- Inputs: `.php` files under `patterns/` (and any directory added via `motto_blocks_pattern_dirs`), each with a WP-core-style pattern file header.
- Persistence: none beyond WordPress's own in-memory `WP_Block_Patterns_Registry` for the current request — no options/postmeta.
- Outputs: patterns appear in the native block inserter's "Patterns" tab, "Motto" category; inserting one produces plain block markup in `post_content`, identical to hand-building the same blocks.

## 6. Acceptance Criteria
- [x] `npm run build` assembles `patterns/` and the new placeholder asset into the runtime plugin copy (`scripts/assemble-plugin.mjs` `COPY_PATHS` updated).
- [x] Opening the block inserter's "Patterns" tab (via "Explore all patterns" — the compact inline sidebar only shows a curated subset of categories, custom ones like "Motto" only appear in the full explorer modal) shows a "Motto" category with all three patterns. Verified against `greenwood.local`.
- [x] Inserting each pattern produces no "This block contains unexpected or invalid content" / block-recovery notice in the canvas. Verified against `greenwood.local` for all three patterns after `motto/media-and-content`'s live-edit round (§4.6) settled — also dropped the leftover native `layout`/`is-layout-flex` remnants from that round (§4.7) and applied the `800×600` image fix (§7).
- [ ] Frontend render of each inserted pattern matches the canvas (no PHP notices/fatals from the placeholder-image `echo` calls). Not yet checked on a published/viewed post, only in the editor canvas.

## 7. Risks and Mitigations
- Resolved: `motto/button`'s hand-authored `<a>` was initially missing the `wp-block-motto-button` base class that `useBlockProps.save()` always injects (present on every other hand-authored block in these patterns, just missed on this one) — this was the actual, confirmed cause of `motto/media-and-content`'s only observed invalidation notice, not the `motto/container` layout-class guess below. Fixed by adding the class; re-verified clean.
- Resolved: `motto/image`'s placeholder rendered at `0×0px` in the canvas (confirmed via `boundingBox()`) because neither the bundled SVG nor the block's `image.width`/`image.height` attrs carried real dimensions, leaving the `<img>` with no intrinsic size for the browser to lay out. Fixed by giving `pattern-placeholder.svg` explicit `width="800" height="600"` and setting matching `800×600` values in every pattern's `image` attrs (+ matching `width`/`height` on the `<img>` tag) — `getImageDimensionsAttributes()` only forwards these when both are finite and `> 0` (`src/blocks/image/README.md`).
- Resolved (moot for shipped code, kept for the record): the `is-layout-flex` class *was* confirmed empirically to be part of `motto/container`'s persisted save markup when `supports.layout`'s native `layout` attribute is set to a flex config — the header pattern round-tripped clean with that class present before §4.7's revert. Since native `layout` is no longer used in any shipped pattern (§4.7), this no longer matters here, but confirms the mechanism works identically to `core/group`'s if it's ever needed elsewhere.
- Resolved: `motto/classic-menu`'s self-populating `menuLocation`/`menuSlug` `useEffect` fires correctly when the block arrives via a pattern insert (verified — `motto/header-logo-navigation` showed no "unconfigured menu" state or warning).
- Resolved: `motto/media-and-content`'s live-edit round (§4.6) left two leftovers once it settled — the native `layout`/`className:"is-layout-flex"` pair on the outer container (§4.7 says Styler owns this, not WP core) and a Gutenberg-internal `metadata: {categories, patternName, name}` block added by the "Edit pattern" flow — both removed; the `image` attrs were still `width:0,height:0` (the resolved 0×0px bug applied to the other two patterns but not yet to this one) — fixed to `800×600` to match.
- Risk: A future Pro pattern pack directory registering a pattern with the same `Slug` as a Free one silently no-ops (first-registered wins) rather than erroring.
  - Mitigation: acceptable for now — Pro packs should namespace slugs distinctly (e.g. `motto-pro/...`); revisit only if a real collision occurs.

## 8. Test Plan
Automated:
- `php -l` on all new/changed PHP files (done, passing).

Manual:
- Open a fresh draft, block inserter → Patterns tab → Motto category → insert each of the three patterns → confirm no recovery/invalidation notice → save → view on frontend → confirm the rendered section matches the canvas.

## 9. Rollout Plan
Phase A:
- Ship the three starter patterns in Free once manual verification (§8) passes.

Phase B (future, not this spec):
- Pro pattern pack via `motto_blocks_pattern_dirs`, once there's a concrete set of Pro-only patterns to ship.

Rollback:
- Remove the `require_once` line for `includes/block-patterns.php` in `motto-blocks.php`; no persisted data to clean up.

## 10. Change Log
- v0.1: Initial draft — loader + three starter patterns, live-editor verification pending.
- v0.2: Patterns rebuilt on Motto's own blocks instead of core-only (per product feedback — a Motto pattern gallery should showcase Motto). Live-verified against `greenwood.local`: found and fixed a missing base class on `motto/button` (the real invalidation cause) and a `0×0px` image sizing bug; confirmed `motto/classic-menu` self-populates correctly via pattern insert. Reverted an incorrect use of WP core's native `layout` attribute on `motto/container` in favor of leaving arrangement to Styler (§4.7, product direction). `motto/media-and-content` now carries a real, live-authored `mottoStyler` payload (§4.6) and is mid-edit by the user as of this revision.
- v0.3: `motto/media-and-content`'s live-edit round settled — cleaned up leftover native `layout`/Gutenberg `metadata` attrs and applied the `800×600` image fix. All three patterns re-verified clean (0 invalidation notices) against `greenwood.local`. Status → Active.
