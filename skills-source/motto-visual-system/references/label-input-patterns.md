# Value Options And Label/Input Patterns

## Value Options

Resolution order:

1. `__patterns`
2. exact prop key

Exact prop config is the final override.

Rules:

- Supported editor args include `defaultView: "visual" | "code"` and `defaultRangeView: "preset" | "numeric"`.
- If `defaultView` is absent, UI decides by value legibility and component capability.
- Forced code view for invalid visual values overrides defaults.
- Suggestions are UX-only and do not define CSS property validity.
- CSS custom props (`--*`) are free-typed unless explicitly configured otherwise.

## Label/Input Patterns

- Stacked label/input: `motto-grid gap-sm`.
- Inline label/input: `motto-flex align-center gap-sm`.
- Wrap sibling inline rows in `motto-flex-rows`.
- Labels must include `motto-label`.
- Primary fields must include `motto-input`.
- Feature-specific classes are additive and must not replace primitives.
