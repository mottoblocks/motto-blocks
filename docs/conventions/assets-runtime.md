# Assets, Runtime, Performance, And Build Conventions

## Static Assets

- Shared SVG/image assets used by PHP, frontend rendering, or editor JS live under `assets/images/`.
- `src/` is for source code and build-time modules, not canonical shared visual assets.
- Brand assets: `assets/images/branding/`.
- Shared non-Lucide icons: `assets/images/icons/`.
- Avoid duplicate copies of the same asset in `includes/` and `assets/`.

## Block Asset Registration

- Load block CSS/JS through `register_block_type` handles.
- Do not use `enqueue_block_assets` or `wp_enqueue_scripts` for per-block assets.

Canonical handles:

- `style_handles`: frontend CSS.
- `editor_style_handles`: editor CSS.
- `view_script_handles`: frontend JS.
- `editor_script_handles`: editor JS.

Rules:

- Register external/shared dependencies first.
- Auto-register per-block CSS from repo asset conventions.
- When adding handles, merge with base handles; do not replace the base handle array.
- Shared editor-global styles may use `enqueue_block_editor_assets`.
- There is no frontend equivalent for plugin-global styles; truly global frontend styling belongs in the theme.

## Frontend Public Dependency Resolution

- Public/frontend derived CSS and expanded frontend trees resolve shared dependency entities from published sources only.
- Draft, private, auto-draft, or otherwise non-public entities must not feed public frontend output.
- If a dependency becomes unavailable to public rendering, invalidate affected caches and rebuild from the next valid public request.

## Accessibility

- Icon-only controls must include `aria-label` and `title`.
- Inputs must include `label` or `aria-label`.
- Keyboard interaction with `Tab`, `Enter`, and `Escape` must remain functional with visible focus.

## Performance

- Memoize heavy lists and maps.
- Avoid recomputing large datasets per keystroke.
- Avoid duplicate state effects that create UI loops.
- Keep state derivation deterministic and single-source.
- Avoid inline `JSON.stringify(...)` in hook dependency arrays; compute memoized signatures first.
- Editor CSS-class resolution must resolve only class entities referenced by the expanded document tree.
- CSS-variable catalogs are global design tokens and must resolve the full published catalog across all pages.

## CSS Build Output Structure

Source SCSS compiles into two output trees mirroring the source layout:

| Source | Output |
|--------|--------|
| `src/blocks/scss/` | `assets/css/blocks/` |
| `src/pro/blocks/scss/` | `assets/css/blocks/` (Pro-only block styles) |
| `src/styler/` | `assets/css/styler/` |

Build command (sass compiles recursively per entry):

```
sass --no-source-map src/blocks/scss:assets/css/blocks src/pro/blocks/scss:assets/css/blocks src/styler:assets/css/styler
```

NPM scripts:

- `npm run sass:build` uses the command above.
- `npm run sass:watch` runs the same inputs/outputs in watch mode.
- `npm run build` runs Sass first via `prebuild`.

- Sass skips SCSS partials (files starting with `_`) automatically.
- Because `src/styler` is compiled recursively, subfolders mirror into the output. For example `src/styler/styles/editor-ui.scss` → `assets/css/styler/styles/editor-ui.css`.
- PHP asset registration must reference the full mirrored path (e.g., `assets/css/styler/styles/editor-ui.css`).
- `_dev/build/free/` contains the Free editor bundle plus copied Free `block.json` runtime artifacts. `_dev/build/pro/` contains the Pro editor bundle plus copied Pro `block.json` runtime artifacts. The assembled plugins keep WordPress-facing paths stable: `motto-blocks/build/` for Free and `motto-blocks-pro/build/` plus `motto-blocks-pro/assets/motto-blocks-pro.js` for Pro. The source roots and sync behavior are centralized in `scripts/block-json-sync.mjs`. JSON manifests needed by PHP/packaging should live under `config/`, which is shipped with the assembled plugin.

## Validation And Build

Required checks by relevance:

- `npm run build`
- `npm run validate:value-options` when present and value option data changed.
- repo-specific PHP lint/build checks.

`validate:value-options` checks:

- type validity
- refs/optionsRef validity
- pattern conflicts
- enum shape
- valid `defaultView` / `defaultRangeView`

## Packaging

- ZIPs must contain only runtime files required for deployment.
- Exclude `src/`, `scripts/`, `node_modules/`, editor config, caches, and temporary files unless explicitly required by the runtime.
- Do not ship duplicate source and compiled runtime assets when compiled assets are enough.
- ZIP generation must be non-destructive.
- Packaging commands must only create/replace the ZIP artifact and optional temp files outside the repo tree.
