# Feature Spec: SDD-016 — Spacing & Border Radius Value Controls v1
Version: 0.7
Status: Active
Owner: Styler Core
Last Updated: 2026-09-28

> This spec documents the current behavior contract of `SpacingControl`, `BorderRadiusControl`, `PresetValueRow`, and their wrappers, as implemented in code (including small uncommitted polish on top of the `SDD-013` refactor). `SDD-013` remains the historical record of *why* these controls were rewritten (RAF race conditions, stale closures, draft-row ghost rules); this spec is the canonical reference for *what the current behavior is*. It also closes the open verification item in `SDD-009` §6 regarding control sub-view inference for spacing/border-radius. The css-mode input surface these controls render (read-only overlay + popup editor) is `MottoUnitControl`'s own contract, not this spec's — see `SDD-020`.

## 1. Goal
Define, in one place, the complete interaction contract for editing spacing (margin/padding/gap) and border-radius CSS values in the Styler: how a value's UI representation is chosen, how switching units/modes behaves, how values are emitted, and how the containing rule row (draft state) persists — so future regressions are checked against a written contract instead of tribal memory.

## 2. Scope

In scope:
- `PresetValueRow` — the shared preset/custom/css row used by both controls for one "slot" (side, corner, or linked axis).
- `SpacingControl` — multi-side layout (axial link/unlink, single-side, "all"), auto-value toggle.
- `BorderRadiusControl` — multi-corner layout (all-linked vs per-corner).
- Wrappers: `SpacingMultipleControl` (CSS shorthand ↔ 4-side patch), `SpacingSingleControl` (single side/property).
- `useSlotValueMode` (`use-slot-value-mode.js`, formerly `usePresetCustomVisibility`) — the tri-state preset/custom/css mode per slot.
- `categorizeSpacingValue` and related utilities in `spacing-value-utils.js`, `border-radius-value-utils.js` (as of v0.7, shares the shorthand-expansion/`!important`-stripping helpers in `top-level-token-utils.js` with the spacing utils), and `value-mode.js` (`detectValueMode`, the ephemeral per-slot memory helpers) — the value-kind classification and mode/memory logic these controls rely on.
- The draft-row lifecycle in `StylerCssList.jsx` as it affects this control's popup identity (`RuleValuePopup` open/close stability).
- Registration in `value-control-registry.jsx` (`border-radius`, `spacing-multiple`, `spacing-single` types).

Out of scope:
- The Popover-level Visual-vs-Raw-code decision (`canVisualizePopupValue`, `shouldForceValueCodeView`) — owned by `SDD-009`.
- Other value-control types (color, box-shadow, grid-template-*, font-size, etc.).
- `blockSpacing` (gap/margin resolution between sibling blocks) — a separate system, see `docs/conventions/block-layout.md`.
- `MottoUnitControl`'s own unit-switching and css-mode overlay/popup contract (what these controls render once the custom editor is showing a `css`-unit slot) — owned by `SDD-020`. This spec only covers *when* a slot enters/leaves the custom editor and css sub-mode (§4.2–4.3), not how that surface behaves once shown. One exception: a `MottoUnitControl` bug (seeding css mode from a bare-unit artifact) was found and fixed while verifying this spec's v0.7 changes — noted here (§4.3.2) as a cross-reference, but the authoritative record of that fix is `SDD-020` v0.2.

## 3. Current Behavior
Prior to the `SDD-013` refactor, these controls emitted stored values via `requestAnimationFrame`-scheduled patches, causing stale-closure bugs, and `StylerCssList`'s draft row used an async-store-dependent guard (`draftIsCommitted`) that could produce ghost duplicate rows. That refactor landed; this spec documents the resulting steady-state contract, including small follow-up polish (the `cssModeSelected` unit-mode handling in `PresetValueRow`) made on top of it.

## 4. Target Behavior

### 4.1 Value kind classification (`categorizeSpacingValue`)
Every raw CSS value maps to exactly one kind, checked in this priority order (priority matters — a preset token would otherwise also match the CSS-expression check):
1. **`custom`** — bare `"0"`, or a numeric value with a recognized unit (`"16px"`, `"1.5rem"`).
2. **`preset`** — a spacing preset token, either Motto's internal marker (`var:preset|spacing|<slug>`) or the equivalent real CSS var (`var(--wp--preset--spacing--<slug>)`).
3. **`css`** — any CSS expression or keyword (`var(--x)`, `calc(...)`, `inherit`, `initial`, `unset`), and this is also the catch-all: anything not matching `custom` or `preset` falls here.
4. **`raw`** (empty only) — a truly empty value has no kind; treated as pristine.

`categorizeSpacingValue` is used as-is by `PresetValueRow` for both controls — it was never spacing-specific despite the file name. A trailing `!important` on the raw shorthand string is stripped *before* any of this classification runs (see §4.8) — it is a declaration-level modifier, not a positional shorthand value, and must never be misread as one.

