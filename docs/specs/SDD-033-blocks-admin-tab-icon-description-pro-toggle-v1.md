# Feature Spec: SDD-033
Version: 0.6
Status: Active
Owner: Architecture + Blocks
Last Updated: 2026-09-24

## 1. Goal
Fix three gaps in the admin **Blocks** tab (`tab=blocks`): block cards showed no icon and,
for Free blocks, no description; a Pro-tier "hard gate" block (e.g. `motto/panel-trigger`)
kept showing a locked "Get Pro" card even when Pro was installed, active, and actually
registering the real block, because Free had no way to know Pro's catalog existed; and once
work started on the icon, a v0.1 attempt to source it from `block.json`'s WP-standard `icon`
field turned out to render the *wrong* icon — every block's `index.jsx` overrides that field
with a hardcoded Lucide component, so `block.json`'s `icon` is dead code the editor never
shows (see §3, §4).

## 2. Scope
In scope:
- A new Free-owned filter, `MOTTO_HOOK_BLOCK_DEFINITIONS` (`motto_blocks_available_block_definitions`,
  `includes/freepro-hooks.php`), fired at the end of `motto_blocks_get_available_block_definitions()`,
  letting Pro contribute its own block.json-derived definitions into the same catalog Free
  uses for both the enabled-blocks toggle system and the admin Blocks tab.
- Extracting block.json → definition parsing into `motto_blocks_parse_block_definition_file()`
  (`motto-blocks.php`), reused by both Free's own scan and Pro's filter contribution; adding
  `description` and `tier` (`'free'`/`'pro'`) to the definition shape.
- Each block's icon is a plain SVG file, `assets/icons/blocks/<slug>.svg` — the single source
  for both consumers, so a custom (non-Lucide) icon is just a new file. The editor imports it
  (`import blockIcon from "@block-icons/<slug>.svg?raw"`, alias in `scripts/vite-shared.mjs`) and
  registers `icon: { src: <BlockIcon svg={blockIcon} /> }`; PHP reads the same file. The 29
  initial files were exported once from the Lucide icons the blocks used before. No sync script.
- `motto_blocks_render_block_icon( $slug, $args )` (`includes/helpers.php`): reads
  `assets/icons/blocks/<slug>.svg`, passes it through the existing `motto_blocks_sanitize_svg()`
  allowlist, and returns it for the admin tab (replacing the dashicon span).
- `pro/motto-blocks-pro.php`: registers the new filter (deferred via `plugins_loaded` — see
  §7) to glob its own `build/blocks/*/block.json`; drops the blanket
  `motto_skip_enabled_check` for its blocks so they go through the same
  `motto_blocks_is_block_enabled()` check as Free blocks.
- Fixing `motto_blocks_sanitize_enabled_blocks()`'s child auto-enable step (previously a
  single pass over blocks sorted alphabetically by title) to iterate to a fixed point, so
  multi-level nesting resolves regardless of title sort order. This was already silently
  broken for `motto/tabs > motto/tab-panels > motto/tab` and
  `motto/tabs > motto/tab-container > motto/tab-button` (title order placed the grandchild
  before its parent got enabled); it would have broken the same way for the newly-toggleable
  `motto/panel-trigger > motto/panel-trigger-panel > motto/panel-trigger-close`.
- A back-compat heuristic in the same function so sites that already saved
  `motto_blocks_enabled_blocks` before Pro blocks joined this catalog don't lose already-live
  Pro content on upgrade (§5.2).
- `includes/admin/render-tabs.php` (`motto_blocks_render_blocks_tab()`): render the block
  icon (via `motto_blocks_render_block_icon()`) + `description` on every block card (Free and
  Pro-registered); add a "Pro" badge for `tier === 'pro'` entries; only render the
  informational locked "Get Pro" card for `config/features.json` pro-tier entries that aren't
  actually registered.
