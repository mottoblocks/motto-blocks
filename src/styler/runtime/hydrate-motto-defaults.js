import { normalizeMottoStyler } from "../utils/normalize-motto-styler";
import { ensureBlockSelectorIdsByBreakpoint } from "../utils/block-selectors-shape";
import { BREAKPOINT_KEYS as BREAKPOINTS } from "../config/styler-breakpoints.js";

const sanitizeId = (value) => {
	const raw = String(value || "").trim();
	return raw || "";
};

const ensureCssRowIds = (rows, prefix) =>
	(Array.isArray(rows) ? rows : [])
		.filter((row) => row && typeof row === "object")
		.map((row, index) => {
			const id = sanitizeId(row?.id) || `${prefix}-${index + 1}`;
			return {
				...row,
				id,
			};
		});

export const hydrateMottoDefaultsToStyler = (rawDefaults) => {
	const normalized = normalizeMottoStyler(rawDefaults || {});
	return {
		...normalized,
		css: BREAKPOINTS.reduce((acc, bp) => {
			acc[bp] = ensureCssRowIds(normalized?.css?.[bp], `motto-main-row-${bp}`);
			return acc;
		}, {}),
		blockSelectors: ensureBlockSelectorIdsByBreakpoint(normalized?.blockSelectors || {}),
		html: {
			attributes: ensureCssRowIds(normalized?.html?.attributes, "motto-html-attr"),
		},
	};
};
