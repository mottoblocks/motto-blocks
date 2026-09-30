# Feature Spec: SDD-014 — Conditional Block v1
Version: 0.3
Status: Active
Owner: Blocks (Pro)
Last Updated: 2026-07-18

## 1. Goal
Introduce `motto/conditional`, a Pro-only wrapper block that renders or hides its inner blocks based on a single request/environment condition — device, viewport (media query), URL param, cookie, or language (Polylang/WPML) — evaluated server-side where possible, and via CSS only where server-side evaluation is not possible (viewport).

## 2. Scope

In scope:
- New `motto/conditional` block registration, Pro-only, `src/pro/blocks/conditional/` + `pro/includes/conditional-block-render.php`.
- Five condition types (`condition.type`): `device`, `mediaQuery`, `urlParam`, `cookie`, `language`.
- `condition.matchMode`: `show` | `hide` — inverts the evaluated result.
- Single condition per block instance (no AND/OR combinators).
- Discriminated per-variant data contract (see `docs/conventions/architecture.md` § Discriminated Type Attributes).
- Dynamic `render_callback` gating for `device` / `urlParam` / `cookie` / `language` — inner content fully absent from frontend HTML when the condition fails (real SSR gate, not CSS-hidden).
- CSS-only display gating for `mediaQuery`, delivered via Path 1 (`wp_head`, per `docs/conventions/styler-css-loading.md`), reading real breakpoint thresholds from `config/motto-breakpoints.json`.
- Editor-only preview toggle (`BlockControls`, Eye/EyeOff — same pattern as `panel-trigger`) to force-preview inner content regardless of the condition.
- Consolidation of the `config/features.json` roadmap: `visibility` renamed to `conditional`; `block-conditional-visibility` removed (media query is now one of this block's condition types, not a separate feature).

Out of scope (v1):
- Multiple/combinable conditions (AND/OR) — candidate for v2.
- User role, page type, or ACF-value conditions (present in the original `visibility` roadmap note; not part of this v1's five types).
- Device classes beyond `mobile` / `desktop` (no tablet distinction, no UA-parsing library).
- Full-page cache vary-by-cookie/param/language strategy — flagged as a known limitation, not solved here.
- Any Free-tier stub, badge, or informational listing for this block — it is hard-gated and Free never registers it.

## 3. Current Behavior
Neither `motto-blocks` nor `motto-blocks-pro` has a block-level conditional-rendering mechanism today. All existing Pro blocks (`panel-trigger`, `marquee`) are static-save blocks with no PHP `render_callback` — `motto/conditional` would be the first dynamic block in the registry. `motto-dynamics` handles data-sourcing (queries, ACF/meta) but not request/environment gating, and was deliberately ruled out as the home for this feature (domain mismatch: data-sourcing vs. context-gating). The Styler's unrelated `motto-conditional-classes.json` mechanism maps CSS prop values to marker classes and is not reused here.

## 4. Target Behavior

1. `motto/conditional` appears in the inserter only when `motto-blocks-pro` is active; Free never registers the real block (Registration boundary, `docs/free-pro-strategy-and-boundaries.md`).
2. The block wraps arbitrary `InnerBlocks` with no restricted template (unlike `panel-trigger`'s rigid two-child family) — closer to `container`.
3. `condition` attribute defaults to `{ type: "device", matchMode: "show", device: { deviceType: "mobile" } }`.
4. Inspector (`InspectorControls`, one `PanelBody` "Condition") shows, top to bottom: a `SelectControl` condition-type picker (5 options), a `matchMode` show/hide toggle, then only the fields for the active variant:
   - `device`: `SelectControl` Mobile/Desktop.
   - `mediaQuery`: `SelectControl` breakpoint (from `BREAKPOINT_KEYS`) + `SelectControl` direction (Up/Down).
   - `urlParam` / `cookie`: `TextControl` name + `matchType` toggle (Exists/Equals) + `TextControl` value, the value field only rendered when `matchType === "equals"`.
   - `language`: `SelectControl` populated from `GET /motto-blocks-pro/v1/languages` (see §5). If the request returns an empty list (no Polylang/WPML active), the panel shows a warning notice instead of the select — same pattern as the Maps block's missing-API-key warning.
   - Same `SelectControl`-driven discriminator + conditional-fields pattern already used by `ImageSourceDynamicControl.jsx` for `imageDynamic.imageSourceMode`.
5. `save()` outputs `<InnerBlocks.Content />` wrapped in `blockProps` — the full inner markup is always serialized into `post_content`, regardless of the condition. The gate lives entirely in the render callback, not in `save()`.
6. Server-evaluated types (`device`, `urlParam`, `cookie`, `language`): `motto_pro_render_conditional_block( $attributes, $content, $block )` evaluates the condition, applies `matchMode`, and returns `$content` unchanged or `''`. When it returns `''`, the inner content does not exist in the response HTML (verifiable via view-source, not just visually hidden).
7. `device`: true when `deviceType === 'mobile'` matches `wp_is_mobile()`, or `deviceType === 'desktop'` matches `! wp_is_mobile()`.
8. `urlParam` / `cookie`: `matchType: "exists"` checks key presence only; `matchType: "equals"` additionally compares the sanitized value with strict string equality.
9. `language`: current language resolved via `pll_current_language( 'slug' )` when Polylang is active, else `apply_filters( 'wpml_current_language', null )` when WPML is active — same calls already used in `motto-dynamics/includes/terms-query-block.php:140-173`. If neither plugin is active, the condition cannot be evaluated.
10. `mediaQuery` type: the render callback always returns `$content` unchanged and adds `data-motto-conditional-mq="{instanceId}"` to the wrapper. A `wp_head`-time hook (Path 1) collects breakpoints in use on the page and prints `@media` rules (`display: none`) sourced from `config/motto-breakpoints.json` — never a hardcoded pixel value.
11. **Fail-open principle**: whenever a condition cannot be evaluated — Pro deactivated (falls back to WordPress's native unregistered-block behavior, which outputs the raw saved `InnerBlocks.Content` unconditionally) or a required dependency is missing (no Polylang/WPML active for a `language` condition) — the block shows its content rather than hiding it. Visibility gating must never silently delete published content because of an environment gap.
12. Editor `edit()`: inner content is always visible to the author while editing (`BlockControls` Eye/EyeOff toggle only affects local editor-preview state, never persisted attributes), plus a text badge summarizing the active condition (e.g. "Visible if: cookie `consent` exists").

## 5. Data Contract

- Inputs:
  - Block attribute `condition` (object, discriminated per-variant shape — see `docs/conventions/architecture.md` § Discriminated Type Attributes):
    ```js
    condition: {
      type: "device" | "mediaQuery" | "urlParam" | "cookie" | "language",
      matchMode: "show" | "hide",
      device:     { deviceType: "mobile" | "desktop" },
      mediaQuery: { breakpoint: BreakpointKey, direction: "up" | "down" },
      urlParam:   { name: string, matchType: "exists" | "equals", value: string },
      cookie:     { name: string, matchType: "exists" | "equals", value: string },
      language:   { languageCode: string }
    }
    ```
  - Request context for server types: `$_GET`, `$_COOKIE`, `wp_is_mobile()`, active multilingual plugin's current-language accessor.
  - Site breakpoint config for `mediaQuery`: `config/motto-breakpoints.json` (`BREAKPOINT_KEYS`).
  - Editor-only: `GET /motto-blocks-pro/v1/languages` — new REST route, registered in `pro/includes/conditional-block-render.php` following the exact pattern of `motto-blocks-pro/v1/dynamic-image-preview` (`pro/includes/dynamic-image-resolver.php:457-476`: `READABLE`, `rest_api_init`, `edit_posts`-gated permission callback). Response: `[{ code: string, label: string }]`, built from `pll_languages_list()` (Polylang) or the `wpml_active_languages` filter (WPML, distinct from the single-language `wpml_current_language` filter used at render time) — empty array if neither plugin is active, which drives the Inspector warning state in §4.4.
- Persistence:
  - `condition` under `motto/conditional` block attributes.
  - Inner blocks fully serialized via standard `InnerBlocks.Content` in `save()` — never conditionally omitted at save time.
- Outputs:
  - Editor: inner content always rendered in canvas; Eye/EyeOff toggle (local state) + condition-summary badge.
  - Frontend: full inner HTML present (condition passes, or fail-open), or completely absent from the response (condition fails, server type), or present + CSS-hidden by breakpoint (`mediaQuery`).

## 6. Acceptance Criteria
- [ ] `motto/conditional` inserts and saves with arbitrary inner blocks, no template restriction.
- [ ] Free build never registers `motto/conditional` under any configuration.
- [x] `render_callback` wiring reaches WordPress correctly (`WP_Block_Type_Registry` shows it registered; confirmed via real HTTP requests, 2026-07-15).
- [x] `urlParam` / `cookie`: verified correct via real HTTP requests (exists + equals, both match and mismatch) — content fully absent from HTML (not CSS-hidden) when the condition fails.
- [ ] `device`: logic verified correct in an isolated clean test (`wp_is_mobile()` behaved correctly once), but repeated re-tests on this dev install showed `wp_is_mobile()` itself returning inconsistent results across identical requests — suspected PHP-FPM worker-pool staleness on this specific Local install, not a code defect. Needs a clean re-test (e.g. after restarting PHP-FPM) before checking this off with confidence.
- [x] `language`: fully verified via real HTTP requests against `housing-hub.local` with Polylang configured (`en`/`fr`, 2026-07-20). Fail-open path confirmed earlier on two sites with no plugin active (`greenwood.local`, `housing-hub.local` pre-setup). Positive path confirmed on a real `/fr/` request: `language=fr` matches (shows), `language=en` doesn't (hides); `matchMode: hide` correctly inverts both directions; a real mismatch (`zz-nonexistent`) correctly fails.
- [x] `matchMode: "hide"` correctly inverts genuine (non-fail-open) evaluation results — verified for `urlParam`/`cookie`/`device`/`language`.
- [ ] `mediaQuery`: content always present in HTML; generated `@media` rule matches the site's real configured breakpoint value, updates correctly if breakpoints are changed in admin settings.
- [x] `language` with no Polylang/WPML active: `GET /motto-blocks-pro/v1/languages` returns `[]` (confirmed on 2 sites); frontend fails open for both `show` and `hide` matchMode (see §7 bug fix). Editor warning-state UI not visually confirmed (no browser used).
- [x] `GET /motto-blocks-pro/v1/languages` returns the real active language list — confirmed against live Polylang (`[{code: en, label: English}, {code: fr, label: Français}]`), `edit_posts` gate confirmed (401 unauthenticated).
- [ ] Pro deactivated: previously saved `motto/conditional` content still renders on the frontend (fails open), no fatal errors.
- [ ] Editor Eye/EyeOff toggle previews inner content regardless of condition; never mutates saved attributes.
- [ ] `npm run build`, `npm run lint`, `npm run validate:boundaries` pass.

## 7. Risks and Mitigations
- Risk: full-page/edge cache (e.g. WP Engine) serves one cached render to all visitors, breaking `urlParam` / `cookie` / `language` conditions that must vary per-request.
  - Mitigation: document as a known v1 limitation; recommend excluding pages using these condition types from full-page cache. Cache-vary strategy is a v2 candidate, not solved here.
- Risk: Polylang and WPML expose current-language through different, incompatible APIs; a detection bug could mis-evaluate visibility site-wide.
  - Mitigation: fail-open default (§4.11) limits blast radius to "shows when it shouldn't" rather than "hides published content"; add an automated test per plugin.
- Risk: `wp_is_mobile()` is UA-string based and known to be imprecise (misses many tablets, breaks under UA spoofing/some proxies).
  - Mitigation: accepted trade-off, decided explicitly in this spec (§ Scope) in exchange for zero new PHP dependencies. Revisit only if it becomes a recurring support issue.
- Risk (resolved 2026-07-15): this was the first `render_callback`-based block in the Free/Pro registry. Verified: `motto_blocks_do_register_block()` / `motto_pro_register_block()` correctly pass through `render_callback` via merged `$extra_args`; `WP_Block_Type_Registry` confirms the block registers with `motto_pro_render_conditional_block` wired.
- Risk (new, found during verification): `wp_is_mobile()` behaved inconsistently across repeated identical real HTTP requests on the local dev install used for testing — suspected PHP-FPM worker-pool staleness, unconfirmed root cause. Affects any feature using `wp_is_mobile()`, not specific to this block.
  - Mitigation: none yet; needs a clean re-test after a PHP-FPM restart before trusting `device` condition results on that install.
- Bug (found and fixed 2026-07-18): fail-open results (`null` internally) were still passed through `matchMode` inversion — a fail-open `language`/`urlParam`/`cookie` condition combined with `matchMode: "hide"` inverted "always show" into "always hide," the exact opposite of §4.11. Root cause: the per-type evaluators returned plain `true` for "cannot evaluate," indistinguishable from a genuine positive match, so `!$result` silently flipped it. Fixed by having evaluators return `null` for "cannot evaluate" and checking for `null` before applying `matchMode`, not after. Verified via real HTTP requests on a site with no Polylang/WPML active (`http://greenwood.local`): all fail-open + `matchMode: hide` combinations now correctly show content; normal (non-fail-open) evaluation paths re-verified unaffected.
- Risk: authors reviewing a published page may be confused why content they know exists doesn't render, since it's genuinely absent from HTML (no frontend indicator by design).
  - Mitigation: editor-side Eye/EyeOff toggle + condition badge is the only surface for this; no frontend indicator is planned (would defeat the purpose of true hiding).

## 8. Test Plan
Automated:
- `npm run build`
- `npm run lint`
- `npm run validate:boundaries`

Manual:
- Insert the block with each of the 5 condition types; verify Inspector shows only the relevant fields per type.
- For `device`, `urlParam`, `cookie`, `language`: toggle the condition to fail and confirm (view-source) the inner HTML is fully absent, not just hidden.
- Toggle `matchMode` between `show`/`hide` and confirm inverted behavior for each type.
- For `mediaQuery`: resize viewport across the real configured breakpoints; confirm content hides/shows at the exact threshold, with content still present in DOM when hidden.
- Change a breakpoint value in admin settings; confirm the generated `@media` rule updates accordingly.
- With Polylang active, confirm the Inspector's language select is populated from `GET /motto-blocks-pro/v1/languages`; repeat with WPML active.
- Deactivate Polylang/WPML with a `language` condition saved; confirm editor warning and frontend fail-open (content shows).
- Deactivate `motto-blocks-pro` entirely with saved `motto/conditional` content; confirm frontend still renders the inner content, no fatal errors.
- Use the Eye/EyeOff toggle in editor; confirm it never persists to saved attributes (reload editor, toggle resets).

## 9. Rollout Plan
Phase A (shipped): `device`, `urlParam`, `cookie` condition types (fully server-side, lowest implementation risk, no external plugin dependency). Verified via real HTTP requests against a live install — see Change Log v0.2 verification note.

Phase B (in progress): `language` implemented 2026-07-18 (`motto_pro_evaluate_conditional_language()`, `GET /motto-blocks-pro/v1/languages`, Inspector select + warning state) — not yet functionally verified end-to-end. `mediaQuery` (CSS generation via Path 1) remains unimplemented.

Rollback:
- Render callback stays defensive: any evaluation error must fail open (§4.11) rather than fatal or silently hide content.
- Because `save()` never conditionally omits content, disabling/removing the block registration at any point degrades to "always show" automatically — no data migration needed.

## 10. Change Log
- v0.1: Initial draft, consolidating `visibility` + `block-conditional-visibility` roadmap entries into a single Pro block with 5 condition types.
- v0.2 (2026-07-14): Locked Inspector layout (`SelectControl` discriminator pattern, matching `ImageSourceDynamicControl.jsx`); added `GET /motto-blocks-pro/v1/languages` REST endpoint for the `language` condition's Inspector select; fixed WPML filter name typo (`wpml_current_language`, confirmed against existing usage in `motto-dynamics/includes/terms-query-block.php`).
- v0.3 (2026-07-18): Implemented Phase A (`device`/`urlParam`/`cookie`) and verified `urlParam`/`cookie` + registration mechanics via real HTTP requests against a live install; found and fixed a duplicate registration (auto-format-hook race) and a missing `PRO_BLOCK_SLUGS` entry blocking assembly. Implemented `language` and verified its fail-open path (`greenshift-theme-test` was down for this session, tested against `greenwood.local`/`housing-hub.local` instead). Found and fixed a real fail-open bug: `matchMode: "hide"` was inverting fail-open results into "always hide" for `language`/`urlParam`/`cookie` when unconfigured (see §7). Also fixed a missing `@wordpress/api-fetch` Vite external/global and missing `wp-api-fetch` script dependency, both required for the language Inspector select to load at all. Found unrelated environment issue: `wp_is_mobile()` inconsistent across repeated requests on the `greenshift-theme-test` dev install (see §7).
- v0.4 (2026-07-20): Verified `language`'s positive path end-to-end against a live Polylang install on `housing-hub.local` (real `/fr/` request, `language=fr` matches, `language=en` doesn't, both `matchMode` directions, real mismatch correctly fails) — closes the last open `language` acceptance criteria. `GET /motto-blocks-pro/v1/languages` confirmed returning the real Polylang catalog. Remaining open items: `mediaQuery` (unimplemented), `device` (needs a clean re-test once the `wp_is_mobile()` environment flakiness is resolved), Pro-deactivation fail-open, and editor UI (never visually driven in a browser).
