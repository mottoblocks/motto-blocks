# Feature Spec: SDD-012 — Wildcard Result Accessors v1
Version: 0.2
Status: Active
Owner: Architecture
Last Updated: 2026-07-12

This file is a technical follow-up to:
- `docs/specs/SDD-010-wildcard-system-v1.md`
- `docs/specs/SDD-011-shared-wildcard-engine-v1.md`

It defines the first official contract for accessing array/object-like wildcard results without embedding path mini-syntax inside resolver params.

## 1. Goal
Add a small, explicit accessor layer to the shared wildcard engine so consumers can safely navigate array/object-like wildcard results.

## 2. Scope
In scope:
- Engine-level accessor wildcards for array/object traversal.
- Shared contract for simple index and path access.
- Nested wildcard support inside accessor arguments.
- Failure behavior for missing paths and invalid traversal.

Out of scope:
- Inline path syntax inside arbitrary resolver params.
- Full JSONPath / JMESPath support.
- Array transforms such as `map`, `filter`, `join`, or slicing.
- Consumer-specific path parsing in Pro or Dynamics resolvers.

## 3. Problem Statement
Nested wildcard support in SDD-011 solves:
- nested `param`
- nested `context`

But it does not yet provide a clean, shared way to consume wildcard results that resolve to arrays or objects.

Examples of desired behavior:
- take the first ID from an ACF ID list
- read a nested property from a repeater-like structure
- reuse the result inside another wildcard context

The tempting syntax:

```text
${ACF_FIELD_IDS:activities[0]}
${ACF_FIELD_IDS:activities[0].otro}
${POST_META:gallery[2].url}
```

is familiar, but it pushes path parsing into each wildcard resolver's `param` handling.

That would:
- duplicate logic across resolvers
- blur the boundary between resolver semantics and engine navigation
- make editor/runtime validation harder to keep aligned

## 4. Target Behavior
### 4.1 Official v1 syntax
The engine should officially support:

```text
${INDEX:${ACF_FIELD_IDS:activities},0}
${PATH:${ACF_FIELD_IDS:activities},0,otro}
${PATH:${POST_META:gallery},2,url}
```

Meaning:
- `INDEX` returns one indexed element from an array-like result.
- `PATH` traverses a sequence of array indexes and object/associative keys.

### 4.2 Nested arguments
Accessor arguments may themselves be wildcards.

Examples:

```text
${INDEX:${ACF_FIELD_IDS:activities},${POST_META:selected_index}}
${PATH:${POST_META:${ACF_FIELD_STR:meta_key_field}},0,url}
```

### 4.3 Exact-token vs embedded-string behavior
The shared SDD-011 rules continue to apply:
- exact token preserves native type
- embedded string casts to string

Examples:

```text
"${INDEX:${POST_META:gallery_ids},0}" -> 123
"/image/${INDEX:${POST_META:gallery_ids},0}" -> "/image/123"
```

## 5. Supported and Unsupported Syntax
### 5.1 Supported in v1

```text
${INDEX:${ACF_FIELD_IDS:activities},0}
${PATH:${ACF_FIELD_IDS:activities},0,otro}
${PATH:${POST_META:gallery},2,url}
${POST_META:_wp_attached_file@${INDEX:${ACF_FIELD_IDS:activities},0}}
```

### 5.2 Not supported in v1
Do not document or implement these as official syntax:

```text
${ACF_FIELD_IDS:activities[0]}
${ACF_FIELD_IDS:activities[0].otro}
${POST_META:gallery[2].url}
${ACF_FIELD_IDS:activities[${POST_ID}]}
```

Those may be considered future sugar, but not as the base contract.

## 6. Semantics
### 6.1 `INDEX`
Signature shape:

```text
${INDEX:<value>,<index>}
```

Rules:
- `<value>` must resolve to an array-like value.
- `<index>` must resolve to an integer-like scalar.
- if the index exists, return that element.
- if the index does not exist, return empty string.
- if `<value>` is not traversable, return empty string.

Examples:

```text
${INDEX:${POST_META:gallery_ids},0}
${INDEX:${ACF_FIELD_IDS:activities},${POST_META:selected_index}}
```

### 6.2 `PATH`
Signature shape:

```text
${PATH:<value>,<segment1>,<segment2>,...}
```

