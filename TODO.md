# TODO

## General
- [x] border issue on split values
- [ ] check styler component architecture
- [x] motto conditional - change matchmode to toggle group
- [ ] block selector - if no inner/state selector defined - pointing to main block, instead of click ok a doing nothing, simply disable the button.
- [ ] particle bg block, select/upload particle, interaction w/mouse, animation, etc...
- [ ] map: title.desciption.link must have a text saying belong to infobox, you can leave empty if you dont want an infobox.
- [ ] think about like an alternative that uses class+vars as patterns
- [x] check if scrolltrigger.refresh is being trigered when accordions and tabs are toggled
- [ ] Allow to change icon in accordions
- [ ] Motto Gallery in Pro — slider, masonry, etc features.
- [x] creating class on remote:
takes too long to check if name is avalable, others seems not to work when class created, action buttons takes time to load, that's shouldn't happen since the plugin just created the class, it should show inmediatly (removed per-keystroke REST duplicate-slug check in CreateClassModal, now validated against the already-preloaded local class registry; new class record is optimistically merged into the shared registry via registerPendingCssClassRecord so action buttons/suggestions show immediately without waiting for the list requery)
- [x] checking existing class submit toggle button in taking too long. could be find an optimized way of checking this? (same fix — Save button no longer gated on a remote resolving state)

