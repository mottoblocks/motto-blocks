# motto/slide

Part of the Slider family: `motto/slider` (carousel wrapper) contains one or more `motto/slide` (single slide) blocks — the same parent/child relationship as Accordion/Accordion Item. See `../slider/README.md` for the carousel-level behavior; this file only covers what's specific to a single slide.

## Purpose

A single slide item, usable only inside `motto/slider` (`parent: ["motto/slider"]` in `block.json`). A thin `InnerBlocks` wrapper equivalent to a Swiper `.swiper-slide` — it carries no attributes of its own and no carousel logic; all Swiper configuration and instantiation belongs to the parent `motto/slider`.

## Attributes contract

- No custom attributes at all — `block.json` only declares `version`, `parent`, and `supports`.
- `supports.reusable: false` — prevents this block from being converted into a reusable block/pattern on its own, since it only makes sense nested inside a slider.
- `parent: ["motto/slider"]` — Gutenberg only offers this block for insertion inside a `motto/slider`.
- Content is unrestricted `InnerBlocks` (no `allowedBlocks`, no template lock); `TEMPLATE` pre-seeds one `core/paragraph` placeholder on insert.

## Behavior

- **Editor vs. frontend markup**: both `edit()` and `save()` render the identical wrapper `className="motto-slide swiper-slide"` + the `mottoBaseLayout: "flow"` class — `swiper-slide` is a static string literal here (not derived from Swiper config), so any future rename of that convention must be a manual edit in this file.
- **Drag lock**: `draggable={false}` + `onDragStart={disableCanvasDrag}` suppress the browser's native HTML5 drag gesture on the slide root in the editor, so it doesn't interfere with the parent's Swiper touch/drag handling in the canvas. Swiper itself is instantiated by the parent `motto/slider` block, not by this block.
- This block registers no view/editor scripts of its own — `motto_blocks_register_slider_block()` (`motto-blocks.php`) calls `motto_blocks_register_block('slide')` with no extra args. Its only script/style dependencies are whatever the parent `motto/slider` loads (Swiper JS/CSS, `motto-blocks-slider-view`).

## Implementation notes

- Deliberately minimal: `index.jsx` defines `edit`/`save` inline inside the `registerBlockType()` call rather than as named components — there is no separate logic module (no `slide-utils.js`, no hooks) for this block.
- Slide selection/navigation in the editor (clicking a slide to `swiper.slideTo()` it and select its block) is implemented entirely in the parent — see `onRootClick` in `../slider/use-swiper-instance.js`, which resolves the clicked slide via `closestBlockEl.closest(slideSelector)` where `slideSelector` is hardcoded to `.wp-block-motto-slide`.

## Known limitations

- No `allowedBlocks` restriction inside the slide — any block can be nested, including another `motto/slider` or `motto/slide`, with no guard against nonsensical nesting.
- `parent` is enforced only by `block.json` (editor UI), not at render time — directly-authored `post_content` could still place a `motto/slide` outside a `motto/slider`; nothing checks for a Swiper ancestor when rendering.