### 4.2 View selection per slot
Each slot (side/corner/axis) independently shows one of three UI modes — `MODE_PRESET` | `MODE_CUSTOM` | `MODE_CSS` (`src/styler/utils/value-mode.js`):
- **Preset editor** (`MODE_PRESET`): a `RangeControl` slider snapping to indexes of the theme's spacing preset scale.
- **Custom editor** (`MODE_CUSTOM`): a unit-aware numeric input (`MottoUnitControl`) + a `RangeControl` slider.
- **CSS editor** (`MODE_CSS`): the same input alone as a free-text field (no slider) — reached by picking `"css"` from the unit dropdown while in the custom editor, never directly from the preset↔custom toggle button.

Rules:
- The mode is tracked per slot by the shared hook `useSlotValueMode` (`src/styler/hooks/use-slot-value-mode.js`, used identically by `SpacingControl` and `BorderRadiusControl`) — pure UI state, changing it **never** changes the stored value on its own.
- `detectValueMode(raw)` derives the mode a value's own shape corresponds to: empty / `"0"` / `"auto"` → `MODE_PRESET`; preset kind → `MODE_PRESET`; css kind → `MODE_CSS`; anything else → `MODE_CUSTOM`. `"0"` and `"auto"` deliberately stay in preset mode (`"0"` is the "None" preset slug and the shorthand placeholder the CSS serializer writes for an untouched side/corner — flipping it to custom would misrepresent it as a chosen `0px`; `"auto"` has its own orthogonal toggle, see §4.5).
- `defaultMode` (`"preset"` | `"custom"`) affects **only** the pristine (truly empty, nothing chosen yet) case. It never overrides an already-meaningful value — `"0"`, `"auto"`, a real preset, a real custom value, or a real css value all keep resolving their own mode via `detectValueMode`.
- A fresh external value change (undo/redo, programmatic set) that becomes non-preset reveals the matching mode (`MODE_CUSTOM` or `MODE_CSS`) for that slot, mirroring core Gutenberg behavior — but only when the slot is currently showing `MODE_PRESET`; it never yanks an already-open custom/css editor to a different mode underneath the user.
- The preset↔custom toggle button always lands on `MODE_PRESET` or `MODE_CUSTOM`, never `MODE_CSS` directly — `MODE_CSS` is only reached via the unit dropdown, from within the custom editor.
- When `hasPresets` is false, the preset editor is unavailable: a slot whose mode would otherwise be `MODE_PRESET` is forced to `MODE_CUSTOM` instead — but a slot already showing `MODE_CSS` (a real css-kind value) is left alone, it does not get forced to custom.

### 4.3 `mode` is fully controlled by the parent — `PresetValueRow` owns no view state
Prior to v0.7, free-text CSS editing was a distinct internal boolean (`cssModeSelected` in `PresetValueRow`) that only re-derived from the value's kind at two trigger points (mount, and the moment the custom editor was freshly entered), specifically to avoid being kicked out of css mode mid-typing (typing `"10px"` passes through intermediate shapes like `"10p"` that the loose numeric-value regex still matches). `PresetValueRow` now takes `mode` and `onModeChange` as controlled props instead of owning any state itself — the same avoid-mid-typing-kicks guarantee now lives one level up, in `useSlotValueMode`'s own contract (§4.2): it only ever reveals a mode change from a genuinely *external* value change, never from the slot's own live edits.
- Picking `"css"` from the unit dropdown calls `onModeChange(MODE_CSS)`; picking any other unit calls `onModeChange(MODE_CUSTOM)`.
- Entering css mode directly from a slider-selected preset seeds the textarea with the preset's *resolved* size (e.g. `"16px"`), not Motto's internal `var:preset|spacing|X` marker — that marker is never valid CSS. A real `var()` the user already typed/selected is left untouched. This seeding is `MottoUnitControl`'s own concern (`lastCssValueRef`, `SDD-020`) — it must only seed from a genuine value, never from a bare unit-only artifact (e.g. `"px"` with no digits, which is what WP `UnitControl` echoes back when the numeric field is empty and only a unit is selected — see the regression note in §4.3.2).

