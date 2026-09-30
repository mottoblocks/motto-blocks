import { defaultMottoStyler } from "../data/default-motto-styler";
import { normalizeBlockSelectorsSelectorList } from "../utils/block-selectors-shape";
import { hasNonEmptyCssRows } from "../utils/motto-content";
import { isObject } from "../utils/normalize-motto-styler";

export const STYLER_ATTRIBUTE_KEY = "mottoStyler";

const hasNonEmptyBlockSelectors = (rows) =>
	Array.isArray(rows) &&
	rows.some((row) => {
		if (String(row?.selector || "").trim() !== "") return true;
		if (String(row?.before || "").trim() !== "") return true;
		if (String(row?.after || "").trim() !== "") return true;
		return hasNonEmptyCssRows(row?.css);
	});

const hasBlockSpacingContent = (value) => {
	const blockSpacing = isObject(value?.blockSpacing) ? value.blockSpacing : {};
	if (blockSpacing.enabled !== true) return false;
	const spacingValues = isObject(blockSpacing.values) ? blockSpacing.values : {};
	return Object.values(spacingValues).some(
		(entry) => typeof entry === "string" && entry.trim() !== ""
	);
};

const hasStylerContent = (value) => {
	if (!isObject(value)) return false;
	const css = isObject(value.css) ? value.css : {};
	const html = isObject(value.html) ? value.html : {};
	const hasCss = Object.values(css).some((rows) => hasNonEmptyCssRows(rows));
	const rawInner =
		value.blockSelectors !== undefined ? value.blockSelectors : value.innerSelectors;
	let hasBlockSelectors = false;
	if (Array.isArray(rawInner)) {
		hasBlockSelectors = hasNonEmptyBlockSelectors(rawInner);
	} else if (isObject(rawInner)) {
		hasBlockSelectors = Object.values(rawInner).some((rows) => hasNonEmptyBlockSelectors(rows));
	}
	const hasClasses = Array.isArray(value.cssClasses) && value.cssClasses.length > 0;
	const hasHtmlAttributes = Array.isArray(html.attributes) && html.attributes.length > 0;
	const hasBlockSpacing = hasBlockSpacingContent(value);
	return hasCss || hasBlockSelectors || hasClasses || hasHtmlAttributes || hasBlockSpacing;
};

const isNonEmptyObject = (value) => isObject(value) && Object.keys(value).length > 0;
const normalizePersistedBlockStylerValue = (value) => {
	if (!isObject(value)) return defaultMottoStyler;
	const rawBlockSelectors =
		value.blockSelectors !== undefined ? value.blockSelectors : value.innerSelectors;

	if (rawBlockSelectors === undefined) {
		return value;
	}

	const normalizedValue = {
		...value,
		blockSelectors: normalizeBlockSelectorsSelectorList(rawBlockSelectors),
	};

	delete normalizedValue.innerSelectors;
	delete normalizedValue.selectors;

	return normalizedValue;
};

export const resolveRawStylerAttributes = (attributes) => {
	const source = isObject(attributes) ? attributes : {};
	const stylerValue = source[STYLER_ATTRIBUTE_KEY];
	if (hasStylerContent(stylerValue)) return stylerValue;
	if (isNonEmptyObject(stylerValue)) return stylerValue;
	return defaultMottoStyler;
};

const compactMottoStyler = (value) => {
	if (!isObject(value)) return value;
	const result = { ...value };

	if (Array.isArray(result.cssClasses) && result.cssClasses.length === 0) {
		delete result.cssClasses;
	}

	if (Array.isArray(result.blockSelectors) && result.blockSelectors.length === 0) {
		delete result.blockSelectors;
	}

	if (isObject(result.css)) {
		const css = { ...result.css };
		for (const bp of Object.keys(css)) {
			if (Array.isArray(css[bp])) {
				if (css[bp].length === 0) {
					delete css[bp];
				} else {
					css[bp] = css[bp].slice();
				}
			}
		}
		if (Object.keys(css).length === 0) {
			delete result.css;
		} else {
			result.css = css;
		}
	}

	if (isObject(result.html)) {
		const attrs = result.html.attributes;
		if (Array.isArray(attrs) && attrs.length === 0 && Object.keys(result.html).length === 1) {
			delete result.html;
		}
	}

	if (isObject(result.ui)) {
		const spacing = result.ui.spacing;
		if (isObject(spacing)) {
			const controls = spacing.controls;
			const isEmpty =
				(Array.isArray(controls) && controls.length === 0) ||
				(isObject(controls) && Object.keys(controls).length === 0);
			if (
				isEmpty &&
				Object.keys(spacing).length === 1 &&
				Object.keys(result.ui).length === 1
			) {
				delete result.ui;
			}
		}
	}

	return result;
};

export const persistStylerAttributes = (setAttributes, nextStylerValue) => {
	if (typeof setAttributes !== "function") return;
	const normalizedValue = isObject(nextStylerValue)
		? compactMottoStyler(normalizePersistedBlockStylerValue(nextStylerValue))
		: defaultMottoStyler;
	setAttributes({
		[STYLER_ATTRIBUTE_KEY]: normalizedValue,
	});
};