Rules:
- `<value>` must resolve to an array/object-like value.
- each segment is applied left to right.
- numeric-like segments index arrays.
- string-like segments access associative/object keys.
- if any segment is missing, return empty string.
- if traversal reaches a non-traversable value before finishing, return empty string.

Examples:

```text
${PATH:${ACF_FIELD_IDS:activities},0,otro}
${PATH:${POST_META:gallery},2,url}
${PATH:${POST_META:locations},0,address,city}
```

## 7. Engine Responsibilities
The shared engine in Free should own:
- parsing `INDEX` / `PATH` arguments
- resolving nested wildcard arguments
- normalizing argument lists
- safe traversal helper(s)
- exact-token / embedded-string casting behavior

Consumers should not:
- parse path syntax out of arbitrary resolver params
- duplicate traversal helpers
- reinterpret `INDEX` / `PATH` semantics locally

## 8. Failure Contract
- If a nested child wildcard needed by `INDEX` / `PATH` is unresolved, the parent accessor token remains unresolved.
- If traversal is invalid or a segment is missing, the accessor resolves to empty string.
- If an exact token resolves to an array/object at the final segment, preserve that native type.

Examples:

```text
${PATH:${UNKNOWN_TOKEN},0} -> unresolved token
${PATH:${POST_META:gallery},99,url} -> ""
${PATH:${POST_META:gallery},0} -> first item, preserving type when exact-token
```

## 9. API Direction
The exact helper names may vary, but the engine will likely need:

```php
motto_blocks_split_accessor_arguments( string $param ): array
motto_blocks_resolve_accessor_segments( array $segments, array $options = array() ): array
motto_blocks_get_value_at_path( $value, array $segments )
```

And shared resolver entry points for:
- `INDEX`
- `PATH`

These should remain neutral engine features in Free, not Pro/Dynamics business resolvers.

## 10. Editor / Runtime Contract
Editor-side validators and normalizers must align with runtime syntax for:
- comma-separated accessor arguments
- nested wildcard children inside accessor arguments
- exact token detection

No editor should assume inline bracket/dot path syntax as official v1 behavior.

## 11. Migration Plan
Phase A:
- Add spec and lock the v1 syntax contract.

Phase B:
- Implement `INDEX` in the shared Free engine.
- Add tests for scalar index access.

Phase C:
- Implement `PATH` on top of the same traversal helper.
- Add tests for nested associative/object access.

Phase D:
- Document product-facing usage in Dynamics where relevant.

## 12. Acceptance Criteria
- [x] `INDEX` works with exact-token nested wildcard input. (`includes/wildcard-registry.php:229`, `motto_blocks_resolve_engine_wildcard`)
- [x] `PATH` works with array indexes and associative/object keys. (`includes/wildcard-registry.php:332`, `motto_blocks_get_value_at_path`)
- [x] Nested wildcard arguments inside accessor params resolve through the shared engine.
- [x] Missing segments return empty string deterministically. (`motto_blocks_get_value_at_path` returns `''` on any unmatched segment)
- [ ] Unresolved child wildcard arguments keep the accessor token unresolved. — not re-verified in this pass.
- [x] Consumers do not need resolver-specific bracket/dot path parsing.

Note (2026-07-12): `INDEX`/`PATH` implementation confirmed against `includes/wildcard-registry.php`. Status set to `Active` rather than `Approved` — no automated test coverage exists anywhere in the repo (no PHPUnit setup at all), so the Test Plan in §13 remains unexecuted despite the implementation matching the spec.

## 13. Test Plan
Automated:
- `INDEX` with literal index
- `INDEX` with nested wildcard index
- `PATH` with array index + associative key
- exact-token type preservation for `PATH(...,0)`
- embedded-string cast behavior
- missing index / missing key
- unresolved child wildcard argument

Manual:
- Query / Dynamic Text / Dynamic Image flows that consume accessor results inside larger wildcard compositions.

## 14. Future Considerations
Possible future sugar, explicitly out of scope for v1:

```text
${ACF_FIELD_IDS:activities[0]}
${ACF_FIELD_IDS:activities[0].otro}
${POST_META:gallery[2].url}
```

If added later, it should compile conceptually to `INDEX` / `PATH` semantics rather than creating resolver-specific parsing contracts.

## 15. Change Log
- v0.1: Initial draft for explicit result-accessor wildcards (`INDEX`, `PATH`) as the official v1 navigation contract.