### 4.3.1 Ephemeral per-slot value memory
Each of the 3 modes can hold a *different* value at once, remembered only for the lifetime of the open popup — never written to the block attribute, gone the moment the control unmounts (popup closes). This is deliberately **not** persistence: switching modes and reopening the popup later does not restore anything from a previous session, only from earlier in the *same* open popup.
- **Storage**: `memoryBySide` / `memoryByCorner`, a plain `useState({})` owned by `SpacingControl` / `BorderRadiusControl` (not the shared hook — it doesn't need the hook's external-change-watching effect), shaped `{ [slotKey]: { preset?, custom?, css? } }`. Pure helpers in `value-mode.js`: `writeSlotMemory`, `readSlotMemory`, `clearSlotMemory`, `resolveDisplayFallback`.
- **Write** (`writeSlotMemory`, on every real edit — never on a mode toggle): the slot's `emit` wrapper first re-captures the *outgoing* live value under its own kind (`categorizeSpacingValue(...).kind`), then files the *incoming* value the same way, before calling the real row `onChange`. Capturing the outgoing value on every edit — not just once — is what lets a value that was never explicitly "saved" in a mode (e.g. the value already there when the popup opened) still get remembered the first time *any* edit happens, without a separate seeding step. `"auto"` and empty values are never written to memory.
- **Read**: the value handed to `PresetValueRow` as `rawValue` is `readSlotMemory(memory, slot, mode, resolveDisplayFallback(mode, liveValue))` — memory for the currently-shown mode wins if present; otherwise the fallback. `resolveDisplayFallback` is where css mode diverges from the other two: `MODE_PRESET`/`MODE_CUSTOM` fall back to the live value as-is (custom's own `resolvedForCustom` logic already turns a preset live-value into its concrete size, which is a meaningful seed for a numeric field); `MODE_CSS` falls back to the live value **only when the live value is already itself `MODE_CSS`-kind** — otherwise it falls back to `""`. A preset or custom value has no meaningful css-expression equivalent, so css mode must never auto-populate from one.
- **Clear**: emitting an empty value clears all 3 remembered modes for that slot (`clearSlotMemory`) — stale memory must not resurface once the user has explicitly emptied the field.
- Toggling a mode never emits by itself (§4.2) — even when memory exists for the destination mode and the display updates to show it, `row.value` is untouched until the user actually edits something in that mode.

### 4.3.2 Regression: a bare unit is not a value (`MottoUnitControl`)
`MottoUnitControl`'s own seed-on-entering-css-mode logic (§4.3) originally checked only `!isCssExpressionValue(currentCleanValue)` to decide whether to seed the css textarea from the custom editor's current value. `isCssExpressionValue` already treats a bare unit string like `"px"` (no digits) as "not a real value" for its own purposes (it's what WP `UnitControl` echoes back when the numeric field is empty and only a unit is selected) — but the seed check didn't share that distinction, so a pristine custom slot (empty number, `"px"` selected) produced the composed display value `"px"`, which then got seeded into css mode as if it were a real value. Fixed by adding an explicit `isBareUnitArtifact` check (same `/^[a-z%]+$/i` pattern) alongside the `isCssExpressionValue` check before seeding — parsing custom found nothing there, so css mode must not inherit anything from it either.

### 4.4 Emission rules (no RAF)
- Preset slider: emits immediately on every position change.
- Custom numeric input: emits on every keystroke, but only if the trimmed value parses as a float, or is a recognized CSS expression/keyword — partial input (bare units like `"em"`, empty strings) is ignored so it never wipes the stored value mid-edit.
- Custom `css`-mode input: the row's slot renders `MottoUnitControl` in css mode, which shows a read-only overlay and defers all edits to a popup, emitting once on Confirm rather than per keystroke — this is `MottoUnitControl`'s own contract, see `SDD-020` §4.3/§4.5.
- Custom range slider: emits `${number}${currentUnit}` on every drag position.
- **Switching units alone never emits** (`emitOnUnitChange={false}` on `MottoUnitControl`) — it only recomputes what the input displays; the stored value changes only when the user then edits the number or types in the css textarea. Full unit-switching rules: `SDD-020` §4.2/§4.5.

### 4.5 Auto-value toggle
When `hasAutoValue` is set, an `Auto` `ToggleControl` renders beside the row, orthogonal to view mode (can be on with either preset or custom active):
- Toggling on emits `"auto"` and disables the row's slider/input.
- Toggling off restores the last non-`"auto"` value seen for that side (tracked in a ref), or empty string if none was ever set.

### 4.6 Multi-slot layout (`SpacingControl`)
- `sides` config decides which slots exist: 4 independent sides, a physical axial pair (`vertical`/`horizontal`), a **logical start/end pair** (`["start", "end"]` — one logical axis split into its two ends), or a single side.
- Initial view (`getInitialView`) heuristic for physical configs: if the axis pairs currently match (`top === bottom` and `left === right`, with at least one set) or nothing is set on a balanced 4-side config, start in the linked **axial** view; otherwise per-side (**sides**) view. A single-value axis-only config resolves to whichever axis actually has the value; a genuinely single-side config with no value renders that side directly.
- The link/unlink toggle only appears when more than one side is configurable and the config isn't already axis-only; toggling re-derives the view, it does not rewrite values.

#### 4.6.1 Logical start/end pairs (`sides: ["start", "end"]`)
Used by the logical spacing shorthands `margin-block` / `margin-inline` / `padding-block` / `padding-inline` / `inset-block` / `inset-inline`, which each take at most `<start> <end>` along a **single** logical axis (not two axes like the physical `margin` shorthand).
- An extra `axis` config (`"block"` | `"inline"`) is passed alongside `sides`. It does **not** change stored values — it only selects the glyphs: linked view uses `iconSidesVertical` (`block`) / `iconSidesHorizontal` (`inline`); split view maps each end to the axis-appropriate **single** physical edge — `block` → `start`=top, `end`=bottom; `inline` → `start`=left, `end`=right (start before end in LTR). The aria label still says `Start` / `End`.
- Initial view (`getInitialPairView`): both ends equal or both empty → linked **axial** view (one slot, patched to `{start, end}`); ends differ → split **sides** view (two slots keyed `start` / `end`).
- The physical edge glyphs are an editor affordance only; the emitted CSS is always the logical `<start> <end>` shorthand. Under RTL / vertical `writing-mode` the highlighted edge is nominal (no runtime `dir` detection) — accepted, mirroring WP core's own physical spacing controls.
- The link/unlink toggle behaves as for physical pairs (re-derives view, does not rewrite values).

### 4.7 Multi-corner layout (`BorderRadiusControl`)
- Two views: **all corners linked** (one slot, patched to all four) or **per-corner** (four independent slots).
- Re-linking (`Link corners`) explicitly copies the current "all" representative value onto all four corners at the moment of toggling — it is not just a display grouping, it's an emitted patch.

### 4.8 Wrappers and the CSS shorthand round-trip
- The 1/2/3/4-value CSS box-shorthand expansion rule (`[a]→[a,a,a,a]`, `[a,b]→[a,b,a,b]`, `[a,b,c]→[a,b,c,b]`, `[a,b,c,d]→[a,b,c,d]`) is identical for `margin`/`padding` and `border-radius`, so it lives once — `expandFourValueShorthand` in `top-level-token-utils.js` — and both `spacing-value-utils.js` and `border-radius-value-utils.js` call it rather than each hand-rolling their own 1/2/3/4 branches (they did, prior to v0.7). The elliptical `border-radius` `/` syntax stays border-radius-specific, split off before tokens ever reach the shared helper.
- A trailing `!important` is a declaration-level modifier, not a positional shorthand value. `stripTrailingImportant` (also `top-level-token-utils.js`, case-insensitive, tolerates `"! important"`) strips it before tokenizing in both `parseSpacingSidesForControl`/`parseSpacingPairForControl` and `parseBorderRadiusValue`/`getBorderRadiusInitialView`/`canVisualizeBorderRadiusValue` — without it, e.g. `"10px 20px !important"` split into 3 naive whitespace tokens and `!important` landed in the `bottom`/third slot. Editing any side/corner afterward intentionally drops it (`stringifySpacingSidesToCss`/`buildBorderRadiusValue` have no concept of it) — it is rebuilt from the edited sides only.
- `border-radius-value-utils.js`'s token-acceptance (`normalizeBorderRadiusControlToken`, and by extension `canVisualizeBorderRadiusValue`) previously only accepted a numeric length or a bare `var(--x)` call — narrower than spacing's catch-all css kind (§4.1), so a value like `calc(var(--border-radius))` was rejected and the popup forced raw/code view even though `PresetValueRow`'s css mode could already display it fine. Now also accepts any `isCssExpressionValue`/`isCssKeywordValue` match (`calc()`, `clamp()`, `min()`, `max()`, a `var()` nested inside one of those, `inherit`/`initial`/`unset`/…), matching what the inner UI can actually show.
- `SpacingMultipleControl` resolves its `sides` list from config (`config.sides` if present, else `allowSplit ? 4-side : ["vertical","horizontal"]`). For **physical** side lists it parses an incoming CSS shorthand string into `{top,right,bottom,left}` (`parseSpacingSidesForControl` — handles 1/2/3/4-value shorthand forms), and serializes a patch back to shorthand (`stringifySpacingSidesToCss`), collapsing to the shortest equivalent form. Missing sides are normalized to `"0"` before collapsing so an axial control never produces an ambiguous single-value shorthand like `"auto"` that would incorrectly rehydrate onto both axes.
- For a **logical start/end pair** (`sides: ["start", "end"]`), the wrapper instead uses `parseSpacingPairForControl` (`"a"` → `{start:"a", end:"a"}`; `"a b"` → `{start:"a", end:"b"}`) and `mergeSpacingPairToCss` / `stringifySpacingPairToCss` (`start === end` collapses to one value; a missing end is padded with `"0"`, mirroring the physical helper's anti-ambiguity rule). These pair helpers live in `spacing-value-utils.js` and never reuse the four-side physical serializer.
- `SpacingSingleControl` operates on one already-scalar CSS value (a specific side or standalone property), converting to/from Motto's internal preset token via `toSpacingControlToken`/`toSpacingCssValue`.
- Both wrappers, plus `BorderRadiusControl` directly, are wired into rule-row editing via `value-control-registry.jsx` under the types `spacing-multiple`, `spacing-single`, and `border-radius`; each reads its behavior config (`allowSplit`, `sides`, `axis`, `hasAutoValue`, `allowNegativeValue`, `initialUnit`, `defaultMode`, `side`) from the CSS property's entry in `styler-css-value-options.json`.
- Property→config mapping for the logical shorthands: `styler-css-value-options.json` maps `margin-block` / `margin-inline` / `padding-block` / `padding-inline` / `inset-block` / `inset-inline` (both the `--custom-prop` and bare-property pattern trees) to `type: "spacing-multiple"` with `sides: ["start","end"]` and the matching `axis`. These were `spacing-single` (one slider applied to both ends) prior to v0.6. The `*-block-start` / `*-block-end` / `*-inline-start` / `*-inline-end` longhands remain `spacing-single`.

### 4.9 Draft row identity (why this doesn't close the popup mid-edit)
`StylerCssList` treats an empty new rule as a **draft row** kept in local component state, not yet written to block attributes:
- Draft name/value edits update local state only; committing to the real row list (`persistRows`) happens on blur or on any non-empty value change, via `commitDraftIfNeeded`.
- The commit path updates `rowsRef` **synchronously** in the same tick as `setDraftRow(null)` — this is why `RuleValuePopup`'s ownership identity (keyed by row `id`) survives the transition from draft to real row without an intermediate render where the row appears to vanish and reappear, which is what previously caused the popup to close itself mid-interaction (see `SDD-013` / commit `847ef2d`).
- The auto-create-empty-draft effect guards on `rowsRef.current.length` (synchronous), not `resolvedRows.length` (one render behind, sourced from the block-attribute store) — using the async value here is what previously produced a duplicate "ghost" draft row.

## 5. Data Contract

- Inputs:
  - A plain CSS value **string** per property, per breakpoint (`mottoStyler.css.<breakpoint>[].value`) — these controls never receive or emit structured objects; shorthand parsing/serialization is entirely the wrapper's responsibility.
  - Per-property behavior config, read from `styler-css-value-options.json` and passed through `value-control-registry.jsx`:
    - `spacing-multiple`: `{ allowSplit, sides, axis, hasAutoValue, allowNegativeValue, initialUnit, defaultMode }` — `sides` (optional) overrides the `allowSplit`-derived list; `["start","end"]` selects the logical-pair mode (§4.6.1), for which `axis` (`"block"` | `"inline"`) picks the linked glyph.
    - `spacing-single`: `{ side, hasAutoValue, allowNegativeValue, initialUnit, defaultMode }`
    - `border-radius`: `{ defaultMode }`
  - Theme spacing preset scale (`spacingSizes`, from `buildSpacingSizes`) — drives the preset slider's steps and slug↔size resolution.
- Persistence: none beyond the standard `mottoStyler.css` row value — no additional block attributes, ever. As of v0.7 the controls *do* keep local-only React state beyond the pristine-only `defaultMode` fallback — the per-slot `mode` (§4.2) and the ephemeral 3-value memory (§4.3.1) — but both live purely in `SpacingControl`'s/`BorderRadiusControl`'s own component state, are never written to the block attribute or `row.value`, and are gone the moment the control unmounts (popup closes). Reopening the popup later re-derives `mode` from the value's own shape exactly as before v0.7, with no memory carried over.
- Outputs: a single CSS value string per `onChange` call (wrappers re-serialize to shorthand where applicable before calling the row-level `onChange`).

## 6. Acceptance Criteria
- [x] A value classified as `custom`/`preset`/`css` renders the corresponding editor on fresh popup open, per §4.1–4.2.
- [x] Toggling preset↔custom never changes the stored value.
- [x] `"0"` and `"auto"` never auto-reveal the custom editor.
- [x] `defaultMode` affects only genuinely empty (pristine) slots.
- [x] Switching units alone never emits a value change.
- [x] Typing a partial numeric value (e.g. a bare unit) never wipes the stored value.
- [x] Axial link/unlink and corner link/unlink re-derive/re-emit correctly (§4.6–4.7).
- [x] A logical start/end pair (`margin-block` etc.) opens linked when both ends match and split when they differ; split slots show one axis-appropriate physical edge each (block → top/bottom, inline → left/right); `start === end` edits collapse back to a one-value shorthand (§4.6.1, §4.8) — serialization covered by `spacing-value-utils.test.js`.
- [x] Adding a new empty rule and typing into it does not close any open value popup mid-edit (draft row synchronous commit, §4.9).
- [ ] No dedicated automated test coverage exists for the `mode`/memory *interaction* rules themselves (§4.2–4.3.1) — `useSlotValueMode`/`SpacingControl`/`BorderRadiusControl` can't be rendered in the current test environment (`@wordpress/element`/`@wordpress/components` aren't available to vitest). The pure logic each of those rules is built on (`detectValueMode`, `writeSlotMemory`/`readSlotMemory`/`clearSlotMemory`/`resolveDisplayFallback`) is covered by `value-mode.test.js`; the stateful wiring itself is manual-only. Candidate follow-up, not blocking.
- [x] Behavior is identical for both `SpacingControl` and `BorderRadiusControl` (both consume `PresetValueRow` → `MottoUnitControl`, and both use the same `useSlotValueMode` hook and `value-mode.js` memory helpers) — neither re-implements any part of the css-mode surface, which is `MottoUnitControl`'s own contract (`SDD-020` §6).
- [x] A trailing `!important` on the raw shorthand string never lands in a side/corner slot as if it were a value (§4.8) — covered by `spacing-value-utils.test.js` and `border-radius-value-utils.test.js`.
- [x] A border-radius value using `calc()`/`clamp()`/`min()`/`max()`/a nested `var()`/a global keyword opens in the matching visual editor instead of being forced to raw/code view (§4.8) — covered by `border-radius-value-utils.test.js`.
- [x] Switching to css mode with nothing remembered there never auto-populates from a preset's `var()` or a custom numeric value — it starts blank unless the live value is already itself a css expression (§4.3.1) — covered by `value-mode.test.js` (`resolveDisplayFallback`).
- [x] A pristine custom slot (no digits typed, just a unit selected) never seeds css mode with the bare unit string (e.g. `"px"`) when switching to it (§4.3.2, `MottoUnitControl.jsx`).

## 7. Risks and Mitigations
- Risk: a future change to `categorizeSpacingValue`'s priority order (checking `css` before `preset`) would silently break preset detection, since preset tokens also pass the CSS-expression test.
  - Mitigation: priority order is now documented here and inline in the source; any change should update both.
- Risk: re-deriving `mode` on every render from the live value (instead of only at the documented trigger points in `useSlotValueMode`) would reintroduce the "kicked out of css mode mid-typing" bug this design specifically avoids.
  - Mitigation: documented in §4.2–4.3; the effect that updates it is intentionally scoped and only fires from a genuinely *external* value change.
- Risk: `resolveDisplayFallback`'s css-mode exception (§4.3.1) is the kind of check that looks redundant/removable at a glance ("just fall back to the value like the other two modes do") — removing it reintroduces a preset's `var()` leaking into a blank css field.
  - Mitigation: documented in §4.3.1 with the exact failure mode; covered by `value-mode.test.js`.
- Risk: `MottoUnitControl`'s seed-on-entering-css-mode check (§4.3.2) is easy to "simplify" back to just `!isCssExpressionValue(...)`, silently dropping the bare-unit-artifact guard and reintroducing the `"px"`-leaks-into-css-mode regression.
  - Mitigation: documented in §4.3.2 with the exact mechanism (WP `UnitControl`'s empty-number-plus-unit echo).
- Risk: `writeSlotMemory`'s "capture the outgoing value on every edit" behavior (§4.3.1) is doing double duty as both "remember what I just typed" and "seed memory for a mode that was never explicitly touched" — a future refactor that only captures the *incoming* value would silently reintroduce the "switch to preset, pick one, switch back to custom, original value is gone" bug this was built to fix.
  - Mitigation: documented in §4.3.1 explicitly as the reason both the outgoing and incoming value are captured, not just the incoming one.
- Risk: an axial control that doesn't normalize missing sides to `"0"` before collapsing to shorthand could emit an ambiguous one-value shorthand (e.g. bare `"auto"`) that rehydrates onto both axes incorrectly.
  - Mitigation: `stringifySpacingSidesToCss` normalizes explicitly (§4.8); covered by existing `spacing-value-utils.test.js`.
- Risk: reintroducing an async guard (like the old `resolvedRows.length`) anywhere in the draft-row lifecycle would reopen the ghost-row / popup-closes-itself bugs from `SDD-013`.
  - Mitigation: §4.9 documents the synchronous `rowsRef` requirement explicitly as a contract, not an implementation detail.
- Risk: this spec's §4.4 references `MottoUnitControl`'s css-mode emission contract without restating it; if `SDD-020` changes that contract (e.g. reintroduces per-keystroke emission), this spec's own criteria wouldn't catch the drift since it no longer owns that behavior.
  - Mitigation: `SDD-020` is listed as a dependency (see header); any change there affecting spacing/radius should be cross-checked against this spec's §4.2–4.4.

## 8. Test Plan
Automated:
- `npm run test:unit` — `spacing-value-utils.test.js` (shorthand parsing/serialization, value categorization, `!important` handling, the `parseSpacingPairForControl` / `stringifySpacingPairToCss` / `mergeSpacingPairToCss` logical-pair helpers), `border-radius-value-utils.test.js` (shorthand expansion, `!important` handling, css-expression/keyword visualization), `top-level-token-utils.test.js` (`stripTrailingImportant`, `expandFourValueShorthand`), `value-mode.test.js` (`detectValueMode`, `writeSlotMemory`/`readSlotMemory`/`clearSlotMemory`/`resolveDisplayFallback`).
- `npm run lint`
- `npm run build`

Manual (the `mode`/memory wiring itself — `useSlotValueMode`, `SpacingControl`, `BorderRadiusControl` — has no automated coverage, see §6):
- Add a `margin-block` (or `padding-inline`, `inset-block`) rule — confirm it opens as a linked single slot with the axis glyph, unlinks to two `Start`/`End` slots, and that a `10px 20px` value opens already split while `16px` opens linked. Confirm the serialized value collapses to `16px` when both ends are set equal.
- Open a spacing rule with a preset value, an explicit unit value, and a `var()`/`calc()` value — confirm each opens in the matching editor mode.
- Toggle preset↔custom on a slot with a real value — confirm the value is unchanged.
- Set a preset value, switch its unit to `css` — confirm `MottoUnitControl`'s overlay shows the preset's *resolved* size (e.g. `"16px"`), not the internal `var:preset|spacing|X` marker (§4.3). Editing/confirming that value is `SDD-020`'s test surface, not this one.
- On a **pristine** slot (nothing set in preset, custom, or css yet), go preset → custom → css without typing anything — confirm the css field is genuinely blank, not `"px"` and not any preset-derived value.
- Type a custom value (e.g. `16px`), switch to preset and pick a different preset, switch back to custom — confirm the original `16px` reappears (ephemeral memory), not the picked preset's resolved size.
- Type a css expression, switch to preset, switch back to css — confirm the css expression reappears. Then close and reopen the popup — confirm it does **not** reappear (memory is popup-lifetime only, not persisted, §4.3.1).
- Clear a slot's value entirely, then set a new one — confirm no stale value from before the clear resurfaces in another mode.
- Enter a border-radius value like `calc(var(--x))` in css mode, close and reopen the popup — confirm it opens in the visual UI (css mode), not forced to raw/code view.
- Switch unit without editing the number — confirm no attribute change is emitted.
- Link/unlink sides on an axial-capable spacing control; link/unlink corners on border-radius — confirm values propagate correctly on relink.
- Toggle Auto on/off — confirm the last real value is restored.
- Add a new empty CSS rule, type a value while an existing rule's popup is open elsewhere in the list — confirm the open popup does not close.
- `MottoUnitControl`'s own css-mode overlay/popup behavior (open/confirm/discard, autocomplete, keyboard access) is out of scope here — see `SDD-020` §8.

## 9. Rollout Plan
The `SpacingControl`/`BorderRadiusControl`/`PresetValueRow` contract in §4.1–§4.9 documents already-shipped behavior; no phased rollout applies to it.

Rollback: not applicable (documentation-only spec; the underlying controls' own rollback, if ever needed, is a code change tracked separately).

## 10. Change Log
- v0.1 (2026-07-12): Initial draft documenting the current `SpacingControl`/`BorderRadiusControl`/`PresetValueRow` behavior contract, following up on the `SDD-013` refactor and closing the related open item in `SDD-009`.
- v0.2 (2026-07-29): Folded in the proposed css-mode input surface redesign (§4.3.1) — read-only inline overlay + popup editor with draft-until-Confirm commit semantics, replacing the directly-editable inline `RawControl` portal. Originally drafted as a standalone `SDD-020`; merged here since it amends this spec's existing §4.3/§4.4 contract rather than covering a separate feature area. Not yet implemented — see unchecked items in §6.
- v0.3 (2026-07-29): Implemented §4.3.1 in `MottoUnitControl.jsx` and `_motto-unit-control.scss`. Deviated from the draft in one respect: the popup clone reuses `RawControl` directly (styled to match `.motto-css-rule-value`) instead of the styler-owned `CssFunctionAutocompleteControl`, since `MottoUnitControl` lives under `src/components/` and the `components-to-styler` import-boundary rule forbids that import. `npm run lint`/`npm run build` (including `validate:boundaries`) pass. Manual browser verification per §8 still pending — the local WP dev environment was not running (502) at implementation time.
- v0.4 (2026-07-29): Polish pass — Confirm is now an icon-only button (`motto-ui-button is-icon-only`, Lucide `Check`) instead of a text button; popup appearance now uses the shared `motto-popup` class (`withMottoPopupClass`) for its white background, and the popup's own layout/input styles moved from `_motto-unit-control.scss` to `_ui-popups.scss` alongside the plugin's other popup styles. Manual browser verification per §8 performed and confirmed working on both `SpacingControl` and `BorderRadiusControl` — all §6 acceptance criteria for §4.3.1 checked off.
- v0.6 (2026-09-04): Added logical start/end pair mode to `SpacingControl` (§4.6.1) and `SpacingMultipleControl` (§4.8). `margin-block` / `margin-inline` / `padding-block` / `padding-inline` / `inset-block` / `inset-inline` migrate from `spacing-single` (one slider for both ends) to `spacing-multiple` with `sides: ["start","end"]` + `axis`, giving a 1↔2 link toggle. Split view reuses the existing single-edge physical glyphs, resolved by `axis` (block → top/bottom, inline → left/right) via a new `iconKey` param on `renderSideControl`; an earlier draft used dedicated axis-agnostic bracket icons but they highlighted two edges at once, so they were dropped. New `parseSpacingPairForControl` / `stringifySpacingPairToCss` / `mergeSpacingPairToCss` helpers in `spacing-value-utils.js` (2-value shorthand round-trip, not the 4-side serializer). `inset-block`/`inset-inline` previously used `spacing-multiple` + `allowSplit: false` (mislabeled `Vertical`/`Horizontal`, no toggle). `npm run lint` / `npm run build` / styler unit tests pass; manual browser verification per §8 pending.
- v0.5 (2026-07-29): Split §4.3.1 back out into a standalone spec, `SDD-020` — v0.2's original merge reasoning ("doesn't cover a separate feature area") turned out to be wrong: `MottoUnitControl` is consumed by `GridTemplateTracksControl` and `TransformControl` directly (and by `NumericControl`/`TransitionDurationField`/`FilterControl` via `NumericUnitField`), so its css-mode contract was never spacing/radius-specific — it just happened to be implemented while working on this spec. This spec keeps §4.1–4.2 (value classification, view selection) and §4.3 (`cssModeSelected`, which *is* `PresetValueRow`-specific), and now references `SDD-020` for what happens once a slot renders `MottoUnitControl` in css mode. No behavior change.
- v0.7 (2026-09-28): Prompted by a user-reported bug audit of the spacing/radius controls (raw↔visual switching mis-splitting values with `!important`, then a broader request to unify spacing/radius and stop losing values across mode switches). Four changes, landed in sequence:
  1. **Shared shorthand parsing** (§4.1, §4.8): extracted `expandFourValueShorthand`/`stripTrailingImportant` into `top-level-token-utils.js`, used by both `spacing-value-utils.js` and (newly) `border-radius-value-utils.js` instead of each hand-rolling its own 1/2/3/4-value branches. Fixes `!important` being misread as a positional shorthand value in both controls, and widens `border-radius-value-utils.js`'s token acceptance to match spacing's css-expression catch-all (`calc()`/`clamp()`/keywords, not just a bare `var()`).
  2. **Tri-state `mode`** (§4.2–4.3): replaced the `usePresetCustomVisibility` boolean hook and `PresetValueRow`'s internal `cssModeSelected` state with a single shared `useSlotValueMode` hook (`use-slot-value-mode.js`) returning `MODE_PRESET | MODE_CUSTOM | MODE_CSS` per slot, and made `PresetValueRow`'s `mode` a fully controlled prop. Pure logic (`detectValueMode`) extracted to `value-mode.js` since `@wordpress/element` isn't available to the test env and the hook itself can't be unit-tested directly.
  3. **Ephemeral per-slot value memory** (§4.3.1): `SpacingControl`/`BorderRadiusControl` each keep a popup-lifetime-only `useState` remembering the last value seen per mode per slot (never persisted to the block attribute — explicitly rejected during design in favor of this over a persisted-attribute approach, to keep the change scoped and avoid a schema migration). Fixes switching preset→custom→preset→custom (etc.) silently discarding whichever value wasn't currently "active."
  4. Two regressions caught during manual verification of (3), both fixed same-day: `resolveDisplayFallback` added to stop css mode's empty-memory fallback from showing a preset's raw `var()`/resolved size (it now only falls back to the live value when that value is already itself css-kind, otherwise blank) — and `MottoUnitControl.jsx`'s seed-on-entering-css-mode logic gained an `isBareUnitArtifact` guard to stop a pristine custom slot's bare-unit echo (`"px"`) from being seeded into css mode as if it were a real value (§4.3.2).
  New tests: `top-level-token-utils.test.js`, `border-radius-value-utils.test.js` (first coverage for that file), `value-mode.test.js`. No coverage added for `MottoUnitControl.jsx` (no test harness exists for `src/components/controls/units/` — depends on `@wordpress/components`) or for the `useSlotValueMode`/memory *wiring* itself (manual-only, §6/§8). `npm run lint` / `npm run build` pass throughout; manual browser verification performed per §8 after each of the 4 sub-changes.
