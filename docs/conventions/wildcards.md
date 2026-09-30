# Wildcard System

Wildcards are dynamic runtime tokens that resolve to contextual values at render time such as post IDs, ACF fields, dates, URLs, and query-specific values.

## Syntax

```text
${TOKEN}
${TOKEN:param}
${TOKEN:param@context}
```

Contexts:

- *(none)* — current post
- `@parent` — parent of current post
- `@123` — explicit post ID

Nested resolution is supported by the shared Free engine for `param` and `context`.

Examples:

```text
${POST_ID}
${POST_META:_wp_attached_file}
${POST_META:_wp_attached_file@${POST_ID}}
```

## Architecture

Free (`motto-blocks`) owns the shared wildcard infrastructure because it is the only guaranteed common dependency for both Pro and Dynamics.

| Layer | Owner | Responsibility |
|---|---|---|
| Shared engine | **motto-blocks (Free)** | Parser, recursive resolution, context normalization, dispatch hooks, merged REST catalog |
| Base content tokens | **motto-blocks-pro** | Post, term, user, site, date, ACF, post-meta resolver semantics |
| Query tokens | **motto-dynamics** | Query, extended ACF, post-terms resolver semantics |

There is no runtime dependency between Pro and Dynamics. Both extend the Free engine.

## Shared PHP Contract

Free provides the shared engine in `includes/wildcard-registry.php`.

Primary functions:

```php
motto_blocks_get_wildcards(): array
motto_blocks_parse_wildcard_token( string $token ): ?array
motto_blocks_resolve_wildcard_token( string $token, array $options = array() )
motto_blocks_resolve_dynamic_value( $value, array $options = array() )
motto_blocks_resolve_wildcards_in_string( string $value, array $options = array() ): string
```

Primary hooks:

```php
motto_blocks_wildcards
motto_blocks_pre_resolve_wildcard
motto_blocks_resolve_wildcard
```

## Catalog Ownership

| Plugin | Catalog | Resolver entrypoint | Notes |
|---|---|---|---|
| **motto-blocks-pro** | `pro/config/wildcards.json` | `pro/includes/wildcard-resolver.php` | Registers catalog + resolver callbacks into Free |
| **motto-dynamics** | `config/wildcards.json` | `includes/query-block.php` | Keeps query-specific semantics; bridges into Free via `includes/wildcard-bridge.php` |

## Editor Contract

Editor controls fetch the merged wildcard catalog from Free:

```text
/wp-json/motto-blocks/v1/wildcards
```

This merged endpoint is the source of truth for wildcard popup UIs.

## Adding a wildcard

### Add a Pro wildcard

1. Add the token definition to `pro/config/wildcards.json`.
2. Add the resolver semantics to `pro/includes/wildcard-resolver.php`.
3. Update the relevant spec/doc if the contract changes.

### Add a Dynamics wildcard

1. Add the token definition to `config/wildcards.json`.
2. Add the resolver semantics to `includes/query-block.php`.
3. Keep any query-specific interceptors in `includes/wildcard-bridge.php` if needed.
4. Update the relevant spec/doc if the contract changes.

## Rules

- Keep parser and recursive resolution mechanics in Free.
- Keep token meaning and data access in the owning plugin.
- Do not add a direct runtime dependency between Pro and Dynamics.
- Do not fork popup catalog endpoints per plugin; use the merged Free endpoint.
