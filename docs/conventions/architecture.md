# Architecture Conventions

## Repo Topology

- `motto-blocks` is the base repo and owns shared Blocks, Styler, and shared modules.
- `motto-dynamics` and `motto-animations` are consumer repos with their own runtime behavior and build artifacts.
- The cross-repo **public API** is `motto-blocks/src/shared/index.js` (barrel only — no other files under `src/shared/`). Implementation lives in `src/components/`, `config/`, or `src/lib/` and is re-exported from the barrel when consumers need it.
- Editor UI implementations used inside this repo live primarily under `motto-blocks/src/components/`; surface symbols to consumer repos by re-exporting from `src/shared/index.js` when needed.
- Avoid direct cross-plugin runtime file imports in deployed code.
- Historical `motto-props` references are legacy-only.

## Project Structure

- `src/blocks/`: **free** blocks only — one folder per block (`block.json`, `index.jsx`). Block SCSS lives under `src/blocks/scss/` (compiled to `assets/css/blocks/`).
- `src/blocks/freepro/`: **Pro extension surfaces for free blocks** — hook ID constants (`blocks-freepro-ids.js`, exports `BLOCKS_HOOKS`) used by free blocks to expose `applyFilters()` call sites for Pro controls. Free blocks import from here; Pro registers `addFilter()` responses from `src/pro/blocks/register-pro-block-filters.js`.
- `src/pro/blocks/`: **Pro-only** blocks (same folder shape as free). Registered only from the Pro JS entry (`src/pro/editor-hooks.js` imports); never from `src/index.jsx`. Their SCSS lives under `src/pro/blocks/scss/` (same compile output directory). Also contains `register-pro-block-filters.js` — Pro-side filter registrations for block-level Pro controls that extend free blocks (Pattern B).
- `src/styler/`: **Styler core** (ships with the free plugin) — panel runtime, controls, components, hooks, utils, and **extension points** (`doAction` / `applyFilters`) for Pro. Pro does not fork this tree; it hooks in from `src/pro/styler/`.
- `src/shared/`: **public barrel only** (`index.js`) — re-exports symbols consumer repos may import. Implementation belongs in `src/components/`, `config/`, or `src/lib/` and is surfaced here when needed.
- `src/lib/`: neutral JS helpers used by both Styler and `src/components/` (e.g. CSS variable catalog glue, Pro hook id constants) without pulling in `src/styler/`.
- `src/components/`: repo-internal editor UI — `controls/` holds `*Control` components and domain-specific control families (bullets, icons, link, etc.), grouped in subfolders (`image/`, `color/`, `units/`, `device/`, `transition/`, …). `primitives/` holds companion pieces that are not named `*Control` (fields, tabs, unit helpers, etc.). Shared editor chrome partials live in `ui/styles/` (SCSS). The generated Lucide registry is `lucide/lucide-registry.js`. Not published as its own package; consumer repos must not depend on `@components` paths from this repo.
- `src/pro/`: Pro-only JS — entry `editor-hooks.js` imports `blocks/` (Pro-only Gutenberg blocks + block-level filters), `styler/` (Pro Styler UI and filters), and shared `register-*` side effects. Mirrors the free layout: free has `src/blocks` + `src/styler`; Pro has `src/pro/blocks` + `src/pro/styler`.
- `assets/css/blocks/`: compiled CSS for blocks (output of `src/blocks/scss/` and `src/pro/blocks/scss/`).
- `assets/css/styler/`: compiled CSS for styler (output of `src/styler/`).
- `assets/images/`: shared static image assets used by JS/PHP/frontend.
- `assets/images/branding/`: brand assets.
- `assets/images/icons/`: shared SVG icons not covered by Lucide registry.
- `build/`: compiled JS bundle and copied block.json/data artifacts (tracked in git for deployment without a build step).
- `scripts/`: repo automation.
- `config/`: shared cross-repo config sources synced into consumers.

