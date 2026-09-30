# Feature Spec: SDD-018
Version: 0.1
Status: Proposed
Owner: Architecture + Blocks
Last Updated: 2026-07-15

## 1. Goal
Add a scroll parallax effect to `motto/image`, gated as a Pro feature (per `TODO.md`), that reuses the exact interaction model and math already shipped for `motto/container`'s background parallax — but applied to a real `<img>` element (moved via `transform: translateY()`) instead of a `background-image` layer.

## 2. Scope
In scope:
- Two new attributes on the **free** `image/block.json`: `imageParallax` (boolean) and `imageParallaxOffset` (number), mirroring `backgroundParallax` / `backgroundParallaxOffset` naming and range.
- Free structural CSS/markup so the image can overflow vertically and be translated without layout breakage, inert unless the attribute is `true`.
- A new Pattern B block-level hook (`BLOCKS_HOOKS.imageParallaxSection`) exposing the Toggle + Offset UI, following the same stub-by-ID convention as `imageSourceDynamicSection` (SDD-008 §5.7).
- Extraction of the existing GSAP tween-building logic (currently duplicated across `use-container-parallax-preview.js` editor hook and `assets/js/parallax-runtime.js` frontend runtime) into a Pro-agnostic shared utility, reused by both the existing Free container feature and the new Pro image feature.
- A new Pro-owned frontend runtime asset (enqueued only by `motto-blocks-pro`) that actually animates `.motto-image__media.is-parallax`.
- A new Pro-owned editor component that wires the live canvas preview for the image block.
- A `config/features.json` entry (`image-parallax`, tier `pro`, gate `hard`, parent `image`).

Out of scope:
- Any change to `motto/container`'s parallax behavior, attributes, or its Free/no-gate status.
- Retroactively cataloging container's parallax in `config/features.json` (not in scope here; noted as a pre-existing gap only).
- Object-position-based (non-parallax) image controls — unaffected.
- Licensing/validation logic — `Motto_License::is_valid()` stays a stub per existing SDD-007 scope.

## 3. Current Behavior

### `motto/container` (prior art, 100% Free, no gate)
- Attributes `backgroundParallax` / `backgroundParallaxOffset` (20–400px, default 120) live in the free `container/block.json`.
- UI: native `FormToggle` + `RangeControl` in `container/index.jsx:431-467`, no hook indirection, no license check.
- The background layer div (`.motto-container__bg-image`) gets a conditional `is-parallax` class. CSS (`container.scss:46-50`) extends its `inset` vertically by `calc(var(--motto-parallax-offset) * -1)`, giving it translate headroom; the container itself gets `overflow: hidden` via `:has()`.
- Motion is GSAP `fromTo(layer, { y: -offset }, { y: +offset, scrollTrigger: { scrub, start: "top bottom", end: "bottom top" } })`, computed identically in two places:
  - Editor preview: `use-container-parallax-preview.js` (falls back to a manual `requestAnimationFrame` progress calc when running inside the block-editor iframe, where ScrollTrigger can't observe the parent window's scroll).
  - Frontend: `assets/js/parallax-runtime.js`, a vanilla IIFE that queries `.is-parallax` elements globally and reads the offset from the `--motto-parallax-offset` CSS custom property.
- Both respect `prefers-reduced-motion`.

### `motto/image` (current)
- Static block (`edit`/`save`, no `render.php`). Renders a plain `<img className="motto-image__media">` directly inside `.motto-image`, no wrapper overflow, no absolute positioning.
- `objectPosition` attribute controls `object-position`; `object-fit`/`aspect-ratio`/`height` are already exposed generically via Styler (`image/block.json:53-65`, `blockSelectors` on `.motto-image__media`).
- Pro extension point already exists for a different feature (`imageSourceDynamicSection`, SDD-008 §5.7): Free calls `applyFilters(BLOCKS_HOOKS.imageSourceDynamicSection, null, context)`; if `null` (Pro absent), renders a disabled `FormToggle` + `PRO` badge stub.
- No parallax capability today.

