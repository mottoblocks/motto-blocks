# Control And Button Class Naming

## Button Classes

- `motto-ui-button` is the base class for Motto-owned editor buttons.
- Icon-only buttons use `motto-ui-button`, render the icon SVG as the only direct child, and include `aria-label` plus `title`.
- Do NOT add `motto-ui-button` to buttons that are children of a `ToggleGroupControl` / `ToggleGroupControlOption` unless the component is intentionally opting into Motto button styling.

## Styler Control Class Naming

Root class:

- Every control component uses `motto-[css-property-name]-control` as its root class. No exceptions.
- Never embed implementation details in the root class: not `styler`, not `input`, not `field`, not `popup`.
- Controls rendered inside a popup are still `-control`, not `-popup`. The popup shell is owned by `RuleValuePopup`, not the control.

Layout primitives:

- The component's semantic class always comes first, layout primitives after: `motto-filter-control motto-grid gap-sm`, never `motto-grid gap-sm motto-filter-input`.

Eliminated pattern — `motto-field-*`:

- `motto-field-*` had no defined role and must not be emitted by control components. Use `motto-[name]-control` as the root and let the parent own any context-specific wrapper class if needed.

BEM `__` sub-elements:

- Use BEM only for **structural shell** sub-elements: `__header`, `__body`, `__actions`, `__footer`.
- Content rows and items inside the body use flat naming: `motto-[name]-row`, `motto-[name]-item`, `motto-[name]-panel`.

Icon classes:

- Use `motto-[name]-icon`. Never suffix with the implementation type (`-svg`, `-lucide`, etc.).

## Class And CSS Ordering

Class application and generated CSS order:

1. Classes from CPT/attached class entities.
2. Local block class `motto-styler-<instanceId>`.
3. Conditional classes.

(The underlying CSS delivery/caching contract for instance vs. shared class CSS is defined in `docs/conventions/styler-css-loading.md`, not here.)

## Shared Control Ownership

- Shared/styler control classes are defined by the control component, not each call site.
- Do not add passthrough `className` props to shared controls just for one instance styling.
- If a modifier is needed, derive it internally from props or create a dedicated variant.
