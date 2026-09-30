import { __ } from "@wordpress/i18n";
import { useCallback, useEffect, useMemo, useState } from "@wordpress/element";
import { PRESETS } from "../data/motto-css-presets";
import { useLucideIconMap } from "../utils/icon-utils";
import { normalizeBlockSelectorsByBreakpoint } from "../utils/block-selectors-shape";
import {
	groupPresets,
	mergeCssRows,
	mergeInnerSelectorRows,
	normalizeByBreakpoint,
	remapCollidingSelectorIds,
} from "../utils/css-row-list-helpers";

export const OPEN_PRESETS_EVENT = "motto-styler/open-style-presets";

// Style-preset picker state + apply logic for a StylerCssList. Extracted out of
// StylerCssList.jsx — applyPresetBySlug still needs most of the list's own
// cross-breakpoint state, since a preset can touch both the CSS rows and the
// block selectors of every breakpoint at once.
export const useCssListPresetPicker = ({
	popupScope,
	breakpointKey,
	rowsRef,
	persistRows,
	hasExistingContent,
	canApplyPresetAcrossBreakpoints,
	controlledRowsByBreakpoint,
	onCssByBreakpointChange,
	canApplyPresetSelectorsAcrossBreakpoints,
	controlledSelectorsByBreakpoint,
	onBlockSelectorsByBreakpointChange,
}) => {
	const [showPresetPicker, setShowPresetPicker] = useState(false);
	const [activePresetTab, setActivePresetTab] = useState("");

	const presetGroups = useMemo(() => groupPresets(PRESETS), []);
	const visiblePresetIconNames = useMemo(() => {
		if (!showPresetPicker) return [];
		const activeGroup =
			presetGroups.find((group) => group.key === activePresetTab) || presetGroups[0];
		if (!activeGroup) return [];
		return activeGroup.items
			.map((preset) => (typeof preset?.icon === "string" ? preset.icon : ""))
			.filter(Boolean);
	}, [activePresetTab, presetGroups, showPresetPicker]);
	const presetIconMap = useLucideIconMap(visiblePresetIconNames);

	useEffect(() => {
		if (!showPresetPicker) return;
		if (activePresetTab) return;
		if (!presetGroups[0]?.key) return;
		setActivePresetTab(presetGroups[0].key);
	}, [activePresetTab, presetGroups, showPresetPicker]);

	useEffect(() => {
		if (typeof window === "undefined" || !window.addEventListener) return;
		const scopeKey = String(popupScope || "").trim();
		const handler = (event) => {
			if (PRESETS.length === 0) return;
			const requestedScope = String(event?.detail?.popupScope || "").trim();
			if (scopeKey && requestedScope && scopeKey !== requestedScope) return;
			if (!scopeKey && requestedScope) return;
			setShowPresetPicker(true);
		};
		window.addEventListener(OPEN_PRESETS_EVENT, handler);
		return () => window.removeEventListener(OPEN_PRESETS_EVENT, handler);
	}, [popupScope]);

	const applyPresetBySlug = useCallback(
		(slug) => {
			const preset = PRESETS.find((entry) => entry.slug === slug);
			const presetStyler = preset?.mottoStyler;
			if (!presetStyler || typeof presetStyler !== "object") return;

			if (hasExistingContent) {
				const ok = window.confirm(
					__("This will merge a preset into existing rules. Continue?", "motto-blocks")
				);
				if (!ok) return;
			}

			const presetCss = presetStyler.css;
			const presetBlockSelectors = presetStyler.blockSelectors;

			if (presetCss && typeof presetCss === "object") {
				if (canApplyPresetAcrossBreakpoints) {
					const nextCss = normalizeByBreakpoint(controlledRowsByBreakpoint);
					Object.keys(presetCss).forEach((bp) => {
						if (!Array.isArray(presetCss[bp])) return;
						nextCss[bp] = mergeCssRows(nextCss[bp], presetCss[bp]);
					});
					rowsRef.current = Array.isArray(nextCss[breakpointKey])
						? nextCss[breakpointKey]
						: [];
					onCssByBreakpointChange(nextCss);
				} else {
					persistRows(
						mergeCssRows(rowsRef.current || [], presetCss[breakpointKey] || [])
					);
				}
			}

			if (
				Array.isArray(presetBlockSelectors) &&
				presetBlockSelectors.length > 0 &&
				canApplyPresetSelectorsAcrossBreakpoints
			) {
				const nextBlockSelectors = normalizeBlockSelectorsByBreakpoint(
					controlledSelectorsByBreakpoint
				);
				const normalizedPresetSelectors = remapCollidingSelectorIds(
					nextBlockSelectors,
					normalizeBlockSelectorsByBreakpoint(presetBlockSelectors)
				);
				Object.keys(normalizedPresetSelectors).forEach((bp) => {
					if (!Array.isArray(normalizedPresetSelectors[bp])) return;
					nextBlockSelectors[bp] = mergeInnerSelectorRows(
						nextBlockSelectors[bp],
						normalizedPresetSelectors[bp]
					);
				});
				onBlockSelectorsByBreakpointChange(nextBlockSelectors);
			}
			setShowPresetPicker(false);
			setActivePresetTab("");
		},
		[
			breakpointKey,
			canApplyPresetAcrossBreakpoints,
			canApplyPresetSelectorsAcrossBreakpoints,
			controlledRowsByBreakpoint,
			controlledSelectorsByBreakpoint,
			hasExistingContent,
			onBlockSelectorsByBreakpointChange,
			onCssByBreakpointChange,
			persistRows,
			rowsRef,
		]
	);

	return {
		showPresetPicker,
		setShowPresetPicker,
		activePresetTab,
		setActivePresetTab,
		presetGroups,
		presetIconMap,
		applyPresetBySlug,
	};
};
