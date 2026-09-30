import { __ } from "@wordpress/i18n";
import { applyFilters } from "@wordpress/hooks";

import { ProFeatureCta } from "@components";
import { STYLER_FEATURE_IDS, STYLER_HOOKS } from "../freepro/freepro-ids";

export function BlockSpacingSection({
	isHidden = false,
	mode,
	blockSpacing,
	cssByBreakpoint,
	classMottoStylers,
	baseLayout,
	onChange,
}) {
	if (isHidden) return null;

	const content = applyFilters(STYLER_HOOKS.blockSpacingSection, null, {
		mode,
		blockSpacing,
		cssByBreakpoint,
		classMottoStylers,
		baseLayout,
		onChange,
	}) ?? (
		<ProFeatureCta
			featureId={STYLER_FEATURE_IDS.blockSpacing}
			title={__("Block Spacing", "motto-blocks")}
			description={__("Unlock custom spacing controls in Motto Blocks Pro.", "motto-blocks")}
			buttonLabel={__("Get Pro", "motto-blocks")}
		/>
	);

	return <div className="motto-panel-section">{content}</div>;
}
