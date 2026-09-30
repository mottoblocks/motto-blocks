# motto/accordion-panel

## Purpose

Collapsible content panel inside `motto/accordion-item` (SDD-024) — a `<div class="motto-accordion-item__panel">` wrapping arbitrary free-form `InnerBlocks` content, identical in permissiveness to what `motto/accordion-item` itself used to render directly before this split. Must remain a **direct DOM child** of `.motto-accordion-item` — `accordion-frontend.js` queries `:scope > .motto-accordion-item__panel`, and `.motto-accordion-item__panel-inner` must in turn be a direct child of *this* block's own root (also queried via `:scope >`). See `../accordion-item/README.md` for the parent block.

`mottoBaseLayout` is `"flow"`.

## Attributes contract

- **`itemId`** / **`isOpen`** — duplicated copies of the parent `motto/accordion-item`'s own attributes, kept in sync one-way by the parent's own effect. Needed here for the same reason as `motto/accordion-trigger`: `save()` has no access to block context, so `id`/`aria-labelledby`/`aria-hidden` at save time need real, persisted attribute values; `edit()` instead reads the live `motto/accordion-item-itemId`/`motto/accordion-item-isOpen` context.

## Behavior

- **Content model**: unrestricted `InnerBlocks` — no `allowedBlocks` restriction, `templateLock: false`, default template `[["core/paragraph", { placeholder: "Accordion content…" }]]` — verbatim carry-over of what `motto/accordion-item` rendered directly before SDD-024.
- **`aria-hidden`**: computed via the shared `computeIsEditorOpen()` helper (`../accordion/utils.js`) at edit time; from the duplicated `isOpen` attribute at save time (same reasoning as the trigger's `aria-expanded` — `accordion-frontend.js` overwrites it unconditionally on load).
- **Visibility/height animation is not this block's concern**: `max-height`/`overflow` transitions are entirely CSS rules keyed off the **ancestor** `.motto-accordion-item.is-open` class (unchanged from before SDD-024) — this block's own root carries no visual state class of its own.

## Implementation notes

- `save()` mirrors `edit()`'s structural shape: `<div class="...panel" role="region" aria-labelledby={triggerId} aria-hidden={...}><div class="...panel-inner"><InnerBlocks.Content/></div></div>`.

## Known limitations

None beyond the family-wide ones already documented on `motto/accordion-item`/`motto/accordion`.
