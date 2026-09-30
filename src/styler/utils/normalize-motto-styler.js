import { defaultMottoStyler } from "../data/default-motto-styler";
import { normalizeRowsByBreakpoint } from "./breakpoint-shape";
import {
	emptyBlockSelectorsByBreakpoint,
	normalizeBlockSelectorsByBreakpoint,
} from "./block-selectors-shape";

export const isObject = (value) =>
	Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeHtml = (source) => ({
	attributes: Array.isArray(source?.html?.attributes) ? source.html.attributes : [],
});

const normalizeBlockSelectors = (source) => {
	const rawBlockSelectors =
		source?.blockSelectors !== undefined ? source.blockSelectors : source?.innerSelectors;
	return {
		...emptyBlockSelectorsByBreakpoint(),
		...normalizeBlockSelectorsByBreakpoint(rawBlockSelectors),
	};
};

const normalizeBlockSpacing = (source) => {
	const raw = source?.blockSpacing;
	// New format: { enabled, values }
	if (isObject(raw) && ("values" in raw || "enabled" in raw)) {
		return {
			enabled: raw.enabled === true,
			values: isObject(raw.values) ? raw.values : {},
		};
	}
	// Legacy format: blockSpacing was a flat bp map, enabled was a top-level key
	if (isObject(raw)) {
		return {
			enabled: source?.blockSpacingEnabled === true,
			values: raw,
		};
	}
	return { enabled: false, values: {} };
};

const normalizeCssClasses = (source, normalizeCssClassesValue) => {
	if (typeof normalizeCssClassesValue === "function") {
		return normalizeCssClassesValue(source?.cssClasses);
	}
	if (Array.isArray(source?.cssClasses)) {
		return source.cssClasses;
	}
	return defaultMottoStyler.cssClasses;
};

export const normalizeMottoStyler = (
	raw,
	{ normalizeCssClassesValue = null, includeHtml = true, includeBlockSelectors = true } = {}
) => {
	const source = isObject(raw) ? raw : {};
	const normalized = {
		...defaultMottoStyler,
		...source,
		cssClasses: normalizeCssClasses(source, normalizeCssClassesValue),
		css: normalizeRowsByBreakpoint(source?.css),
		blockSpacing: normalizeBlockSpacing(source),
	};

	delete normalized.innerSelectors;
	delete normalized.selectors;
	delete normalized.blockSpacingEnabled;

	if (includeBlockSelectors) {
		normalized.blockSelectors = normalizeBlockSelectors(source);
	}

	if (includeHtml) {
		normalized.html = normalizeHtml(source);
	}

	return normalized;
};
