# motto/counter

## Purpose

Standalone animated number counter. Renders an inline `prefix` / `value` / `suffix` group plus an optional label above or below it, and animates the numeric value from `startValue` to `endValue` via a hand-written `requestAnimationFrame` tween (no external animation library — kept dependency-free for WordPress.org distribution) when it becomes visible on the frontend. No `InnerBlocks` — this is a self-contained leaf block with its own `edit`/`save`, no children.

## Attributes contract

Non-obvious fields only — see `block.json` for the full list and defaults.

- **`step`** is *not* an animation increment. It's purely a display-rounding granularity applied by `roundValueToStep()`/`formatCounterValue()` (`counter-utils.js`) at render time; the underlying tween always progresses continuously between `startValue` and `endValue` — `step` only controls which rounded number gets shown at any given instant.
- **`thousandsSeparatorMode`**: `locale | custom | none`. `locale` uses `Intl.NumberFormat(locale)` and ignores `thousandsSeparator` entirely. `custom` manually inserts `thousandsSeparator` (falling back to `,` if empty) via `formatIntegerWithCustomSeparator()`. `none` strips separators and only trims trailing zeros via `trimTrailingZeros()`.
- **`thousandsSeparator`**: `normalizeSeparatorCharacter()` truncates to a single character (`String(...).slice(0, 1)`) — longer strings are silently truncated.
- **`replayMode`**: `once | replay`. Only meaningful on the frontend; the editor preview ignores it entirely (see Behavior).
- **`respectReducedMotion`**: when true and `prefers-reduced-motion: reduce` matches, the animation is skipped and the value is shown as its final formatted `endValue` immediately, in both editor and frontend.
- All attributes are re-derived through `normalizeCounterAttributes()` (`counter-utils.js`) at every render — `clampNumber()` coerces non-finite input to a fallback and clamps to min/max, and `tagName`/`labelPosition`/`replayMode`/`thousandsSeparatorMode` are validated against fixed option sets (`TAG_OPTIONS`, `LABEL_POSITION_OPTIONS`, `REPLAY_MODE_OPTIONS`, `SEPARATOR_MODE_OPTIONS`), silently falling back to their defaults for any unrecognized value.

## Behavior

- **Editor preview vs. frontend trigger**: the editor (`use-counter-preview.js`) has no scroll/visibility observer — its `useEffect` (re)starts the tween immediately whenever `duration`/`endValue`/etc. change, so it effectively "replays" on every relevant edit regardless of `replayMode`. The frontend runtime (`assets/js/counter-frontend.js`) instead attaches an `IntersectionObserver` (threshold `0.25`) per counter root: on enter it starts the count once (`replayMode: "once"`) or every time (`replayMode: "replay"`); on leave, replay mode also resets the displayed value back to `startValue` via `resetCounter()`.
- **Easing**: `easing` selects one of a fixed set of named eases (`COUNTER_EASING_OPTIONS`/`applyCounterEasing()` in `counter-utils.js`) applied to the tween's 0-1 progress value — linear, three power (quad/cubic/quartic) ease-outs, a back-out, and an elastic-out. Both editor and frontend implement the same six easing functions independently (see Duplicated formatting logic).
- **Duplicated formatting/easing logic**: `counter-utils.js` (editor, ESM) and an inlined near-copy in `assets/js/counter-frontend.js` (frontend, plain IIFE) both implement `clampNumber`/`normalizeSeparatorMode`/`roundValueToStep`/`formatCounterValue` and the `easing` name → function map — the two must be kept in sync manually when changing rounding/formatting/easing behavior.
- **State classes**: `is-counting` / `is-complete` toggle on the block root (`getCounterClassName()` in `index.jsx`, `setState()` in `counter-frontend.js`) and are styled via `mottoDefaults.blockSelectors` in `block.json` (e.g. an opacity change while counting).
- Editor preview and `save()` both render through the shared `CounterMarkup()` component in `index.jsx`, so the two never diverge in DOM shape.

## Implementation notes

- `counter-utils.js` owns all pure logic: `normalizeCounterAttributes()` (attribute validation/coercion), `roundValueToStep()` / `formatCounterValue()` (rounding + thousands-separator formatting), and `getCounterLocale()` (resolves `document.documentElement.lang`, then `navigator.language`, else `undefined` so `Intl.NumberFormat` falls back to the browser default). `counter-utils.test.js` covers normalization defaults, step rounding, and custom/`none` separator formatting.
- `use-counter-preview.js` owns the editor-only tween/rAF state (`displayValue`, `isCounting`, `isComplete`) and is the sole consumer of `getCounterLocale()` + `formatCounterValue()` on the editor side.
- Frontend runtime registration mirrors the Container block's pattern: `motto_blocks_register_counter_assets()` (`includes/assets-frontend-libs.php`) registers `assets/js/counter-frontend.js` as `motto-blocks-counter-view`, depending on `motto-blocks-gsap` only if that handle is already registered; `motto_blocks_register_counter_block()` (`motto-blocks.php`) attaches it via `view_script_handles` and conditionally prepends `motto-blocks-gsap` to `editor_script_handles`.
- No `render_callback` / `render.php` — `motto/counter` is a pure static `save()` block; all frontend behavior comes from `data-counter-*` attributes read by `buildConfig()` in `counter-frontend.js`.

## Known limitations

- `step` is purely cosmetic rounding; it does not change the number of animation "ticks" or otherwise affect the tween itself.
- `thousandsSeparator` only accepts a single character; longer input is silently truncated to its first character.
- Browsers without `IntersectionObserver` run the counter once, unconditionally, on init (see `initCounter()` in `counter-frontend.js`) — there's no polyfill or alternate trigger.
- Formatting/rounding logic is maintained in two independent copies (ESM editor module vs. plain-JS frontend script) with no shared build step between them.

## TODO

- Give the frontend runtime a non-GSAP fallback (Behavior) — right now missing `window.gsap` snaps straight to `endValue` on the frontend, unlike the editor's rAF fallback.
- Reconcile `counter-utils.js` and `counter-frontend.js`'s duplicated formatting logic (Implementation notes) into one shared source, or add a test that fails if they drift.
