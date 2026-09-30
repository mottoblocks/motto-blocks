import { BREAKPOINT_KEYS } from "../config/styler-breakpoints.js";

export const emptyBreakpointRows = () => ({
	desktop: [],
	tablet: [],
	landscapePhone: [],
	phone: [],
});

const toRuntimeRowId = (name, bp, index) => {
	const n = String(name || "")
		.trim()
		.toLowerCase();
	return `styler-${n || "row"}-${bp}-${index}`;
};

export const normalizeRowsByBreakpoint = (raw) => {
	const source = raw && typeof raw === "object" ? raw : {};
	const out = emptyBreakpointRows();
	BREAKPOINT_KEYS.forEach((bp) => {
		out[bp] = Array.isArray(source?.[bp])
			? source[bp].map((row, i) => {
					if (!row || typeof row !== "object" || row.id) return row;
					return { ...row, id: toRuntimeRowId(row.name, bp, i) };
				})
			: [];
	});
	return out;
};

export const BREAKPOINT_ROW_KEYS = BREAKPOINT_KEYS;
