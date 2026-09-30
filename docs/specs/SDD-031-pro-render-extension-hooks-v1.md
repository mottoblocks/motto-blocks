# Feature Spec: SDD-031
Version: 0.5
Status: Active
Owner: Architecture + Blocks
Last Updated: 2026-09-18

This file is a PHP-side technical annex to `docs/free-pro-strategy-and-boundaries.md` and
a sibling to `SDD-008-pro-extensibility-hooks-v1.md` (the JS-side hook contract). It
defines PHP render-extension hook points only. It must not redefine the overall
Free/Pro strategy, ownership model, or rollout plan.

## 1. Goal
Replace Pro's current technique of parsing Free's already-serialized block markup
(`WP_HTML_Tag_Processor`/regex against hardcoded class names) to inject dynamic
background images, link overrides, and dynamic image sources — in `motto/container`,
`motto/image`, and `motto/button` — with a small set of Free-owned PHP data filters.
Free keeps sole ownership of its own markup shape (in one place, alongside `save()`);
Pro contributes only resolved values through a stable, documented hook contract. This
is the PHP-side counterpart to the stub/filter pattern SDD-008 already established for
the JS/Styler side.

## 2. Scope
In scope:
- Four new Free-owned filter hooks (container background, container link overlay,
  button link, image dynamic source) fired from Free's own new `render_block_motto/*`
  registrations.
- Moving the `WP_HTML_Tag_Processor`/regex markup-mutation logic for these four cases
  out of `pro/motto-blocks-pro.php` and into new Free files under `includes/`.
- A centralized PHP hook-name registry (`includes/freepro-hooks.php`), mirroring the
  `STYLER_HOOKS`/`BLOCKS_HOOKS` pattern in `src/lib/freepro-ids.js` /
  `src/blocks/freepro/blocks-freepro-ids.js` — hook names are always constants, never
  inlined strings.
- Migrating Pro's 4 existing `render_block_motto/*` closures in
  `pro/motto-blocks-pro.php` to register on the new data-only hooks instead.

Out of scope:
- Any change to attribute schemas, `save()` output, or `block.json`.
- The `motto/conditional` device/URL-param/cookie/language hooks (SDD-014) — unrelated
  mechanism.
- A new automated boundary validator (PHP equivalent of
  `scripts/validate-import-boundaries.mjs`) — worth revisiting once this pattern has
  shipped and proven itself; see Risks.
- Image parallax's own frontend runtime script/behavior — only the *markup* Pro
  currently hand-builds when `save()` produced no `<img>` moves under this spec; the
  parallax script enqueue and style-string math stay Pro's own logic, just returned as
  plain values instead of raw HTML.

## 3. Current Behavior
- `motto/container`, `motto/image`, and `motto/button` are static blocks (serialized
  via `save()`). **Free registers zero PHP filters on their render path today.** Pro is
  the only PHP participant, via WordPress's own generic `render_block_{$block_name}`
  filter — `pro/motto-blocks-pro.php:508-770`, four separate closures:
  - `render_block_motto/image` (priority 10): resolves a dynamic image payload, then
    either regex-edits the existing `<img>`'s `src`/`style`, or — when `save()`
    produced no `<img>` at all — builds a `<div class="wp-block-motto-image
    motto-image">...<img class="motto-image__media" ...></div>` fragment from scratch,
    hand-duplicating class names Free owns and never validates against.
  - `render_block_motto/container` (priority 10, background): finds the
    `.motto-container__bg-media` wrapper via `WP_HTML_Tag_Processor` (falling back to
    regex, then to a second "legacy shape" `.motto-container__bg-image` regex path for
    content saved before that wrapper existed) and sets its `src`/`style`/`class`. A
    comment at the top of this closure literally reads *"Mirrors
    `containerBackgroundNeedsDivFallback()` in `src/blocks/container/index.jsx` — keep
    both in sync."*
  - `render_block_motto/container` (priority 11, link overlay): finds the
    `.motto-container__link-overlay` `<a>` and sets `href`, or appends a new `<a>`
    before the closing tag if `save()` didn't render one.
  - `render_block_motto/button` (priority 10): finds the first `<a>` and sets `href`.
