---
name: motto-visual-system
description: "Use when creating or editing Motto Styler editor UI: PanelBody/panel structure, *Control components, buttons, popups, SCSS class naming, motto-panels primitives, value-options resolution, label/input layout, and Lucide icon usage/sizing rules for the Motto design system."
compatibility: "motto-blocks and consumer repos (motto-dynamics, motto-animations, motto-ai) that import motto-blocks editor UI/Styler primitives."
---

# Motto Visual System

## When to use

Use this skill for editor UI work inside `motto-blocks` (or a consumer repo importing its shared UI), such as:

- adding or editing a `PanelBody` / sub-panel in a block's `InspectorControls`
- creating a new `*Control` component (styler control, popup, toggle group, etc.)
- naming CSS classes for controls, buttons, icons, or popups
- writing or reviewing SCSS for editor UI
- choosing a Lucide icon and its size
- deciding where a new label/input row or layout primitive goes

Do not use this skill for Styler **data contracts** (CSS class CPT refs, `mottoStyler`/icon-payload attribute shape, CSS delivery/caching paths) or **file placement/topology** (where `*Control` components and shared exports live) — those live in `docs/conventions/architecture.md`, `docs/conventions/styler-css-classes.md`, and `docs/conventions/styler-css-loading.md`. This skill covers the visual/naming layer only, not the underlying data model or repo topology.

## Reference map

Each file is independently addressable — open only the one matching your task:

| Task | File |
| --- | --- |
| Panel/sub-panel structure, popups, shared panel primitives | `references/panel-structure.md` |
| Naming a control/button, BEM sub-elements, class/CSS ordering | `references/control-naming.md` |
| Value-options resolution, label/input layout | `references/label-input-patterns.md` |
| SCSS conventions, Lucide import/sizing rules | `references/scss-and-icons.md` |

## Verification

- New/changed control root class matches `motto-[css-property-name]-control`.
- `PanelBody` has `motto-panel-body`; sub-panel titles are short and clear, without redundant `Settings`/`Options`/`Controls` suffixes (see `panel-structure.md` for when a longer descriptive name is the right call).
- Popup root has `.motto-popup`; targeting class follows `motto-[component]-popup`.
- Icons import directly from `lucide-react` at the correct default size for their context.
- No shared-looking style duplicated in a block folder when a `motto-panels` primitive already covers it.
- `npm run build` (or `npm run lint` for JS-only changes) runs clean.

## Escalation

If a rule here conflicts with `docs/conventions/architecture.md` (topology, aliases, `mottoStyler` contract) or with `docs/conventions/styler-css-classes.md` / `styler-css-loading.md` (data contracts), those docs win for anything about data shape, resolution, or CSS delivery — this skill only governs class naming and visual structure.
