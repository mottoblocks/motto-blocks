# Motto Styler

The Styler owns the editor UI, value editing, normalization helpers, and CSS runtime for
Motto block styling. Keep this file as a map of responsibilities; durable conventions live
in `CONVENTIONS.md`, `docs/conventions/*`, and the Styler skills.

## Main Flow

`StylerPanel` renders the block-level Styler shell. `StylerCssList` renders breakpoint rule
lists. `StylerRuleRow` owns one CSS rule row and delegates the value editor to
`renderRuleValue()` from `controls/value-control-registry.jsx`.

## Folders

- `components/`: Styler UI composition such as panels, lists, rule rows, headers, popups,
  selector editors, and preset pickers.
- `controls/`: visual editors for CSS values used by rule rows.
- `data/`: CSS property/value registries, presets, output order, and editor important rules.
- `runtime/`: CSS generation and editor/frontend style injection paths.
- `utils/`: parsing, validation, warnings, capabilities, normalization, and small shared
  helpers that should be testable without rendering UI.
- `classes/`: UI and state flow for reusable CSS class editing.
- `hooks/`: editor state and panel behavior hooks.
- `styles/`: SCSS for Styler editor UI.
- `freepro/`: IDs and boundaries for Free/Pro integration.
- `variables/`: CSS variable runtime helpers.

## Where To Add Things

- New CSS value editor: register the value type in `data/styler-css-value-options.json`,
  then dispatch it from `controls/value-control-registry.jsx`.
- New rule warning: add the rule in `utils/rule-warnings.js`; the row should only call the
  warning helper and pass translated messages.
- New parsing or value capability logic: prefer `utils/` with focused tests.
- New runtime CSS behavior: update `runtime/style-engine.jsx` or the specific runtime path
  named in `docs/conventions/styler-css-loading.md`.
- Shared block/editor controls: put them in `src/components/` when blocks outside the Styler
  also consume them.

## Boundaries

Keep heavy business rules out of row/header components. UI components should compose state
and render controls; validation, warnings, parsing, and feature capability decisions belong
in `utils/`, `data/`, or `runtime/` depending on whether they affect editing, registries, or
CSS output.
