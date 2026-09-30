# Code/Visual View Support

Every rule row can show either a Visual control (your component) or a Raw code editor (plain text/textarea). Which one opens is decided deterministically by value visualizability — **not** a user preference and **not** something your control chooses directly.

## Where this lives

- `canVisualizePopupValue(popupType, rawValue, enumOptions)` in `src/styler/utils/value-type-capabilities.js` is the single source of truth for "can this value be shown visually for this type." `RuleValuePopup` uses it (via `usePropValueConfig` → `shouldForceCodeView`) to pick the initial view when a rule row's popup opens.
- The full deterministic rule set — Popover view resolution (§4.1) and control sub-view inference (§4.2) — is specced in **SDD-009** (`docs/specs/SDD-009-styler-value-view-inference-v1.md`) and, for spacing/border-radius specifically, **SDD-016**. Read those sections for the actual rules and acceptance criteria — this file only tells you where to hook in.

## Adding support for a new type

1. If your value type's raw CSS string can be ambiguous, invalid, or otherwise not always representable in your visual control (e.g. arbitrary `calc()`, mismatched token counts), add a `canVisualizeYourTypeValue(rawValue)` predicate in `value-type-capabilities.js`, following the pattern of the existing `canVisualize*Value` functions.
2. Wire it into `canVisualizePopupValue`'s dispatch for your `popupType`.
3. If your control has internal sub-views (like spacing's presets/custom or border-radius's all/custom), infer them from the value per SDD-009 §4.2.
4. If you skip this step, your type still works — it falls back to whatever `shouldForceCodeView` resolves to by default per SDD-009 §4.1, which is fine for simple always-visualizable types (enums, presets-only fields).
