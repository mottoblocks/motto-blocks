# motto/buttons

## Purpose

Group wrapper block for one or more `motto/button` children — a flex container for CTA groups (e.g. "Learn more" + "Contact us" side by side). Parent half of a parent/child pair: `motto/buttons` is the only block `motto/button` can live in (`motto/button`'s `block.json` declares `"parent": ["motto/buttons"]`, and this block's own `allowedBlocks`/template restrict it to only accepting `motto/button` — see `src/blocks/button/README.md`). Renders as a plain `<div>` with `mottoBaseLayout: "flex"`.

## Attributes contract

Only `mottoStyler` (object) — no block-specific attributes beyond the shared Styler payload. `mottoDefaults.css.desktop` in `block.json` seeds `display: flex`, `flex-direction`, `flex-wrap`, and `justify-content` as Styler-editable properties (empty/unset defaults except `display`), not inline styles baked into the markup.

## Behavior

- **Editor**: `ALLOWED_BLOCKS = ["motto/button"]` and `TEMPLATE = [["motto/button"]]` (`index.jsx`) restrict inserted content to `motto/button` only and auto-scaffold one button on block creation. `templateLock: false` still allows freely adding/removing/reordering buttons within that restriction. `orientation: "horizontal"` sets keyboard-arrow navigation direction for the block list. The block does not override `renderAppender`, so Gutenberg uses the same core appender behavior as `motto/container`.
- **Frontend**: identical markup to the editor, produced via `useInnerBlocksProps.save` — no dynamic rendering (no `render.php`).
- **No transforms**: unlike `motto/container`, there is no conversion path from `core/buttons`, `core/group`, or any other block.

## Implementation notes

- Both `edit` and `save` build the same class list, `motto-buttons ${BASE_LAYOUT_CLASS}`, where `BASE_LAYOUT_CLASS` comes from `getMottoBaseLayoutClassName(metadata.mottoBaseLayout)` (`src/styler/layout/base-layout.js`) and resolves to `motto-base-layout-flex`.
- Block inserter icon is lucide-react's `Ungroup` (`registerBlockType`'s `icon.src` overrides `block.json`'s `"button"` dashicon fallback).

## Known limitations

- `allowedBlocks` on this block prevents inserting anything other than `motto/button` through the UI, but there's no depth/count guard — any number of buttons can be added.
- Layout is hardcoded to `mottoBaseLayout: "flex"` in `block.json`; there's no per-instance option in this block's own code to switch to another base layout (grid, inline-flex, etc.) — that would have to come from Styler overriding `display` directly.
