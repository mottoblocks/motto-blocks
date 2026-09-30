# Motto Blocks

WordPress Gutenberg plugin: advanced blocks plus **Styler**, a reusable, responsive per-instance CSS system (breakpoints, reusable classes, CSS variables) that keeps design decisions consistent and scalable across a site.

This is the human-readable source for the [Motto Blocks](https://wordpress.org/plugins/motto-blocks/) WordPress.org plugin — the source used to build `build/motto-blocks.js` and the rest of the compiled assets shipped in the plugin package. A separate paid Pro add-on is distributed independently via [mottoblocks.com](https://mottoblocks.com/) and is not part of this repository.

## Blocks

Each block lives under `src/blocks/<slug>/` and has its own `README.md` documenting its current behavior — start there before changing a block. Some blocks are static (`save()`), others are dynamic (PHP `render_callback`); check the block's own README/`block.json` rather than assuming one or the other.

## Build

See `CLAUDE.md` for build/dev/lint/format commands — that's the canonical copy, not repeated here.

## Contributing / conventions

- `AGENTS.md` — operational rules, repo topology, commands.
- `CONVENTIONS.md` — engineering conventions index (naming, data contracts, architecture).
- `skills-source/` — Claude Code skills for this repo (visual/design-system rules, Styler value-control authoring).
