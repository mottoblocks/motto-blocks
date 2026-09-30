# motto/button

## Purpose

Individual button — an anchor (`<a>`) with editable text, a link (static URL or Pro dynamic source), and an optional icon (image, Lucide icon, or inline SVG) positioned before or after the text. Child half of a parent/child pair: `block.json` declares `"parent": ["motto/buttons"]`, so this block can only be inserted inside a `motto/buttons` group (which in turn only accepts `motto/button` — see `src/blocks/buttons/README.md`). `mottoBaseLayout: "inline-flex"`.

## Attributes contract

Non-obvious fields only — see `block.json` for the full list and defaults.

- **`text`**: `RichText` HTML sourced from `.motto-button__text`, not a plain string attribute.
- **`url` / `linkTarget` / `rel`**: sourced as attributes from the saved `.motto-button` anchor's `href` / `target` / `rel` — there are no `default` values in `block.json`; everything is read back from the saved markup.
- **`rel` is never edited directly** — it's derived combinatorially by `buildRelValue()` (`index.jsx`) from `linkTarget === "_blank"` (adds `noopener noreferrer`) and `noFollow` (adds `nofollow`), while preserving any other existing tokens already in `rel`.
- **`iconOptions`**: `{ type: "none"|"image"|"svg", image: { id, url }, svg: { source: "inline"|"lucide", inline, lucideIcon } }`. `type` selects which slot is active; when `type === "svg"`, `svg.source` further picks between a Lucide library icon (`svg.lucideIcon`) and raw pasted markup (`svg.inline`) — both are kept in state simultaneously so switching source doesn't discard the other. Always read through `normalizeButtonIconOptions()` (`src/components/controls/button-icons/button-icon-options.js`), which coerces missing/malformed values back to safe defaults via `toSafeString`/`toSafeNumber` rather than trusting stored attributes as-is.
- **`iconPosition`**: `"left"` (default) or `"right"`; any other stored value normalizes to `"left"` via `normalizeIconPosition()`.
- **`linkDynamic`**: object, Pro-only dynamic URL source. This block stores/passes it through (to `MottoLinkControl`) but never reads it itself in `edit` or `save` — see Known limitations.
- **`noFollow`**: boolean, independent of both `url` and `linkDynamic`.

## Behavior

- **Editor vs. frontend**: in the editor the `<a>` has `onClick={(event) => event.preventDefault()}`, and `button.editor.scss` additionally sets `pointer-events: none` on `.motto-button` (scoping `pointer-events: auto` back onto `.motto-button__text` only) — both mechanisms exist together so the block is inert except for clicking into the `RichText` to edit the label. Frontend `save()` renders a real, clickable `<a>`.
- **Link editing is duplicated in two places**, both writing to the same `url`/`linkTarget`/`noFollow`/`linkDynamic` attributes: a `BlockControls` toolbar `ToolbarButton` (`Link2` icon) that opens a `Popover` containing `MottoLinkControl` (`variant="link-control"`), and an always-visible `InspectorControls` → "Button Settings" panel with the same control.
- **Dynamic link UI**: when `linkDynamic` has a resolvable mode (`hasDynamicLinkSource()` in `src/components/controls/link/dynamic-link-utils.js`), the `link-control` variant hides the raw URL field (`hideUrl={isDynamic}`) so the Pro dynamic-URL section — registered via the `motto.blocks.linkSource.dynamicSection` filter (`applyFilters` in `motto-link-control.jsx`) — takes over instead. When no Pro filter is registered, Free renders a disabled "Dynamic URL" toggle stub, mirroring `motto/container`'s Pro-feature-stub pattern for backgrounds/links.
- **Icon toggle**: the "Show icon" `ToggleControl` flips `iconOptions.type` between `"none"` and the last non-`"none"` type, defaulting to `"svg"` the first time it's enabled from scratch.
- **`iconEnabled` vs. actual rendering**: `iconEnabled` (`iconOptions.type !== "none"`) only controls whether the Icon panel's position/selector controls are shown in the sidebar. Whether an icon actually renders on the button uses a separate check, `hasConfiguredButtonIcon()` (`button-icon-media.jsx`), which additionally requires real content (a non-empty image URL, a chosen Lucide icon name, or non-empty inline SVG markup) — so enabling the icon toggle with nothing selected yet renders nothing.
- **Legacy class cleanup**: a `useEffect` in `index.jsx` strips any `wp-block-button` token from `attributes.className` via `removeLegacyCoreButtonClass()`, calling `setAttributes` automatically if one is found. This exists because the block's own hardcoded wrapper classes already include `wp-block-button__link wp-element-button` (for theme.json/global-styles core-button compatibility) but deliberately not the outer `wp-block-button` wrapper class.
- **No transforms**: no conversion path from `core/button`.

## Implementation notes

- `ButtonIconMedia` (`src/components/controls/button-icons/button-icon-media.jsx`) is the single render function shared by `edit` and `save` for the icon `<span>` content: image type → `<img>`; Lucide type → `<LucideIcon iconName=... size="100%" />`; inline-SVG type → markup passed through `sanitizeInlineSvgMarkup()` (`src/lib/inline-svg-sanitizer.js`, which allowlists tags/attributes) and injected via `dangerouslySetInnerHTML`. Keep new icon rendering paths flowing through this function rather than inlining markup at either call site.
- Icon color/size are CSS custom properties set in `button.scss` (`--icon-color: currentColor`, `--icon-size: 1em`), not inline styles or attributes — Lucide icons get `stroke: var(--icon-color)`, inline SVGs get `fill: var(--icon-color)` applied to descendants via `:where(.motto-button__icon-media-inline) :where(svg, svg *)`.
- `iconPosition` drives two independent things that must stay in sync: a `motto-button--icon-${iconPosition}` class on the block wrapper itself, and the actual JSX placement of the icon `<span>` before/after the `RichText`.
- General Lucide icon selection/rendering (`LucideGallery`, `LUCIDE_ICON_REGISTRY`, `LucideIcon`) is the plugin's shared Lucide infrastructure, reused as-is here — not re-documented in this file.
- Block inserter icon is lucide-react's `SquareMousePointer` (`registerBlockType`'s `icon.src` overrides `block.json`'s `"button"` dashicon fallback).
- This block never imports anything from `src/pro/`, matching `motto/container`'s convention — dynamic-link UI is entirely injected via the `motto.blocks.linkSource.dynamicSection` filter.

## Known limitations

- `save()` only ever renders `attributes.url` / `linkTarget` / `rel` into the anchor's `href` / `target` / `rel` — `linkDynamic` is never read at save time by this block. How (or whether) a dynamic URL gets resolved into those attributes is entirely outside this file, mirroring `motto/container`'s dynamic background/link pattern; nothing in this block's own code performs that resolution.
- `iconOptions.type` is a single active slot (none/image/svg) — image and Lucide/inline-SVG choices can't be combined, though unselected types' data is retained (not discarded) when switching.
- No `deprecated` entries in `block.json` — unlike `motto/container`, there's currently no migration path if the saved markup (class names, wrapper structure) changes in the future.
