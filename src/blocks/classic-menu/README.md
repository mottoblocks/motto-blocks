# motto/classic-menu

## Purpose

Renders a WordPress classic (Menus API) navigation menu — selected either by theme location or by a specific menu — with dropdown or accordion submenu behavior driven by a small hand-authored frontend runtime. Fully dynamic block: rendered server-side via `render_callback` on every request, not from saved block markup. `save()` returns `null`; there is no `InnerBlocks` content.

## Attributes contract

Non-obvious fields only — see `block.json` for the full list and defaults.

- **`useLocation`**: toggles between "Location" mode (`menuLocation`, passed as `wp_nav_menu`'s `theme_location`) and "Menu" mode (`menuSlug`, passed as `wp_nav_menu`'s `menu`). The two are mutually exclusive; only the active mode's value is read.
- **`menuLocation` / `menuSlug`**: self-populate on insert — a `useEffect` in `index.jsx` sets whichever is empty to the first available option from `useSelect(select("core").getMenuLocations()/getMenus())` once that data loads, so a freshly inserted block doesn't stay unconfigured.
- **`submenuPosition`**: `"floating"` (dropdown, default) or `"accordion"`. Only affects which CSS class (`floating-submenu` / `accordion-submenu`) lands on the rendered `<ul>` — the JS open/close logic in the runtime is identical in both modes; the accordion look comes entirely from `classic-menu.scss`'s `max-height` transition keyed off a `--items-count` custom property the runtime sets per submenu.
- **`toggleEvent`**: `"rollover"` (default; hover/focus) or `"click"`. Re-validated server-side too — anything other than `'click'` collapses to `'rollover'` in `motto_blocks_render_classic_menu()`. The runtime (`classic-menu-runtime.js`) reads it primarily from the rendered `<ul data-submenu-toggle-event="...">` attribute, falling back to a `.toggle-event-click` class on the block wrapper only if that data attribute isn't `'click'`.
- **`orientation`**: declared in `block.json`, threaded through the editor's preview payload (`renderAttributes` in `index.jsx`) and accepted by `motto_blocks_render_classic_menu()`'s attribute parsing — but never actually read to affect markup, classes, or styling anywhere in `index.jsx`, `includes/classic-menu.php`, or `classic-menu.scss`. There's no InspectorControls for it either. Currently a no-op attribute.

## Behavior

- **Editor is a pure REST preview, not a client-rendered React tree**: `edit()` posts `renderAttributes` to `/wp/v2/block-renderer/motto/classic-menu?context=edit` via `wp.apiFetch` and injects the returned HTML with `dangerouslySetInnerHTML` — the exact same PHP path (`motto_blocks_render_classic_menu()`) that runs on the frontend. There is no separate editor-only markup to keep in sync with the frontend.
- After the preview HTML mounts, a second `useEffect` hands the container to `window.mottoBlocksClassicMenu.initClassicMenus()` (from `assets/js/classic-menu-runtime.js`, enqueued as an editor script) so hover/click submenu toggling also works inside the editor canvas, not only on the published page.
- **Frontend script wiring**: `motto_blocks_register_classic_menu_block()` (`motto-blocks.php`) registers `motto-blocks-classic-menu-runtime` (`assets/js/classic-menu-runtime.js` — exposes `window.mottoBlocksClassicMenu`) and `motto-blocks-classic-menu-view` (`assets/js/classic-menu-frontend.js` — a 9-line `DOMContentLoaded` bootstrap calling `initClassicMenus(document)`) as the block's `view_script_handles`. Both scripts are registered directly in `includes/assets-frontend-libs.php` (`motto_blocks_register_classic_menu_assets()`) and are hand-authored, framework-free files with no `src/` build counterpart — edit them in place under `assets/js/`.
- **Submenu markup** is produced by a custom `Motto_Blocks_Classic_Menu_Walker` (`includes/classic-menu.php`) extending `Walker_Nav_Menu`: wraps each submenu level in `.motto-classic-menu__submenu-container > ul.motto-classic-menu__submenu`, appends a `.motto-classic-menu__submenu-icon` toggle `<button>` (inline chevron SVG) after any item with children, and auto-adds `rel="noopener noreferrer"` when `target="_blank"` and no `rel` was already set on the menu item.
- **Runtime toggle behavior** (`classic-menu-runtime.js`): rollover mode opens on `mouseenter`/`focusin` and closes on `mouseleave`/`focusout` (respecting focus moving to a still-contained child); click mode toggles `aria-expanded` and closes sibling submenus at the same level first. A document-level click listener closes all open submenus when a click lands outside the menu. On init, `applyClickedItemFromHash()` also matches the current URL hash against item `href`s and adds a `.menu-item-clicked` class to the matching item — a CSS hook only, no scroll or focus side effect.
- **Empty states**: `motto_blocks_render_classic_menu()` returns a `<p>` ("No menu selected." / "Menu not found.") only when `is_admin()` is true (true for the block-renderer REST call made from wp-admin) — the real frontend gets an empty string instead, so an unconfigured or since-deleted menu renders nothing there.

## Implementation notes

- No `render.php` — the callback is a plain function, `motto_blocks_render_classic_menu()` in `includes/classic-menu.php`, wired up via `'render_callback'` in `motto_blocks_register_classic_menu_block()` (`motto-blocks.php`), the same pattern used by `motto/svg` and `motto/slider` rather than block.json's `"render"` field.
- `wp_nav_menu()`'s `items_wrap` embeds `data-submenu-toggle-event` directly on the rendered `<ul>` — this is how the click-vs-rollover choice travels from PHP attributes into the vanilla-JS runtime without inline event handlers or an extra fetch.
- `initClassicMenu()` is idempotent per DOM node: it stashes its own cleanup function on `menu.__mottoClassicMenuCleanup` and invokes any prior one before re-binding, so re-running the editor's `useEffect` after every `previewHtml` change doesn't leak listeners.
- Base layout class comes from `motto_styler_get_base_layout_class_for_block('motto/classic-menu')`, guarded with `function_exists()` since Styler may not be loaded in every context, rather than a hardcoded class name.

## Known limitations

- `orientation` exists as an attribute but is fully inert (see Attributes contract) — horizontal/vertical layout is left entirely to Styler CSS, not to this attribute.
- Editor preview requires a live REST round-trip on every attribute change (throttled only by React's effect batching); there's no local/offline preview fallback beyond the `"Could not load menu preview."` error message.
- Submenu depth is unbounded (default `Walker_Nav_Menu` behavior), but `classic-menu.scss` only styles two visual states (top-level flex row + one dropdown level) — deeper nesting inherits the same `.motto-classic-menu__submenu-container` styling recursively rather than getting distinct treatment per level.
