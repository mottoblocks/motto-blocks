# Block Layout Conventions

## Root Layout And Block Spacing

Root layout resolution order:

1. Active breakpoint in local `mottoStyler.css`.
2. Carry from larger breakpoints within the same local layer.
3. Active breakpoint in attached Motto CSS classes.
4. Carry from larger breakpoints within the attached-class layer.
5. Block `mottoBaseLayout` contract.
6. Final implicit fallback only if no signal exists.

Rules:

- Carry is intra-layer only.
- Never skip an explicit active-breakpoint `display` to read a larger breakpoint value.
- This contract applies to real editor/frontend block roots, not incidental internal elements.
- `mottoBaseLayout` in `block.json` is the source of truth for the block base layout.
- Allowed `mottoBaseLayout` values: `flow`, `flex`, `inline-flex`, `grid`, `inline-grid`.
- The root layout primitive class and JS/PHP fallback must derive from `mottoBaseLayout`.
- Root layout primitive classes must emit effective CSS, not metadata-only markers.

Block spacing:

- `blockSpacing` resolves against the effective root layout for the active breakpoint.
- Flex/grid layouts emit spacing through `gap`.
- Flow/block layouts emit spacing through sibling margins.
- JS and PHP must follow the same layout and spacing resolution order.
- Editor-only layout overrides may exist for usability but must not redefine the frontend contract.

## Child Block Roles

Classify every direct child of a parent block into one role before implementing editor behavior:

1. `structural singleton`: exactly one, auto-repaired, not manually inserted/duplicated/removed.
2. `optional structural singleton`: zero or one, controlled only by parent reconciliation.
3. `derived internal child`: attributes derived from one explicit source of truth.
4. `editorial repeatable item`: user-facing item that may be inserted, duplicated, removed, and reordered.

Rules:

- Do not rely only on hidden UI controls for child restrictions.
- Use `parent`/`ancestor`, `supports.inserter`, `templateLock`, and parent reconciliation as needed.
- If a child is derived, the parent owns reconciliation and manual parallel editing must be avoided.

### Optional structural singleton — implementation contract

When a parent toggle controls an `optional structural singleton`:

- **Off → the block must not exist in the inner blocks at all** — not hidden, not invisible, truly absent. It must not appear in the block list/structure panel.
- **On → the block is present** and the parent reconciles it into the inner blocks via `useEffect` + `replaceInnerBlocks`.
- The toggle attribute (`filtersEnabled`, `showNoResults`, etc.) travels to the frontend via `providesContext` so the PHP render callback can guard against stale saved content.
- Do NOT use `return null` from the child's `edit` function as the primary visibility mechanism — that only hides the canvas render, it does not remove the block from the structure.
- `return null` in the child edit is acceptable only as a safety net for context mismatches.

Implementation pattern (follows `motto/query` convention):

```js
// In the parent edit function:
const hasOptionalBlock = childBlocks.some((b) => b?.name === 'motto/optional-block');

useEffect(() => {
  if (toggleEnabled && hasOptionalBlock) return;

  const nextBlocks = [...childBlocks];
  const blockIndex = nextBlocks.findIndex((b) => b?.name === 'motto/optional-block');

  if (!toggleEnabled) {
    if (blockIndex < 0) return;
    nextBlocks.splice(blockIndex, 1);
    replaceInnerBlocks(clientId, nextBlocks, false);
    return;
  }

  // toggleEnabled but block is missing — insert it.
  const anchorIndex = nextBlocks.findIndex((b) => b?.name === 'motto/anchor-block');
  nextBlocks.splice(anchorIndex >= 0 ? anchorIndex : 0, 0, createBlock('motto/optional-block'));
  replaceInnerBlocks(clientId, nextBlocks, false);
}, [childBlocks, clientId, toggleEnabled, hasOptionalBlock, replaceInnerBlocks]);
```

## Child Styling Decision Rule

- If a parent has a single child type, the child may own visual styling through its own `mottoStyler`.
- If a parent has N homogeneous children of the same type, visual styles belong in the parent's `blockSelectors`, not in each child.

## Synced Patterns And Wrappers

