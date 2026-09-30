# Panel Structure, Popups, And Shared Primitives

## Panel Structure

- Every `PanelBody` in block `InspectorControls` must include `className="motto-panel-body"`.
- Main panel title: `{Block Name} Settings`.
- Main panel `initialOpen`: `true`.
- Sub-panels `initialOpen`: `false` unless critical.
- Sub-panel titles: prefer short, clear nouns (`Pagination`, `Background`, `Link`, `Typography`, `Color`, `Layout`). Generic suffixes like `Settings`, `Options`, or `Controls` are usually redundant once a panel's content already makes its purpose clear — but a slightly longer, descriptive name is fine when it's genuinely clearer than a bare noun (e.g. `Dynamic Link` over `Dynamic`, or keeping a block-name prefix like `Container Link` when a related second panel needs to stay recognizably paired with it).
- Keep `motto-panel-section` flat; do not nest it inside another `motto-panel-section`.

Shared panel primitives:

- `motto-panel-body`
- `motto-panel-section`
- `motto-section-heading`
- `motto-section-title`
- `motto-section-title-text`
- `motto-section-actions`
- `motto-section-help`
- `motto-css-actions`
- `motto-css-actions-row`

Composable layout primitives:

- Display: `motto-flex`, `motto-grid`, `motto-flex-col`
- Multi-row groups: `motto-flex-rows`
- Alignment: `align-center`, `align-start`, `align-end`, `justify-between`, `justify-center`, `justify-end`
- Gaps: `gap-xs`, `gap-sm`, `gap-md`, `gap-lg`
- Flex items: `flex-1`, `flex-none`
- Grid columns: `cols-2`, `cols-3`, `cols-4`
- Slider growth: `motto-control-slider`

## Popups And Inputs

- Every Motto-owned popup must include `.motto-popup` on its root element — the outermost Motto-authored element inside the popup (the `renderContent()` div, or the `<Popover>` directly when no content wrapper exists).
- Use `withMottoPopupClass("motto-[component]-popup")` on that root element; do NOT apply it to the WP Dropdown/Popover wrapper when a separate Motto content div exists.
- The WP Dropdown/Popover `popoverProps.className` receives only the specific targeting class (plain string, no `withMottoPopupClass`) when CSS overrides of WP internals (e.g. `.components-popover__content`) are needed.
- Popup targeting classes use flat kebab: `motto-[component]-popup`. Never use BEM `__popup` suffix — popups are standalone components, not sub-elements.
- Control components rendered **inside** a popup do NOT use `withMottoPopupClass` on their root — they inherit the popup context from the ancestor `.motto-popup` element managed by `RuleValuePopup`.
- Toggle groups select the active variant only; switching active options must not clear inactive payloads.
- Prop-name changes must immediately recompute popup input type.
- `Tab` accepts suggestions; `Esc` closes suggestion lists.

## `motto-panels` Authority

- `motto-panels` is the shared editor UI style source of truth.
- Shared component styles, panel styles, primitives, and layout helpers belong there.
- Do not duplicate shared-looking styles in block folders or consumer repos.
- Block-level styles are allowed only when strictly block-exclusive and not already covered by a shared primitive.