- None of this is covered by `scripts/validate-import-boundaries.mjs` (JS-only) or any
  PHP equivalent. A class rename or markup restructure in Free's `save()` breaks Pro
  silently — no compile-time or lint signal, only a runtime visual regression on sites
  with Pro active.

## 4. Target Behavior
Rules:
- Free owns all knowledge of its own rendered markup shape (class names, wrapper
  structure, the "needs a `<div>` fallback vs. an `<img>`" decision) in one place per
  block, inside `includes/`, alongside — and reviewed together with — any `save()`
  change for that block.
- Pro contributes only resolved **values** (a URL, a small payload array) through
  `apply_filters()` calls that **Free itself fires**, from Free's own new
  `render_block_motto/*` registrations. Pro never touches `$html` directly for these
  four cases.
- Each hook's default filtered value is `null` (no override). When a hook returns
  `null`, Free's registration does zero work beyond the `apply_filters()` call itself —
  no HTML parsing, no `WP_HTML_Tag_Processor` instantiation — so Free-only sites (no
  Pro, or Pro installed but the specific dynamic feature unused) pay only the cost of
  one cheap filter call per block render, not a markup pass.
- No Pro code performs `WP_HTML_Tag_Processor`/regex surgery on Free's serialized HTML
  for these four cases. The markup-mutation function lives in Free as a plain,
  independently callable function (testable, and reviewed whenever `save()` changes).
