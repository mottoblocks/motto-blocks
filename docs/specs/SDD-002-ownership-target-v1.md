# Feature Spec: SDD-002 — Ownership Target v1
Version: 1.1
Status: Approved
Owner: Architecture
Last Updated: 2026-03-10

## 1. Goal
Define ownership boundaries by folder and enforce import guardrails that prevent cross-layer coupling.

## 2. Scope
In scope:
- Ownership map for top-level functional folders.
- Allowed and forbidden imports for `src/styler`, `src/blocks`, and `src/shared`.
- Automated guardrails for layer-coupling imports.

Out of scope:
- Feature implementation.
- Legacy fallback removal (`mottoProps`).

## 3. Ownership Map
1. `src/styler`
- Owner: Styler Core.
- Responsibility: Styler contract (`mottoStyler`), rule/value UI, runtime style resolution, conditional classes.

2. `src/blocks`
- Owner: Blocks.
- Responsibility: block behavior, block-specific controls, block attributes/defaults.

3. `src/shared`
- Owner: Shared Local.
- Responsibility: reusable UI/data utilities and shared primitives used across domains.

4. `includes`
- Owner: PHP Integration.
- Responsibility: server-side rendering integration and runtime bridge with WP.

5. `docs`
- Owner: Architecture.
- Responsibility: contracts, specs, rollout plans, and temporary-compat removal criteria.

6. `scripts`
- Owner: Tooling.
- Responsibility: build/validation/generation workflows.

## 4. Import Boundary Rules
`src/blocks/**`:
- Allowed:
  - `@shared`
  - `@shared/*`
  - `@components` / `@components/*` (repo-internal alias → `src/components`)
  - WordPress packages and third-party libs
- Forbidden:
  - `src/styler/runtime/*` (direct or resolved relative paths)

`src/styler/**`:
- Allowed:
  - `@shared`
  - `@shared/*`
  - local `src/styler/*`
- Forbidden:
  - `src/blocks/*` (except neutral shared contracts moved to `src/shared`)

`src/shared/**`:
- Allowed:
  - shared utilities and WP/third-party dependencies
- Forbidden:
  - `src/blocks/*`
  - `src/styler/runtime/*`

## 5. Guardrail
- Script: `scripts/validate-import-boundaries.mjs`
- Rules currently enforced (11 total):
  - fail if `src/blocks/**` imports `src/styler/runtime/**`
  - fail if `src/shared/**` imports `src/styler/runtime/**`
  - fail if `src/shared/**` imports `src/blocks/**`
  - fail if `src/styler/**` imports `src/blocks/**`
  - fail if `src/styler/**` imports `src/pro/blocks/**`
  - fail if `src/blocks/**` imports `src/pro/blocks/**`
  - fail if `src/shared/**` imports `src/pro/blocks/**`
  - fail if `src/styler/**` imports `src/pro/styler/**`
  - fail if `src/blocks/**` imports `src/pro/styler/**`
  - fail if `src/shared/**` imports `src/pro/styler/**`
  - fail if `src/components/**` imports `src/styler/**`

## 6. Quality Gate Addition
Run as part of normal validation:
- `npm run validate:boundaries`

## 7. Current Alignment Notes
- `container` was migrated away from direct Styler runtime imports.
- Legacy `mottoProps` compatibility was fully removed (`9ae22de`, JS + PHP read/write paths and `LEGACY_STYLER_ATTRIBUTE_KEY`); `mottoStyler` is now the only attribute key. See open item flagged in `SDD-001` for full spec-vs-code reconciliation.
