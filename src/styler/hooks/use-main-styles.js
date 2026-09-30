import { useCallback, useMemo } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { Save } from "lucide-react";
import { hydrateMottoDefaultsToStyler } from "../runtime/hydrate-motto-defaults";
import { emptyBlockSelectorsByBreakpoint } from "../utils/block-selectors-shape";
import { hasAnyMottoContent } from "../utils/motto-content";
import { generateInstanceId, resolveValidInstanceId } from "../utils/instance-id";

const emptyBps = () => emptyBlockSelectorsByBreakpoint();

export const useMainStyles = ({
	mottoStyler,
	updateMottoStyler,
	mode,
	hasMainMottoDefaults,
	hasInnerSelectorDefaults,
	normalizedMottoDefaults,
	onSaveAsClass,
}) => {
	const hasBlockProps = useMemo(() => hasAnyMottoContent(mottoStyler), [mottoStyler]);

	const cssRows = useMemo(
		() => (Array.isArray(mottoStyler?.css?.[mode]) ? mottoStyler.css[mode] : []),
		[mottoStyler?.css, mode]
	);

	const extraControls = useMemo(() => {
		if (!hasBlockProps) return null;
		return [
			{
				title: __("Save as a global class", "motto-blocks"),
				icon: Save,
				onClick: onSaveAsClass,
			},
		];
	}, [hasBlockProps, onSaveAsClass]);

	const handleRowsChange = useCallback(
		(nextRows) => {
			updateMottoStyler((current) => ({
				css: { ...(current?.css || {}), [mode]: Array.isArray(nextRows) ? nextRows : [] },
			}));
		},
		[mode, updateMottoStyler]
	);

	const handleCssByBreakpointChange = useCallback(
		(nextCss) => {
			updateMottoStyler({ css: nextCss && typeof nextCss === "object" ? nextCss : {} });
		},
		[updateMottoStyler]
	);

	const handleResetToDefaults = useCallback(() => {
		if (!hasMainMottoDefaults) return;
		const ok = window.confirm(
			__("This will reset Motto Styler defaults for this block. Continue?", "motto-blocks")
		);
		if (!ok) return;
		const nextInstanceId =
			resolveValidInstanceId(mottoStyler?.instanceId) || generateInstanceId();
		const hydratedDefaults = hydrateMottoDefaultsToStyler(normalizedMottoDefaults);
		updateMottoStyler({
			cssClasses: Array.isArray(mottoStyler?.cssClasses) ? mottoStyler.cssClasses : [],
			css: hydratedDefaults.css || emptyBps(),
			html: hydratedDefaults.html || { attributes: [] },
			ui: hydratedDefaults.ui || { spacing: { controls: {} } },
			instanceId: nextInstanceId,
		});
	}, [hasMainMottoDefaults, mottoStyler, normalizedMottoDefaults, updateMottoStyler]);

	const handleResetSelectorsToDefaults = useCallback(() => {
		if (!hasInnerSelectorDefaults) return;
		const ok = window.confirm(
			__("This will reset selector defaults for this block. Continue?", "motto-blocks")
		);
		if (!ok) return;
		const nextInstanceId =
			resolveValidInstanceId(mottoStyler?.instanceId) || generateInstanceId();
		const hydratedDefaults = hydrateMottoDefaultsToStyler(normalizedMottoDefaults);
		updateMottoStyler({
			blockSelectors: hydratedDefaults.blockSelectors || emptyBps(),
			instanceId: nextInstanceId,
		});
	}, [hasInnerSelectorDefaults, mottoStyler, normalizedMottoDefaults, updateMottoStyler]);

	return {
		cssRows,
		extraControls,
		handleCssByBreakpointChange,
		handleResetSelectorsToDefaults,
		handleResetToDefaults,
		handleRowsChange,
	};
};
