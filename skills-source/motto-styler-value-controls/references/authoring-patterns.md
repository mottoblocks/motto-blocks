# Choosing A Control Structure

Two valid shapes exist for a `value`/`onChange` control (see `dispatch-and-component.md` for the contract itself). Pick one deliberately instead of defaulting to a self-contained component out of habit — most new value types are a thin adapter over something that already exists.

## Archetype A — thin adapter over a shared primitive

Delegate rendering to an existing base component; the wrapper only normalizes props and converts between the raw CSS string and whatever shape the base component wants. No local state beyond what the base component already manages.

Examples: `src/components/controls/units/PercentControl.jsx` (scale/clamp via two pure functions, delegates to `MottoNumberControl`), `src/components/controls/units/LengthControl.jsx` (default unit list, delegates to `MottoNumberControl`), `src/styler/controls/SpacingSingleControl.jsx` / `SpacingMultipleControl.jsx` (side normalization + `toSpacingControlToken`/`toSpacingCssValue`/`mergeSpacingPatchToCss` from `../utils/spacing-value-utils`, delegate to `SpacingControl`), `src/styler/controls/FontSizeControl.jsx` (one regex-based preset-slug adapter, delegates to core's `FontSizePicker`).

Use this shape when an existing primitive already covers the interaction (`MottoNumberControl`/`NumericUnitField`, `SpacingControl`, `EnumControl`, a `@wordpress/components` picker). Before writing new parsing/state logic, check `src/styler/utils/*-value-utils.js` and `src/components/controls/units/` for something that already does it — reimplementing unit/slider/toggle handling that `MottoNumberControl` already provides, or regex parsing that a `*-value-utils.js` file already exports, is the main way these controls get bloated.

If your value is a space-separated list of typed CSS functions (`type(args) type(args) ...` — transform, filter), use the `useCssFunctionListEntries` hook (`src/styler/hooks/use-css-function-list-entries.js`) instead of writing your own type-registry + parse/build/dedup logic. `TransformControl.jsx` and `FilterControl.jsx` used to duplicate this ~40-line pattern almost verbatim (found during an authoring-pattern audit) before it was extracted; the hook now owns parsing, building, add/update/remove and type dedup, and each control only supplies its type registry plus `parseArgs`/`buildArgs`/`createEntryFields` for its own per-entry shape.

## Archetype B — self-contained control

Own local state, own parse/build functions, resync from the external `value` prop via `useEffect` + a ref (to avoid clobbering in-progress edits on every parent re-render). Justified only when no existing primitive fits the value shape.

Minimal example: `src/styler/controls/AspectRatioControl.jsx` — pure `parseAspectRatio`/`buildAspectRatio` functions, a `syncedValueRef` to detect genuine external changes vs. its own `onChange` echo, no dependency on other controls.

When the domain is genuinely complex (multiple sub-values, linked/unlinked state, preset-vs-custom sub-views), don't let one component absorb all of it — extract collaborators the way `src/styler/controls/BorderRadiusControl.jsx` does: `PresetValueRow.jsx` (one preset/custom row), `LinkToggleButton.jsx` (the link icon toggle), `usePresetCustomVisibility` hook (per-slot preset/custom view state), plus pure value utils (`border-radius-value-utils.js`). The orchestrating component stays a loop over corners/slots calling into those pieces, not a single function doing parsing + state + rendering inline.

## Decision checklist

1. Does a base component in `src/components/controls/units/` or `src/styler/controls/` already render this interaction? → Archetype A. Write the conversion as pure functions (like `PercentControl`'s `toDisplay`/`fromDisplay`), not inline in JSX handlers.
2. No existing base component fits, and the value is a single scalar/string shape? → Archetype B, kept minimal (parse/build functions + `useEffect`/ref resync, no premature sub-component split).
3. No existing base fits, and the value has multiple independent parts (corners, sides, layers)? → Archetype B, but extract one collaborator per repeated unit (a row/slot component) plus a state hook if the show/hide-custom logic repeats across parts — mirror `BorderRadiusControl.jsx`'s split, don't inline the loop body.
4. Before adding a new regex or parse function, grep `src/styler/utils/` and `src/components/controls/` for one that already does it for a sibling value type.
