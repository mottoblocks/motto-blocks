# motto/accordion

## Purpose

Parent wrapper block for a list of `motto/accordion-item` children (FAQ sections, collapsible content groups). Renders a fixed `<div class="motto-accordion ...">` — unlike `motto/container` there is no configurable `tagName`. Supports `anchor` and `align: ["wide", "full"]`; `html` support is disabled. `mottoBaseLayout` is `"flow"`, and `mottoDefaults.css` seeds the block with `display: flex; flex-direction: column; gap: 1em` via the Styler on insert.

Only `motto/accordion-item` blocks may be inserted as direct children (`allowedBlocks` in `useInnerBlocksProps`, mirrored by `parent: ["motto/accordion"]` on the item's own `block.json`) — the relationship is enforced from both sides. See `../accordion-item/README.md` for the child block.

## Attributes contract

Non-obvious fields only — see `block.json` for the full list and defaults.

- **`closeOtherItems`** (bool, default `false`) — accordion-style mutual exclusion. Exposed to children via `providesContext: { "motto/accordion-closeOtherItems": "closeOtherItems" }` and mirrored onto the saved wrapper as `data-close-other-items` (read by `accordion-frontend.js`). Enforced in three independent places: the accordion's own dedup `useEffect` (persisted attribute cleanup, see Behavior), the accordion-item's "Open by default" toggle handler (immediate sibling close), and the frontend runtime's `initAccordion()` (keeps only the first `is-open`/`data-open="true"` item on load).
- **`mottoDefaults.blockSelectors`** — declares three extra Styler-exposed sub-targets beyond the block's own root selector: the trigger (`.motto-accordion-item__trigger`), the trigger in its open state (`:where(.is-open .motto-accordion-item__trigger)`), and the panel content (`.motto-accordion-item__panel-inner`), each with baseline default CSS (padding, border, color, font-size). These are plain class-name selectors, so they kept resolving correctly after SDD-024 split the trigger/panel markup into `motto/accordion-trigger`/`motto/accordion-panel`'s own `save()` output — CSS doesn't care which block rendered a class.
- No `allowedBlocks` restriction exists on the *panel* contents of items — that permissiveness belongs to `motto/accordion-panel` (as of SDD-024; it used to be `motto/accordion-item` directly), not this block.

## Behavior

- **Editor-only preview state is separate from persisted state.** `AccordionEditorContext` (`editor-context.js`) holds `editorOpenItemIds` (array) and `editorActiveItemId` (string) — ephemeral, not saved attributes — and is provided by this block's `Edit` to every descendant `motto/accordion-item`. This lets an item visually expand in the canvas for editing without writing to its persisted `isOpen` attribute. The `providesContext`/`usesContext` pair in `block.json` only carries the persisted `closeOtherItems` value; the open/active ids travel exclusively through this React context, not block context.
- **Item id dedup**: a `useEffect` in `Edit` runs on every change to `itemBlocks` (via `getBlocks(clientId)`) and calls `updateBlockAttributes(itemBlock.clientId, { itemId: generateAccordionItemId() })` on any item whose `itemId` is empty or already seen — this is what fixes up duplicated/copy-pasted items sharing an id. `motto/accordion-item` also has its own effect that fills a blank `itemId` on mount (see its README); the two are redundant by design since only the parent can see all siblings for duplicate detection.
- **`closeOtherItems` persisted-attribute cleanup**: a second `useEffect` only runs when `closeOtherItems` is true; if more than one child has `attributes.isOpen === true`, all but the first are force-closed via `updateBlockAttributes(..., { isOpen: false })`.
- **Editor state cleanup**: two more effects prune `editorOpenItemIds`/`editorActiveItemId` when items are removed, and reset `editorOpenItemIds` to `[]` whenever `closeOtherItems` is switched on.
- **Frontend toggle + height animation**: `assets/js/accordion-frontend.js` initializes each `.motto-accordion` found on the page (idempotent via a `data-motto-accordion-init` guard). It measures each panel's content height into a `--motto-accordion-panel-height` CSS custom property (`panelInner.scrollHeight`) because CSS cannot transition `max-height` to `auto`; `.motto-accordion-item__panel` transitions `max-height` between `0` and that variable (see `../scss/accordion.scss`). A `ResizeObserver` on the panel's inner content and a `window` `resize` listener keep the measured height in sync after images load or layout shifts.
- **Editor canvas skips the measured-height transition**: `../scss/accordion.editor.scss` sets `max-height: none; overflow: visible` on `.is-open` panels instead of relying on the CSS variable, since the frontend runtime's `ResizeObserver`/ scroll-height measurement doesn't run against the editor's React-rendered DOM.
- **Frontend script auto-registration**: `assets/js/accordion-frontend.js` needs no manual PHP wiring — `motto_blocks_build_block_registration_args()` in `includes/helpers.php` auto-discovers any `assets/js/{slug}-frontend.js` file by block slug convention and registers it as the block's `view_script_handles`. Contrast with `motto/container`'s parallax runtime, which needs extra GSAP dependencies and is registered by hand.

## Implementation notes

- `generateAccordionItemId()`, `normalizeAccordionItemId()`, `getAccordionTriggerId()`, `getAccordionPanelId()`, and (as of SDD-024) `computeIsEditorOpen()` live in `utils.js` and are imported across the whole family (`motto/accordion-item`, `motto/accordion-trigger`, `motto/accordion-panel`) for id generation, `aria-controls`/`aria-labelledby` wiring, and the shared "is this item open in the editor" computation.
- `motto/accordion` itself is unaffected by SDD-024's trigger/panel split beyond its own `TEMPLATE` dropping the `{ label: "Item 1" }`/`{ label: "Item 2" }` attribute seed (that attribute moved to `motto/accordion-trigger`'s `InnerBlocks` content, which this block's template has no way to seed directly — see `motto/accordion-item`'s README, Known limitations). Its own `templateLock: false` already made it immune to the `templateLock: "all"` remount-deletion regression found and fixed in `motto/tabs` (SDD-022 §4.5); the *new* `templateLock: "all"` surface SDD-024 introduces is one level deeper, in `motto/accordion-item`'s own trigger/panel split.
- `AccordionEditorContext` (`editor-context.js`) is the only channel carrying ephemeral editor UI state between parent and children; it's a plain `createContext`, provided once per accordion instance in `Edit`.
- No `render.php` — fully static, `Save`-based block (`InnerBlocks.Content`), same pattern as `motto/container`.
- No `deprecated` entries yet.

## Known limitations

- No transform to/from other blocks (no `core/group`-style conversion, no `ungroup`), unlike `motto/container`.
- The `closeOtherItems` persisted-attribute cleanup effect only runs on this parent's re-render when `itemBlocks` changes — it corrects multiple persisted-open items after the fact rather than preventing the invalid state from ever being briefly present in the block tree.
