# Feature Spec: SDD-011 — Shared Wildcard Engine v1
Version: 0.2
Status: Active
Owner: Architecture
Last Updated: 2026-07-12

This file is a technical follow-up to `docs/specs/SDD-010-wildcard-system-v1.md`.

It does not redefine wildcard ownership, plugin dependency boundaries, or the shared registry contract already established in SDD-010.

## 1. Goal
Define a shared wildcard engine in Free (`motto-blocks`) that owns neutral parsing and resolution infrastructure used by both `motto-blocks-pro` and `motto-dynamics`, including nested wildcard resolution.

## 2. Scope
In scope:
- Shared parsing of wildcard tokens in Free.
- Shared recursive resolution rules for exact-token values, embedded string tokens, and nested `param` / `context` segments.
- Shared safeguards: max depth, invalid-context handling, unresolved-child handling.
- Migration of `motto-dynamics` to use the shared Free engine for generic token parsing and recursive value resolution.
- Preservation of plugin-specific resolver ownership via existing filter hooks.

Out of scope:
- Adding new business-level wildcard tokens.
- Moving plugin-specific resolver semantics into Free.
- Changing the existing registry/discovery model from SDD-010.
- Reworking editor popup UX beyond what is needed to stay compatible with the runtime contract.

## 3. Current Behavior
- Free already owns the wildcard registry, token dispatch, and REST catalog endpoint in `includes/wildcard-registry.php`.
- Pro already depends on Free's engine and contributes only token catalog entries plus resolver implementations.
- Dynamics already bridges its token catalog and resolver dispatch into Free's registry hooks, but still duplicates generic token parsing and recursive value resolution inside `includes/query-block.php`.
- Free's current string resolution is single-pass and does not support wildcard nesting inside `param` or `context`.

## 4. Target Behavior
### 4.1 Ownership model
- Free owns the shared wildcard engine infrastructure because it is the only guaranteed common dependency.
- Pro and Dynamics continue to own:
  - token catalog entries
  - resolver keys
  - resolver-specific runtime behavior
  - plugin-specific context interception when needed

### 4.2 Shared engine responsibilities in Free
Free should own only neutral wildcard mechanics:
- token-shape parsing
- nested resolution of `param` and `context`
- exact-token vs embedded-string resolution behavior
- recursive resolution of arrays and scalar values
- base context normalization (`''`, `parent`, explicit numeric ID)
- recursion / cycle safeguards
- dispatch into `motto_blocks_pre_resolve_wildcard` and `motto_blocks_resolve_wildcard`

### 4.3 Plugin-specific responsibilities
Consumers must continue to own:
- `resolver => meaning` mapping
- token-specific validation and data access
- special context overrides that are not generic post-context rules

Example:
- Dynamics may still intercept term-loop context through `motto_blocks_pre_resolve_wildcard`.
- Pro may still resolve `${POST_META:key}` or `${ACF_FIELD_STR:key}` via its own resolver callback.

## 5. Shared Engine Contract
### 5.1 Supported syntax
The shared engine must support:
- `${TOKEN}`
- `${TOKEN:param}`
- `${TOKEN:param@context}`

Additionally:
- `param` may contain nested wildcard tokens
- `context` may contain nested wildcard tokens

Examples:
- `${POST_ID}`
- `${POST_META:_wp_attached_file}`
- `${POST_META:_wp_attached_file@${POST_ID}}`
- `${POST_META:${ACF_FIELD_STR:file_meta_key}@parent}`

### 5.2 Resolution order
Resolution must proceed from inner to outer:
1. Parse the outer token structure.
2. Resolve nested wildcards inside `param`.
3. Resolve nested wildcards inside `context`.
4. Normalize the final `context` into a target post ID rule.
5. Dispatch the resolved token to plugin callbacks.

### 5.3 Exact token vs embedded string
Rules:
- If the full input value is exactly one wildcard token, preserve the resolver's native return type.
- If a wildcard is embedded inside a larger string, cast the resolved value to string.
- Arrays must be resolved recursively item-by-item.

Examples:
- `"${POST_ID}"` -> `123` as integer
- `"/post/${POST_ID}"` -> `"/post/123"` as string
- `["${POST_ID}", "${CURRENT_YEAR}"]` -> `[123, 2026]`

### 5.4 Unresolved nested tokens
If a nested token inside `param` or `context` cannot be resolved:
- the parent token must remain unresolved
- the engine must not partially dispatch a token with raw unresolved fragments

Example:
- `${POST_META:key@${UNKNOWN_TOKEN}}` -> unresolved parent token

### 5.5 Context normalization
After nested resolution, the final `context` value must be one of:
- empty string
- `parent`
- numeric post ID string

Any other final `context` is invalid and the token must remain unresolved.

