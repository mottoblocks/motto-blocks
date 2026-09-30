import { addFilter } from "@wordpress/hooks";
import { BlockControls, InspectorControls } from "@wordpress/block-editor";
import { ToolbarButton, ToolbarDropdownMenu, ToolbarGroup } from "@wordpress/components";
import { useDispatch, useSelect } from "@wordpress/data";
import { RawHTML, useCallback, useEffect, useMemo, useState } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { Clipboard, SwatchBook } from "lucide-react";
import { isStylerCoreMvpBlock } from "./supported-blocks";
import { isStandaloneStylerActive } from "./runtime-flags";
import { StylerPanel } from "../components/StylerPanel.jsx";
import {
	createClipboardPayload,
	readClipboard,
	readClipboardLocal,
	writeClipboard,
} from "../utils/clipboard";
import { defaultMottoStyler, normalizeMottoDefaultsValue } from "../data/default-motto-styler";
import {
	normalizeBlockSelectorsByBreakpoint,
	normalizeBlockSelectorsSelectorList,
	withPersistedBlockSelectors,
	withRuntimeBlockSelectors,
} from "../utils/block-selectors-shape";
import { persistStylerAttributes, resolveRawStylerAttributes } from "./styler-attributes";
import { hasAnyMottoContent, hasBlockSelectorsByBreakpointContent } from "../utils/motto-content";
import {
	cssRowsOverlap,
	innerSelectorRowsOverlap,
	mergeCssRows,
	mergeInnerSelectorRows,
	remapCollidingSelectorIds,
} from "../utils/css-row-list-helpers";
import { getAutoApplyDefaultsPayload } from "./styler-defaults-auto-apply";
import { generateInstanceId, hasValidInstanceId } from "../utils/instance-id";
import mottoBlocksIsoRaw from "../../../assets/images/branding/mottoblocks-toolbar-icon.svg?raw";

const withSize = (svgMarkup, size = 18) => {
	const source = String(svgMarkup || "").trim();
	if (!source) return "";
	const nextSize = Number.isFinite(Number(size)) ? Number(size) : 18;
	return source.replace(
		/<svg\b([^>]*)>/i,
		`<svg$1 width="${nextSize}" height="${nextSize}" aria-hidden="true" focusable="false">`
	);
};

const mottoLogo = <RawHTML>{withSize(mottoBlocksIsoRaw, 18)}</RawHTML>;

const hasClasses = (mp) => {
	if (!mp || typeof mp !== "object") return false;
	return Array.isArray(mp.cssClasses) && mp.cssClasses.length > 0;
};

const hasMainStyles = (mp) => {
	if (!mp || typeof mp !== "object") return false;
	const css = mp.css || {};
	const html = mp.html || {};
	const blockSelectors = mp.blockSelectors || mp.innerSelectors || {};
	const cssHas = Object.values(css).some((list) => Array.isArray(list) && list.length > 0);
	const htmlHas = Array.isArray(html.attributes) && html.attributes.length > 0;
	const blockSelectorsHas = hasBlockSelectorsByBreakpointContent(blockSelectors);
	return cssHas || htmlHas || blockSelectorsHas;
};

const normalizeClassEntry = (item) => {
	if (!item) return null;
	if (typeof item === "string") {
		const slug = item.trim().replace(/^\./, "");
		return slug ? { slug } : null;
	}
	if (typeof item === "object") {
		const id = Number(item.id || 0);
		const slug = typeof item.slug === "string" ? item.slug.trim().replace(/^\./, "") : "";
		if (id > 0) return { id, slug };
		if (slug) return { slug };
	}
	return null;
};

const mergeClasses = (base, incoming) => {
	const next = Array.isArray(base) ? [...base] : [];
	const seen = new Set();
	next.forEach((item) => {
		const norm = normalizeClassEntry(item);
		if (!norm) return;
		const key = norm.id ? `id:${norm.id}` : `slug:${norm.slug}`;
		if (key) seen.add(key);
	});
	(incoming || []).forEach((item) => {
		const norm = normalizeClassEntry(item);
		if (!norm) return;
		const key = norm.id ? `id:${norm.id}` : `slug:${norm.slug}`;
		if (!key || seen.has(key)) return;
		seen.add(key);
		next.push(norm.id ? { id: norm.id, slug: norm.slug } : norm.slug);
	});
	return next;
};

const isStylerExcludedContext = ({ standalone, blockName, postType }) =>
	standalone || blockName === "core/block" || postType === "motto_css_class";

const canRenderStylerUi = ({ excluded, supported, hasExistingStylerContent }) =>
	!excluded && (supported || hasExistingStylerContent);

const resolveBlockTypeMottoDefaults = (select, blockName) => {
	const blockType = select("core/blocks")?.getBlockType?.(blockName);
	if (blockType?.mottoDefaults && typeof blockType.mottoDefaults === "object") {
		return blockType.mottoDefaults;
	}
	const fromAttribute = blockType?.attributes?.mottoDefaults?.default;
	return fromAttribute && typeof fromAttribute === "object" ? fromAttribute : {};
};