## 4. Target Behavior

### 4.1 Attributes (Free)
- `image/block.json` gains:
  - `imageParallax`: `{ "type": "boolean", "default": false }`
  - `imageParallaxOffset`: `{ "type": "number", "default": 120 }`
- Per "Free always renders" (free-pro-strategy-and-boundaries.md §1), these attributes must be declared in the free schema so Gutenberg preserves them across edit cycles even without Pro, exactly like `backgroundDynamic`/`imageDynamic` already do for other Pro features.

### 4.2 Structural markup/CSS (Free)
- `edit()`/`save()` in `image/index.jsx` add `is-parallax` to `.motto-image__media` when `attributes.imageParallax` is true. No other markup change; when the attribute is `false` (default), output is byte-identical to today — no `deprecated` entry needed.
- New CSS (added to `src/blocks/scss/image.scss` — currently no per-block SCSS file exists for image; one must be created and registered wherever `container.scss` is registered):
  ```
  .motto-image {
    --motto-parallax-offset: 120px;
    &:has(> .motto-image__media.is-parallax) {
      position: relative;
      overflow: hidden;
    }
  }
  .motto-image__media.is-parallax {
    position: absolute;
    inset: calc(var(--motto-parallax-offset) * -1) 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform: translate3d(0, 0, 0);
    will-change: transform;
  }
  ```
- This mirrors container's `inset` trick exactly, swapping `background-size: cover` for `object-fit: cover`. Effect is only visible when the block has an explicit height or `aspect-ratio` (same implicit precondition container already has — not a new constraint, not surfaced as a warning, consistent with existing precedent).
- This CSS is inert (never applied) unless `is-parallax` is present in the markup, which in turn requires Pro's UI to set `imageParallax: true` — satisfies "Free must not contain full Pro implementations" while keeping "Free always renders" for content authored while Pro was active.

### 4.3 Editor + frontend UI (Pro-gated, Pattern B)
- New hook constant in `src/blocks/freepro/blocks-freepro-ids.js`: `BLOCKS_HOOKS.imageParallaxSection` → `"motto.blocks.imageParallax.section"`.
- Free's `image/index.jsx` calls:
  ```js
  const parallaxSection = applyFilters(
    BLOCKS_HOOKS.imageParallaxSection,
    null,
    {
      enabled: Boolean(attributes.imageParallax),
      offset: Number.isFinite(attributes.imageParallaxOffset) ? attributes.imageParallaxOffset : 120,
      mediaRef, // ref callback attached to the rendered <img>, for Pro's live preview wiring
      onChange: ({ enabled, offset }) => setAttributes({ imageParallax: enabled, imageParallaxOffset: offset }),
    }
  );
  ```