- Do not duplicate Motto classes on wrapper plus inner real block.
- For synced pattern instances, apply Motto styles to the real inner block, not container wrappers.
- Block duplication must regenerate `instanceId`.
- Detach operations must generate new `instanceId` when style identity should diverge.

### Native Pattern Overrides (Block Bindings, WP 6.9+)

To give a custom block parity with `core/image`/`core/button`/etc.'s native "Enable overrides" (per-instance editable content inside a synced pattern), `role: "content"` in `block.json` alone is **not** enough. Four separate mechanisms have to line up. Reference implementations (both battle-tested against a real installed WP core, both live-verified end to end): `motto/image` (`docs/specs/SDD-025-image-pattern-overrides-v1.md`) and `motto/container` (`docs/specs/SDD-032-container-link-pattern-overrides-v1.md`) — read SDD-032's Change Log for the fuller story of what went wrong at each step and why.

1. **`block.json` schema — decide what's actually "content"**. Mark the instance-specific fields `role: "content"`, mirroring core's own shape. Two sub-cases:
   - A field readable straight from the saved markup (a string/rich-text living in an HTML attribute or tag body) gets `source: "attribute"` (or `"rich-text"`) + `role: "content"`.
   - A field with no markup representation (an attachment ID, a boolean like "open in new tab") gets `role: "content"` with **no** `source` and stays comment-persisted — same treatment as `core/image`'s `id` and `motto/image`'s `mediaId`. `role: "content"` doesn't require `source`; WP's binding *resolution* (`WP_Block::process_block_bindings()`) doesn't care either way, only the render-time *write-back* (step 3) does.
   - Before marking anything overridable, apply the "content vs. design" test: is this field *what the pattern shows* (text, a link's URL/target, an image), or *how it behaves* (motion effects, layout, a dynamic-source config)? Only the former belongs here — `core/image` never exposes `align`/`sizeSlug` as bindable, and this repo deliberately keeps `imageParallax*`/`linkDynamic`/`imageDynamic` out of scope for the same reason (see SDD-025 §2, SDD-032 §2). Check real core `block.json` files (`wp-includes/blocks/*/block.json`) for precedent before assuming a field is out of scope — `core/button` marking `linkTarget`/`rel` `role: "content"` (not just `url`) is easy to miss and changes what "parity" should include.

2. **PHP allowlist opt-in** — WP core (since 6.9.0) hardcodes which block types are eligible in `get_block_bindings_supported_attributes()` (`wp-includes/block-bindings.php`). This single allowlist gates *both* the editor's "Enable overrides" control *and* the render-time binding resolution — without it, the `role: "content"` schema is inert either way. Opt a block in with the `block_bindings_supported_attributes_{$block_type}` filter (block-type-scoped — note the literal `/` in the block name), listing the same attribute names as step 1. Use the shared `motto_blocks_add_bindings_supported_attributes( $supported_attributes, $attribute_names )` helper (`includes/helpers.php`) rather than re-writing the merge/dedupe boilerplate — see `includes/image-render.php`/`includes/container-render.php` for the two reference calls. (This same allowlist is also what feeds WP's own native "Attributes" panel in the block's Advanced settings — a generic custom-fields-binding UI, unrelated to Pattern Overrides' actual value editing, that lists whatever you allowlist here. Expect users to notice it and ask what it's for; it's inert/read-only for `core/pattern-overrides` bindings when the site has no compatible custom field to offer instead.)