- Hook names are centralized as PHP constants in `includes/freepro-hooks.php`. Naming
  follows the existing PHP convention (`motto_blocks_` prefix, snake_case — see
  `docs/conventions/architecture.md`'s Naming section), not the JS side's dot-namespaced
  style; this is a different runtime's idiom, not a duplicate registry to keep in sync.

## 5. Data Contract

All hook name constants live in `includes/freepro-hooks.php`. Never use inline hook
name strings — always import the constant (`require`d automatically alongside the rest
of `includes/` via the existing bootstrap in `motto-blocks.php`).

### 5.1 Container background hook
Constant: `MOTTO_HOOK_CONTAINER_BACKGROUND` → `'motto_blocks_container_background'`

Fired by: Free, from a new `render_block_motto/container` registration in
`includes/container-render.php` (priority 10, matching Pro's current priority so
ordering relative to the link-overlay hook below is unchanged).

Inputs: `$override = null`, `$attrs` (parsed block attrs), `$block_instance` (`WP_Block`).

Output: `null` (no override — `save()`'s own background stands), or an array:
```php
[
    'url'           => string,  // required non-empty to take effect
    'attachment_id' => int,     // 0 if unknown
    'style'         => string,  // full inline style for the bg wrapper div
    'object_style'  => string,  // full inline style for the <img> (object-position, --motto-parallax-offset, ...)
]
```
Free's callback: if `$override['url']` is non-empty, calls the new
`motto_blocks_apply_container_background_override( string $html, array $override, array $attrs ): string` —
this function contains the `WP_HTML_Tag_Processor`/regex logic verbatim-moved from
`pro/motto-blocks-pro.php` (including the legacy-shape fallback), since it is Free's own
markup shape being mutated. Pro's `motto_pro_get_container_background_style()` /
`motto_pro_get_container_background_object_style()` stay in Pro exactly as-is — they
compute *values* (parallax offset math, dynamic-source resolution), which is
legitimately Pro's job; only the DOM mutation moves.

**No `extra_class`/`child_class` field**: `backgroundParallax` (and the "needs a `<div>`
fallback" decision, `motto_pro_container_bg_needs_div()`) are derived purely from
`$attrs`, which Free's own hook callback already receives as a parameter — so the
`motto_pro_merge_container_background_class()` / `motto_pro_merge_container_media_child_class()` /
`motto_pro_merge_legacy_container_bg_image_class()` functions move to Free **unchanged**
and are called from inside `motto_blocks_apply_container_background_override()` using
the `$attrs` already in scope, exactly as they are today — no need for Pro to compute or
pass any class information through the override array at all. This was the one point
where a literal verbatim move didn't fit: those merge functions need both the existing
class found by the tag processor (only the mutator has that) and `$attrs` (which the
mutator already receives from the hook signature) to reproduce the current add/remove
behavior (e.g. stripping a stale `is-parallax` when `backgroundParallax` is now off) —
Pro was never a necessary intermediary for that computation.

### 5.2 Container link-overlay hook
Constant: `MOTTO_HOOK_CONTAINER_LINK` → `'motto_blocks_container_link'`

Fired by: Free, same `includes/container-render.php`, priority 11 (unchanged ordering).

Inputs: `$url = null`, `$attrs`, `$block_instance`.

Output: `null`, or a non-empty `string` URL. `linkContainerNewTab`/`linkContainerNoFollow`
are Free-schema attributes (`src/blocks/container/block.json`) already reachable from
`$attrs` — same reasoning as §5.1's class fields — so Free's mutator derives
`target`/`rel` itself; Pro only resolves the dynamic URL.

Free's callback: if `$url` is non-empty, calls
`motto_blocks_apply_container_link_override( string $html, string $url, array $attrs ): string` —
finds `.motto-container__link-overlay` via `WP_HTML_Tag_Processor` and updates its
`href`, or appends a new one (computing `target`/`rel`/`aria-label` from `$attrs`) before
the closing tag (using `$attrs['tagName']`) if `save()` didn't render one, exactly
matching current behavior.

### 5.3 Button link hook
Constant: `MOTTO_HOOK_BUTTON_LINK` → `'motto_blocks_button_link'`

Fired by: Free, from a new `render_block_motto/button` registration in
`includes/button-render.php`.

Inputs: `$url = null`, `$attrs`, `$block_instance`.

Output: `null`, or a non-empty `string` URL.

Free's callback: if non-null and non-empty, calls
`motto_blocks_apply_button_link_override( string $html, string $url ): string` — finds
the first `<a>` and sets `href`, exactly matching current behavior.

### 5.4 Image dynamic-source hook
Constant: `MOTTO_HOOK_IMAGE_SOURCE` → `'motto_blocks_image_source'`

Fired by: Free, from a new `render_block_motto/image` registration in
`includes/image-render.php`.

Inputs: `$payload = null`, `$attrs`, `$block_instance`.

Output:
- `null` — no filter registered (or `imageDynamic` not configured) — `save()`'s own
  output stands untouched.
- `[]` (empty array, explicitly not `null`) — a dynamic source was configured but
  resolved to nothing; Free suppresses a bare img-less wrapper (matching today's
  behavior for this exact case — `is_array()` is the discriminator, not truthiness).
- A non-empty payload array: `['url' => string, 'alt' => string, 'title' => string, 'width' => int, 'height' => int]`.
  No `img_style`/`img_class` field: `imageParallax`/`imageParallaxOffset` are Free-schema
  attributes (`src/blocks/image/block.json`) already reachable from `$attrs` — same
  reasoning as §5.1/§5.2 — so `motto_pro_get_image_parallax_class()` /
  `motto_pro_get_image_parallax_style_declaration()` move to Free unchanged and are
  called from inside the mutator using `$attrs`, not passed through the payload.

Free's callback:
- `is_array($payload)` and empty → suppress an img-less wrapper (return `''`) exactly
  as today.
- Non-empty payload → calls
  `motto_blocks_apply_image_dynamic_source( string $html, array $payload, array $attrs ): string`
  which either edits the existing `<img>` (when `$html` has one) or builds the
  `wp-block-motto-image motto-image` / `motto-image__media` fragment from scratch
  (when it doesn't) — both paths moved verbatim from Pro into Free, since both depend
  on Free's own class-name contract, and both now compute the parallax class/style
  inline from `$attrs` rather than reading it off the payload.
- Pro's callback for this hook keeps doing the `imageParallax` script enqueue as a
  side effect (independent of markup, doesn't belong in a Free mutator) before
  returning the payload.

## 6. Acceptance Criteria
- [x] All four `render_block_motto/*` closures in `pro/motto-blocks-pro.php` no longer
      touch `$html` with `WP_HTML_Tag_Processor` or `preg_replace`/`preg_replace_callback`
      — they only resolve and return plain values (URL string or payload/override array).
- [x] The corresponding markup-mutation functions exist in Free
      (`includes/container-render.php`, `includes/button-render.php`,
      `includes/image-render.php`) and are covered by the "legacy shape" fallback case
      that exists today for containers saved before the `<div>` wrapper existed.
- [x] Free-only installs (Pro inactive) render `motto/container`/`motto/image`/`motto/button`
      byte-identical to their pre-spec output — the new Free filters are no-ops when
      nothing overrides `MOTTO_HOOK_*` (verified with a standalone smoke script — not
      committed to the repo — that loaded the real Free include files with no
      `MOTTO_HOOK_*` filters registered and asserted passthrough output for all three
      blocks). Manually confirmed in the browser after Phase A (static/default content
      only — Pro active, before Phase B's hook migration existed).
- [x] With Pro active, dynamic backgrounds, container links, button links, and dynamic
      images render identically to current behavior for: default static content, the
      "no bg node saved at all" case, the "legacy `.motto-container__bg-image`" case,
      the "no `<a>` overlay saved" case, and the "no `<img>` saved" image case — verified
      by loading the real, unmodified `pro/motto-blocks-pro.php` in the same standalone
      smoke script, with `motto_pro_resolve_dynamic_image_payload()`/
      `motto_pro_resolve_dynamic_link_url()` stubbed to return fixed test values.
      Manually confirmed in the browser against real dynamic sources.
- [x] All 4 hook name constants are defined in `includes/freepro-hooks.php`; no inline
      hook-name string literals remain in either `includes/` or `pro/includes/`.
- [x] No new `WP_HTML_Tag_Processor`/`preg_replace` call is added to `pro/` for these
      four cases going forward (spot-checked in review, not automated — see Risks).

## 7. Risks and Mitigations
- Risk: Free gains new always-on render-path code for very common blocks
  (container/image/button), where today Free-only installs pay zero
  `render_block_motto/*` filter cost.
  - Mitigation: each new Free filter's fast path (hook returns `null`) does a single
    `apply_filters()` call and an `is_array()`/truthiness check, then returns `$html`
    unchanged — no parsing, no allocation, no `WP_HTML_Tag_Processor` construction.
    Benchmark this fast path before merging (Phase A acceptance).
- Risk: Moving the `WP_HTML_Tag_Processor`/regex logic changes its behavior subtly in
  the process (e.g. a copy-paste slip in the "legacy shape" fallback).
  - Mitigation: move the code verbatim first (mechanical extraction, matching this
    session's JS-refactor precedent of same-behavior-first, optimize-later); verify with
    the before/after `save()`-output snapshot comparison in the acceptance criteria
    before touching anything else.
  - Note from doing the equivalent JS-side extraction this session (StylerCssList /
    BlockSelectorsList splits): always re-run the full build and compare bundle output
    size/diff after a "mechanical move," not just tests — a seemingly equivalent import
    path once caused an unrelated ~150KB bundle regression that only showed up by
    diffing build output, not by tests passing. The PHP analog here is to diff rendered
    HTML output, not just "the code compiles."
- Risk: No automated boundary check (unlike `validate-import-boundaries.mjs` for JS)
  means a future Pro feature could reintroduce `WP_HTML_Tag_Processor`/regex-on-Free's-HTML
  coupling without anyone noticing at review time.
  - Mitigation: out of scope for v1 (see Scope), but flag in the PR description and in
    `docs/conventions/architecture.md`'s Free/Pro boundary notes as a known gap — a
    `grep -rn 'WP_HTML_Tag_Processor\|preg_replace' pro/` review step is cheap enough
    to do by hand for now given how rarely this area changes.
- Risk: `motto_blocks_apply_*` functions become a second place (besides `save()`) that
  must be updated whenever container/image/button markup changes, partially
  reintroducing the "keep two things in sync" problem SDD-008's comment already flags
  for the JS side (`containerBackgroundNeedsDivFallback()`).
  - Mitigation: this is a real, accepted tradeoff — but it moves the duplication from
    "Free's `save()` vs. Pro's markup guesses" (cross-plugin, easy to miss) to "Free's
    `save()` vs. Free's own `includes/container-render.php`" (same plugin, same PR,
    same reviewer). Add a one-line comment in each block's `index.jsx` `save()`
    pointing at its Free-side mutator function, mirroring the existing
    `containerBackgroundNeedsDivFallback()` cross-reference comment.
- Risk (materialized during Phase B, fixed same day): Pro's 4 new `add_filter(
  MOTTO_HOOK_*, ... )` calls originally sat at `pro/motto-blocks-pro.php`'s top level,
  which evaluates the `MOTTO_HOOK_*` constant *immediately* as PHP parses that line —
  not deferred. This assumed `Requires Plugins: motto-blocks` in Pro's header
  (WP 6.5+) guarantees Free's `includes/freepro-hooks.php` has already run by then.
  In practice this caused `Fatal error: Uncaught Error: Undefined constant
  "MOTTO_HOOK_IMAGE_SOURCE"` on at least one real site, meaning that guarantee doesn't
  hold everywhere (older WP core, or some other environment difference not fully
  root-caused).
  - Mitigation: wrapped all 4 `add_filter()` calls in `add_action( 'plugins_loaded',
    ... )`, the standard WP pattern for depending on another plugin's definitions
    regardless of file-inclusion order — `plugins_loaded` fires only after every
    active plugin's main file has finished executing. Reproduced the exact failure
    (required Pro's file before Free's in the standalone smoke script) and confirmed
    the fix resolves it before shipping.
  - Takeaway for future PHP-side Free/Pro hook work: never reference a cross-plugin
    constant/function at a file's top level, even with a `Requires Plugins` header in
    place — always defer through `plugins_loaded` (or later) for anything that isn't
    itself inside a closure already deferred to a later hook.

## 8. Test Plan
Automated:
- PHP: a snapshot test (or manual `wp eval`/PHPUnit if the repo has PHP test
  infrastructure — confirm before Phase A) that renders each block's `save()` HTML
  through `apply_filters('render_block_motto/{container,image,button}', ...)` with no
  filters registered on the new `MOTTO_HOOK_*` constants, and asserts the output is
  byte-identical to pre-spec output for a fixed set of attribute fixtures (default,
  no-bg-node, legacy-bg-image-shape, no-link-overlay, no-img).
- `npm run build` unaffected (this spec is PHP-only) — still run once as a smoke check
  in case any JS references PHP hook names as strings (none expected).

Manual:
- Free only (deactivate Pro): open each of the three blocks on the frontend, confirm
  no visual/markup change from before the spec.
- Pro active: exercise dynamic background image, container link override, button link
  override, and dynamic image source (with and without `imageParallax`) — confirm
  identical rendering to current behavior, including the "no bg node saved,"
  "legacy bg-image shape," "no link overlay saved," and "no `<img>` saved" edge cases
  called out in the current Pro code's comments.

## 9. Rollout Plan

Phase A — Free-owned hooks + mutators (no Pro change yet): ✓ done
- Added `includes/freepro-hooks.php` with the 4 constants.
- Added `includes/container-render.php`, `includes/button-render.php`,
  `includes/image-render.php`, each registering its `render_block_motto/*` filter and
  firing the corresponding `MOTTO_HOOK_*` filter with a `null` default.
- Moved the `WP_HTML_Tag_Processor`/regex mutator functions from
  `pro/motto-blocks-pro.php` into these new Free files (with the §5.1/§5.2/§5.4
  class/style helpers simplified to read straight from `$attrs` — see v0.2 changelog).
- Verified Free-only byte-identical output before touching Pro; manually confirmed on a
  live site with Pro active (inert, since nothing hooked `MOTTO_HOOK_*` yet).

Phase B — Migrate Pro to the new hooks: ✓ done
- Replaced Pro's 4 `render_block_motto/*` closures with `add_filter()` registrations on
  the 4 `MOTTO_HOOK_*` constants (`pro/motto-blocks-pro.php`), returning plain values
  instead of mutating `$html`.
- Deleted the now-dead `WP_HTML_Tag_Processor`/regex code and the class/style helpers
  that moved to Free from `pro/motto-blocks-pro.php` (774 → 354 lines).
- Verified with the standalone smoke script, loading the real unmodified
  `pro/motto-blocks-pro.php` against stubbed resolver functions — all four hooks
  resolve and mutate correctly, including the empty-payload suppression and
  no-dynamic-configured passthrough cases.
- Hit and fixed a real fatal error on a live site (`plugins_loaded` deferral — see §7)
  before this could be called done.
- Manually verified in the browser against real dynamic sources (ACF background image,
  dynamic container link, dynamic image source).

Rollback:
- Phase A alone is a no-op for Pro (Free's new filters are inert until Pro registers on
  `MOTTO_HOOK_*`) — safe to ship and let sit if Phase B needs more time.
- If Phase B regresses something, reverting Pro's commit alone restores the previous
  `render_block_motto/*` closures; Free's Phase A hooks stay in place (harmless, unused).

## 10. Change Log
- v0.1: Initial draft, scoped from the motto-blocks architecture audit (2026-09-17/18
  session) that flagged `pro/motto-blocks-pro.php`'s HTML-string coupling to Free's
  `save()` output as the highest-severity Free/Pro architecture finding.
- v0.2: Simplified the three data contracts (§5.1, §5.2, §5.4) after discovering, during
  Phase A implementation, that every attribute the class-merge/style-declaration helper
  functions depend on (`backgroundParallax(Offset)`, `linkContainerNewTab`,
  `linkContainerNoFollow`, `imageParallax(Offset)`) is already Free-schema and therefore
  already reachable from `$attrs` inside Free's own hook callback. Dropped
  `extra_class`/`child_class`/`target`/`rel`/`img_style`/`img_class` from the three
  override/payload shapes — Free derives them directly from `$attrs` instead of Pro
  computing and passing them through. Pro's contribution narrows to exactly the values
  only Pro's dynamic-resolution logic can produce (a URL, an image payload, a
  parallax-adjusted style string tied to the *dynamically resolved* attachment).
- v0.3: Status → Active. Both phases implemented: Phase A (Free-owned hooks/mutators)
  and Phase B (Pro migrated, dead code deleted, `pro/motto-blocks-pro.php` 774 → 354
  lines). All acceptance criteria met except live browser verification of Phase B's
  dynamic-source paths against real content, which remains open (tracked in §9).
- v0.4: Fixed a real fatal error hit on a live site immediately after v0.3 shipped —
  `Undefined constant "MOTTO_HOOK_IMAGE_SOURCE"` — caused by Pro's 4 `add_filter()`
  calls sitting at file top level instead of deferred to `plugins_loaded`. See §7 for
  the root cause and fix; reproduced and verified against the exact failure before
  closing.
- v0.5: Closed the last open item — manually verified in the browser against real
  dynamic sources (ACF background image, dynamic container link, dynamic image
  source). Both phases fully done; no further work planned under this spec.