## Import aliases (motto-blocks source, Vite)

- `@shared` resolves to `src/shared/index.js` (the barrel). There are no other modules under `src/shared/` to deep-import.
- **Consistency:** Source inside `motto-blocks` (`src/blocks/**`, `src/styler/**`, `src/components/**`, `src/pro/**`) should import shared UI and helpers via **`@components`**, **`@lib`**, and **`@config`** (canonical locations). Do **not** use `from "@shared"` in this repo — that barrel is the **published API for consumer repos** (motto-dynamics, motto-animations, etc.), which wire an alias to `src/shared/index.js` only.
- `@components` resolves to `src/components/index.js` or `src/components/*`.
- `@lib` resolves to `src/lib/*`.
- `@config` resolves to repo-root `config/*` (JSON + shared breakpoint JS).
- Prefer **`@components`**, **`@lib`**, and **`@config`** for imports from `src/blocks/**`, `src/styler/**`, or `src/pro/**` instead of long relative paths (stable when files move).
- Keep **relative imports** for same-folder/nearby modules (e.g. `src/styler/components/*` imported from `src/styler/classes/components/*` via `../../components/…`, which is the **styler** components folder, not `src/components`).
- Consumer repos wire their own alias to `motto-blocks` `src/shared/` (often exposed as `@mottoblocks/shared` or `@shared`); they do not import `src/components/` directly.

## Editor layer imports (motto-blocks)

- `src/styler/**` may import `src/components/**` and `src/shared/**`.
- `src/components/**` must not import `src/styler/**`. Put neutral building blocks in `config/` or `src/lib/` (e.g. `config/styler-breakpoints.js`, `src/lib/css-variable-records.js`, `src/lib/freepro-ids.js`) and have both Styler and `components` consume them. `scripts/validate-import-boundaries.mjs` enforces the `components` → `styler` ban for relative imports.

## Breakpoints

- Source of truth for breakpoint JSON config: `config/motto-breakpoints.json`.
- JS source of truth for breakpoint keys: `BREAKPOINT_KEYS` exported from `config/styler-breakpoints.js`.
- All JS code that needs `["desktop", "tablet", "landscapePhone", "phone"]` must import `BREAKPOINT_KEYS` — never hardcode the array.
- Consumer repos use a local synced copy of the JSON at runtime.
- Breakpoint setting changes invalidate frontend cache entries; they must not synchronously rebuild every cached post in the settings save request.
- Eager cache warming must be an explicit separate/background action.

### Cascade direction (desktop-first)

