# Class Rename Log

Record of CSS class renames for DB migration (search & replace in `wp_posts.post_content`).

---

## motto/classic-menu — 2026-03-26

Block is dynamic (`save: () => null`), so the HTML renames take effect immediately on plugin update.
The DB migration is needed for saved `mottoStyler` attribute data (blockSelectors).

| Old class | New class |
|---|---|
| `motto-block-navigation` | _(removed — was redundant on root `<nav>`)_ |
| `motto-block-navigation__container` | `motto-classic-menu__container` |
| `motto-block-navigation-item` | `motto-classic-menu__item` |
| `motto-block-navigation-item__content` | `motto-classic-menu__item-content` |
| `motto-block-navigation__submenu-container` | `motto-classic-menu__submenu-container` |
| `motto-block-navigation__submenu` | `motto-classic-menu__submenu` |
| `motto-block-navigation__submenu-icon` | `motto-classic-menu__submenu-icon` |
| `motto-block-navigation-submenu__toggle` | `motto-classic-menu__submenu-toggle` |

### Files changed

- `includes/classic-menu.php`
- `src/blocks/classic-menu/block.json`
- `src/blocks/scss/classic-menu.scss`
- `src/blocks/scss/classic-menu.editor.scss`

---

## motto/container — 2026-03-27

Block is static (has `save()`), so existing posts need DB migration OR
the user can click "Attempt Recovery" in the editor to migrate per-post.
Previous `save()` added as `deprecated[0]` in `index.jsx`.

| Old class | New class |
|---|---|
| `motto-bg-image` | `motto-container__bg-image` |
| `motto-bg-overlay` | `motto-container__bg-overlay` |
| `motto-container-link-overlay` | `motto-container__link-overlay` |

### Files changed

- `src/blocks/container/index.jsx`
- `src/blocks/scss/container.scss`
- `src/blocks/scss/container.editor.scss`
- `assets/css/container.css`
- `assets/css/container.editor.css`
- `assets/js/parallax-runtime.js`
