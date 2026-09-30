# SDD-010 — Wildcard System Architecture v1

## Status: Approved

## Problem

The wildcard system (token substitution for dynamic values like `${POST_ID}`, `${ACF_FIELD_STR:key}`) was implemented independently in motto-blocks-pro and motto-dynamics, creating:

- Duplicate resolver logic in two PHP files
- An implicit runtime dependency: motto-dynamics hooked into motto-blocks-pro filters, but Pro is optional
- Split wildcard catalogs at the editor layer — each plugin's popup showed only its own tokens
- `config/wildcards.json` was not copied during Pro assembly, breaking the REST endpoint entirely

## Architecture

### Plugin dependency model

```
motto-blocks (Free)   ← always present, owns the infrastructure
       ↑                        ↑
motto-blocks-pro      motto-dynamics
(optional)            (optional, independent of Pro)
```

Free is the only guaranteed common dependency. Neither Pro nor Dynamics depends on the other.

### Responsibility split

| Layer | Owner | What it provides |
|---|---|---|
| Registry infrastructure | Free | Filter hooks, engine, REST endpoint |
| Base token catalog | Pro | Post, term, user, site, date, acf tokens |
| Query token catalog | Dynamics | Query, extended ACF, post-terms tokens |
| WildcardsPopup component | Free (shared) | Editor UI, compiled into each build |
| Resolver dispatch | Free (via filter) | Delegates to whoever registered the resolver |

---

## PHP Contract

### Filter: `motto_blocks_wildcards`

Plugins add their token definitions to the catalog.

```php
add_filter( 'motto_blocks_wildcards', function ( array $wildcards ): array {
    return array_merge( $wildcards, [
        [
            'token'       => '${MY_TOKEN:param}',
            'label'       => 'My token',
            'description' => 'Resolves to ...',
            'category'    => 'post',   // always a string
            'resolver'    => 'my_resolver_key',
        ],
    ]);
});
```

### Filter: `motto_blocks_resolve_wildcard`

Plugins resolve tokens they own. Return non-null to short-circuit.

```php
add_filter( 'motto_blocks_resolve_wildcard', function ( $value, string $resolver, string $param, int $post_id ) {
    if ( null !== $value ) return $value;
    switch ( $resolver ) {
        case 'my_resolver_key':
            return get_post_meta( $post_id, $param, true );
    }
    return null;
}, 10, 4 );
```

### Filter: `motto_blocks_pre_resolve_wildcard`

For intercepting resolution before the standard dispatch. Same signature as `motto_blocks_resolve_wildcard`. Used by Dynamics to inject loop-term context.

### Engine functions (Free)

```php
// Returns merged catalog (all registered plugins).
motto_blocks_get_wildcards(): array

// Resolves mixed dynamic values recursively, preserving exact-token native types.
motto_blocks_resolve_dynamic_value( $value )

// Resolves all ${...} tokens in a string. Unresolvable tokens are left as-is.
motto_blocks_resolve_wildcards_in_string( string $value, array $options = array() ): string

// Resolves a single token. Returns null if unresolvable.
motto_blocks_parse_wildcard_token( string $token ): ?array
motto_blocks_resolve_wildcard_token( string $token, array $options = array() ): mixed|null
```

### REST endpoint (Free)

```
GET /wp-json/motto-blocks/v1/wildcards
Permission: edit_posts
Response: JSON array of token definitions (merged catalog)
```

---

## Token schema

```json
{
  "token":       "${POST_META:key}",
  "label":       "Post meta",
  "description": "Resolves to a WP post meta value. Example: ${POST_META:my_key}",
  "category":    "post",
  "resolver":    "post_meta"
}
```

- `category` is always a **string** (single value). Multi-category is not supported.
- `token` uses `:param` suffix for parameterized tokens (placeholder name is illustrative).
- `resolver` is the key used in the dispatch filter.

---

## Token categories

Defined in `WildcardsPopup.jsx` as `WILDCARD_CATEGORIES`:

```js
["post", "term", "user", "site", "date", "acf"]
```

Dynamics adds a `"query"` category (`${QUERIED_ID}`, `${CURRENT_PAGE}`). These are valid tokens but intentionally excluded from the shared `WILDCARD_CATEGORIES` constant for now — they are context-specific and may be added in a future revision.

---

## JS Contract

### WildcardsPopup

Defined in `src/components/primitives/WildcardsPopup.jsx`, exported via `src/shared/index.js`.

```js
import { WildcardsPopup, WILDCARD_CATEGORIES } from '@mottoblocks/shared';
// or within motto-blocks:
import { WildcardsPopup, WILDCARD_CATEGORIES } from '@components/primitives/WildcardsPopup.jsx';
```

All popups fetch the wildcard catalog from Free's REST endpoint:

```js
wp.apiFetch({ path: '/motto-blocks/v1/wildcards' })
```

Fetch is triggered when the control becomes enabled (not lazily on mode selection), so data is ready by the time the user reaches the wildcard input.

### WILDCARDS constant (Dynamics-internal)

`motto-dynamics` keeps a local `WILDCARDS` constant (static import of `config/wildcards.json`) **only for validation purposes** in `query-normalizers.js` — checking whether a string is a valid token at parse time. This is not used for display or runtime dispatch.

---

## Migration from previous system

### Removed
- `motto_pro_wildcards` filter → replaced by `motto_blocks_wildcards`
- `motto_pro_pre_resolve_wildcard` filter → replaced by `motto_blocks_pre_resolve_wildcard`
- `motto_pro_resolve_wildcard` filter → replaced by `motto_blocks_resolve_wildcard`
- `motto-blocks-pro/v1/query-wildcards` REST endpoint → replaced by `motto-blocks/v1/wildcards`
- `pro-wildcards-bridge.php` in Dynamics → replaced by `wildcard-bridge.php` hooking into Free

### Renamed (Dynamics)
- `config/query-wildcards.json` → `config/wildcards.json`
- `QUERY_WILDCARDS` → `WILDCARDS`
- `motto_dynamics_get_query_wildcards()` → `motto_dynamics_get_wildcards()`
- `motto_dynamics_resolve_query_wildcard_token()` → `motto_dynamics_resolve_wildcard_token()`
- `motto_dynamics_resolve_query_wildcards()` → `motto_dynamics_resolve_wildcards()`

### Backwards compatibility
Pro's `motto_pro_get_wildcards()` and `motto_pro_resolve_wildcards_in_string()` are kept as thin wrappers delegating to Free's engine, for any external code that may call them directly.

Dynamics keeps `motto_dynamics_resolve_wildcard_token()` and `motto_dynamics_resolve_wildcards()` as compatibility wrappers, but the primary runtime path delegates to Free's shared engine when available. Dynamics-specific meaning stays in its own resolver dispatch and pre-resolve hooks.
