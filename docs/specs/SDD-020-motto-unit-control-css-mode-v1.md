# Feature Spec: SDD-020 — MottoUnitControl Unit-Switching & CSS-Mode Contract v1
Version: 0.2
Status: Active
Owner: Shared Components
Last Updated: 2026-09-28

> Extracted from `SDD-016` §4.3.1/§4.4, which originally documented this behavior as if it were spacing/border-radius-specific. It is not: `MottoUnitControl` is a shared primitive in `src/components/` with no knowledge of spacing, presets, or the Styler at all — `SpacingControl`/`BorderRadiusControl` (`SDD-016`) are just one of several consumers. This spec is the canonical behavior contract for the component itself; `SDD-016` and other consumer specs should reference it rather than restate it.

## 1. Goal
Define the complete interaction contract for `MottoUnitControl` — WP's `__experimentalUnitControl` wrapped with a Motto-specific `"CSS"` unit, css-mode editing surface, and unit-switching emission rules — so every consumer (spacing, border-radius, grid tracks, transform, filter, transition duration, generic numeric fields) gets identical, predictable behavior instead of each one re-deriving it.

## 2. Scope

In scope:
- `MottoUnitControl` (`src/components/controls/units/MottoUnitControl.jsx`): unit list construction (always appends `"CSS"` last via `ensureVarUnitLast`), `localUnit` override logic, `emitOnUnitChange` contract.
- CSS-mode detection and entry: `isCssLike` (`isCssExpressionValue` / `isCssKeywordValue` from `var-unit-utils.js`), explicit entry via the unit dropdown, and auto-entry when a `calc()`/`var()`-shaped expression is typed directly into the numeric field.
- CSS-mode editing surface: the read-only inline overlay (`.motto-unit-css-mode-overlay`) and the `Popover` + `RawControl` draft-until-Confirm popup editor.
- CSS-mode exit and value restoration: `getCompatibleExitVarValue`, the stale-echo guard (`exitingCssValueRef`) for WP `UnitControl`'s internal re-sync.
- The import-boundary constraint that shapes the popup's autocomplete choice: `MottoUnitControl` lives under `src/components/`, which the `components-to-styler` rule (`scripts/validate-import-boundaries.mjs`) forbids from importing anything under `src/styler/` — so the popup clones `RawControl` (shared) rather than the styler-owned `CssFunctionAutocompleteControl`.
- Known direct consumers as of writing: `PresetValueRow` (via `SpacingControl`/`BorderRadiusControl`, see `SDD-016`), `GridTemplateTracksControl`, `TransformControl`. Known indirect consumers via `NumericUnitField`: `NumericControl`, `TransitionDurationField`, `FilterControl`. This list is not exhaustive and will grow — any new consumer inherits this contract automatically since it lives inside `MottoUnitControl` itself, not in a caller.

Out of scope:
- `NumericUnitField`'s own behavior (slider pairing, var-unit mode, unit resolution from `step`/`units` props) — a separate wrapper spec if one is ever needed.
- Value-kind classification that's meaningful only to a specific consumer (e.g. `categorizeSpacingValue`'s preset detection) — owned by that consumer's spec (`SDD-016` for spacing/radius).
- The Popover-level Visual-vs-Raw-code decision for the rule-row's own code view (`RuleValuePopup`) — owned by `SDD-009`. That surface intentionally keeps a different (per-keystroke) commit model than this one; see Risks (§7).

## 3. Current Behavior
Originally, `MottoUnitControl`'s `"css"`-unit mode rendered an editable `RawControl` portaled directly into WP `UnitControl`'s input container — every keystroke committed straight to the stored value via `onChange`, including incomplete expressions like `"var(--"` mid-type. This was replaced with a read-only overlay + popup editor (draft-until-Confirm) so in-progress edits never touch the stored value until explicitly confirmed. This spec documents that resulting steady-state contract for the component itself, independent of any one consumer.

## 4. Target Behavior

