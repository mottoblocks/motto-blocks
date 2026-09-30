# Feature Spec: SDD-001 — Styler Runtime Stabilization Pilot v1
Version: 1.1
Status: Approved
Owner: Styler Core
Last Updated: 2026-03-10

## 1. Goal
Stabilize the current Styler runtime behavior by enforcing a single data contract for reads/writes and a consistent popup-close focus behavior.

## 2. Scope
In scope:
- Styler attribute resolution and persistence (`mottoStyler` SSOT + legacy bridge).
- Frontend attribute resolution parity with editor/runtime.
- Popup toggler blur on close across all close paths.
- Unit tests that lock contract behavior.

Out of scope:
- Full removal of legacy `mottoProps`.
- New Styler features unrelated to runtime consistency.
- Cross-repo migration tooling.

## 3. Data Contract (SSOT)

**⚠ STALE (flagged 2026-07-12, not rewritten — needs an explicit decision):** `mottoProps` legacy fallback support described below was **fully removed** from the codebase in commit `9ae22de` ("refactor(styler): remove mottoProps legacy attribute support") — all JS read/write paths, `LEGACY_STYLER_ATTRIBUTE_KEY`, and the PHP `get_post_meta('motto_props')` fallback are gone. `mottoStyler` is now the only attribute key, no priority resolution happens. The section below documents the migration this spec originally drove, kept for history; it no longer describes current runtime behavior. Left as-is rather than rewritten in this pass — decide whether to close this spec as historical/superseded or rewrite §3-4 to match the current single-key reality.

Primary key: `mottoStyler`
Legacy fallback: `mottoProps` (removed — see warning above)

Resolution priority:
1. `mottoStyler` with meaningful content
2. `mottoProps` with meaningful content
3. non-empty `mottoStyler`
4. non-empty `mottoProps`

Migration rule:
- New style edits target `mottoStyler`.
- Legacy `mottoProps` remains fallback input for backward compatibility.
- Migration flow may still tag legacy payloads with `readyToDelete: true` after promoting them into `mottoStyler`.

## 4. Runtime Rules
1. Editor and frontend must resolve the same effective styler payload.
2. Popup close must blur the toggle button regardless of close trigger:
- `Esc`
- close button
- outside click/focus
- manager-triggered close
3. Conditional class runtime logic must remain contract-aligned with backend semantics.

## 5. Acceptance Criteria
- [x] Editing styles updates `mottoStyler`.
- [x] New style edits target `mottoStyler`; legacy writes are limited to migration tagging (`readyToDelete`).
- [x] Frontend render uses the same effective payload priority.
- [x] Popup toggle is not focused after any close path. (single `isOpen`-keyed blur effect covers Esc, close button, outside click, and manager-triggered close uniformly — `RuleValuePopup.jsx:119-127`)
- [x] Unit tests pass for attribute priority and conditional class rules. Popup-related runtime behavior (blur-on-close) still has no dedicated test coverage.

Verified 2026-07-12: `styler-attributes.test.js` had a stale test (`strips id from css rows before persisting`) asserting behavior that was intentionally reverted in `847ef2d` ("fix: prevent popup close and duplicate row when dragging slider on new CSS rule") — stripping `id` on persist caused the exact popup-closing bug that fix addresses, and also contradicts the stable-id rule in `docs/conventions/architecture.md`. Rewrote the test to lock the correct behavior (`id` preserved); full suite now passes (127/127). Remaining gap: no test exercises the blur-on-close effect in `RuleValuePopup.jsx` directly — left as a known gap, not blocking.

## 6. Test Plan
Automated:
- `npm run test:unit`
- `npm run build`
- `php -l motto-blocks.php includes/*.php`

Manual:
- Open value popup, close via `Esc`, verify toggle loses focus.
- Repeat with close button and outside click.
- Verify block styles match editor vs frontend for `mottoStyler` and legacy-only content.

## 7. Rollout
Phase A (completed): bridge write was enabled (`mottoStyler` + `mottoProps`).
Phase B (now): write `mottoStyler`, keep legacy fallback reads, and tag migrated legacy payloads as `readyToDelete`.

## 8. Change Log
- v1.1: Removed legacy mirror writes as an active style target; retained fallback reads and migration tagging.
- v1.0: Initial pilot spec for runtime stabilization.