- `desktop` has `media: ""` (unwrapped, unconditional CSS). `tablet`/`landscapePhone`/`phone` each wrap in `@media (max-width: …)` with a decreasing width. Breakpoint order (`BREAKPOINT_KEYS`) is widest-first.
- Consequence: a prop declared only on `desktop` (e.g. `display: flex`) still applies at narrower breakpoints unless a narrower breakpoint explicitly redeclares that same prop. This is the normal CSS cascade across stacked media-query blocks for the same selector, not inheritance — it applies to any prop, not just `display`.
- **`display` resolution SSOT — `src/styler/utils/display-cascade.js`.** `resolveEffectiveDisplay()` resolves the `display` value actually in effect at a given breakpoint, in the same priority order used everywhere: the instance's own cascaded declarations (`buildDisplayLayerByBp()`, carrying the last-declared value wide -> narrow), then attached reusable classes' cascaded declarations (`buildClassDisplayLayerByBp()`, merging all attached classes' rows per breakpoint before carrying), then the block's structural base layout default (`getMottoBaseLayoutDisplay()` from `src/styler/layout/base-layout.js`). The CSS generator (`buildEditorCssForSelector()` in `src/styler/runtime/style-engine.jsx`) consumes these same building blocks directly — do not re-derive this priority order elsewhere; import from `display-cascade.js`.
- The Styler "requires" dependency warning (e.g. `align-items` warns "Requires display: flex" — declared per-prop in `src/styler/data/styler-css-value-options.json`, checked in `src/styler/utils/rule-warnings.js`) reuses this SSOT so it doesn't false-positive when `display` was set on a wider breakpoint, an attached class, or only implied by the block's base layout instead of the current breakpoint's own rows. Wiring, in `StylerCssList.jsx`:
  - Any prop (not just `display`) declared on a wider breakpoint of the *same* rows is covered generically by `resolveCascadedCssValuesByProp()` (`src/styler/utils/css-row-metadata.js`), which needs the full `cssByBreakpoint` map — pass that prop or the check silently falls back to current-breakpoint-only.
  - `display` specifically is additionally backfilled from `resolveEffectiveDisplay()` when the cascade above found nothing, using the optional `classMottoStylers`/`baseLayout` props (only meaningful — and only wired — for a block instance's own CSS list, e.g. `StylerPanel.jsx`; class-definition editors like `ClassEditorPanel`/`PostClassStylerPanel` have no attached-classes or base-layout concept and don't pass them).
- Inner/block selectors are cascade-aware too: `BlockSelectorsList.jsx` builds a `cssByBreakpointById` map (matching each selector's `id` across its per-breakpoint `syncedByBp` map) and passes the entry for the open selector down through `InnerSelectorItem.jsx` as `StylerCssList`'s `cssByBreakpoint` prop — read-only (no `onCssByBreakpointChange`), so this doesn't enable cross-breakpoint preset-apply for selectors, only the dependency-warning cascade lookup. Since the computation lives in `BlockSelectorsList.jsx` itself, all three consumers (`ClassEditorPanel`, `PostClassStylerPanel`, `SelectorsSection`) get it automatically; the `display` backfill still doesn't apply here (no attached-classes/base-layout concept for a selector), same as class-definition editors above.

## Naming

- Components: `PascalCase`.
- JS variables/functions: `camelCase`.
- CSS classes: kebab-case, `motto-` prefix for plugin-owned classes.
- PHP functions: `motto_blocks_` or `motto_styler_`; never `motto_props_`.
- Shared components re-exported from `src/shared/index.js`, or defined under `src/components/controls/` or `src/components/primitives/`, use descriptive names without a `Motto` prefix.
- Block titles keep the short `Motto` prefix for inserter grouping — **except** blocks restricted to a Motto parent via `block.json`'s `"parent"` (i.e. only ever inserted nested inside another Motto block, never appearing loose in the inserter). Those drop the `Motto` prefix so nested trees don't repeat it at every level (e.g. `Motto Accordion > Accordion Item > Accordion Trigger`, not `Motto Accordion > Motto Accordion Item > Motto Accordion Trigger`).

## className

- Use `clsx` directly in JSX `className` props.
- Do not pre-compute class strings in constants for JSX.
- Do not use `array.filter(Boolean).join(" ")`, `joinClasses`, or similar helpers.
- Exception: `clsx()` inside `useMemo` is acceptable when the class string feeds non-JSX logic.

## MottoStyler Attribute Contract

Canonical shape:

```js
{
  instanceId: string,
  cssClasses: Array<string | { id?: number, slug: string, uid?: string }>,
  css: { desktop: CssRow[], tablet: CssRow[], landscapePhone: CssRow[], phone: CssRow[] },
  innerSelectors: { desktop: InnerSelector[], tablet: InnerSelector[], landscapePhone: InnerSelector[], phone: InnerSelector[] },
  html: { attributes: HtmlAttr[] }
}
```

- `CssRow`: `{ id: string, name: string, value: string }`
- `InnerSelector`: `{ id: string, selector: string, css: CssRow[] }`

Rules:

- `mottoStyler` is canonical.
- `mottoProps` is migration-only compatibility input; never write to it.
- **Reusable class attachments (`cssClasses`)**: resolution, deduplication, and stable `uid` (planned) are defined in `docs/conventions/styler-css-classes.md` — do not fork that contract in other docs.
- Every row must have a stable unique `id`.
- Never use `name` or `value` as row identity.
- Missing/duplicated IDs must be repaired on load.
- `instanceId` is block-level identity and must not collide after sanitization.

## Discriminated Type Attributes

When a block attribute represents one of several mutually exclusive variants — a `type`/mode discriminator plus per-type config fields (e.g. an image source that can be featured/field/custom, or a condition that can be device/cookie/urlParam/language/...) — prefer a single object attribute with the discriminator and a **nested sub-object per variant**, not a flat merge of all variants' fields into one level.

```js
// Preferred: per-variant nesting
{
  type: "cookie",
  cookie: { name: "consent", matchType: "equals", value: "yes" },
  urlParam: { name: "", matchType: "exists", value: "" }
}

// Avoid: flat merge across variants
{
  type: "cookie",
  name: "consent", matchType: "equals", value: "yes"   // ambiguous which variant this belongs to
}
```

Rationale: per-variant nesting avoids stale/orphaned keys surviving a type switch, keeps field ownership unambiguous when read out of context, and maps cleanly to JSON Schema (`oneOf` + discriminator) and TypeScript discriminated unions.

Exception: `imageDynamic` (`src/blocks/image/block.json`) predates this convention and uses a flat merged shape (`{ ...dynamic, ...patch }` in `ImageSourceDynamicControl.jsx`). It is grandfathered — do not retrofit shipped attribute shapes without an explicit migration/deprecation plan (see the `deprecated` array pattern in `src/pro/blocks/panel-trigger/index.jsx`). New discriminated-type attributes must follow the per-variant shape above.

### Icon Payload Shape

Single-icon option payloads are an intentional exception to per-variant nesting:

- One top-level discriminator: `type: image | icon | svg | none`.
- Authored icon payload fields stay flat, e.g. `inlineSvg` and `lucideIcon`, rather than nested per-variant.

## Free vs. Pro Block Registration (PHP)

Both Free and Pro blocks use the shared helpers `motto_blocks_build_block_registration_args()` and `motto_blocks_do_register_block()`.

Key difference:
- **Free blocks**: registered via `motto_blocks_register_block()`, which goes through the per-block enabled/disabled check (`motto_blocks_is_block_enabled()`). Users can toggle free blocks on/off in admin settings.
- **Pro blocks**: registered via `motto_pro_register_block()`, which goes through the same `motto_blocks_is_block_enabled()` check as Free blocks (see `docs/specs/SDD-033`). Pro contributes its own block.json-derived definitions to the shared catalog via the `MOTTO_HOOK_BLOCK_DEFINITIONS` filter (`motto_pro_add_block_definitions()`), tagged `tier: pro`, so Pro-tier blocks get a real per-block toggle in the admin Blocks tab once Pro is active. Availability is still not license-gated — Pro blocks register unconditionally whenever the Pro plugin is active and enabled.

Pro blocks read their `block.json` from `MOTTO_PRO_DIR . 'build/blocks/'` and their editor script handle is `'motto-blocks-pro'` (vs. `'motto-blocks-editor'` for free).

## Defaults Ownership

- `motto-blocks` owns shared runtime logic for `mottoDefaults`, reset behavior, and default auto-apply decisions.
- Blocks provide defaults as `block.json` data when needed.
- Starter rules must be minimal and structural.
- `mottoDefaults` rows in `block.json` intentionally omit `id`; Styler assigns IDs on load.
- Consumer repos reuse shared behavior instead of forking defaults heuristics.

## SSR Preview Contract

- Send explicit allowlist payloads to `/wp/v2/block-renderer/{namespace/block}`.
- Payloads must include only attributes declared by the target block schema.
- Do not pass global/editor runtime objects implicitly.
- `innerSelectors` belongs inside `mottoStyler` or `mottoDefaults`, not as a root SSR attribute.
