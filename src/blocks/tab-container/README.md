# motto/tab-container

## Purpose

Navigation bar for the Motto Tabs family — always the first child of `motto/tabs` (`parent: ["motto/tabs"]`), rendered as a `<nav>` and holding one `motto/tab-button` per tab. Part of the `motto/tabs` family together with `motto/tab-panels`, `motto/tab-button`, and `motto/tab`; the active-tab state and cross-block sync mechanism are owned by `motto/tabs` — see that block's README for the full mechanics.

`mottoBaseLayout` is `"flex"`.

## Attributes contract

No attributes of its own beyond `usesContext: ["motto/tabs-activeTabId"]` (unused directly in this block's own `edit`/`save` — declared so the context is available, though `tab-button` is what actually reads it) and the globally-injected `mottoStyler`.

- **`mottoDefaults`**: sets its own Styler defaults (`display: flex`, `gap: 0.5em`, `padding`) plus two `blockSelectors` entries — `&{BLOCK} :where(.motto-tabs__nav-item)` ("Tab button") and `&{BLOCK} :where(.motto-tabs__nav-item.is-active)` ("Tab button (active)"). This means the Styler panel for **this** block, not `motto/tab-button` itself, is where a user configures default/active tab-button appearance (background, color, font-size, border-radius, active state colors) — `motto/tab-button`'s own `block.json` has no `mottoDefaults` at all.
- **`supports`**: `inserter: false` and `reusable: false` — this block can't be inserted standalone or converted to a reusable block; it only ever exists as created by `motto/tabs`'s fixed template.

## Behavior

Editor and frontend both render `<nav className="motto-tabs__nav {baseLayoutClass}">` wrapping `InnerBlocks`/`InnerBlocks.Content`. `allowedBlocks` is restricted to `["motto/tab-button"]` with `templateLock: false`, so buttons can be freely added (via `InnerBlocks.ButtonBlockAppender`), removed, and reordered by the user — `motto/tabs`'s sync effect then reconciles the panel list in `motto/tab-panels` to match.

Click-to-activate, `aria-selected`, and the active-state class are implemented per-button in `motto/tab-button`, and on the frontend by the shared `tabs-frontend.js` runtime — see `motto/tabs`.

## Implementation notes

Trivial `edit`/`save` (`src/blocks/tab-container/index.jsx`) — no custom hooks or state beyond `useInnerBlocksProps`.

## Known limitations

No `role="tablist"` on the `<nav>` element (see `motto/tabs` Known limitations for the family-wide ARIA gap).
