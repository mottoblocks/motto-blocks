# motto/list

## Purpose

Bulleted/numbered list wrapper. Its only children are `motto/list-item` blocks (`ALLOWED_BLOCKS = ["motto/list-item"]` in `index.jsx`); it owns the shared bullet configuration (`bulletOptions`) and pushes it down to every item via block context (`providesContext: { "motto/bulletOptions": "bulletOptions" }`). `mottoBaseLayout` is `"flow"` — the list itself is a plain block-level element; the flex-row layout (bullet + text) lives on each `motto/list-item` instead.

Renders as `<ol>` when the resolved bullet type is `counter`, otherwise `<ul>` — see Behavior.

## Attributes contract

Non-obvious fields only — see `block.json` for the full list and defaults.

- **`bulletOptions`**: `{ type: "default"|"image"|"icon"|"svg"|"counter"|"none", image: {id,url}, svg: {source,inline,lucideIcon}, counter: {style,start} }`. This is the block-level default that every child list-item inherits through context unless a given item sets `overrideBullet: true`. Default type is `"icon"` with `svg.lucideIcon: "star"`.
- **`mottoDefaults.css.desktop`** sets `--bullet-size: 30px` and `--bullet-color: blue` on the block by default — these custom properties (not dedicated attributes) are the only way to control bullet size/color from the Styler.
- **`mottoDefaults.blockSelectors`** exposes one extra Styler target, `&{BLOCK} :where(.motto-list-item)` ("List Items"), which only surfaces a `padding` control on desktop. This is the list's mechanism for controlling per-item spacing without list-item needing its own spacing control.

## Behavior

- **Tag selection**: `ListTag = bulletOptions.type === "counter" ? "ol" : "ul"`, computed identically in `edit()` and `save()` from the list's *own* `bulletOptions`, not from any child. If an individual item overrides its own bullet to `"counter"` while the list's own type is something else, that item still gets numbered visually (see list-item's README) but the wrapping tag stays `<ul>`.
- **Numbering is CSS-counter-driven, not native**: `list.scss` sets `list-style: none` and renders digits/letters via `counter-increment`/`content: counter(...)` on `.motto-list-item__bullet--counter*`. The `<ol>` tag and its `start` attribute are semantic/accessibility fallbacks, decoupled from the actual visible marker, which is produced by the inline `counterReset: motto-list-item ${counterStart - 1}` style set in JS.
- **`--motto-counter-start`** is set as an inline custom property in both `edit()` and `save()` but is not referenced anywhere in `list.scss` — currently dead in the shipped styles (likely reserved for a future/Pro override hook); the actual start-offset mechanism is the inline `counter-reset` value, not this variable.
- **Editor vs. frontend**: no divergence — `edit()` and `save()` compute the same tag, same `listStyle`, and the same data attributes via the shared `getListDataAttributes()` helper.
- **Root data attributes** (`data-bullet-type`, `data-counter-style`, `data-bullet-image-url`, `data-bullet-svg-source`, `data-bullet-lucide-icon`) reflect the list's own `bulletOptions` and are set on `.motto-list`. None of them are read by any CSS or JS in this codebase — `list.scss` keys its bullet styling off `data-resolved-bullet-type` on `.motto-list-item` instead. They appear to be reserved hooks for external targeting rather than actively consumed.
- **Insertion**: template inserts 3 `motto/list-item` blocks with only `content` set (no `bulletOptions`); `templateLock: false` so items can be freely added, removed, or reordered, but no other block type can be inserted.

## Transforms

- `transforms.from` (`index.jsx`, `SDD-023`) accepts `core/list` from the block toolbar's "Transform to" control. `transformCoreList()`/`transformCoreListItem()` map `ordered`/`start` → `bulletOptions` (`ordered: true` → `{ type: "counter", counter: { style: "decimal", start } }`, `ordered: false` → `{ type: "default" }`) and recurse into each `core/list-item`'s own `content` + any nested `core/list` (via `allowedBlocks: ["core/list"]` on core's own item), preserving sub-lists as nested `motto/list` blocks.
- `transforms.to` (`SDD-023`) is the mirror: `transformMottoListToCore()`/`transformMottoListItemToCore()` map `bulletOptions.type === "counter"` → `{ ordered: true, start: bulletOptions.counter.start }`, any other bullet type → `{ ordered: false }`. This is lossy for `image`/`icon`/`svg`/`none` bullet types — core has no equivalent marker system, so converting one of those to `core/list` silently falls back to a plain unordered `<ul>`. Nested `motto/list` sub-lists are preserved as nested `core/list`.
- Not mapped in either direction: `reversed` (no `bulletOptions` equivalent) and the legacy `type` HTML attribute (`1`/`a`/`A`/`i`/`I`) — rarely populated by current Gutenberg, silently dropped if present on the `from` side, never emitted on the `to` side.

## Implementation notes

- `normalizeBulletOptions()` (`src/components/controls/bullets/bullet-options.js`) is the single source of truth for coercing/validating `bulletOptions`, shared verbatim with `motto/list-item`. It also absorbs a legacy flat-attribute shape (`bulletType`, `bulletImageUrl`, `bulletSvgSource`, …) as fallback values, and retypes a bare `type: "svg"` to `"icon"` vs `"svg"` based on `svg.source` when no explicit type was given — a migration heuristic for older data.
- `getListDataAttributes()` (`index.jsx`) is shared between `edit()`/`save()`, but the `counterStart` clamping and `listStyle` (inline `counterReset`/`--motto-counter-start`) calculations are duplicated inline in both instead of being extracted — keep both copies in sync if this logic changes.
- `BulletSelector` (`src/components/controls/bullets/bullet-selector.jsx`) is the shared Inspector UI for editing `bulletOptions`; on `motto/list` it always edits the block's own (shared) value, whereas on `motto/list-item` it's only rendered when `overrideBullet` is on.
- Because the parent→child link is pure block context (`providesContext`/`usesContext`), there is no direct data flow — a list item only picks up a parent bullet change once its own `edit()` re-renders with the new context value and its sync effect runs. See `src/blocks/list-item/README.md` for the resulting editor/save divergence this can cause.

## Known limitations

- No "reversed" list support and no ordering control beyond native inner-blocks drag/drop.
- Bullet size/color are only exposed via the `--bullet-size`/`--bullet-color` custom properties (through `mottoDefaults` or the Styler); there's no dedicated bullet-size/color panel field on the list block itself.
- The `blockSelectors` entry only exposes `padding` for `.motto-list-item`; other per-item styling (bullet size/color, gap) has to go through the shared custom properties or by selecting the child block directly.

## TODO

- `--motto-counter-start` (Implementation notes) is set inline but never read by `list.scss` — wire it up or stop setting it.