- `config/features.json`: add `description` (copied from each block's own `block.json`) to the
  `panel-trigger`, `marquee`, and `conditional` entries, so their "Get Pro" card (shown when Pro
  isn't installed) isn't blank; the card's icon comes from `assets/icons/blocks/<slug>.svg`
  like any other. `hotspots-image`/`graph` are unbuilt (no `index.jsx` yet) — left without
  icon/description until they exist (drop a `<slug>.svg` in `assets/icons/blocks/` by hand).
- Distinguish "not installed but exists in Pro" from "doesn't exist in any package yet":
  `config/features.json`'s existing `status` field (`'shipped'` vs. `'planned'`/`'proposed'`)
  now also drives the "Get Pro" card — `hotspots-image`/`graph` (`status: "planned"`, no
  `block.json` anywhere) always show the "Pro" badge too, plus an additional "Coming soon"
  badge and no "Get Pro" button, since there's nothing to buy yet.
- Fixed a pre-existing CSS class-name mismatch: the "note" paragraph's PHP class
  (`motto-block-item__note`, double underscore) never matched the SCSS selector
  (`motto-block-item-note`, hyphen) — renamed both sides to `motto-block-item-description`.

Out of scope:
- License validation gating block registration — Pro blocks still register unconditionally
  whenever the Pro plugin is active (unchanged).
- Any change to `motto/tabs`/`motto/accordion`/`motto/panel-trigger`'s `block.json`, `save()`,
  or markup — the fixed-point fix only changes which blocks the admin toggle enables, not
  block implementation.
- A version-gated migration system for the back-compat heuristic (§5.2) — the heuristic is
  the deliberately simpler, accepted-tradeoff option (see Risks).
- `motto/pattern-ref`: temporarily disabled mid-implementation of this spec (still in test
  mode) — its PHP/editor registration is commented out and its `config/features.json` entry
  removed, independent of this spec's mechanism. Re-enabling it needs no changes to this
  spec's code, just uncommenting those registrations.

## 3. Current Behavior
- `motto_blocks_get_available_block_definitions()` (`motto-blocks.php`) globs only
  `MOTTO_BLOCKS_DIR . 'build/blocks/*/block.json'` (Free's own build output) and discards
  every field except `name`/`slug`/`title`/`namespace`/`parents`.
- Every block's `block.json` declares a WP-standard `icon` (a dashicon slug, e.g. `"button"`,
  `"screenoptions"`) — but every single block's `index.jsx` immediately overrides it at
  registration time: `registerBlockType(metadata.name, { ...metadata, icon: { src: <Box .../> } })`,
  where the JSX literal is a hardcoded `lucide-react` import unrelated to `block.json`'s `icon`
  string. So `block.json`'s `icon` field is never what a user actually sees in the inserter —
  reading it (as an earlier draft of this spec did) renders the *wrong* icon in the admin tab.
- `includes/admin/render-tabs.php`'s Blocks tab renders a title + domain for each Free block
  (no icon, no description) and, separately, a list of pro-tier `config/features.json` entries
  as locked "Get Pro" cards — unconditionally, with no check for whether that block is actually
  registered.
- `pro/motto-blocks-pro.php` registers its own blocks (`motto_pro_register()`, `init` priority
  20) directly against WP's block registry, with `motto_skip_enabled_check: true` on every
  call — Free has no visibility into this at all; the two catalogs never talk to each other.
- `motto_blocks_sanitize_enabled_blocks()`'s child auto-enable loop is a single pass over
  `$definitions` (already sorted alphabetically by title), so a grandchild block whose title
  sorts before its own parent's title never gets added, even though the parent is enabled.

## 4. Target Behavior
- Every block card in the Blocks tab (Free or Pro) shows the *same* icon the block editor
  inserter shows (the same SVG file, §5.1) and a short description when present.
- A pro-tier "hard gate" block shows exactly one of: (a) a real enable/disable toggle with a
  "Pro" badge, icon, and description from its own `block.json`, if it is actually registered
  (Pro active); or (b) a locked informational "Get Pro" card with icon/description from
  `config/features.json`, if it is not registered.
- `motto_blocks_sanitize_enabled_blocks()`'s child auto-enable step converges regardless of
  nesting depth or title sort order (fixed-point iteration, not a single pass).
- A pro-tier block's absence from a pre-existing saved `motto_blocks_enabled_blocks` option
  is not read as "explicitly disabled" the first time Pro blocks join this catalog — see §5.3.

## 5. Data Contract

### 5.1 Block icons (`assets/icons/blocks/<slug>.svg`)
One SVG file per block is the source of truth (slug = `block.json` name without the namespace):
- **Editor**: `index.jsx` imports it with Vite's `?raw` through the `@block-icons/` alias and
  renders it with `BlockIcon` (`src/components/primitives/BlockIcon.jsx`), which adds the
  `motto-block-icon` class (18×18, `editor-ui.scss`) to the `<svg>`. The markup is packaged
  at build time, never user input.
- **PHP**: `motto_blocks_render_block_icon( $slug, $args )` (`includes/helpers.php`) reads the
  same file, sanitizes it with `motto_blocks_sanitize_svg()`, and adds the optional `class`. A
  missing file renders nothing.
- **File format**: 24×24 `viewBox`, `stroke`/`fill="currentColor"` so it inherits color, and only
  tags/attributes on `motto_blocks_sanitize_svg()`'s allowlist — anything else (e.g. `<defs>`,
  gradients) renders in the editor but is stripped in the admin card.
- Pro blocks' SVGs live in Free's `assets/icons/blocks/` too, so their "Get Pro" cards (Pro not
  installed) can show them. A planned block with no code yet (`hotspots-image`, `graph`) gets
  its card icon by dropping `<slug>.svg` there.
- **Changing an icon** = replacing the file (copy the SVG from lucide.dev for a Lucide one).

### 5.2 `MOTTO_HOOK_BLOCK_DEFINITIONS` filter
Constant: `MOTTO_HOOK_BLOCK_DEFINITIONS` → `'motto_blocks_available_block_definitions'`
(`includes/freepro-hooks.php`).

Fired by: Free, at the end of `motto_blocks_get_available_block_definitions()`
(`motto-blocks.php`).

Input/Output: `array<string, definition>` keyed by block name, where each definition is
`{name, slug, title, icon, description, namespace, parents, tier}`. Default value is Free's
own glob result (all `tier => 'free'`). Pro's registered callback
(`motto_pro_add_block_definitions()`, `pro/motto-blocks-pro.php`) merges in its own
`build/blocks/*/block.json`-derived definitions, each tagged `tier => 'pro'`.

### 5.3 Back-compat heuristic for pre-existing saved settings
In `motto_blocks_sanitize_enabled_blocks( $blocks )`: when `$blocks` is a saved (non-null)
array, compute `$pro_parent_names` (current pro-tier parent block names). If none of them
appear anywhere in the raw submitted/saved `$blocks` array, treat every currently-available
pro-tier parent block as enabled for this resolution (in addition to whatever Free names were
explicitly present) — the saved array predates Pro blocks existing as checkboxes, so it
couldn't have recorded an intentional "off" for them. The next time the admin saves the
Blocks tab with Pro blocks actually rendered as checkboxes, the saved array will contain real
pro-tier names and this fallback stops applying.

## 6. Acceptance Criteria
- [x] Every block (29) has `assets/icons/blocks/<slug>.svg`; every `index.jsx` renders it via
      `BlockIcon`, and the built Free/Pro bundles inline the SVGs.
- [x] `motto_blocks_get_available_block_definitions()` exposes `description`/`tier` for
      every block, Free and Pro (when Pro's filter is registered).
- [x] Blocks tab renders icon + description for every card; Pro-registered blocks show a "Pro"
      badge and a working toggle; not-yet-registered pro-tier blocks show the locked "Get Pro"
      card with icon/description instead of the old free-text `note`.
- [x] A pro-tier entry never renders both as a real toggle and as a "Get Pro" card
      simultaneously.
- [x] Simulated (standalone PHP, not WP-integrated — no local DB access this session) the
      fixed-point auto-enable step against the real `motto/tabs` and `motto/panel-trigger`
      family shapes/titles: all members of both families end up enabled, including the ones
      the old single-pass version silently dropped (`motto/tab`, `motto/tab-button`,
      `motto/panel-trigger-close`).
- [ ] Manually verified in a real wp-admin session (blocked this session — local DB
      unreachable via WP-CLI, see Risks) that: Pro inactive shows Free blocks + "Get Pro" cards
      only; Pro active shows Panel+Trigger/Marquee/Conditional as real, checked, toggleable
      entries with a Pro badge; unchecking and saving actually disables the block's frontend
      registration; re-checking restores it.
- [x] `php -l` clean on all touched PHP files; `config/features.json` valid JSON;
      `npm run build` (sass + both vite builds + both assemble scripts) completes.

## 7. Risks and Mitigations
- Risk: Pro's `add_filter( MOTTO_HOOK_BLOCK_DEFINITIONS, ... )` referencing Free's constant
  before Free has finished loading would fatal-error, exactly as documented in SDD-031 §7 for
  the four render-extension hooks.
  - Mitigation: registered inside `add_action( 'plugins_loaded', ... )`, guarded by
    `defined( 'MOTTO_HOOK_BLOCK_DEFINITIONS' )`, never at file top level.
- Risk (accepted tradeoff): the §5.3 back-compat heuristic can't distinguish "this site has
  never seen Pro blocks as checkboxes" from "this admin explicitly unchecked every single
  Pro-tier block and saved" — both look identical (zero pro-tier names in the saved array).
  An admin doing the latter would have their choice silently reverted back to "all enabled"
  indefinitely.
  - Mitigation: accepted as narrow and low-severity (disabling literally every Pro block at
    once is an unusual action) in exchange for not building a version-gated migration system;
    revisit with a real migration if this proves to matter in practice.
- Risk: no automated test coverage exercises `motto_blocks_sanitize_enabled_blocks()` (no PHP
  test infrastructure in this repo yet); the fixed-point fix and the §5.3 heuristic were only
  verified via a standalone PHP simulation against real title/parent data pulled from the
  actual `block.json` files, not against the live function inside WordPress.
  - Mitigation: `php -l` on every touched file; manual verification still pending (§6, blocked
    by local DB access this session) before considering this spec's rollout fully closed.
- Risk: `motto/pattern-ref`'s mid-flight disable (out of scope, §2) means its `build/blocks/`
  output may still exist on disk after a stale build; `motto_pro_add_block_definitions()`
  explicitly excludes it by slug so it can't leak back into the catalog as a toggle nobody's
  code actually registers.
- Risk: the mechanical `index.jsx` refactor touched all 29 blocks' icon registration (a
  real, if narrow, blast radius across the entire block editor surface) — a wrong per-file
  edit could silently swap one block's inserter icon for another's, or leave a stale unused
  Lucide import (caught by `no-unused-vars`, not by anything visual).
  - Mitigation: `npm run lint` run after the refactor (initially caught two false-negative
    removals — `Menu`/`List` — where a plain-English string like `__("Classic Menu Settings")`
    made the "is this identifier still used elsewhere" detection think the import was still
    needed; fixed once lint flagged the resulting `no-unused-vars` errors). Full `npm run build`
    (webpack/vite module graph must still resolve) plus `npm run format` also run clean.
    Pixel-level "does block X still show icon X in the actual inserter" was not independently
    re-screenshotted per block this session — the mapping was derived once via a scripted
    kebab-case resolution check against the real `node_modules/lucide-react` file tree (§5.1),
    not eyeballed per icon.

## 8. Test Plan
Automated:
- `php -l` on `motto-blocks.php`, `pro/motto-blocks-pro.php`, `includes/admin/render-tabs.php`,
  `includes/helpers.php`.
- `python3 -m json.tool config/features.json` (validity).
 `npm run lint`, `npm run format`, `npm run build`.

Manual (pending — see §6):
- Editor: open the inserter and confirm every block's icon is unchanged from before this
  spec (the refactor changes *how* each icon is sourced, never which icon it is).
- Free only (Pro inactive): Blocks tab shows Free blocks with icons/descriptions, each matching
  its editor inserter icon; pro-tier entries show as locked "Get Pro" cards with icon/description,
  no duplicate toggle.
- Pro active: `panel-trigger`/`marquee`/`conditional` show as real, checked-by-default toggles
  with a "Pro" badge and the same icon as their editor inserter entry; unchecking "Motto Panel +
  Trigger" and saving removes it and its three children from the frontend/editor inserter;
  re-checking restores all four.
- A site with a pre-existing saved `motto_blocks_enabled_blocks` option (simulate by saving
  the form once before this change, or on a real pre-upgrade site): confirm Pro blocks stay
  enabled after upgrade until the admin saves the form again.

## 9. Rollout Plan
Phase A (this change):
- Filter + parser extraction + fixed-point fix + back-compat heuristic in `motto-blocks.php`.
- Pro's filter registration + `motto_skip_enabled_check` removal in `pro/motto-blocks-pro.php`.
- `assets/icons/blocks/*.svg` + `BlockIcon` + `motto_blocks_render_block_icon()` added; admin tab
  rendering + `config/features.json` `description` fields.

Rollback:
- Revert this spec's commit(s). `MOTTO_HOOK_BLOCK_DEFINITIONS` is additive and inert without
  Pro's callback registered, so reverting only the Pro-side change is also safe in isolation
  (Free falls back to Free-only definitions, pro-tier blocks show as locked cards again).

## 10. Change Log
- v0.1: Initial draft and implementation — icon sourced from block.json's WP-standard `icon`
  (dashicon) field.
- v0.2: Discovered v0.1's icon source was wrong — every block's `index.jsx` already overrides
  `icon` with a hardcoded Lucide component, so block.json's `icon` is never what the editor
  shows. Replaced with a real SSOT: added `mottoIcon` to all 29 block.json files, switched all
  29 `index.jsx` files to read it through the existing `LucideIcon` resolver, and added a
  manual build script + PHP renderer so the admin tab renders the identical icon via inline SVG
  instead of a (frequently nonexistent) dashicon class. Renamed `config/features.json`'s `icon`
  field to `mottoIcon` for the same reason.
- v0.3: Added a "Coming soon" badge alongside the existing "Pro" badge (still no "Get Pro"
  button) for pro-tier catalog entries whose `config/features.json` `status` isn't `'shipped'`
  (`hotspots-image`, `graph`) — these don't exist in any Pro package yet, so showing the same
  "Get Pro" CTA as an actually-shipped, not-yet-installed block was misleading. Also moved every
  badge out of `.motto-block-item-title` onto its own row below the title (`.motto-block-item-badges`),
  per feedback that it read wrong inline with the block name.
- v0.4: Added `npm run sync:pro-catalog` (`scripts/sync-pro-feature-catalog.mjs`) to close the
  last duplication gap flagged in a review of this whole approach: a shipped pro-tier block's
  `mottoIcon`/`description` were hand-typed into `config/features.json`, independent of the
  real values in its own `block.json`, with nothing to catch drift. First implementation did a
  full `JSON.parse`/`stringify` round-trip, which silently reformatted every unrelated array in
  the file (multi-line `includes: [...]`) — replaced with surgical regex-based text replacement
  scoped to just the touched entries. That first regex version also had a real ordering bug:
  upserting `mottoIcon` and `description` as two independent "insert after `name`" operations
  duplicated the second field, because after the first upsert `description` was no longer
  directly after `name` (`mottoIcon` was). Fixed by upserting both fields as one atomic
  match/replacement instead of two sequential ones. Verified by round-tripping a real edit
  (temporarily changed `panel-trigger`'s `mottoIcon`, confirmed the script updated exactly that
  one value with zero incidental diff, then reverted and confirmed a byte-identical no-op run).
- v0.5: Reverted the `mottoIcon` mechanism from v0.2–v0.4 as over-engineered for something
  that changes rarely: every `index.jsx` imports its Lucide component directly again, `mottoIcon`
  is gone from all `block.json` files and `config/features.json`, and `sync:pro-catalog` /
  `icons:block-svgs` / `assets/icons/motto-block-icons.json` / `motto_blocks_render_lucide_icon()`
  are removed. Replaced by `npm run sync:block-icons`, which exports each block's icon from its
  `index.jsx` to `assets/icons/blocks/<slug>.svg`, rendered by `motto_blocks_render_block_icon()`.
  Definitions no longer carry an `icon` field (the admin derives the file from the slug).
  The filter, fixed-point fix, back-compat heuristic and "Coming soon" badge are unchanged.
- v0.6: Made the SVG files themselves the source for both consumers instead of an export of
  the editor's Lucide imports. Each `index.jsx` now imports `assets/icons/blocks/<slug>.svg`
  (`?raw`, `@block-icons/` alias) and renders it via a new `BlockIcon`; PHP reads the same file.
  Removed `npm run sync:block-icons` (nothing left to sync), and custom non-Lucide icons no
  longer need any Lucide extension.
