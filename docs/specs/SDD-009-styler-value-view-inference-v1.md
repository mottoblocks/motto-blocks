# Feature Spec: SDD-009
Version: 0.2
Status: Active
Owner: Styler Core
Last Updated: 2026-07-12

## 1. Goal
Unify the editor decision rules for which value representation to show when editing a CSS rule value: Visual UI vs Raw (code). The editor must always choose the best representation for the current value deterministically, without persisting user preference. Controls may still have internal UI sub-views (e.g. presets vs custom), derived from the value using a consistent contract.

## 2. Scope
In scope:
- A single, deterministic rule set to resolve Popover `valueView` (`visual` or `code`) from the current value and the selected popup type/capabilities.
- Standardize the notion of "visualizable" across value editors using `canVisualizePopupValue(...)` as the SSOT for Popover decisions.
- Define a per-control contract for inferring UI sub-views from a value (e.g. spacing: presets/custom, axial/sides).
- Apply the contract to Styler rule value editing (rule-row popover).

Out of scope:
- Persisting the last user-selected view (no `mottoUI`, no store/local storage).
- Live auto-switching while typing inside the popover (switching may happen on next open only, by re-evaluating the value).
- Refactoring unrelated control UX, styling, or layout.

## 3. Current Behavior
- Popover view (`visual` vs `code`) is decided by a combination of:
  - `shouldForceValueCodeView` derived from `canVisualizePopupValue(...)`
  - optional `defaultView` (visual/code) config from value options
  - Popover internal initialization that happens once per open
- UI sub-view selection (e.g. spacing `axial` vs `sides`, or presets/custom) is control-specific and not defined as a shared contract.
- There is no persistence of view decisions. The Popover provides `onValueViewChange` but call sites do not store it.

Relevant code:
- `src/styler/components/RuleValuePopup.jsx` (initializes code/visual on open)
- `src/styler/components/StylerRuleRow.jsx` (passes `shouldForceCodeView` and `defaultValueView`)
- `src/shared/styler/use-prop-value-config.js` (computes `defaultValueView`, `shouldForceValueCodeView`)

## 4. Target Behavior
### 4.1 Popover valueView (UI vs Raw)
Define Popover `valueView` exclusively from value visualizability (empty counts as visual):

Rules:
1. Empty value (undefined/null/"") MUST open in `visual`.
2. If the current value is visualizable for the resolved popup type, Popover MUST open in `visual`.
3. If the current value is not visualizable for the resolved popup type, Popover MUST open in `code`.

Notes:
- "Visualizable" MUST be evaluated by a single shared policy: `canVisualizePopupValue(popupType, value, enumOptions)`.
- `defaultView` (visual/code) MUST NOT influence the Popover decision in this spec. If a visual/code default is still required for specific cases, it must be implemented by the visualizability policy (i.e. treat the value as non-visualizable).

### 4.2 Control UI sub-views (within visual)
Controls may define internal UI states but MUST infer them deterministically from the value.

Rules:
1. If value is empty (undefined/null/"") the control MUST use its internal `defaultUiState`.
2. If value exists, the control MUST infer the most appropriate sub-view to represent it.
3. Sub-view inference MUST NOT be treated as a user preference; it is derived from the value.

Examples (non-exhaustive):
- Spacing:
  - If value matches a WP spacing preset token, use `inputMode="presets"`.
  - If value is a var() (non-preset), use `inputMode="custom"` with unit=`var`.
  - If value is a numeric + unit length, use `inputMode="custom"` with unit inferred.
- Border radius:
  - If value is a single token or all corners equal, use view=`all`.
  - If value contains multiple tokens with differing corners, use view=`custom`.
  - If token is preset, render via preset mode; else custom mode with inferred unit (including var unit).

## 5. Data Contract
Inputs:
- `popupType`: resolved from value options / prop config (e.g. color, enum, spacing-multiple, etc.)
- `value`: current CSS value string (empty allowed)
- `enumOptions`: if popupType is enum
- `capabilities`: evaluated via `canVisualizePopupValue(...)`
- Control-specific props needed for inference:
  - spacing: `spacingSizes`, supported `sides`, `allowLinkedSides`
  - radius: `spacingSizes` for preset resolution, unit options

Persistence:
- None (no storage of view decisions).

Outputs:
- Popover: `valueView` (`visual` or `code`) on open.
- Control: inferred UI state (per control type) used for first visual render.

## 6. Acceptance Criteria
- [x] When a rule value is empty, the popover opens in Visual UI. (`canVisualizePopupValue` returns `true` for empty values, `src/styler/utils/value-type-capabilities.js:191`)
- [x] When a rule value is visualizable for its popup type, the popover opens in Visual UI.
- [x] When a rule value is not visualizable for its popup type, the popover opens in Raw code editor. (`shouldForceValueCodeView` derives exclusively from `canVisualizePopupValue`, no `defaultView` mixed in — `src/styler/hooks/use-prop-value-config.js:442-465`)
- [x] Visual controls infer their internal sub-view deterministically from the value (no user preference persistence). Full contract now documented in `SDD-016`.
- [x] No new persisted state is introduced (no `attributes.mottoUI`, no editor store).

Note (2026-07-12): §4.1 (Popover valueView resolution) confirmed against committed code. §4.2 (control sub-view inference) verified and written up in full in `SDD-016-spacing-radius-value-controls-v1.md` — the small uncommitted polish found during this audit (`cssModeSelected` handling in `PresetValueRow.jsx`) is coherent, deliberate follow-up work, not a regression risk. Status remains `Active` (not `Approved`) pending automated test coverage for the interaction rules, per `SDD-016` §6.

## 7. Risks and Mitigations
- Risk: Different controls implement their own "visualizable" logic and drift over time.
  - Mitigation: Centralize Popover legibility on `canVisualizePopupValue(...)`; for controls, expose `inferUiState(value, context)` helpers per type and reuse across call sites.
- Risk: Some values are technically visualizable but UX is better in code (e.g. complex functions).
  - Mitigation: Expand `canVisualizePopupValue` rules to classify such values as non-visualizable, instead of adding ad-hoc defaults or persistence.

## 8. Test Plan
Automated:
- `npm run lint`
- `npm run build`

Manual:
- In a Styler rule row, set a value that is not visualizable for its type → open popover → Raw shown.
- Edit Raw to a value that becomes visualizable → close popover → reopen → Visual shown.
- Spacing: set preset value → opens visual and shows preset mode.
- Spacing: set `var(--x)` external var → opens visual and shows custom mode with var unit.

## 9. Rollout Plan
Phase A:
- Implement Popover valueView resolution strictly via `canVisualizePopupValue`.
- Implement/standardize sub-view inference helpers for spacing and border radius.

Phase B:
- Extend inference to other value editors as needed (box-shadow, composite fields, etc.).

Rollback:
- Revert to previous `defaultView`-driven behavior and keep forced code view for non-visualizable values.

## 10. Change Log
- v0.1: Initial draft.
