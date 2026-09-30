# motto/tab

## Purpose

Single content panel inside `motto/tab-panels` — a `<div>` wrapping arbitrary `InnerBlocks` content, identified by a `tabId` shared with its corresponding `motto/tab-button`. Part of the `motto/tabs` family; the active-tab state it reads/writes and the button↔panel sync mechanism are owned by `motto/tabs` — see that block's README for the full mechanics.

`mottoBaseLayout` is `"flow"`.

## Attributes contract

Only `tabId` — SDD-022 removed the `label`/`iconOptions`/`iconPosition` attributes this block used to mirror from `motto/tab-button`. They were already inert for this block's own rendering (it only ever wrapped `InnerBlocks` content in a `.motto-tab__content` div) and existed solely to seed an auto-created button's `label`/icon; now that `motto/tab-button`'s text/icon live in its own `InnerBlocks` (not attributes), there is nothing left to seed and nothing left to mirror.

## Behavior

- **Active state**: `isActive = normalizeTabId(context["motto/tabs-activeTabId"]) === normalizeTabId(attributes.tabId)` toggles the `is-active` class. In the editor, `tabs.editor.scss` hides any `.motto-tab:not(.is-active)` inside `.motto-tabs__panels`, so only the active panel is visible/editable at a time.
- **Click-to-activate**: the panel wrapper's `onClick` sets the parent `motto/tabs`'s `activeTabId` to this panel's `tabId` (parent found via `useTabsParentClientId`, walking `getBlockParents(clientId)` to the nearest `motto/tabs`) — mirrors `motto/tab-button`'s click handler. Because inactive panels are `display: none` in the editor, this handler is reachable mainly for the already-active panel or via non-pointer selection.
- **Own content**: `TEMPLATE = [["core/paragraph", { placeholder: "Tab content…" }]]` with `templateLock: false` — free-form content, no `allowedBlocks` restriction (unlike `tab-container`/`tab-panels`, which restrict their direct children to `tab-button`/`tab` respectively).
- **Frontend visibility**: fully driven by `tabs-frontend.js` toggling `.is-active` + the native `hidden` attribute per `data-tab-id` (see `motto/tabs`); this block contributes no runtime behavior of its own beyond exposing `data-tab-id` in its saved markup.

## Known limitations

No `role="tabpanel"` or `aria-labelledby` (see `motto/tabs` Known limitations for the family-wide ARIA gap).