### 4.1 Unit list and the `"CSS"` unit
- `resolvedUnits` always appends a `{ value: "css", label: "CSS" }` option last (`ensureVarUnitLast`), unless the consumer passes `enableVarUnit={false}`.
- Consumers may pass their own `units` list (e.g. `GridTemplateTracksControl`'s `fr`-first list); the CSS unit is appended regardless.

### 4.2 CSS-mode detection and entry
- `localUnit` is `undefined` by default, letting WP `UnitControl` derive the unit from the value. It is only forced to `CSS_UNIT` when css-mode is active — this is a local override, not a re-derivation on every render (mirrors `PresetValueRow`'s own `cssModeSelected` pattern documented in `SDD-016` §4.3, but this is a separate piece of state one layer down).
- Entry via unit dropdown: selecting `"css"` seeds `lastCssValueRef` from the current clean value if nothing was already remembered (so a value like `"1.5rem"` becomes editable/extendable, e.g. into `calc(1.5rem + 10px)`, instead of starting blank), and — if `emitOnUnitChange` — immediately emits that seeded value. The seed check is `!isCssExpressionValue(currentCleanValue) && !isBareUnitArtifact` — a **bare unit with no digits** (e.g. `"px"`, what WP `UnitControl` echoes back when the numeric field is empty and only a unit is selected) is explicitly excluded, same as an empty string: neither is a real value, so neither seeds css mode. Before this guard existed, a pristine numeric field (no number typed, unit selected) seeded css mode with the literal string `"px"`.
- Auto-entry from the numeric field: if the user types something ending in a CSS-expression shape directly into the plain numeric input (e.g. pastes `calc(100% - 20px)`), the control detects it (`isCssExpressionValue` on the cleaned value), switches into css mode, and emits the cleaned expression — the user never has to manually select the `"css"` unit first.
- Sync guard: an external value change (undo/redo, programmatic set, device switch) that is itself CSS-like flips `localUnit` to `CSS_UNIT` even if the local state hadn't caught up yet.

### 4.3 CSS-mode editing surface — inline overlay + popup editor
- **Inline overlay**: while in css mode, the input container renders a **read-only** overlay (`.motto-unit-css-mode-overlay`, portaled into WP `UnitControl`'s `.components-input-control__container`) instead of an editable field — same position the old editable portal occupied. It is a real `<button>` (keyboard-reachable, `aria-haspopup="dialog"`, `aria-expanded`; Enter/Space/click all open the popup) showing the current committed value as text, not an `<input>`/`<textarea>` — it accepts no keystrokes.
- **Popup editor**: activating the overlay opens a `Popover` anchored to the overlay button (`placement="bottom-start"`, `flip`/`shift` on, `variant="unstyled"`, styled via the shared `motto-popup` class through `withMottoPopupClass`), containing a `RawControl` clone (free-form CSS input with `var()`/function autocomplete) plus an icon-only **Confirm** button (`motto-ui-button is-icon-only`, Lucide `Check`).
- **Synchronization on open**: `openCssPopup` seeds the draft from `cssDisplayValue` (the live committed value if currently CSS-like, else the last remembered CSS value) every time the popup opens — never from a stale leftover draft from a previously discarded edit.
- **Draft-until-confirm**: typing in the popup's `RawControl` updates local `draftValue` state only; no `onChange` fires to the consumer while the popup is open. Accepting an autocomplete suggestion updates the draft in place and does not implicitly confirm/close. Clicking Confirm (`confirmCssPopup`) writes `draftValue` into `lastCssValueRef`, closes the popup, and emits it via `onChange` exactly once — including whatever incomplete expression was typed up to that point (no filtering).
- **Discard on close**: Escape (when the `RawControl` autocomplete list isn't open) or click/focus-outside (`onFocusOutside`/`onClose` both call `discardCssPopup`) closes the popup **without** committing — the stored value and inline overlay are unchanged. Escape with an open suggestion list closes the list first (existing `RawControl` behavior); a second Escape discards and closes the popup.
- Leaving css mode by any other route (unit switched away, external value change) closes an open popup without committing, via the `[isCssMode]` effect.

### 4.4 CSS-mode exit and value restoration
- Switching the unit dropdown away from `"css"` calls `getCompatibleExitVarValue({ selectedUnit, lastNonVarValue, lastVarValue })`, which only restores a candidate value (the last plain value, or a `var(--x, fallback)`'s fallback) whose **explicit unit matches** the newly selected unit — otherwise it restores empty, rather than guessing.
- WP `UnitControl` may emit one stale echo of the just-exited CSS value on the same tick the unit changes; `exitingCssValueRef` remembers that value (and a "trailing unit appended" variant of it) so the control's `onChange` handler can silently ignore that single echo instead of re-committing it.

### 4.5 Emission rules
- **Switching units alone never emits** when `emitOnUnitChange={false}` (the default consumers should pass for slot-style controls like spacing) — it only recomputes what the input displays. The default prop value is `emitOnUnitChange = true`; each consumer decides whether unit-only switches should be silent.
- Entering css mode via the dropdown emits once immediately (§4.2), if `emitOnUnitChange` is on.
- The plain numeric field emits on every `onChange` from WP `UnitControl`, except: while in css mode (guarded entirely, the numeric field isn't rendered as the editable surface — see §4.3), during the one-tick stale-echo window on exit (§4.4), and for a hard guard against a malformed synthetic value like `"3css"` slipping through.
- The css-mode popup emits exactly once, on Confirm (§4.3) — never per keystroke.

## 5. Data Contract
- Inputs: `value` (plain CSS value string), `units` (optional override list), `onChange`, `onUnitChange`, `emitOnUnitChange` (bool, default `true`), `enableVarUnit` (bool, default `true`), `disabled`, plus passthrough props (`label`, `min`, `max`, etc.) forwarded to WP `UnitControl`.
- Persistence: none — all css-mode/popup state (`localUnit`, `lastCssValueRef`, `lastNonCssValueRef`, `draftValue`, `isPopupOpen`) is local component state/refs, re-derived from `value` on mount and on qualifying external changes (§4.2).
- Outputs: a single value string per `onChange` call — either the plain numeric+unit string from WP `UnitControl`, or a full CSS expression string from the popup's Confirm.

## 6. Acceptance Criteria
- [x] The `"CSS"` unit is always present and last in the unit dropdown, for every consumer, unless `enableVarUnit={false}`.
- [x] With `css` unit active, the inline area shows a read-only overlay (no editable field in place); clicking/Enter/Space opens a popup pre-filled with the current value.
- [x] Typing in the popup does not change the stored value until Confirm is clicked; Escape/click-outside discards the draft and leaves the stored value and inline overlay unchanged.
- [x] Autocomplete suggestions work inside the popup's `RawControl` clone; accepting one updates the draft, not the stored value.
- [x] Pasting/typing a `calc()`/`var()`-shaped expression directly into the plain numeric field auto-switches to css mode and emits the cleaned expression.
- [x] Switching units alone never emits when `emitOnUnitChange={false}`.
- [x] Exiting css mode restores a value only when its explicit unit matches the newly selected unit; otherwise restores empty.
- [x] Behavior is identical across all direct consumers (`PresetValueRow`/`SpacingControl`/`BorderRadiusControl`, `GridTemplateTracksControl`, `TransformControl`) since none of them re-implement any part of this contract.
- [x] Entering css mode from a pristine numeric field (no digits typed, only a unit selected) never seeds the css popup with the bare unit string (e.g. `"px"`) — it seeds from an actual value or starts blank (§4.2).
- [ ] No dedicated automated test coverage exists for this component (manual verification only, §8). Candidate follow-up, not blocking.

## 7. Risks and Mitigations
- Risk: draft-until-confirm here vs. `RuleValuePopup`'s code view (`SDD-009`), which still commits on every keystroke, creates two different mental models for "raw CSS editing" in the same plugin.
  - Mitigation: explicitly scoped and called out here and in `SDD-009`/`SDD-016`; if this diverges the UX noticeably, consider a follow-up to unify both under one commit model.
- Risk: seeding the popup draft from a stale ref instead of the live committed value could reopen the popup with an outdated value if an external change (undo/redo) landed while the popup was closed.
  - Mitigation: `openCssPopup` seeds from `cssDisplayValue`, which prefers the live `rawValue` over the ref (§4.3); the popup is also force-closed by the `[isCssMode]` effect if css mode is left externally.
- Risk: a future consumer disables `enableVarUnit` expecting css-mode to simply not trigger, but still passes a value that resolves `isCssExpressionValue(...) === true` — the value would render through WP `UnitControl`'s plain path with no editing surface able to represent it correctly.
  - Mitigation: document here that `enableVarUnit={false}` is only safe for value domains that can never legitimately contain a CSS expression/keyword.
- Risk: losing in-place quick-edit convenience — a one-click tweak to a `calc()` value becomes a two-step click-overlay-then-Confirm flow, for every consumer at once.
  - Mitigation: accepted tradeoff per explicit product decision (originally made for the spacing/radius use case); an Enter-to-confirm shortcut can be added later if this friction proves real across consumers.
- Risk: any new consumer that reads `value` directly instead of going through `onChange` (e.g. to mirror it into another field) would miss the "emits once on Confirm" timing and could show a stale value while the popup is open.
  - Mitigation: document here as the expected pattern; consumers should treat the control as the source of truth for display while its popup is open.

## 8. Test Plan
Automated:
- `npm run build` (includes `validate:boundaries`, which enforces the `components-to-styler` rule this component's popup design works around).

Manual (repeat on at least one direct consumer from each layer — e.g. `SpacingControl` and `GridTemplateTracksControl` — since none of them override this behavior):
- Switch a field's unit to `css`; confirm the field is no longer directly editable in place and shows the current value as read-only.
- Click the overlay; confirm the popup opens pre-filled with the same value, styled like the rule-row's raw-code view.
- Type a new value, close via Escape without confirming; confirm the stored value and inline overlay are unchanged.
- Type a new value, click Confirm; confirm the stored value updates and the inline overlay reflects it.
- Trigger the `var()`/CSS-function autocomplete inside the popup, accept a suggestion, then Confirm; confirm the accepted suggestion is what gets committed.
- Type or paste a `calc()`/`var()` expression directly into a plain (non-css-mode) numeric field; confirm it auto-switches to css mode.
- Switch a unit away from `css` after typing a value with a matching explicit unit; confirm it restores. Switch to a unit with no matching candidate; confirm it restores empty instead of a wrong unit's value.
- Tab to the overlay with keyboard only, open with Enter/Space, confirm focus lands in the popup's input.

## 9. Rollout Plan
Documents already-shipped behavior (implemented and manually verified on `SpacingControl`/`BorderRadiusControl` under `SDD-016` before this spec was split out; not yet re-verified independently on `GridTemplateTracksControl`/`TransformControl`, though they share the exact same code path).

Rollback: revert `MottoUnitControl`'s `isCssMode` branch to the directly-editable inline `RawControl` portal it replaced; no data migration involved since the stored value shape is unchanged.

## 10. Change Log
- v0.1 (2026-07-29): Extracted from `SDD-016` §4.3.1/§4.4, which had documented this as spacing/radius-specific. Generalized to cover the component's full unit-switching and css-mode contract and its actual consumer set (`PresetValueRow`, `GridTemplateTracksControl`, `TransformControl` directly; `NumericControl`, `TransitionDurationField`, `FilterControl` via `NumericUnitField`). No behavior change — documentation split only.
- v0.2 (2026-09-28): Bug fix, found while manually verifying `SDD-016` v0.7's new ephemeral per-slot value memory: a pristine slot (custom mode, no number typed) composes as the bare string `"px"`; the css-mode seed check only tested `!isCssExpressionValue(...)`, which treats a bare unit the same as "not a css expression, therefore a real value to seed with" — so switching straight from a pristine custom field to css mode showed `"px"` in the popup instead of blank. Added an explicit `isBareUnitArtifact` check (§4.2). Affects every consumer of `MottoUnitControl`, not just spacing/radius, though it was only actually observed (and manually re-verified) via `SpacingControl`/`BorderRadiusControl`. No automated test added — no harness exists for this component (§6).
