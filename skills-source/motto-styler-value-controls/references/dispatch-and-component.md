# Dispatch And Component Contract

## Where the value type gets rendered

`renderRuleValue()` in `src/styler/controls/value-control-registry.jsx` is an `if`/`else` dispatcher, not a lookup table, despite the file name — it isn't a plain map of `type -> Component`, because most branches also thread type-specific props from `model.config` (e.g. `min`/`max`/`step` for `number`, `spacingSizes` for `spacing-single`/`border-radius`). It receives a `model` (built by `usePropValueConfig` from the JSON entry — see `registration-contract.md`) plus shared context props (`themeColors`, `spacingSizes`, `disableCustomColors`, `closePopup`, `suspendAutoClose`, etc.) and returns the JSX for the matched `normalizeValueType(model.type)`.

To add a new type:

1. Import your component at the top of `value-control-registry.jsx`.
2. Add an `if (normalizedType === "your-type") { return <YourControl ... /> }` branch. Put it near branches of similar shape (simple scalar types together, composite/multi-field types together) — the file has no other ordering rule.
3. Always pass `key={model.key}`, `value={model.value}`, and `onChange={(val) => model.onChange(val)}` at minimum. Pull any extra props from `model?.config?.*` (with sane fallbacks — see neighboring branches for the pattern) or from the shared context props already destructured at the top of `renderRuleValue` if your control needs them (e.g. `themeColors`, `spacingSizes`).
4. If nothing matches, `renderRuleValue` falls back to a plain `CssFunctionAutocompleteControl` text editor — that's the safety net, not something to special-case around.

## Component contract

Controls in `src/styler/controls/*.jsx` are plain controlled React components. Minimum contract:

- `value: string` — the current raw CSS value (can be empty).
- `onChange: (nextValue: string) => void` — called with the new raw CSS value; the control does not know about breakpoints, CSS rows, or `mottoStyler` — that plumbing lives entirely upstream (`StylerRuleRow.jsx` / `RuleValuePopup.jsx`).
- Any additional props are config, not state — don't reach into stores or attributes from inside the control.

See `src/styler/controls/AspectRatioControl.jsx` for the simplest complete self-contained example (parses/builds a raw string from internal state, calls `onChange` with the built string, resyncs internal state via `useEffect` when the external `value` changes). More complex controls (`BorderRadiusControl.jsx`, `GradientControl.jsx`) follow the same `value`/`onChange` contract with additional config props for presets/units. Before defaulting to a self-contained component, check whether the value type fits an existing base control instead (`MottoNumberControl`, `SpacingControl`, `EnumControl`) — see `references/authoring-patterns.md` for the two archetypes and when to use each.

## Naming and file location

- Default: `src/styler/controls/<ControlName>.jsx`, one component per file, named export.
- Several existing branches dispatch to shared components imported from `@components` instead (`ColorControl`, `LengthControl`, `MottoNumberControl`, `PercentControl`, `TransitionControl` and its field variants) — if your new type is a thin wrapper around a control that's also useful outside Styler, place it under `src/components/controls/<topic>/` and import it into the registry, following the placement rules in `docs/conventions/architecture.md` rather than defaulting to `src/styler/controls/`.
- Root class, BEM sub-elements, popup/button classes: follow the `motto-visual-system` skill — this skill only covers wiring, not naming.
