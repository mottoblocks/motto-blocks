export const GAP_LAYOUT_DISPLAY_VALUES = new Set(["grid", "inline-grid", "flex", "inline-flex"]);
export const BLOCK_LAYOUT_DISPLAY_VALUES = new Set(["block", "inline-block", "inline"]);

export const normalizeCssDisplayValue = (value) => {
	const normalized = String(value || "")
		.trim()
		.toLowerCase()
		.replace(/\s*!important\s*$/, "")
		.replace(/\s+/g, " ");
	if (normalized === "inline flex") return "inline-flex";
	if (normalized === "inline grid") return "inline-grid";
	if (normalized === "inline block") return "inline-block";
	return normalized;
};

export const getLayoutFlagsForDisplay = (displayValue) => ({
	isGapLayout: GAP_LAYOUT_DISPLAY_VALUES.has(displayValue),
	isBlockLayout: BLOCK_LAYOUT_DISPLAY_VALUES.has(displayValue),
});
