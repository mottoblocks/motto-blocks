# MottoBlocks Free/Pro Strategy

Status: Phase 0 closed. Phase 1 substantially complete. Phase 2 not yet started. Refer to `config/features.json` for the live catalog.

This document is the single source of truth for the Free/Pro strategy in this monorepo.

Use this file for:
- product and architecture decisions
- Free/Pro boundaries
- rollout phases
- distribution and licensing posture

Do not redefine those decisions in spec files.

Technical annexes:
- `docs/specs/SDD-007-free-pro-infra-v1.md` — infrastructure and build/install workflow
- `docs/specs/SDD-008-pro-extensibility-hooks-v1.md` — editor/runtime hook contracts

## Executive Summary

- The repo is a monorepo for Free + Pro development.
- The shipped products are two separate plugins:
  - `motto-blocks` (Free)
  - `motto-blocks-pro` (Pro addon)
- `config/features.json` is the catalog SSOT for Free vs Pro classification.
- The non-negotiable rule is `Free always renders`.
- Pro code may live in the monorepo, but Free and Pro must have clearly separated publication authority.
- Free must not ship full Pro implementations behind conditionals.

## Canonical Principles

### 1. Free always renders

- Frontend rendering and attribute parsing must never require Pro.
- Gates apply to editor UI, operational tools, and feature enablement, not to saved-content compatibility.
- Content created with Pro active must keep rendering correctly if Pro is deactivated.

### 2. Pro code lives only in Pro

- Free must not contain full Pro implementations hidden behind JS or PHP conditionals.
- Soft-gated features in Free may expose stubs, badges, placeholders, or upgrade CTAs.
- The real implementation lives in the Pro addon.

### 3. Monorepo is a source boundary, not a product boundary

- Source code can be versioned together in one repo.
- Shared code is allowed.
- The real commercial boundary is decided by registration, packaging, and shipped assets.
- A Pro block may share source with Free in the monorepo, but its final registration and runtime asset ownership must belong to the Pro addon.
- **Source layout:** Pro-only Gutenberg blocks live under `src/pro/blocks/` (one folder per block, same shape as free). Free blocks live under `src/blocks/`. Pro-only Styler extensions (extra sections, filters on Styler hooks) live under `src/pro/styler/`; **Styler engine and panel core** stay under `src/styler/` (free). Registration: free blocks + Styler core from `src/index.jsx`; Pro blocks and Pro Styler hooks from `src/pro/editor-hooks.js` (see `docs/conventions/architecture.md`).

### 4. Shared code must stay Pro-agnostic

- `src/shared/` cannot depend on `src/pro/`.
- Free core in `src/` cannot import from `src/pro/`.
- `src/pro/` can extend Free/shared code, but should do so through explicit extension surfaces where possible.

### 5. Stable extension over hidden branching

- Prefer explicit hook surfaces, stub-by-ID upgrades, and addon-owned registration.
- Avoid scattered “if Pro is active” branches across Free core.

## Distribution Model

- Free is distributed via wordpress.org and mottoblocks.com as the same plugin zip.
- Pro is distributed only via mottoblocks.com as a separate addon plugin: `motto-blocks-pro`.
- `motto-blocks-pro` requires `motto-blocks` installed and active.
- `motto-dynamics` and `motto-agents` are sibling plugins, initially 100% Pro, each with its own manifest.

## Licensing Model

- Annual-only at launch.
- No lifetime option at launch.
- Lifetime may be offered later as limited, time-boxed promotions.
- Pro activation is license-key based, validated against mottoblocks.com with transient caching and gated updates.

## Product Classification

The feature catalog lives in `config/features.json`. This section explains how to reason about it.

### Tiers

- Free: always available.
- Pro: available in `motto-blocks-pro` with a valid license.

### Pro pillars

- Governance & Control
- Power UX & Ergonomics
- Premium Blocks

### Gate types

- Soft gate: the base capability exists in Free, Pro improves ergonomics or speed.
- Hard gate: the feature is absent in Free UI or is a Pro-only block.

Rule:
- avoid “blocked on every click” experiences
- gate at the decision point, not every interaction

## Boundary Rules

### Registration boundary

- Free registers Free blocks and Free runtime only.
- Pro registers Pro blocks and Pro runtime only.
- Free may expose informational or locked listings for Pro-only blocks, but must not register the real Pro block.

### Asset ownership boundary

- If a block is Pro, its final `style_handles`, `editor_style_handles`, `view_script_handles`, and registration authority should belong to Pro.
- Shared source/build inputs are acceptable in the monorepo.
- Final shipped ownership should still be explicit in the Pro addon.

### UI extension boundary

Two implemented patterns. Use the one that fits the surface:

**Pattern A — Styler hook (for Styler panel UI and runtime CSS)**
- Free defines named filter/action points in `src/lib/freepro-ids.js` (`STYLER_HOOKS`).
- For section actions: Free registers disabled stub items with stable `id`s and `proBadge: true`; Pro calls `addFilter(STYLER_HOOKS.sectionActions, ...)` to upgrade them by ID.
- For panel sections and derived CSS: Free calls `applyFilters(hook, default, context)`; Pro registers the real component or CSS string.
- IDs are centralized constants — never inline strings.

