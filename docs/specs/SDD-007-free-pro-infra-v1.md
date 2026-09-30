# Feature Spec: SDD-007 — Free/Pro Infrastructure v1
Version: 0.2
Status: Active
Owner: Architecture
Last Updated: 2026-05-21

This file is a technical annex to `docs/free-pro-strategy-and-boundaries.md`.

It must not redefine:
- core Free/Pro principles
- product strategy
- canonical rollout decisions

Those live in `docs/free-pro-strategy-and-boundaries.md`.

## 1. Goal
Define the infrastructure and development workflow that implements the Free/Pro strategy described in `docs/free-pro-strategy-and-boundaries.md`.

## 2. Scope
In scope:
- A single source of truth for the Free vs Pro catalog (`config/features.json`) and how it is consumed.
- Distribution model: Free on wordpress.org + mottoblocks.com; Pro addon on mottoblocks.com only.
- Development workflow for building/installing Free and Pro as two separate plugins from one development source.
- Import-boundary rules (`src/shared` / `src/free` / `src/pro`) and validation.
- Gating UX rules (Pro visible/blocked in Free) and where the UI should surface Pro-only blocks vs Pro upgrades.
- License validator scaffold requirements (endpoint shape, caching, fail-open policy).

Out of scope:
- The full implementation of `motto-blocks-pro` features (blocks, governance, power UX).
- The full backend implementation on mottoblocks.com (sales, accounts, licensing store).
- The detailed design of server-anchored features (System Tokens cloud sync, Motto Agents proxy).
- Pricing, packaging, and marketing pages.

## 3. Current Behavior
- `motto-blocks` is a single plugin repo installed directly in WP.
- There is no Pro addon plugin yet.
- Some features planned as Pro already exist in Free and must not break content if Pro is not present.
- The repo tracks build artifacts in `build/` for deployment without a build step.

## 4. Target Behavior
### 4.1 Distribution rules (decided)
- **Free plugin**: distributed via wordpress.org and mottoblocks.com (same zip).
- **Pro plugin**: distributed only via mottoblocks.com as a separate **addon plugin** (`motto-blocks-pro`) that requires `motto-blocks` installed and active.
- **Consumers**: `motto-dynamics` and `motto-agents` are separate sibling plugins, initially 100% Pro, each with its own manifest.

### 4.2 Non-negotiable content contract
- **Free always renders**:
  - Frontend render path and attribute parsing must never require Pro.
  - Gates apply only to editor UI and operational tools.
  - Content created while Pro is active must continue rendering if Pro is deactivated.

### 4.3 Pro visibility rules (product)
- There will be:
  - **Pro-only blocks** (not available without Pro).
  - **Free blocks with Pro upgrades** (base works in Free; advanced options unlock in Pro).
- In Free, Pro options should remain **visible and discoverable**, but **blocked**:
  - For options inside existing Free UI: render the control in a disabled/locked state with a Pro badge, opening an upgrade path.
  - For Pro-only blocks: do **not** register the real block in Free. Instead show an informational listing (e.g. Admin Settings list) or a dedicated “Pro blocks” catalog UI.

### 4.4 “Pro code lives only in Pro” (engineering rule)
- Free must not ship full Pro implementations behind JS/PHP conditionals.
- Soft-gated Pro features must:
  - Keep the full implementation in the Pro addon.
  - Keep only a placeholder/upgrade CTA in Free.

## 5. Data Contract
### 5.1 Feature catalog SSOT
- Inputs:
  - `config/features.json` (catalog + schema vocabulary).
- Persistence:
  - Git-tracked file in `motto-blocks/config/features.json`.
- Outputs:
  - PHP and JS consumers derive tier/gate/status from it.
  - Admin Settings and editor surfaces use it for “Pro visible/blocked” UX.

### 5.2 License validation (Role 1)
- Input: license key stored in `wp_options` (Pro addon).
- Output: boolean “valid/invalid” cached in a transient (24h).
- Validation endpoint (example): `https://mottoblocks.com/api/license/validate?key=...&site=...`