### 5.6 Safeguards
The shared engine must implement:
- max resolution depth
- cycle / repeated-token protection
- deterministic failure behavior for invalid nested inputs

Initial recommendation:
- max depth: `5`

## 6. Free API Surface
The exact internal split may vary, but Free should expose a stable shared API shaped like:

```php
motto_blocks_get_wildcards(): array
motto_blocks_parse_wildcard_token( string $token ): ?array
motto_blocks_resolve_wildcard_token( string $token, array $options = array() )
motto_blocks_resolve_dynamic_value( $value, array $options = array() )
motto_blocks_resolve_wildcards_in_string( string $value, array $options = array() ): string
```

Notes:
- `motto_blocks_resolve_wildcard_token()` remains the canonical single-token entrypoint.
- `motto_blocks_resolve_dynamic_value()` is the shared recursive resolver for arrays/scalars/exact tokens.
- Existing wrapper functions in Pro may continue delegating to the Free API for compatibility.

## 7. Compatibility Rules
- Existing hooks from SDD-010 remain the canonical extension points:
  - `motto_blocks_wildcards`
  - `motto_blocks_pre_resolve_wildcard`
  - `motto_blocks_resolve_wildcard`
- Existing consumer resolvers must not need to understand nested syntax directly.
- Free should continue to pass already-normalized `param`, `context`, and resolved `post_id` into resolver hooks.
- Existing non-nested tokens must continue to resolve exactly as before.

## 8. Migration Plan
Phase A — Free engine upgrade:
- Add shared parsing helpers in `includes/wildcard-registry.php`.
- Add shared recursive value resolution in Free.
- Extend token parsing to support nested `param` / `context`.

Phase B — Pro compatibility:
- Keep Pro callbacks unchanged where possible.
- Keep Pro wrapper helpers as thin delegates to Free.

Phase C — Dynamics migration:
- Replace duplicated generic parsing/resolution logic in `motto-dynamics/includes/query-block.php` with calls into the shared Free engine where the behavior is generic.
- Keep Dynamics-specific token semantics and loop-term interception in Dynamics.

Phase D — Cleanup:
- Remove redundant generic wildcard-parsing helpers from Dynamics once parity is verified.

## 9. Acceptance Criteria
- [x] Free supports nested wildcard resolution in `param` and `context`. (`includes/wildcard-registry.php`, `motto_blocks_resolve_wildcard_token`)
- [x] Exact-token values preserve native types.
- [x] Embedded string wildcards continue resolving to strings.
- [x] Depth guard (`max_depth`, default 5) and cycle protection (`seen_tokens`) implemented (`includes/wildcard-registry.php:31-38,496`).
- [ ] Pro continues to work through existing resolver hooks without token-specific parser changes. — not re-verified in this pass.
- [ ] Dynamics can consume the shared engine for generic recursive resolution while preserving its plugin-specific resolver semantics. — not re-verified in this pass.
- [x] Invalid nested context values fail deterministically without partial dispatch.

Note (2026-07-12): Free engine implementation confirmed against `includes/wildcard-registry.php`. Status set to `Active` rather than `Approved` because the Test Plan's automated coverage was not found anywhere in the repo (no PHPUnit setup exists at all) — implementation is real, verification is not.

## 10. Test Plan
Automated:
- Add unit coverage for Free engine behavior:
  - exact token scalar resolution
  - embedded string replacement
  - nested `param`
  - nested `context`
  - unresolved nested child token
  - invalid final context
  - max-depth guard
  - exact token preserving integer / array return types

Integration:
- Pro token examples continue to resolve through Free dispatch.
- Dynamics query/token flows continue working after delegating generic resolution to Free.

Manual:
- Verify wildcard popup consumers still receive the same merged catalog.
- Verify existing Pro wildcard fields continue to behave unchanged for non-nested tokens.
- Verify Dynamics query and dynamic-text flows behave unchanged for existing tokens.

## 11. Risks and Mitigations
- Risk: Free becomes polluted with consumer-specific semantics.
  - Mitigation: Limit Free to neutral engine behavior only; keep resolver meaning in consumers.
- Risk: Nested parsing introduces ambiguous or partial resolution.
  - Mitigation: Resolve inside-out, reject invalid final context, and avoid partial dispatch.
- Risk: Dynamics relies on edge-case behavior from its duplicated resolver.
  - Mitigation: Migrate in phases and preserve plugin-specific interceptors in Dynamics.
- Risk: Recursive resolution creates loops or hard-to-debug failures.
  - Mitigation: Add depth guards and deterministic unresolved-token fallback behavior.

## 12. Change Log
- v0.1: Initial draft for moving shared wildcard engine mechanics into Free while preserving plugin-specific resolver ownership.