**Pattern B — Block-level applyFilters (for Pro controls inside Free blocks)**
- Free block calls `applyFilters(BLOCKS_HOOKS.hookName, null, context)` where `BLOCKS_HOOKS` is defined in `src/blocks/freepro/blocks-freepro-ids.js`.
- If no Pro filter is registered, the return value is `null` and Free renders a disabled stub UI.
- Pro calls `addFilter(BLOCKS_HOOKS.hookName, ...)` from `src/pro/blocks/register-pro-block-filters.js` to inject the real React component.
- Used for: `imageSourceDynamicSection` (Image block), `linkSourceDynamicSection` (Container + Button).

Common rule for both patterns: Free must not apply Pro-only runtime behavior when Pro is absent.

### Persistence boundary

- Persisted values created by Pro must not create ghost behavior in Free-only installs.
- Free may preserve stored data for compatibility, but should ignore Pro-only runtime effects unless Pro is active.

## Migration Rules

- No already-saved feature may be moved to Pro if doing so breaks existing rendered content.
- If a current Free editing capability is later gated:
  - audit what data it saves
  - confirm render compatibility without Pro
  - define communication/grace strategy if users already rely on it
- New premium blocks should be born Pro whenever possible to avoid migration risk.

## Security And Licensing Posture

### Honest baseline

- WordPress PHP plugins run on the customer server.
- License checks can theoretically be modified by advanced users.
- The practical goal is not “perfect anti-crack”; it is sustainable paid value: legality, support, updates, and trust.

### Two server roles

- Role 1: license validation
- Role 2: server-anchored feature execution

By default, Pro features use Role 1.
Selected high-value features may use Role 2 so cracking the local plugin does not provide the feature substance.

Initial Role 2 anchors:
- System Tokens cloud sync
- Motto Agents proxy-based execution

### Explicit non-goals

- no PHP obfuscation
- no server-side execution of routine editor features
- no runtime code delivery from the server
- no aggressive license nags

## Rollout Roadmap

### Phase 0 — Definition

- Distribution model decided
- Catalog captured in `config/features.json`
- Core contract documented
- Licensing/security posture documented

### Phase 1 — Plumbing ✓ substantially complete

Goal: install the structure without enforcing gates yet.

Done:
- `src/pro/` structure with `src/pro/blocks/` and `src/pro/styler/`
- `src/pro/editor-hooks.js` as the Pro JS entry point
- `src/lib/freepro-ids.js` — centralized stable IDs for Styler hook points
- `src/blocks/freepro/blocks-freepro-ids.js` — stable IDs for block-level Pro hooks
- `build:free` / `build:pro` + `assemble:free` / `assemble:pro` scripts deploying to WP via `scripts/sync-config.mjs`
- `scripts/validate-import-boundaries.mjs` extended with Pro boundary rules
- PHP feature registry (`config/features.json` as SSOT, consumed by admin settings)
- JS Styler hooks: `motto.styler.panelSections`, `sectionActions`, `derivedLayoutCss` active in `style-engine.jsx`
- Pro license validator scaffold (`pro/includes/license/class-motto-license.php`)
- Pro Admin tab extension via `Motto_Pro_Admin` filter hooks

Note: the `dist/` output and `install:free/pro/local` scripts originally planned for this phase were replaced by `build/free|pro/` + `assemble:*` + `sync-config.mjs`. No `src/free/` folder was created — free code stays at `src/` root.

Technical implementation details live in:
- `docs/specs/SDD-007-free-pro-infra-v1.md`
- `docs/specs/SDD-008-pro-extensibility-hooks-v1.md`

### Phase 2 — Premium Blocks (next)

- Launch Pro-only blocks from `motto-blocks-pro` (marquee and panel-trigger are already shipped; remaining catalog items to follow)
- Keep existing Free blocks free
- Gate only Pro sub-features where applicable
- Admin settings: convert Pro block informational tiles into toggleable items when Pro is active

Note: the original "Awareness" phase (show badges with no real blocking) was superseded — the codebase went straight to real gating (disabled stubs + Pro filter injection). No separate awareness-only phase is planned.

### Phase 3 — Governance Features

- lock/unlock props
- role-based class control
- per-block prop restrictions
- system tokens
- config import/export
- operational tooling

### Phase 4 — Power UX Features

- duplicate selector
- clamp generators
- custom spacing override
- mobile-first / desktop-first breakpoints

Highest-risk item:
- custom spacing override, because it intersects with already-saved styling behavior

## Documentation Structure

To avoid future drift, use this split:

- `docs/free-pro-strategy-and-boundaries.md`
  - one document only
  - strategy, principles, boundaries, roadmap, decision status

- `docs/specs/SDD-007-free-pro-infra-v1.md`
  - technical annex
  - build/install/package workflow
  - infrastructure acceptance criteria
  - implementation details for dual-plugin output

- `docs/specs/SDD-008-pro-extensibility-hooks-v1.md`
  - technical annex
  - hook contracts
  - stub-by-ID pattern
  - runtime/editor extension rules

If a statement changes product strategy or Free/Pro ownership, update this file first.
If a statement only changes implementation details for infra or hooks, update the relevant annex.

## Branding

- External product name: `MottoBlocks Pro`
- `MottoStyler` is an internal capability/sub-brand, not a separate commercial product

## Feature Manifest

`config/features.json` is the declarative SSOT for the Free/Pro catalog.

- It defines classification metadata, not access control by itself.
- Real protection comes from architecture and shipping boundaries.
- PHP, JS, admin UI, and marketing surfaces derive from this catalog.
