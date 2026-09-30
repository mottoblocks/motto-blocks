---
name: motto-styler-value-controls
description: "Use when adding or changing a Styler CSS value control: registering a new value type in styler-css-value-options.json, wiring a new component into value-control-registry.jsx's renderRuleValue dispatcher, writing the value/onChange component contract for a rule-row editor, or adding code/visual view (canVisualizePopupValue) support for a value type."
compatibility: "motto-blocks Styler core (src/styler/). Not applicable to generic src/components/controls/ editor UI built outside the value-type registry/dispatch system."
---

# Motto Styler Value Controls

## When to use

Use this skill when the task is building or modifying a **Styler rule-row value control** — the editor that appears when a user opens a CSS property's popup inside a `StylerCssList` rule row (color, spacing, gradient, border-radius, transform, etc.). Triggers:

- adding a brand-new value type (a CSS property or property family with no existing visual editor)
- changing what config a value type accepts (min/max, presets, units, options)
- adding or fixing code/visual view switching for a value type
- debugging why a property falls back to the plain text editor instead of its intended control

Do not use this skill for:
- building a generic `src/components/controls/<topic>/` component in isolation (image pickers, link controls, etc.) — see `docs/conventions/architecture.md` for file placement and the `motto-visual-system` skill for naming. (Note: `value-control-registry.jsx` itself reuses several of these shared components as dispatch targets — see `references/dispatch-and-component.md`.)
- class/panel/button naming, SCSS, icon sizing — `motto-visual-system` skill.
- the specific interaction/inference contract for spacing and border-radius controls, or the general code/visual decision rules — those are specced in `docs/specs/SDD-009-styler-value-view-inference-v1.md` and `docs/specs/SDD-016-spacing-radius-value-controls-v1.md`; this skill tells you where those rules plug in, not what they say.

## Reference map

For a new value type end to end, work through all three in order; for a narrower task, open only the row that matches.

| Task | File |
| --- | --- |
| Register a property → value type + config in `styler-css-value-options.json` | `references/registration-contract.md` |
| Wire the type into `value-control-registry.jsx` and write the component (`value`/`onChange` contract) | `references/dispatch-and-component.md` |
| Decide whether the new component should delegate to an existing base control or be self-contained | `references/authoring-patterns.md` |
| Add/hook up code-vs-visual view switching for the type (skip if always safely visualizable, e.g. a closed enum) | `references/code-visual-view.md` |

Then apply naming/SCSS/icon rules from the `motto-visual-system` skill to the new component.

## Verification

- The property now opens the intended control (not the `CssFunctionAutocompleteControl` fallback) in a real rule row.
- Editing the control round-trips through `onChange` and persists in the CSS row on close/reopen.
- Empty value opens in visual view; an intentionally non-visualizable value opens in code view (if you added a `canVisualize*Value` predicate).
- Breakpoint switching still works untouched — the control itself never reads breakpoint/attribute state.
- `npm run lint` and `npm run build` run clean.

## Escalation

If a rule here conflicts with `docs/specs/SDD-009-styler-value-view-inference-v1.md` or `SDD-016-spacing-radius-value-controls-v1.md` on code/visual or sub-view inference behavior, the spec wins — it's the versioned behavior contract with its own acceptance criteria and dependency chain (SDD-016 depends on SDD-009). This skill only documents where to plug into that system, not the decision rules themselves.
