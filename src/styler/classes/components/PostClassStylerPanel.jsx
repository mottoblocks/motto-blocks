import { useCallback, useEffect, useMemo, useRef } from "@wordpress/element";
import { useDispatch, useSelect } from "@wordpress/data";
import { PluginDocumentSettingPanel } from "@wordpress/editor";
import { __ } from "@wordpress/i18n";
import { applyFilters } from "@wordpress/hooks";
import { PlainTextField, DeviceToggleControl, ProFeatureCta } from "@components";
import { STYLER_FEATURE_IDS, STYLER_HOOKS } from "../../freepro/freepro-ids";
import { STORE_KEY } from "../../runtime/preview-store";
import { createCssClassSlugGuards } from "../../utils/input-guards";
import { hasNonEmptyCssRows, normalizeMottoStylerWithClasses } from "../../utils/motto-content";
import { withPersistedBlockSelectors } from "../../utils/block-selectors-shape";
import { BREAKPOINT_KEYS } from "../../config/styler-breakpoints.js";
import { isCssClassSlugCompatible, sanitizeCssClassSlugInput } from "../css-class-slug";
import { CLASS_META_STYLER_KEY, resolveClassMetaStyler } from "../class-meta";
import { StylerCssList } from "../../components/StylerCssList";
import { BlockSelectorsList } from "../../components/BlockSelectorsList";

export function PostClassStylerPanel() {
	const Panel = PluginDocumentSettingPanel || window?.wp?.editPost?.PluginDocumentSettingPanel;
	const postType = useSelect((select) => select("core/editor")?.getCurrentPostType?.(), []);
	const meta = useSelect(
		(select) => select("core/editor")?.getEditedPostAttribute?.("meta") || {},
		[]
	);
	const slug = useSelect(
		(select) => select("core/editor")?.getEditedPostAttribute?.("slug") || "",
		[]
	);
	const mode = useSelect((select) => select(STORE_KEY)?.getMode?.() || "desktop", []);
	const { editPost } = useDispatch("core/editor");
	const { setMode } = useDispatch(STORE_KEY);

	const mottoStyler = normalizeMottoStylerWithClasses(resolveClassMetaStyler(meta) || {});
	const shouldWarnForBlockSpacingConflicts = mottoStyler?.blockSpacing?.enabled === true;
	const mottoStylerRef = useRef(mottoStyler);
	const didAutoSelectModeRef = useRef(false);

	useEffect(() => {
		mottoStylerRef.current = mottoStyler;
	}, [mottoStyler]);

	useEffect(() => {
		if (didAutoSelectModeRef.current || postType !== "motto_css_class") return;
		didAutoSelectModeRef.current = true;
		const firstNonEmptyBreakpoint = BREAKPOINT_KEYS.find((breakpoint) =>
			hasNonEmptyCssRows(mottoStyler?.css?.[breakpoint])
		);
		if (firstNonEmptyBreakpoint) {
			setMode(firstNonEmptyBreakpoint, "motto");
		}
	}, [mottoStyler, postType, setMode]);

	const updateMottoStyler = useCallback(
		(nextPartial) => {
			const current = mottoStylerRef.current;
			const partial = typeof nextPartial === "function" ? nextPartial(current) : nextPartial;
			if (!partial || typeof partial !== "object") return;
			const next = {
				...current,
				...partial,
			};
			mottoStylerRef.current = next;
			editPost({
				meta: {
					...meta,
					[CLASS_META_STYLER_KEY]: withPersistedBlockSelectors(next),
				},
			});
		},
		[editPost, meta]
	);

	const updateSlug = useCallback(
		(nextValue) => {
			editPost({ slug: sanitizeCssClassSlugInput(nextValue) });
		},
		[editPost]
	);

	const slugInputGuards = useMemo(
		() =>
			createCssClassSlugGuards({
				getValue: () => slug,
				setValue: (nextValue) => updateSlug(nextValue),
			}),
		[slug, updateSlug]
	);
	const mainPopupScope = useMemo(() => `post-class:${String(slug || "draft")}:main`, [slug]);
	const selectorPopupScope = useMemo(
		() => `post-class:${String(slug || "draft")}:selectors`,
		[slug]
	);
	const handleCssByBreakpointChange = useCallback(
		(nextCss) => {
			updateMottoStyler({
				css: nextCss && typeof nextCss === "object" ? nextCss : {},
			});
		},
		[updateMottoStyler]
	);

	if (!Panel || postType !== "motto_css_class") return null;

	return (
		<Panel
			name="motto-blocks-post-class-styler"
			title={__("Motto Styler", "motto-blocks")}
			className="motto-panel-body"
		>
			<DeviceToggleControl variant="extended" storeKey={STORE_KEY} />

			<div className="motto-panel-section">
				<div className="motto-section-heading">
					<div className="motto-section-title">
						<h2 className="motto-section-title-text">{__("Slug", "motto-blocks")}</h2>
					</div>
				</div>
				<PlainTextField
					className="motto-class-input"
					value={slug}
					aria-label={__("Class slug", "motto-blocks")}
					onChange={(next) => updateSlug(next)}
					onKeyDown={slugInputGuards.onKeyDown}
					onPaste={slugInputGuards.onPaste}
					placeholder={__("class-slug", "motto-blocks")}
					autoComplete="off"
				/>
				{!isCssClassSlugCompatible(slug) ? (
					<p className="motto-section-help">
						{__("Use only letters, numbers, _ and - (without dot).", "motto-blocks")}
					</p>
				) : null}
			</div>

			<div className="motto-panel-section">
				<StylerCssList
					mode={mode}
					rows={Array.isArray(mottoStyler?.css?.[mode]) ? mottoStyler.css[mode] : []}
					onRowsChange={(nextRows) =>
						updateMottoStyler((current) => ({
							css: {
								...(current?.css || {}),
								[mode]: Array.isArray(nextRows) ? nextRows : [],
							},
						}))
					}
					cssByBreakpoint={mottoStyler?.css}
					onCssByBreakpointChange={handleCssByBreakpointChange}
					popupScope={mainPopupScope}
					blockSpacingEnabled={shouldWarnForBlockSpacingConflicts}
				/>
			</div>

			<div className="motto-panel-section">
				<BlockSelectorsList
					mode={mode}
					mottoStyler={mottoStyler}
					updateMottoStyler={updateMottoStyler}
					title={__("Block selectors", "motto-blocks")}
					popupScope={selectorPopupScope}
				/>
			</div>

			<div className="motto-panel-section">
				{applyFilters(STYLER_HOOKS.blockSpacingSection, null, {
					mode,
					blockSpacing: mottoStyler?.blockSpacing,
					cssByBreakpoint: mottoStyler?.css,
					onChange: (nextBlockSpacing) => {
						updateMottoStyler((current) => ({
							blockSpacing:
								typeof nextBlockSpacing === "function"
									? nextBlockSpacing(current?.blockSpacing || {})
									: nextBlockSpacing,
						}));
					},
				}) ?? (
					<ProFeatureCta
						featureId={STYLER_FEATURE_IDS.blockSpacing}
						title={__("Block Spacing", "motto-blocks")}
						description={__(
							"Unlock custom spacing controls in MottoBlocks Pro.",
							"motto-blocks"
						)}
						buttonLabel={__("Get Pro", "motto-blocks")}
					/>
				)}
			</div>
		</Panel>
	);
}
