# Registering A Value Type

`src/styler/data/styler-css-value-options.json` is the declarative map from a CSS property name to the value editor it gets in a rule row: `{ type, ...config }`. It is the single source of truth `usePropValueConfig` (`src/styler/hooks/use-prop-value-config.js`) reads to build the `model` object passed into `renderRuleValue`.

## Lookup keys

- **Exact key**: the CSS property name itself, e.g. `"border-radius"`, `"align-content"`.
- **`__aliases`**: `{ "some-legacy-or-composite-key": "canonical-key" }` — points one property name at another entry's config instead of duplicating it.
- **`__patterns`**: an array of `{ match: "<regex>", type, ...config }` entries, tested against the property name when there's no exact key or alias match. Used for custom-property families, e.g. `^--(?:.*-)?columns$`.

Resolution order: exact key → alias → first matching pattern.

## Entry shape

Every entry needs a `type` — the string `renderRuleValue` (see `dispatch-and-component.md`) switches on. Everything else in the entry is `config`, forwarded to the chosen control as `model.config`. Config keys are **type-specific** (a `number` entry uses `min`/`max`/`step`; a `spacing-single` entry uses `side`/`allowNegativeValue`/`hasAutoValue`; an `enum` entry uses `options`). Don't guess the shape — find the nearest existing entry of the same `type` in the JSON file and mirror its config keys.

## Adding a new value type

1. Decide the property (or pattern) this applies to.
2. Add an entry with a new `type` string (kebab-case, matches what you'll dispatch on in `value-control-registry.jsx`).
3. Add whatever `config` fields your control needs — keep them flat, no nested objects beyond what an existing entry already does.
4. If multiple properties share the exact same config, point the extra ones at the canonical key via `__aliases` instead of copying the entry.