### 5.3 Server-anchored features (Role 2, limited subset)
- Some Pro features are intentionally server-dependent (e.g. System Tokens cloud sync, Motto Agents proxy).
- Their “substance” (data and/or execution) lives on mottoblocks.com so cracking local license checks does not provide functionality.

## 6. Acceptance Criteria
- [x] `config/features.json` remains the single source of truth for the Free/Pro catalog.
- [x] Free can list Pro-only blocks as informational (locked) without registering Pro blocks.
- [x] Pro upgrades can be surfaced within Free UI as visible/blocked controls without shipping Pro logic in Free.
- [x] The repository supports a development workflow where Free and Pro are tested as **two separate installed plugins**.
- [x] Import boundaries between `src/shared` and `src/pro` are enforced by an automated validator. (Note: `src/free/` was not created; free code lives at `src/` root; boundaries are enforced via rules in `validate-import-boundaries.mjs`.)

## 7. Risks and Mitigations
- Risk: Confusion between “build artifacts” (`build/`) and “installed plugins”.
  - Mitigation: Document the workflow explicitly: WP activates plugins from `wp-content/plugins/<plugin-folder>/`, not from `build/`.
- Risk: Shipping Pro logic inside Free behind conditionals (violates separation rule).
  - Mitigation: Treat “Pro code lives only in Pro” as a hard constraint; enforce with folder boundaries and code review.
- Risk: Gating a feature that already saves data breaks existing sites.
  - Mitigation: Follow “free always renders” and migration-risk rules; for delicate features (e.g. custom spacing override), gate editing only and keep render compatible.
- Risk: Over-aggressive licensing harms paying customers.
  - Mitigation: Silent background validation, transient caching, and fail-open during outages with a defined grace period.

## 8. Test Plan
Automated:
- `npm run build`
- `npm run lint`
- `npm run validate:boundaries` (existing)

Manual:
- In a WP local install, activate Free plugin and verify:
  - Blocks tab shows Free blocks as toggles.
  - Pro-only blocks appear as locked informational items (if the UI is enabled).
- Install/activate Pro addon (once created) and verify:
  - Without a key: Pro blocks/options remain locked.
  - With a valid key: Pro-only blocks register and Pro upgrades unlock.
  - Deactivate Pro: content still renders correctly.

## 9. Rollout Plan

Phase A — Documentation + scaffolding: ✓ done
- `docs/free-pro-strategy-and-boundaries.md` as strategy SSOT.
- `config/features.json` as catalog SSOT.
- This file as the infra/workflow annex.

Phase B — Dev workflow: ✓ done (different from original plan)
- Originally planned `dist/` + `install:free/pro/local` scripts.
- Actual implementation: `build/free/` + `build/pro/` for build artifacts;
  `scripts/assemble-plugin.mjs` + `scripts/assemble-pro.mjs` copy assembled plugins
  to one or more WP installs configured in `scripts/sync-config.mjs`.
- `npm run build:free`, `npm run build:pro`, `npm run assemble:free`, `npm run assemble:pro` are the canonical scripts.
- No `dist/` folder; no `install:*` scripts.

Phase C — Code separation: ✓ partially done
- `src/pro/blocks/` and `src/pro/styler/` created; free code stays at `src/` root.
- `src/free/` folder was never created and is not planned — the separation is enforced
  by `scripts/validate-import-boundaries.mjs` boundary rules, not by folder mirroring.
- Import boundaries enforced for all `src/pro/` interactions.

Rollback:
- If the dual-plugin workflow is unstable, continue developing with Free only and keep Pro surfaces informational until the addon is ready.

## 10. Change Log
- v0.1: Initial draft capturing Free/Pro infra decisions, dev workflow, and separation rules.
- v0.2: Status → Active. Updated rollout plan to reflect actual implementation (build/free|pro + assemble scripts + sync-config, no dist/ folder, no src/free/, all acceptance criteria met).
