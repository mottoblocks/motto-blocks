import { isObject } from "../utils/normalize-motto-styler";

export const CLASS_META_STYLER_KEY = "motto_styler";
export const CLASS_META_CONDITIONAL_KEY = "motto_styler_conditional_classes";

const hasNonEmptyCssRows = (rows) =>
	Array.isArray(rows) &&
	rows.some((row) => {
		const name = String(row?.name || "").trim();
		const value = String(row?.value || "").trim();
		return name !== "" || value !== "";
	});

const hasNonEmptyBlockSelectors = (rows) =>
	Array.isArray(rows) &&
	rows.some((row) => {
		const selector = String(row?.selector || "").trim();
		if (selector !== "") return true;
		return hasNonEmptyCssRows(row?.css);
	});

const hasStylerContent = (value) => {
	if (!isObject(value)) return false;
	const css = isObject(value.css) ? value.css : {};
	const blockSelectors = isObject(value.blockSelectors)
		? value.blockSelectors
		: isObject(value.innerSelectors)
			? value.innerSelectors
			: {};
	const html = isObject(value.html) ? value.html : {};
	const hasCss = Object.values(css).some((rows) => hasNonEmptyCssRows(rows));
	const hasBlockSelectors = Object.values(blockSelectors).some((rows) =>
		hasNonEmptyBlockSelectors(rows)
	);
	const hasClasses = Array.isArray(value.cssClasses) && value.cssClasses.length > 0;
	const hasHtmlAttributes = Array.isArray(html.attributes) && html.attributes.length > 0;
	return hasCss || hasBlockSelectors || hasClasses || hasHtmlAttributes;
};

const isNonEmptyObject = (value) => isObject(value) && Object.keys(value).length > 0;

export const resolveClassMetaStyler = (meta) => {
	const source = meta && typeof meta === "object" ? meta : {};
	const next = source?.[CLASS_META_STYLER_KEY];
	if (hasStylerContent(next)) return next;
	if (isNonEmptyObject(next)) return next;
	return null;
};

export const resolveClassMetaConditionalClasses = (meta) => {
	const source = meta && typeof meta === "object" ? meta : {};
	if (Array.isArray(source?.[CLASS_META_CONDITIONAL_KEY])) {
		return source[CLASS_META_CONDITIONAL_KEY];
	}
	return [];
};
