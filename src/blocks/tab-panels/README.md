# motto/tab-panels

## Purpose

Content-panels container for the Motto Tabs family — always the second child of `motto/tabs` (`parent: ["motto/tabs"]`), rendered as a `<div>` and holding one `motto/tab` per tab. Part of the `motto/tabs` family together with `motto/tab-container`, `motto/tab-button`, and `motto/tab`; the active-tab state and cross-block sync mechanism are owned by `motto/tabs` — see that block's README for the full mechanics.

`mottoBaseLayout` is `"flow"`.

## Attributes contract

No attributes of its own beyond `usesContext: ["motto/tabs-activeTabId"]` (declared but not read in this block's own `edit`/`save`) and the globally-injected `mottoStyler`.

- **`mottoDefaults.blockSelectors`**: one entry, `&{BLOCK} :where(.motto-tab)` ("Tab panel"), with defaults for `padding` (`.75em`), `background-color`, and `border` (`solid 1px #eee`). As with `tab-container`/`tab-button`, this means default panel appearance is configured from **this** block's Styler panel, not from `motto/tab` itself (`motto/tab`'s `block.json` has no `mottoDefaults`).
- **`supports`**: `inserter: false` and `reusable: false` — only ever created by `motto/tabs`'s fixed template, not insertable standalone.

## Behavior

Editor and frontend both render `<div className="motto-tabs__panels {baseLayoutClass}">` wrapping `InnerBlocks`/`InnerBlocks.Content`. `allowedBlocks` is restricted to `["motto/tab"]` with `templateLock: false`, so panels can be freely added (via `InnerBlocks.ButtonBlockAppender`), removed, and reordered — `motto/tabs`'s sync effect then reconciles the button list in `motto/tab-container` to match.

Which panel is visible is controlled entirely outside this block: in the editor via CSS keyed off the `.is-active` class each `motto/tab` sets itself (`tabs.editor.scss`); on the frontend via `tabs-frontend.js` toggling `.is-active`/`hidden` per `data-tab-id` — see `motto/tabs`.

## Implementation notes

Trivial `edit`/`save` (`src/blocks/tab-panels/index.jsx`) — no custom hooks or state beyond `useInnerBlocksProps`.

## Known limitations

No `role="tabpanel"` container semantics at this level (see `motto/tabs` Known limitations for the family-wide ARIA gap).