- [x] - "Nested values use PATH, for example ${PATH:${ACF_FIELD_ARRAY:contact},info}" label on wildcards popup
- [x] need to have a url param value, maybe the "Site" category may be "URL" or "SITE/URL" (added ${URL_PARAM:param} wildcard under "site" category)
- [x] add FORMAT engine operator (${FORMAT:${WILDCARD},mode}) to actually resolve text formatting (title/titlecase/sentence/upper/lower) — implemented in includes/wildcard-registry.php as __engine_format__, same pattern as PATH
- [x] -block and -inline props need to be able to get separated in top/bottom left/right (SDD-016 v0.6: start/end 1↔2 link toggle for margin/padding/inset -block/-inline)
- [x] unitControl *-block/inline should could be split
- [x] audit negative values in spacingControl sliders (top/right/bottom/left and inset* patterns now set allowNegativeValue: true, matching margin)
- [x] --swiper-pagination-bottom shows a warning dependency (split top/right/bottom/left pattern in styler-css-value-options.json: literal props keep the `requires: position` check, `--*` custom vars no longer do)
- [x] check events to check name availabity when typing class name on create class popover, it's taking much to response / accumulatig requests on remote servers (see fix above — no more remote check per keystroke)
- [x] line-height doesnt recognice number as a valid value, always opens in RAW mode
- [x] Add mottodefault to icon and label in motto button
- [x] get object position from media focus point plugin and use it as a background position for container block bg image option
- [x] weird grid-template-columns fallback when nonreadable value by ui. check it
- [x] add --motto-transition to default in motto-panel-trigger
- [x] grid-template-columns set 1fr as default as pristine, but there's no initial value on raw.
- [x] svg block - empty value on image/code source should show icon src+"super brief message" instead of .components-notice
- [x] style panel - take save icon outside menu and put it aside the toggle dots
- [x] image block — add "replace image" on topbar
- [x] review SDD-025 (image pattern overrides, parity with core/image editable-in-pattern) — live-verified working: flat role:content attributes + deprecated/migrate() + block_bindings_supported_attributes_motto/image PHP filter (WP 6.9+ allowlist requirement) + InspectorControls group="content" split so the sidebar shows while editing inside a synced pattern; dynamic-mode/override interaction documented with a help note. Mechanism generalized in docs/conventions/block-layout.md for other blocks (SDD-025 v0.5)
- [x] image core block - add an option to transform into motto-image.
- [x] motto container/ Sidebar - hide media motto-image-source-position-control if dynamic is enabled
- [x] styler - when pasting rules on class, they are saved but not shown when pasted
- [x] avoid confirm pasting when are no rules
- [x] add parallax to motto image (pro)
- [x] when raw is toggled focus con the raw input
- [x] box-shadow control - make motto-color-control inside a popover trigered by a similar color base from background prop
- [ ] disable style preset on topbar and add color, bgcolor, fontsize, layout variations shortcuts
- [x] add pallette on gradient color picker — checked: core's GradientPicker stop popup (Gutenberg custom-gradient-picker/gradient-bar/control-points) only renders ColorPicker (hue/hex/alpha), no theme ColorPalette either; core has no injection point for it. Would require a fully custom gradient bar/stop popover to add. Decided not worth it — leaving as-is.
- [ ] add selector style on counter block
- [ ] add local block vars on suggestion list
- [x] toggle axis on scale prop
- [ ] create set of motto patterns
- [ ] change relative icon on position property
- [x] check popup class editor and close/open save events
- [x] add inset to prop suggestions
- [x] alow negative values in margin and similars
- [x] visual view loads when unknown value is in flexControl
- [x] class rename checking - first if id exists, adjust slug, if slug adjust id.
- [x] opacity rule must start with undefined not 0%. set steps to 1%
- [x] check loading method blocks/scripts/styles free-pro in motto-blocks(pro).php 
- [x] review logs in maps/slider
- [x] fix block spacing in groups, for some reason is not apllying it on the editor.
- [x] when block selector is duplicated, trigger popup to set it up.
- [x] focus input when click link topbar in button block
- [x] copy block selector with everything inside
- [ ] var suggestions should include instance/class vars
- [x] focus in textarea on switching to raw view
- [x] refine preset popoover layout and content
- [x] fix not saving styler when template is visible in page editor (likely fixed by the May 2026 editor-canvas-resolver cluster — `getPreferredEditorCanvasIframe`; confirmed resolved by manual retest)
- [x] extend cascade-aware "requires" dependency warning (see docs/conventions/architecture.md#cascade-direction-desktop-first) to inner/block selectors — BlockSelectorsList now builds a per-selector cssByBreakpoint map and threads it through InnerSelectorItem into StylerCssList (read-only, doesn't enable cross-breakpoint preset-apply)
- [ ] perf(pro): batch endpoint `/v1/dynamic-image-previews-batch` to fold N image-preview fetches into 1 (mitigate WP Engine 429 when the editor concurrency limiter cannot keep waves small enough). Same evaluation for wrapping/throttling `ServerSideRender` calls in the `motto/dynamic-text` block, which hit `/wp/v2/block-renderer/...` and currently sit outside the limiter.

- [ ] map block
  - [ ] add no drag options in front
  - [ ] refine pins panel
  - [ ] add an address input in panel


## Motto Blocks PRO

- [x] marquee block (gsap, freemode, etc)
- [ ] Interactive Gallery: slider, frame y frame, hovering passing navigation, etc...
- [ ] Free baseline contract: lazy frontend cache invalidation/regeneration stays free; do not require Pro to reach a correct cache state.
- [ ] Pre-gating UX work for `custom-spacing-override` (currently active in free SpacingControl/BorderRadiusControl): adjust override flow before announcing migration to Pro (Phase 5).
- [x] Deduplicate `src/styler/data/styler-css-value-options.json` `__patterns` for CSS vars vs real props (same spacing/border-radius patterns repeated) — merged 24 var/real-prop pairs into single alternation regexes (56 → 32 entries), verified behaviorally identical against 600+ test keys before/after.
- [ ] Define license validator + transient cache (Phase 1).
- [ ] Define `Motto\Features` PHP registry and `useFeature(slug)` JS hook (Phase 1).
- [ ] Author manifest validator script (every slug used in code must exist in `config/features.json`; report orphans).
- [x] Global Custom CSS tab (single site-wide CSS box, safe wp_head output + editor-canvas preview via `window.__MOTTO_BLOCKS_CUSTOM_CSS__`) moved entirely to Pro (`pro/includes/admin/settings-custom-css.php`) — WordPress.org no longer permits a free-form custom CSS field in a directory-hosted plugin, regardless of sanitization. Registers into the shared admin tabs via `motto_blocks_admin_tabs`/`motto_blocks_render_admin_tab_css`, same pattern as the License tab.
- [ ] Pro feature: advanced Custom CSS — per-breakpoint/responsive rules, deeper linting/validation, conditional CSS scoped to specific pages/templates, revision history.
- [ ] selector explorer
- [ ] conditional classes editor as PRO feat.
- [ ] video background motto container
- [ ] Video Block w/ custom player and stuff
- [ ] font size multiplyer - styler
- [ ] make styler list lower (:where) or higher(:root body?) specifity, maybe a togglegroup
- [ ] style gallery - ie: outlined button, big button, box-shadow etc - saved as json and produce ctp classes
- [x] motto/container constrained toggle worked in editor but never clamped on frontend — save() reorder + deprecated entry (SDD-021 v0.5). Already-published containers need a manual re-save to pick up the fix.
- [x] frontend Styler CSS cache never invalidated when a wp_template (not just wp_template_part) was edited — added templateIds dependency tracking (styler-frontend-render.php).

## Motto Agents (SDD-006)

New sibling plugin `motto-agents`:

- [ ] Scaffold plugin repo (WP plugin + Vite, mirrors motto-dynamics structure)
- [ ] PHP REST proxy `/wp-json/motto-agents/v1/generate` (API key never in browser)
- [ ] WP admin settings: AI provider, API key, model
- [ ] Pattern catalog (Phase A): CTA, Hero, 2-col, 3-col, FAQ, Contact section
- [ ] Gutenberg panel UI: prompt → summary → confirm → insert
- [ ] Block tree insertion via `wp.blocks.createBlock()` (never raw HTML)
- [ ] JS-side validator: reject unknown block names before insertion

- [ ] (low priority) RuleValuePopup (rule-row value popup): split the close button into Cancel/Confirm — Cancel reverts the row value to a snapshot taken on open (discard in-session edits), Confirm keeps current close behavior. Value is committed per-keystroke today (no draft state), so this needs an open-edge snapshot in StylerRuleRow guarded against onOpenChange re-firing on every parent render. Open questions before implementing: whether implicit closes (Escape/outside click/switching rows) should act like Cancel or Confirm, and whether this needs its own spec entry (relates to the two-commit-model tension noted in SDD-020).
