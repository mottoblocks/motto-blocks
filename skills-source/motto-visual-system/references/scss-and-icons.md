# SCSS And Icon Rules

## SCSS

- Prefer nested SCSS by component block.
- Always use explicit `&` for nested descendant selectors.
- In block SCSS, wrap child selectors in `:where(...)` by default. Certain conditions may apply where this is not needed; use judgment.
- Reserve bare `&` for root states/modifiers/attributes.
- Avoid `&__element` and `&-suffix` SCSS shorthand for child elements. BEM-style `__` naming in class names (e.g. `.motto-device-toggle__trigger`) is acceptable for complex components with many sub-elements — define them as root-level classes, not via SCSS `&__` interpolation.
- `gap`, `row-gap`, and `column-gap` must use Motto spacing tokens.
- Remove unused CSS when component logic is removed.

SCSS comments:

- Use one file header `/* ComponentName — purpose */`.
- Use `//` group dividers before logical rule groups.
- Do not add comments that merely restate selector names.

## Lucide And Icon Strategy

- Fixed UI icons use direct imports from `lucide-react`.
- Fixed editor chrome icons default to `size={14}` unless a specific UI need requires another size.
- Icon-only button markup/accessibility rules: see `control-naming.md` (Button Classes) — same `motto-ui-button` requirement applies to icon buttons.
- Do not use the WordPress `Button` `icon` prop when exact sizing/markup matters.
- Do not fix icon sizing mismatches with one-off CSS overrides; match the shared button pattern.
- Dynamic icons by string resolve through the local generated registry.
- Never use `import * as Lucide from "lucide-react"` in runtime UI code.
- `motto-blocks/src/components/lucide/` owns the allowlist (`lucide-icons.json`), generator helpers (`generate-lucide-registry-core.mjs`), and the generated registry (`lucide-registry.js`). Each consumer repo keeps its own generated registry file.

Icon option **payload shape** (`type`, `inlineSvg`, `lucideIcon`) is a data contract, not a visual rule — see `docs/conventions/architecture.md` (Discriminated Type Attributes / Icon Payload Shape).

Lucide icon size defaults:

- `18`: toolbar/inserter block icons.
- `16`: sidebar UI buttons.
- `14`: inline actions and compact controls.
