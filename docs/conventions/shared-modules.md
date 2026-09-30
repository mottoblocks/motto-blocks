# Shared Module Conventions

Lucide/icon strategy and sizing moved to the `motto-visual-system` skill (`skills-source/motto-visual-system/references/scss-and-icons.md`) — it's a visual/design-system rule, not a shared-module data contract.

## Image Controls SSOT

Canonical shared components (authored under `src/components/controls/`):

- `src/components/controls/image/ImageSourceControl.jsx`
- `src/components/controls/image/BackgroundImageControlCore.jsx`
- `src/components/controls/image/BackgroundImageLayerControl.jsx`

Shared image value shape:

- `id: number`
- `url: string`
- `alt: string`
- `title: string`
- `width: number`
- `height: number`
- `sizeSlug: string` optional
- `sizes: array` optional

Rules:

- Consumers must not re-implement ad hoc image upload/picker logic when shared controls cover the use case.
- Local wrappers should only adapt attributes/state to the shared contract.
- Prefer WordPress core media components in shared implementations.

## Consumer Repo Overrides

Shared conventions are the baseline. Consumer repos keep explicit repo-only supplements for:

- repo name and entrypoints
- local checks
- runtime ordering contracts
- input lifecycle contracts
- label/config compatibility
- alias/shortcut contracts
- shared integration boundaries

Keep consumer-specific overrides in the consumer repo's local `CONVENTIONS.md` and `AGENTS.md`.

## Dev Mode Shared Module Iteration

- Implement new `*Control` components under `motto-blocks/src/components/controls/` (topic subfolders); keep companion non-control pieces in `src/components/primitives/` when they are not domain-specific control families. Add or adjust exports in `motto-blocks/src/shared/index.js` when consumer repos must import the symbol through the shared barrel.
- Keep contracts, constants, and cross-repo-only modules in `motto-blocks/src/shared/` (e.g. `slider/`, `lucide/` allowlist).
- Consumer repos must rebuild or sync to pick up changes.
- There is no external package indirection.

## Operations

- Repository artifacts must be in English.
- Prefer WordPress core components when feasible.
- Build custom UI only when core components cannot meet the functional requirement.
- Keep commits scoped and descriptive.

## Cross-Repo Rollout Checklist

When applying shared convention changes to another Motto repo:

1. Align local `AGENTS.md` and `CONVENTIONS.md` supplements.
2. Add or align repo validation scripts.
3. Enforce row ID generation and repair.
4. Align value-options resolution (`__patterns` -> exact).
5. Verify popup/input behavior.
6. Verify class/CSS ordering.
7. Run build and an editor smoke test.