- Shown only when an image source is present (mirrors container's `showParallaxControls = hasBackgroundSource`).
- If `null` (Pro inactive), Free renders the existing disabled-stub pattern (`FormToggle disabled` + `PRO` badge), identical in shape to the `imageSourceDynamicSection` fallback (`image/index.jsx:145-161`).
- Pro registers the filter from `src/pro/blocks/register-pro-block-filters.js`, rendering a new `ImageParallaxSection` component (`src/pro/blocks/image-parallax/ImageParallaxSection.jsx`) that reuses the same Toggle + `RangeControl` UI shape (min 20 / max 400 / step 1) as container's native section — but as a controlled component driven by `enabled`/`offset`/`onChange` props instead of direct `setAttributes`.

### 4.4 Motion engine (shared mechanic, Pro-owned activation)
Per "Pro code lives only in Pro" and "Shared code must stay Pro-agnostic" (`src/shared/` may be imported by `src/pro/`, never the reverse):
- Extract the GSAP tween-building logic (currently inline in `use-container-parallax-preview.js` and duplicated in `parallax-runtime.js`) into Pro-agnostic shared utilities:
  - Editor: `src/shared/hooks/use-scroll-parallax-preview.js` — generic `useScrollParallaxPreview({ enabled, offset, containerRef, layerRef, sourceKey })`, identical contract to today's `useContainerParallaxPreview` (rename call sites in `container/index.jsx`, no behavior change).
  - Frontend: refactor `assets/js/parallax-runtime.js` to expose a small neutral API on `window.MottoBlocksParallax` (e.g. `buildTween(layerEl, offset, triggerEl)`, `resetTween(instance)`) in addition to its existing self-contained container behavior. It must **not** start matching `.motto-image__media` itself.
- Container continues to consume the shared hook/utility exactly as before — no behavior change, no regression risk.
- Pro adds:
  - Editor: inside `ImageParallaxSection`, a `useEffect` that calls the shared `useScrollParallaxPreview`-equivalent wiring against the `mediaRef` DOM node passed through hook context.
  - Frontend: a new script `motto-blocks-pro-image-parallax-runtime` (source under `src/pro/blocks/image-parallax/`, enqueued by `motto-blocks-pro.php` with a dependency on the Free `motto-blocks-parallax-runtime` handle so `window.MottoBlocksParallax` is guaranteed present), querying `.motto-image__media.is-parallax` and calling the shared `buildTween` API.
- Net effect: without Pro active, `.is-parallax` markup renders as a correctly cropped, static `object-fit: cover` image (no console errors, no broken layout) — satisfying "Content created with Pro active must keep rendering correctly if Pro is deactivated" — but does **not** animate, since nothing outside Pro ever invokes the tween builder against image elements.

### 4.5 Catalog
- Add to `config/features.json`:
  ```json
  {
    "slug": "image-parallax",
    "name": "Image parallax",
    "category": "block",
    "tier": "pro",
    "status": "proposed",
    "pillar": "premium-blocks",
    "gate": "hard",
    "migrationRisk": "low",
    "parent": "image",
    "note": "Scroll parallax for the Image block's <img>, reusing motto/container's parallax math (transform: translateY, GSAP ScrollTrigger, --motto-parallax-offset). Attributes live in the free block.json for content preservation; UI and the actual scroll-tween activation are Pro-only. Free renders a static, correctly-cropped object-fit: cover image if Pro is deactivated."
  }
  ```

## 5. Data Contract
- Inputs: `attributes.imageParallax` (boolean), `attributes.imageParallaxOffset` (number, 20–400, default 120).
- Persistence: both attributes persist in saved block markup (`mottoDefaults`/`mottoStyler` unaffected — these are plain top-level attributes, same pattern as `backgroundParallax`).
- New hook: `BLOCKS_HOOKS.imageParallaxSection` (`src/blocks/freepro/blocks-freepro-ids.js`).
  - Inputs: `{ enabled, offset, mediaRef, onChange }`.
  - Output: React node or `null`.
- New shared utility contracts (Pro-agnostic, importable from `src/pro/`):
  - `src/shared/hooks/use-scroll-parallax-preview.js` — same signature as today's `useContainerParallaxPreview`.
  - `window.MottoBlocksParallax.buildTween(layerEl, offsetPx, triggerEl)` / `.resetTween(instance)` — exposed by the refactored `assets/js/parallax-runtime.js`.
- Outputs: `.motto-image__media` gains `is-parallax` class + inherited `--motto-parallax-offset` custom property when enabled; no other markup change.

## 6. Acceptance Criteria
- [ ] Free-only install: `imageParallax`/`imageParallaxOffset` round-trip correctly through save/reload (attribute preservation), but the "Parallax" panel section renders as a disabled stub with a `PRO` badge, and no animation runs even if the attribute is manually forced to `true` via the block editor's code view.
- [ ] Pro active: Toggle + Offset RangeControl (20–400px, default 120) behave identically in feel/range to container's existing parallax controls.
- [ ] Pro active, editor canvas: image visibly translates on scroll inside the canvas iframe, matching container's existing editor-preview fidelity (including the iframe rAF fallback path).
- [ ] Pro active, frontend: image translates on scroll, respects `prefers-reduced-motion`, and stops/resets correctly on block removal or attribute change (no orphaned ScrollTrigger instances).
- [ ] Pro deactivated after content was authored with parallax on: page renders without errors, image displays as a normal, correctly cropped `object-fit: cover` image (no visible clipping artifacts, no leftover transform).
- [ ] No behavior change to `motto/container`'s existing parallax after the shared-utility extraction (regression check).
- [ ] `npm run lint` and the import-boundary validator (`scripts/validate-import-boundaries.mjs`, SDD-002) pass with no new Free→Pro imports.

## 7. Risks and Mitigations
- Risk: Content-portability bypass — copying raw block markup/attributes from a Pro site into a Free site could set `imageParallax: true` without ever seeing the (gated) UI.
  - Mitigation: the actual scroll-tween activation lives only in Pro's own enqueued runtime/editor code (§4.4), never in Free's `parallax-runtime.js` or shared hook call sites outside Pro. Free rendering the attribute as inert CSS is intentional and matches "Free always renders."
- Risk: Duplicated GSAP config drifting between container and image over time.
  - Mitigation: single shared tween-building utility (§4.4), consumed by both; container's call sites are refactored to use it, not duplicated.
- Risk: Parallax on `motto/image` is invisible/confusing if the block has no explicit height or `aspect-ratio` set.
  - Mitigation: same precondition already exists for container, undocumented in-app today; explicitly noting it here is enough for now — no new UI requirement introduced by this spec.
- Risk: `assets/js/parallax-runtime.js` is a tracked build artifact (per `CLAUDE.md`); exposing a global API changes its public surface.
  - Mitigation: verify the actual vite entry/source for this file before implementation (its source-of-truth location wasn't confirmed during spec research) and confirm the global-namespace approach is buildable as a Pro script dependency before Phase B starts.

## 8. Test Plan
Automated:
- `npm run lint`
- `node scripts/validate-import-boundaries.mjs` (or equivalent npm script) — confirm no `src/` → `src/pro/` imports introduced.
- Existing container parallax tests/snapshots (if any) re-run green after the shared-utility extraction.

Manual:
- Free only: toggle stub visible/disabled with PRO badge; save a post with `imageParallax` forced true via code editor; confirm frontend renders a static, correctly cropped image.
- Pro installed: enable parallax on an image block with an explicit height; verify editor canvas motion, frontend motion, `prefers-reduced-motion` behavior, and resize/scroll cleanup (no console errors, no leaked ScrollTrigger instances via repeated toggling).
- Deactivate Pro after authoring with parallax on: confirm frontend still renders correctly (no motion, no layout break).

## 9. Rollout Plan
Phase A — Free scaffolding:
- Add `imageParallax`/`imageParallaxOffset` to `image/block.json`.
- Add structural CSS + conditional `is-parallax` class in `image/index.jsx` edit/save.
- Add `BLOCKS_HOOKS.imageParallaxSection` constant + disabled-stub fallback UI.
- Extract `use-scroll-parallax-preview.js` to `src/shared/hooks/`; migrate container to use it (no behavior change).
- Refactor `parallax-runtime.js` to expose `window.MottoBlocksParallax` while preserving its existing container-only default behavior.
- Add `config/features.json` entry (`status: "proposed"`).

Phase B — Pro implementation:
- `src/pro/blocks/image-parallax/ImageParallaxSection.jsx` + registration in `register-pro-block-filters.js`.
- Pro frontend runtime script + PHP enqueue (dependency on Free's parallax handle).
- Flip `config/features.json` entry to `status: "shipped"`.
- Update `TODO.md` to check off the item.

Rollback:
- Deactivate/remove Pro's filter registration and enqueue; Free scaffolding alone is inert and safe to ship ahead of Phase B if desired.

## 10. Change Log
- v0.1: Initial draft.