3. **Frontend write-back — the step most likely to silently fail**. Resolving the override's *value* (step 2) is independent of getting that value *into the rendered HTML*. WP's own generic mechanism (`WP_Block::replace_html()`, private, `wp-includes/class-wp-block.php`) only fires for attributes with a `source`, and even then only ever matches by **bare HTML tag name** (`WP_HTML_Tag_Processor::next_tag(['tag_name' => $selector])`) — never a CSS class, an id, or any other selector, no matter what you write in `block.json`'s `selector`. Real core blocks all use bare tags (`core/image`: `"img"`, `core/button`: `"a"`) for exactly this reason. Two cases:
   - **The element is safely findable by tag alone** (the block's entire saved output is that one element, or you're certain no sibling/inner-block content could contain the same tag first) — just use the bare tag name as `selector`. WP's native write-back then works with **no custom PHP needed** (`motto/image`'s fix, SDD-025 v0.6: changing `.motto-image__media` → `img`).
   - **It isn't safe** (the target sits among arbitrary `InnerBlocks` that might render their own same-tag element first, e.g. `motto/container`'s link overlay next to a nested button/link), **or the attribute has no `source` at all** (a boolean/number, step 1's second sub-case) — WP's native mechanism can't help either way. Add your own `render_block_{$block_type}` filter that: reads the binding-resolved value from `$block_instance->attributes[$name]` (populated correctly regardless of the selector problem — only the write-back is broken, not the resolution), compares it against the pre-binding value in `$parsed_block['attrs'][$name]` to detect whether an override is actually active, and — only then — splices it into `$html` yourself via a class/attribute-scoped `WP_HTML_Tag_Processor` lookup (`motto_blocks_apply_container_link_override()` in `includes/container-render.php` is the reference implementation, handling `href`/`target`/`rel` together).
   - Either way, **verify this in a real browser against the actual frontend HTML**, not just the editor. The editor's JS-side attribute-source parser (`hpq`) supports real CSS selectors and will happily show a correct-looking override in the Inspector even when the PHP write-back is silently broken — this bit both `motto/image` and `motto/container` in this exact way before it was caught by live testing, not by any automated check.

4. **Sidebar visibility — one panel that relocates, not a permanent split**. While a block is being edited as part of a *synced-pattern instance* (as opposed to the pattern's own definition), Gutenberg puts it in "content only" editing mode, which hides every Inspector tab except "Content" — only controls registered via `<InspectorControls group="content">` survive that. But don't render the overridable field's panel in `group="content"` *unconditionally*: compute whether an override is actually active for this instance (shared helper: `hasActivePatternOverride(attributes, attributeName)`, `src/lib/pattern-overrides.js`, checks `attributes.metadata.bindings` for `__default` or the specific attribute) and use it to pick the `InspectorControls` group at render time — `group="content"` when active, the default group (in the field's normal position) otherwise. A block that never uses the feature then shows exactly the single panel it always has; only instances that actually enable overrides see it move to the Content tab. Non-overridable sibling controls (a dynamic-source picker, parallax, anything from step 1's "design" side) get their own separate panel(s), always in the default group, regardless of override state — never folded into the conditional one. (Earlier revisions of both `motto/image` and `motto/container` rendered the content-group and default-group panels *permanently*, both duplicated under the same title — this read as a broken, empty-looking duplicate for the vast majority of blocks that never touch the feature; fixed in SDD-025 v0.7 / SDD-032 v0.4.) For the two (or more) resulting panel titles, see `references/panel-structure.md`'s naming guidance in the `motto-visual-system` skill — a slightly longer, deliberately-paired name (`"Container Link"`/`"Dynamic Link"`) beats a bare noun when the panels need to read as related.

Known limitation — **instance state can't gate the "Enable overrides" toggle itself**: it's injected by `@wordpress/patterns` purely from block-type eligibility (step 2); there's no extension point for a third-party block to hide/disable it conditionally on a specific instance's attribute values (core/image gets one hardcoded exception for this — linked images — that isn't reusable by other blocks). If a per-instance state makes overriding pointless for a given block (e.g. a Pro dynamic-source mode that always overwrites whatever the override sets, on both `motto/image` and `motto/container`), don't try to suppress the native control — surface a `motto-section-help` note in the block's own panel explaining the interaction instead, and make sure your step-3 write-back filter runs *after* the dynamic-source filter so dynamic mode still wins on the frontend to match what the note says.

## Editor Preview Artifacts

- Gutenberg preview artifacts such as `style[inert]`, preview SVGs, and technical wrappers are not real layout/content contract nodes.
- Fix preview-only layout problems with editor-scoped exceptions or wrappers.
- Do not change frontend runtime spacing/layout contracts to accommodate editor-only DOM.

## Editor vs Frontend Runtime

- Keep one shared attribute/data contract.
- Do not force editor and frontend to share the same runtime file.
- Editor preview behavior should live with React/editor lifecycle.
- Frontend behavior may use separate DOM/runtime files.
- Shared intent is required; shared file ownership is optional.
