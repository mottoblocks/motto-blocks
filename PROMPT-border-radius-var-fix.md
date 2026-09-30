# Border Radius Var Fix Notes

## Bug

`BorderRadiusControl` could reopen in code/raw view after saving a `var(...)` value through `MottoUnitControl`.

## Root Cause

Two layers were out of sync:

1. The control itself could parse and work with `var(...)` values.
2. The global popup heuristic did not recognize `border-radius` `var(...)` values as visualizable.

That mismatch forced the popup back into code view on reopen.

## Required Fix

- Use a shared value-type capability layer for popup visualization checks.
- Use the same border-radius grammar in the control and in the heuristic.
- Keep `MottoUnitControl` resilient against trailing-unit echoes such as `var(--token)px`.

## Validation

- Save `border-radius: var(--token, 1rem)`.
- Close and reopen the popup.
- Confirm the control stays in visual mode and does not force raw view.
- Confirm leaving `var` mode hides stale echoes and does not auto-switch back when the slider is used.
