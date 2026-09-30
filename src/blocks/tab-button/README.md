# motto/tab-button

## Purpose

Single clickable nav trigger inside `motto/tab-container` — a `<button>` wrapping real `InnerBlocks` content (text + optional icon), identified by a `tabId` shared with its corresponding `motto/tab` content panel. Part of the `motto/tabs` family; the active-tab state it reads/writes and the button↔panel sync mechanism are owned by `motto/tabs` — see that block's README for the full mechanics.

`mottoBaseLayout` is `"inline-flex"`.

## Attributes contract

- **`tabId`**: normalized via `normalizeTabId()` (trim) from `../tabs/utils`. This block does not assign or dedupe its own `tabId` — that's entirely the responsibility of `motto/tabs`'s sync effect; this block only reads/compares it.
- **`urlSlug`** (string, default `""`, SDD-030): manual, user-typed identifier used for URL hash deep-linking when the parent `motto/tabs`'s `syncUrlHash` is on — see that block's README. Trimmed via the same `normalizeTabId()` helper (plain trim, not an ID generator). No auto-generation from this block's text content, no uniqueness enforcement. `save()` renders it as `data-tab-slug` only when non-empty.
- No other custom attributes beyond `urlSlug` (SDD-022 removed `label`/`iconOptions`/`iconPosition` — see Behavior). No `mottoDefaults` on this block — default and active-state button styling (background, color, border-radius, etc.) is configured on `motto/tab-container`'s Styler panel instead (see that block's README).

## Behavior

- **Content model (SDD-022)**: this block is an `InnerBlocks` container, `allowedBlocks: ["core/paragraph", "motto/svg"]`, default `template: [["core/paragraph", { placeholder: "Tab" }]]`, `templateLock: false`. Text is a plain `core/paragraph` child; an icon is an optional `motto/svg` child, addable/removable via the block appender like any other `InnerBlocks` slot. Icon-before/after-text is plain block order (drag & drop) — there is no `IconPositionToggle` on this block anymore.
- **Activating from the editor**: two independent paths set `activeTabId` on the parent `motto/tabs` block, found by walking up `getBlockParents(clientId)` to the nearest `motto/tabs` ancestor (`useTabButtonContext` hook, local to this file):
  1. The button wrapper's `onClick` handler (`event.preventDefault()`, `updateBlockAttributes(tabsClientId, { activeTabId: tabId })`). Unlike before SDD-022, this no longer force-selects the button block itself (`selectBlock` was dropped) — clicking a child (the paragraph or the svg) now selects that child normally instead of being hijacked back to the parent, since there is no button-level Inspector UI left to reveal.
  2. A `useEffect` that syncs `activeTabId` to this button's `tabId` whenever this button becomes the selected block and its `tabId` differs from the current `activeTabId` — this covers selection via keyboard navigation or the list view, not just direct clicks. Unchanged from before SDD-022.
- **Active state**: `isActive = tabId && tabId === activeTabId` (from `motto/tabs-activeTabId` context) toggles the `is-active` class and `aria-selected`.
- **Inspector (SDD-030)**: no panel by default (SDD-022 removed the old "Tab Button Settings"/"Icon" `PanelBody`s — `core/paragraph`'s own native controls and `motto/svg`'s own block cover what's needed for its children). SDD-030 reintroduced a single conditional `PanelBody` ("Tab Button Settings", a `TextControl` for `urlSlug`), rendered only when `context["motto/tabs-syncUrlHash"]` is true — i.e. only while the parent `motto/tabs`'s URL hash sync is enabled.
- **Frontend click handling**: not implemented per-button here — wired generically by the shared `assets/js/tabs-frontend.js` runtime via `data-tab-id` (see `motto/tabs`).

## Implementation notes

- `save()` mirrors `edit()`'s structural shape: a `<button>` with `useBlockProps.save()` wrapping `<InnerBlocks.Content />` — no more `TabTriggerContent`/`TabTriggerEditor` shared-component rendering (that shared module, `@components/ui/tabs/tab-trigger-content.jsx`, is still used by `motto/accordion-item`, just no longer by this block).

## Known limitations

No `role="tab"` or `aria-controls` linking the button to its panel's id — only `aria-selected` is set (see `motto/tabs` Known limitations for the family-wide ARIA/keyboard-nav gap).
