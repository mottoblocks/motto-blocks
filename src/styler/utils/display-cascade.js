import { normalizeCssDisplayValue } from "../layout/display";
import { getMottoBaseLayoutDisplay } from "../layout/base-layout";

// SSOT for "what display value is actually in effect at breakpoint X", shared by the
// CSS render engine (runtime/style-engine.jsx) and the Styler UI's "requires" warning
// check (rule-warnings.js via StylerCssList.jsx). Breakpoints are desktop-first
// (config/motto-breakpoints.json): `desktop` ships unwrapped and narrower breakpoints
// only win via `max-width` overrides for the props they redeclare, so a `display`
// declared on a wider breakpoint carries down to narrower ones that don't redeclare it.
export const getEffectiveDisplayValue = (rows) => {
	if (!Array.isArray(rows) || rows.length === 0) return "";
	let resolved = "";
	rows.forEach((row) => {
		const name = typeof row?.name === "string" ? row.name.trim().toLowerCase() : "";
		if (name !== "display") return;
		const value = normalizeCssDisplayValue(row?.value);
		if (value) resolved = value;
	});
	return resolved;
};

export const buildDisplayLayerByBp = (cssMap, orderedBreakpoints) => {
	const declaredByBp = {};
	const resolvedByBp = {};
	let carry = "";
	orderedBreakpoints.forEach((bp) => {
		const rows = Array.isArray(cssMap?.[bp]) ? cssMap[bp] : [];
		const declared = getEffectiveDisplayValue(rows);
		declaredByBp[bp] = declared;
		if (declared) carry = declared;
		resolvedByBp[bp] = carry;
	});
	return { declaredByBp, resolvedByBp };
};

export const buildClassDisplayLayerByBp = (classMottoStylers, orderedBreakpoints) => {
	if (!Array.isArray(classMottoStylers) || classMottoStylers.length === 0) {
		return { declaredByBp: {}, resolvedByBp: {} };
	}
	const mergedCssMap = {};
	orderedBreakpoints.forEach((bp) => {
		const rows = [];
		classMottoStylers.forEach((cls) => {
			const clsRows = Array.isArray(cls?.css?.[bp]) ? cls.css[bp] : [];
			rows.push(...clsRows);
		});
		mergedCssMap[bp] = rows;
	});
	return buildDisplayLayerByBp(mergedCssMap, orderedBreakpoints);
};

// Same precedence as buildEditorCssForSelector: the instance's own cascade wins, then
// attached reusable classes' cascade, then the block's structural base layout default.
export const resolveEffectiveDisplay = ({
	instanceCssByBreakpoint,
	classMottoStylers = [],
	baseLayout = "",
	orderedBreakpoints,
	breakpoint,
}) => {
	const instanceLayer = buildDisplayLayerByBp(instanceCssByBreakpoint, orderedBreakpoints);
	const classLayer = buildClassDisplayLayerByBp(classMottoStylers, orderedBreakpoints);
	const baseDisplay = getMottoBaseLayoutDisplay(baseLayout);
	return (
		instanceLayer.resolvedByBp?.[breakpoint] ||
		classLayer.resolvedByBp?.[breakpoint] ||
		baseDisplay ||
		""
	);
};

const FLEX_DIRECTION_VALUES = new Set(["row", "row-reverse", "column", "column-reverse"]);

const normalizeCssFlexDirectionValue = (value) => {
	const normalized = String(value || "")
		.trim()
		.toLowerCase();
	return FLEX_DIRECTION_VALUES.has(normalized) ? normalized : "";
};

const getEffectiveFlexDirectionValue = (rows) => {
	if (!Array.isArray(rows) || rows.length === 0) return "";
	let resolved = "";
	rows.forEach((row) => {
		const name = typeof row?.name === "string" ? row.name.trim().toLowerCase() : "";
		if (name !== "flex-direction") return;
		const value = normalizeCssFlexDirectionValue(row?.value);
		if (value) resolved = value;
	});
	return resolved;
};

const buildFlexDirectionLayerByBp = (cssMap, orderedBreakpoints) => {
	const resolvedByBp = {};
	let carry = "";
	orderedBreakpoints.forEach((bp) => {
		const rows = Array.isArray(cssMap?.[bp]) ? cssMap[bp] : [];
		const declared = getEffectiveFlexDirectionValue(rows);
		if (declared) carry = declared;
		resolvedByBp[bp] = carry;
	});
	return { resolvedByBp };
};

const buildClassFlexDirectionLayerByBp = (classMottoStylers, orderedBreakpoints) => {
	if (!Array.isArray(classMottoStylers) || classMottoStylers.length === 0) {
		return { resolvedByBp: {} };
	}
	const mergedCssMap = {};
	orderedBreakpoints.forEach((bp) => {
		const rows = [];
		classMottoStylers.forEach((cls) => {
			const clsRows = Array.isArray(cls?.css?.[bp]) ? cls.css[bp] : [];
			rows.push(...clsRows);
		});
		mergedCssMap[bp] = rows;
	});
	return buildFlexDirectionLayerByBp(mergedCssMap, orderedBreakpoints);
};

// Same cascade precedence as resolveEffectiveDisplay, but for `flex-direction`.
// Falls back to "row", the CSS-default direction for `display: flex`.
export const resolveEffectiveFlexDirection = ({
	instanceCssByBreakpoint,
	classMottoStylers = [],
	orderedBreakpoints,
	breakpoint,
}) => {
	const instanceLayer = buildFlexDirectionLayerByBp(instanceCssByBreakpoint, orderedBreakpoints);
	const classLayer = buildClassFlexDirectionLayerByBp(classMottoStylers, orderedBreakpoints);
	return (
		instanceLayer.resolvedByBp?.[breakpoint] || classLayer.resolvedByBp?.[breakpoint] || "row"
	);
};

// Maps a block's effective layout at a breakpoint to the axis its direct children are
// laid out on ("horizontal" | "vertical") — used to orient sibling-reorder UI (e.g. the
// block toolbar mover) the same way Gutenberg's own layout.orientation support would.
// Grid always resolves to "horizontal", matching core's own flex_default/grid getOrientation()
// convention (packages/block-editor doesn't inspect grid-auto-flow either).
export const resolveEffectiveOrientation = ({
	instanceCssByBreakpoint,
	classMottoStylers = [],
	baseLayout = "",
	orderedBreakpoints,
	breakpoint,
}) => {
	const display = resolveEffectiveDisplay({
		instanceCssByBreakpoint,
		classMottoStylers,
		baseLayout,
		orderedBreakpoints,
		breakpoint,
	});
	if (display === "flex" || display === "inline-flex") {
		const direction = resolveEffectiveFlexDirection({
			instanceCssByBreakpoint,
			classMottoStylers,
			orderedBreakpoints,
			breakpoint,
		});
		return direction === "column" || direction === "column-reverse" ? "vertical" : "horizontal";
	}
	if (display === "grid" || display === "inline-grid") {
		return "horizontal";
	}
	return "vertical";
};