const useBlockStylerBootstrap = ({
	excluded,
	supported,
	mottoStyler,
	hasExistingStylerContent,
	normalizedMottoDefaults,
	persistMottoStyler,
}) => {
	useEffect(() => {
		if (excluded || !supported) {
			return;
		}
		const autoApplyPayload = getAutoApplyDefaultsPayload(mottoStyler, normalizedMottoDefaults);
		if (!autoApplyPayload) return;
		persistMottoStyler(autoApplyPayload);
	}, [excluded, mottoStyler, normalizedMottoDefaults, persistMottoStyler, supported]);

	useEffect(() => {
		if (excluded) {
			return;
		}
		if (!supported && !hasExistingStylerContent) {
			return;
		}
		if (!hasExistingStylerContent) {
			return;
		}

		if (hasValidInstanceId(mottoStyler)) {
			return;
		}

		persistMottoStyler({
			...mottoStyler,
			instanceId: generateInstanceId(),
		});
	}, [excluded, hasExistingStylerContent, mottoStyler, persistMottoStyler, supported]);
};

addFilter("editor.BlockEdit", "motto-blocks/styler-core-panel", (BlockEdit) => {
	return (props) => {
		const blockName = props?.name || "";
		const { postType, blockTypeMottoDefaults } = useSelect(
			(select) => ({
				postType: select("core/editor")?.getCurrentPostType?.(),
				blockTypeMottoDefaults: resolveBlockTypeMottoDefaults(select, blockName),
			}),
			[blockName]
		);
		const { createSuccessNotice, createWarningNotice } = useDispatch("core/notices");
		const { attributes, setAttributes, clientId } = props;
		const supported = isStylerCoreMvpBlock(blockName);
		const standalone = isStandaloneStylerActive();
		const excluded = isStylerExcludedContext({ standalone, blockName, postType });
		const mottoStyler = withRuntimeBlockSelectors(
			resolveRawStylerAttributes(attributes) || defaultMottoStyler
		);
		const hasExistingStylerContent = hasAnyMottoContent(mottoStyler);
		const normalizedMottoDefaults = useMemo(() => {
			const fromAttributes = normalizeMottoDefaultsValue(attributes?.mottoDefaults || {});
			if (hasAnyMottoContent(fromAttributes)) return fromAttributes;
			return normalizeMottoDefaultsValue(blockTypeMottoDefaults || {});
		}, [attributes?.mottoDefaults, blockTypeMottoDefaults]);
		const persistMottoStyler = useCallback(
			(nextMottoStyler) => {
				persistStylerAttributes(
					setAttributes,
					withPersistedBlockSelectors(nextMottoStyler)
				);
			},
			[setAttributes]
		);
		const shouldRenderStylerUi = canRenderStylerUi({
			excluded,
			supported,
			hasExistingStylerContent,
		});

		useBlockStylerBootstrap({
			excluded,
			supported,
			mottoStyler,
			hasExistingStylerContent,
			normalizedMottoDefaults,
			persistMottoStyler,
		});

		const [clipState, setClipState] = useState(null);
		useEffect(() => {
			const refresh = () => setClipState(readClipboardLocal());
			refresh();
			window.addEventListener("focus", refresh);
			return () => window.removeEventListener("focus", refresh);
		}, []);

		if (!shouldRenderStylerUi) {
			return <BlockEdit {...props} />;
		}

		const canCopyMainStyles = hasMainStyles(mottoStyler);
		const canCopyClasses = hasClasses(mottoStyler);
		const canPasteMainStyles = Boolean(
			clipState &&
			(clipState.type === "main-styles" ||
				clipState.type === "main-rules" ||
				clipState.type === "styles")
		);
		const canPasteClasses = Boolean(clipState && clipState.type === "classes");

		const copyMainStyles = async () => {
			const payload = createClipboardPayload("main-styles", {
				css: mottoStyler.css || {},
				blockSelectors: normalizeBlockSelectorsSelectorList(
					mottoStyler.blockSelectors ?? mottoStyler.innerSelectors
				),
				html: mottoStyler.html || {},
			});
			await writeClipboard(payload);
			setClipState(payload);
			createSuccessNotice(__("All styles copied.", "motto-blocks"), { type: "snackbar" });
		};

		const pasteMainStyles = async () => {
			const clip = await readClipboard();
			setClipState(clip);
			if (
				!clip ||
				(clip.type !== "main-styles" &&
					clip.type !== "main-rules" &&
					clip.type !== "styles")
			) {
				createWarningNotice(__("No all styles data in clipboard.", "motto-blocks"), {
					type: "snackbar",
				});
				return;
			}
			const data = clip.data && typeof clip.data === "object" ? clip.data : {};

			const incomingCss = data.css && typeof data.css === "object" ? data.css : {};
			const currentCss = mottoStyler.css || {};
			const cssOverlaps = Object.keys(incomingCss).some(
				(bp) =>
					Array.isArray(incomingCss[bp]) &&
					cssRowsOverlap(currentCss[bp], incomingCss[bp])
			);

			const currentSelectorsByBreakpoint = normalizeBlockSelectorsByBreakpoint(
				mottoStyler.blockSelectors ?? mottoStyler.innerSelectors
			);
			const incomingSelectorsByBreakpoint = normalizeBlockSelectorsByBreakpoint(
				data.blockSelectors
			);
			const selectorsOverlap = Object.keys(incomingSelectorsByBreakpoint).some((bp) =>
				innerSelectorRowsOverlap(
					currentSelectorsByBreakpoint[bp],
					incomingSelectorsByBreakpoint[bp]
				)
			);

			const htmlOverlaps = cssRowsOverlap(
				mottoStyler.html?.attributes || [],
				data.html?.attributes || []
			);

			if (cssOverlaps || selectorsOverlap || htmlOverlaps) {
				const ok = window.confirm(
					__(
						"This block already has all styles. Merge with clipboard styles?",
						"motto-blocks"
					)
				);
				if (!ok) return;
			}

			const nextCss = { ...currentCss };
			Object.keys(incomingCss).forEach((bp) => {
				if (!Array.isArray(incomingCss[bp])) return;
				nextCss[bp] = mergeCssRows(nextCss[bp] || [], incomingCss[bp]);
			});

			const nextSelectorsByBreakpoint = { ...currentSelectorsByBreakpoint };
			const remappedIncomingSelectors = remapCollidingSelectorIds(
				currentSelectorsByBreakpoint,
				incomingSelectorsByBreakpoint
			);
			Object.keys(remappedIncomingSelectors).forEach((bp) => {
				nextSelectorsByBreakpoint[bp] = mergeInnerSelectorRows(
					currentSelectorsByBreakpoint[bp],
					remappedIncomingSelectors[bp]
				);
			});

			const nextHtmlAttributes = mergeCssRows(
				mottoStyler.html?.attributes || [],
				data.html?.attributes || []
			);

			persistMottoStyler({
				...mottoStyler,
				css: nextCss,
				blockSelectors: nextSelectorsByBreakpoint,
				html: { attributes: nextHtmlAttributes },
			});
			createSuccessNotice(__("All styles pasted.", "motto-blocks"), { type: "snackbar" });
		};

		const copyClasses = async () => {
			const payload = createClipboardPayload("classes", {
				cssClasses: mottoStyler.cssClasses || [],
			});
			await writeClipboard(payload);
			setClipState(payload);
			createSuccessNotice(__("Classes copied.", "motto-blocks"), { type: "snackbar" });
		};

		const pasteClasses = async () => {
			const clip = await readClipboard();
			setClipState(clip);
			if (!clip || clip.type !== "classes") {
				createWarningNotice(__("No classes in clipboard.", "motto-blocks"), {
					type: "snackbar",
				});
				return;
			}
			const current = Array.isArray(mottoStyler.cssClasses) ? mottoStyler.cssClasses : [];
			const merged = mergeClasses(current, clip.data?.cssClasses || []);
			persistMottoStyler({
				...mottoStyler,
				cssClasses: merged,
			});
			createSuccessNotice(__("Classes pasted.", "motto-blocks"), { type: "snackbar" });
		};

		return (
			<>
				<BlockControls group="block">
					<ToolbarGroup className="motto-toolbar-group">
						<span
							className="motto-toolbar-logo"
							title={__("Motto Styler", "motto-blocks")}
						>
							{mottoLogo}
						</span>
						<ToolbarDropdownMenu
							label={__("Styles clipboard", "motto-blocks")}
							icon={<Clipboard aria-hidden="true" />}
							toggleProps={{ iconSize: 20 }}
							controls={[
								{
									title: __("Copy all styles", "motto-blocks"),
									onClick: copyMainStyles,
									isDisabled: !canCopyMainStyles,
								},
								{
									title: __("Paste all styles", "motto-blocks"),
									onClick: pasteMainStyles,
									isDisabled: !canPasteMainStyles,
								},
								{
									title: __("Copy classes", "motto-blocks"),
									onClick: copyClasses,
									isDisabled: !canCopyClasses,
								},
								{
									title: __("Paste classes", "motto-blocks"),
									onClick: pasteClasses,
									isDisabled: !canPasteClasses,
								},
							]}
						/>
						<ToolbarButton
							icon={<SwatchBook aria-hidden="true" />}
							iconSize={20}
							label={__("Style presets", "motto-blocks")}
							onClick={() => {
								const popupScope = `block:${String(clientId || "unknown")}:main`;
								window.dispatchEvent(
									new CustomEvent("motto-styler/open-style-presets", {
										detail: { popupScope },
									})
								);
							}}
						/>
					</ToolbarGroup>
				</BlockControls>
				<BlockEdit {...props} />
				<InspectorControls>
					<StylerPanel
						blockName={props?.name}
						clientId={clientId}
						attributes={attributes}
						setAttributes={setAttributes}
					/>
				</InspectorControls>
			</>
		);
	};
});
