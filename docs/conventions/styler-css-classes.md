# Styler: reusable CSS classes (CPT) and block attachments

## Scope

This document defines the **data contract** between:

- The `motto_css_class` custom post type (reusable class definitions), and  
- Block attributes: `mottoStyler.cssClasses` — an ordered list of **references** a block uses.

Editor resolution, repair/dedup, and future migrations must follow this contract so behavior stays predictable across renames, imports, and multiple blocks.

## Reference shape (`cssClasses` items)

Each entry is a plain object (or legacy string forms normalized at the edges).

### Current

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | `number` | WordPress post ID of the `motto_css_class` when linked; `0` when the class is **local-only** (no CPT). |
| `slug` | `string` | Normalized CSS class token (no leading `.`), used for display, editor index keys, and **slug-based** reconciliation. Normalization rules: `normalizeCssClassSlug` in `src/styler/classes/css-class-slug.js`. |
| `uid` | `string` (optional) | **Immutable** UUID v4 (canonical lowercase) mirrored from CPT meta **`motto_class_uid`**. Omitted for local-only refs or until the CPT has been saved with a uid. Validation: `normalizeClassUid` in `src/styler/classes/css-class-uid.js`. |

**Rule:** `uid` is owned by the CPT; block refs only **mirror** it after a successful resolve. Do not invent a `uid` on the block without the same value stored on the CPT (PHP assigns on first `save_post_motto_css_class` when missing).

## Identity and resolution priority

Resolution maps a stored ref to `{ id, slug[, uid] }` using the in-editor registry (`useCssClassRegistry` → `createCssClassRefResolver` in `src/styler/classes/css-class-editor-session.js`).

**Target priority** (resolver in `css-class-editor-session.js`):

1. **`uid` present and matches a loaded CPT** (`idByUid`) → that CPT wins; sync `id` and `slug` from the registry (cross-environment / stale `id` on the block).  
2. **No matching `uid` (legacy or unknown uid)** → apply the **legacy** rules below. Legacy refs gain `uid` after repair once the CPT row has meta `motto_class_uid` and the editor persists the repaired list.  
3. **Legacy, `id > 0` and that id is known in the registry** → **id wins**: `slug` is taken from the CPT (handles slug renames in WordPress without breaking links).  
4. **Legacy, `id > 0` but id unknown in registry** (deleted post, different environment, partial import) → reconcile by **`slug`** if it matches a CPT in the registry (`idBySlug`): adopt that CPT’s **`id`** and prefer the **canonical slug** from `slugById` when the id is present there; if the slug matches nothing, treat as **local-only** (`id: 0`, keep normalized `slug`).

**Implementation note:** `createCssClassRefResolver` applies rule 3 before rule 4: when `slugById.has(currentId)`, the stored slug is overwritten from the CPT (WordPress rename). Rule 4 is the `currentId > 0 && !slugById.has(currentId)` branch in `src/styler/classes/css-class-editor-session.js`.

**Slug-only attachment:** `id === 0` with a non-empty `slug` → if the slug exists in the registry, attach the CPT `id`; else remain local.

## Deduplication

`repairCssClassRefs` keeps at most one entry per canonical identity: key order is **`uid:`** when a non-empty `uid` exists on the resolved ref, else **`slug:`** when slug is non-empty, else **`id:`** for positive ids. Conflicting duplicates are dropped and `changed` is set so `useCanonicalCssClasses` can persist the repaired list.

## UUID / `uid` lifecycle

- **Assign once** when the CPT is created (or via a one-off backfill for existing classes).  
- **Never regenerate** on slug change, title change, or duplicate repair.  
- **Cross-environment:** copying content between sites preserves meaning if the same CPT rows (with the same `uid` meta) are migrated; numeric `id` may differ per database.  
- **Legacy content:** no `uid` on CPT or ref → use legacy resolution only; after the CPT has a `uid`, the next successful resolve may **add** `uid` to the block ref and persist.

## Slug validation (editor)

Attaching a class by name uses `normalizeCssClassSlug`; creating a new CPT uses stricter `isCssClassSlugCompatible` (see `css-class-slug.js` and `CreateClassModal`). Aligning attach vs create validation is a separate UX decision; this doc does not require them to be identical.

## Implementation map

| Concern | Location |
| --- | --- |
| Resolver + repair + dedup | `src/styler/classes/css-class-editor-session.js` |
| Registry maps (`slugById`, `idBySlug`, `uidById`, `idByUid`) | `src/styler/classes/css-class-registry-maps.js`, `use-css-class-registry.js` |
| CPT uid meta (register + backfill on save) | `includes/class-post-type.php` (`MOTTO_CSS_CLASS_UID_META_KEY`) |
| Canonical repair hook on blocks | `src/styler/classes/use-canonical-css-classes.js` |
| Attach / detach / create flows | `src/styler/hooks/use-class-management.jsx`, `AttachedClassesSection`, `CreateClassModal` |
| Editor wrapper class list | `src/styler/runtime/register-editor-wrapper-class.jsx` |

## Status

- **`id` + `slug` + migration slug reconciliation:** **implemented** (`createCssClassRefResolver`, `repairCssClassRefs`, tests).
- **Stable `uid` (UUID v4) on CPT:** post meta key **`motto_class_uid`** (PHP `MOTTO_CSS_CLASS_UID_META_KEY`), registered for REST read, assigned once on `save_post_motto_css_class` when missing (`wp_generate_uuid4()`). REST body filter still strips client writes to unknown meta keys; uid is server-owned.
- **Block `cssClasses[].uid`:** **implemented** — resolver priority 1 by `uid`, repair dedupes by `uid` when set, registry maps built in `css-class-registry-maps.js`, attach/create class flows copy uid from CPT records.

When changing the meta key or REST shape, update this file and `includes/class-post-type.php` together.
