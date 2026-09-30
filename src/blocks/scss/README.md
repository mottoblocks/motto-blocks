Source folders for block SCSS:

- `src/blocks/scss/` — free blocks
- `src/pro/blocks/scss/` — Pro-only blocks (same output: `assets/css/blocks/`)

SCSS is compiled by project scripts (not VS Code local compilers):

- `npm run sass:build` for one-shot compilation.
- `npm run sass:watch` during active styling work.
- `npm run build` also runs `sass:build` automatically via `prebuild`.

Output tree for block SCSS:

- `src/blocks/scss/*.scss` -> `assets/css/blocks/*.css`
- `src/blocks/scss/*.editor.scss` -> `assets/css/blocks/*.editor.css`

Examples:

- `src/blocks/scss/container.scss` -> `assets/css/blocks/container.css`
- `src/blocks/scss/container.editor.scss` -> `assets/css/blocks/container.editor.css`
- `src/styler/styles/editor-ui.scss` -> `assets/css/styler/styles/editor-ui.css` (shared editor-only UI styles, enqueued globally)

Notes:

- `list.scss` should include styles for both `.motto-list` and `.motto-list-item`.
- `list-item` can stay without a separate CSS file when styles are handled by `list.css`.
- Keep block-content classes (for example `.motto-button`) separate from editor UI classes (`.motto-ui-button`).
