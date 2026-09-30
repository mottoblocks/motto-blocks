# Styler CSS Loading Architecture

Styler CSS (instance styles, class rules, CSS variables) is delivered through four independent paths. Each path owns a specific rendering context. Do not mix responsibilities across paths.

---

## Path 1 — Public frontend (`wp_head`, PHP)

**Context:** any public page request (not admin, not editor).

**How it works:**
`styler-frontend-render.php` accumulates CSS as blocks render via `pre_render_block` / `render_block` hooks, then prints the result in `wp_head` at priority 999997–999999. A buffering fallback handles themes that emit the head before blocks render.

**Rule:** Only published entities feed public output. Draft, private, and auto-draft content must not appear in public CSS.

**Global Custom CSS:** The site-wide Custom CSS setting (`motto_blocks_get_custom_css()`, `includes/admin/settings-custom-css.php`) reuses this path — `motto_blocks_print_custom_css_frontend()` prints its own `<style id="motto-blocks-custom-css">` on `wp_head` at priority `1000000`, after the Styler prints above, so it can override instance/class/variable CSS.

**Persistence:** Do not collapse instance CSS and shared class CSS into one persistence mechanism unless the cache contract is intentionally redesigned.

---

## Path 2 — Editor canvas (JS, in-memory)

**Context:** the main block editor iframe while a post or template is open for editing.

**How it works:**
`src/styler/runtime/editor-style-registry.jsx` maintains three `<style>` tags injected directly into the editor iframe document:

| Tag ID | Content |
|---|---|
| `motto-blocks-styler-editor-vars` | CSS custom property definitions |
| `motto-blocks-styler-editor-classes` | Reusable class rules |
| `motto-blocks-styler-editor-styles` | Per-instance block styles |

The registry reads Gutenberg's in-memory block tree (Redux store), so it reflects unsaved changes immediately.

**Deduplication note:**
In Site Editor contexts, Gutenberg can render the PHP preview snapshot from Path 3 into the same main canvas document as anonymous `<style>` tags. Because those tags cannot be targeted by `id`, the JS runtime disables (`media="not all"`, tracked with `data-motto-preview-snapshot`) only the snapshot tags whose CSS contains the explicit preview markers:

- `/* motto-blocks-preview-styler-classes */`
- `/* motto-blocks-preview-styler-styles */`

**Never `remove()` these nodes.** Gutenberg's `EditorStyles` renders them as index-keyed React children; detaching one makes a later re-render (e.g. returning from editing a synced pattern) write another entry's CSS — core or theme — into the detached node, so that CSS silently disappears until a full reload. If React reuses a disabled node for non-snapshot CSS, the runtime re-enables it.

This is an intentional bridge between Path 3 and Path 2, not a generic style cleanup layer. Keep it narrowly scoped to the main editor canvas document. Do not expand it into content-based CSS heuristics beyond these explicit markers unless WordPress exposes a more precise preview-only API.

**Rule:** This path is the only one that knows about unsaved changes. Do not replicate it in PHP.

**Global Custom CSS:** A 4th, static tag (`motto-blocks-styler-editor-custom-css`) carries the site-wide Custom CSS setting into the canvas. Unlike the other three tags, its content isn't derived from `stylesById` — it's read once per render from `window.__MOTTO_BLOCKS_CUSTOM_CSS__` (localized in `motto_blocks_register_editor_script()`, `motto-blocks.php`) and rendered last, after per-instance styles, so it can override them.

---

## Path 3 — BlockPreview iframes (PHP, `block_editor_settings_all`)

**Context:** read-only template/pattern preview iframes — template chooser popup, Site Editor template grid, pattern inserter.

**How it works:**
`motto_blocks_add_template_preview_dynamic_styler_css()` runs on the `block_editor_settings_all` filter (priority 30). It collects CSS by traversing all templates and template parts via `get_block_templates()` (handles both DB-only and theme-file templates), then all registered patterns. The result is appended to `$settings['styles']`, which WordPress distributes to every BlockPreview iframe as `<style>` tags.

Each Styler payload is prefixed with a marker comment so the main editor canvas JS runtime can remove only the preview snapshot copy when WordPress renders both paths in the same document.

Those marker comments are part of the contract for this path. If Path 3 CSS changes format, preserve the markers or update the JS deduplication in Path 2 at the same time.

Template part resolution uses `get_stylesheet()` as the default theme when the block reference omits the `theme` attribute, preventing cross-theme slug collisions.

**Rule:** Use `get_block_templates()` — not `get_posts()` — to query templates and template parts. `get_posts()` is unreliable for `wp_template` / `wp_template_part` post types. Use `get_posts()` only for `wp_block` (reusable blocks), which `get_block_templates()` does not cover.

**Known limitation:** CSS is injected once at page load. Templates created or modified in the same browser session after load will not appear in BlockPreview CSS until the page is reloaded.

---

## Path 4 — No-iframe block-level preview (PHP via REST, JS-rendered `<style>`)

**Context:** a block renders a preview of content that isn't part of the post's own block tree (so Path 2 can't see it) and deliberately renders it directly into the current document instead of inside a `BlockPreview` iframe (so Path 3 can't reach it — that path only targets real BlockPreview iframes via `block_editor_settings_all`). First consumer: `motto/pattern-ref`'s canvas instance preview, which renders the referenced pattern's blocks via `__experimentalUseBlockPreview` with no iframe, specifically to avoid the nested-iframe mount delay `BlockPreview` has.

**How it works:** PHP computes Styler CSS for one specific piece of externally-resolved content — reusing the exact same builder functions Path 3 already uses (`motto_blocks_collect_template_preview_styler_css()`, `motto_styler_build_frontend_styles_css()`, `motto_styler_build_css_class_rules()`) — scoped to just that content instead of Path 3's "walk everything registered" sweep. The result is exposed over REST (e.g. `motto_pro_get_theme_patterns()`'s `stylerCss` field), and the consuming block renders it as a plain `<style>{css}</style>` element alongside its non-iframe preview, in its own `edit()` output — no `block_editor_settings_all`, no marker-comment deduplication with Path 2, since this CSS lives inside the block's own React output rather than being injected into the shared document head.

**Rule:** Only use this when a block's preview genuinely can't sit inside a `BlockPreview` iframe (Path 3) and doesn't belong to the post's own block tree (Path 2). If a future context could just as well use a real `BlockPreview` iframe, prefer Path 3 — it's already computed once for the whole site's pattern/template catalog, rather than re-computed per block instance.

**How this differs from Path 3:** same underlying CSS-builder functions, different scope (one instance vs. the whole registered catalog) and different delivery (REST + inline `<style>` in JSX vs. `block_editor_settings_all` targeting WordPress-provided iframes).

---

## Which path to use

| What you need to style | Path |
|---|---|
| A public page | 1 (PHP, `wp_head`) |
| The active editing canvas, for blocks that are part of the post's own tree | 2 (JS, editor-style-registry) |
| A BlockPreview / template chooser preview (real iframe) | 3 (PHP, `block_editor_settings_all`) |
| A block-level preview of externally-resolved content, rendered with no iframe | 4 (PHP via REST, JS-rendered `<style>`) |

Adding a fifth path needs the same bar Path 4 met: a rendering context none of the existing paths can reach, not just convenience. Map new needs to the closest existing path first.
