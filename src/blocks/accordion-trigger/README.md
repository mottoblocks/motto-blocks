# motto/accordion-trigger

## Purpose

Trigger button inside `motto/accordion-item` (SDD-024) — a `<button class="motto-accordion-item__trigger">` wrapping real `InnerBlocks` content (text + optional icon) plus a fixed, non-optional chevron. Must remain a **direct DOM child** of `.motto-accordion-item` — `accordion-frontend.js` queries `:scope > .motto-accordion-item__trigger`. Introduced by SDD-024 to bring the trigger content model in line with `motto/tab-button` post-SDD-022; see `../accordion-item/README.md` for the parent block and `../accordion/README.md` for the shared toggle/animation mechanics.

`mottoBaseLayout` is `"flex"`.

## Attributes contract

- **`itemId`** / **`isOpen`** — duplicated copies of the parent `motto/accordion-item`'s own attributes, kept in sync one-way by the parent's own effect (see that block's README). Needed here because `save()` has no access to block context — `edit()` instead reads the **live** `motto/accordion-item-itemId`/`motto/accordion-item-isOpen` context values (no one-render sync lag), only falling back to these duplicated attributes at save/frontend-render time.
- No `mottoDefaults` on this block — default and open-state trigger styling (background, color, border, font-size) is configured on `motto/accordion`'s Styler panel instead (`blockSelectors` targeting `.motto-accordion-item__trigger`/`.is-open .motto-accordion-item__trigger`), unchanged from before SDD-024.

## Behavior

- **Content model**: `InnerBlocks` container, `allowedBlocks: ["core/paragraph", "motto/svg"]`, default template `[["core/paragraph", { content: "Accordion item" }]]` (real text, not an empty placeholder — matches the explicit "new tab/item shows real text" requirement from SDD-022/024). Icon is optional, addable/removable via the block appender, order via drag & drop — no `IconPositionToggle` exists on this block.
- **Click-to-toggle** (`handleToggle`, relocated verbatim from `motto/accordion-item`'s pre-SDD-024 `handleToggle`): reads `itemId`/`isOpen`/`closeOtherItems` from block context and `editorActiveItemId`/`setEditorActiveItemId`/`editorOpenItemIds`/`setEditorOpenItemIds` from the ephemeral `AccordionEditorContext` (`../accordion/editor-context.js`) directly — no need to look up the parent's clientId for this, since none of the 3 branches persist `isOpen` on click (that only happens via the parent's own Inspector toggle). No `selectBlock()` call — per the SDD-022 lesson, clicking the trigger's text/icon children should select those children normally, not get hijacked back to the trigger block.
- **`aria-expanded`**: computed via the shared `computeIsEditorOpen()` helper (`../accordion/utils.js`) at edit time (live context inputs); at save/frontend-render time, from the duplicated `isOpen` attribute instead — `accordion-frontend.js` immediately overwrites this on page load regardless (`setItemState()` unconditionally sets it for every item), so the save-time value only matters for the brief pre-JS/no-JS window.
- **Chevron**: fixed `lucide-react` `ChevronDown`, `size={18}`, rendered as a sibling after the `InnerBlocks` content — not part of the optional custom icon, not user-configurable, unchanged from before SDD-024. Its rotation is driven entirely by CSS keyed off the **ancestor** `.motto-accordion-item.is-open` class (not anything on this block itself).

## Implementation notes

- The `InnerBlocks` region is wrapped in an inner `<span className="motto-accordion-item__trigger-main">` (not the `<button>` root directly) — preserves the pre-SDD-024 DOM structure exactly (`accordion.scss` already had layout rules for this class, separating the flexible text/icon area from the fixed-width chevron).
- `save()` mirrors `edit()`'s structural shape: `<button>` → `<span class="...trigger-main"><InnerBlocks.Content/></span>` + chevron span.

## Known limitations

No `role="tab"` equivalent or roving-tabindex — activation is click/tap only, matching the family-wide ARIA gap already documented for `motto/tabs`. `aria-expanded`/`aria-controls` are present (accordion already has more ARIA wiring than tabs did pre-SDD-022).
