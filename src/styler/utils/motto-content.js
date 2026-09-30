import { createBlock, serialize } from "@wordpress/blocks";

import { normalizeCssClassSlug } from "../classes/css-class-slug";
import { normalizeClassUid } from "../classes/css-class-uid.js";
import { normalizeBlockSelectorsByBreakpoint } from "./block-selectors-shape";
import { normalizeMottoStyler } from "./normalize-motto-styler";

const parseCssClassId = (value) => {
	const numeric = Number(value);
	return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
};

const normalizeCssClasses = (raw = []) => {
	if (!Array.isArray(raw)) return [];
	const seen = new Set();
	const out = [];
	raw.forEach((item) => {
		if (typeof item === "string") {
			const slug = normalizeCssClassSlug(item);
			if (!slug || seen.has(`slug:${slug}`)) return;
			seen.add(`slug:${slug}`);
			out.push({ id: 0, slug });
			return;
		}
		const id = typeof item === "object" ? parseCssClassId(item?.id) : 0;
		const slug = normalizeCssClassSlug(item?.slug || "");
		const uid = typeof item === "object" ? normalizeClassUid(item?.uid) : "";
		const key = uid ? `uid:${uid}` : slug ? `slug:${slug}` : id > 0 ? `id:${id}` : "";
		if ((id === 0 && !slug && !uid) || seen.has(key)) return;
		seen.add(key);
		const entry = { id, slug };
		if (uid) {
			entry.uid = uid;
		}
		out.push(entry);
	});
	return out;
};

export const normalizeMottoStylerWithClasses = (raw = {}) => {
	return normalizeMottoStyler(raw, {
		normalizeCssClassesValue: normalizeCssClasses,
	});
};

export const pickMottoContent = (mottoStyler) => {
	const normalized = normalizeMottoStylerWithClasses(mottoStyler || {});
	return {
		css: normalized.css,
		blockSelectors: normalized.blockSelectors,
		html: normalized.html,
		blockSpacing: normalized.blockSpacing,
	};
};

const makeRowId = (prefix) =>
	`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const mergeCssRows = (localRows = [], classRows = []) => {
	const local = Array.isArray(localRows) ? localRows : [];
	const fromClass = Array.isArray(classRows) ? classRows : [];
	const out = local.map((row) => ({ ...row }));
	const byProp = new Set(
		out
			.map((row) =>
				String(row?.name || "")
					.trim()
					.toLowerCase()
			)
			.filter(Boolean)
	);

	fromClass.forEach((row) => {
		const prop = String(row?.name || "")
			.trim()
			.toLowerCase();
		if (!prop || byProp.has(prop)) return;
		byProp.add(prop);
		out.push({
			...row,
			id: row?.id || makeRowId("css"),
		});
	});

	return out;
};

const mergeBlockSelectorsRows = (localRows = [], classRows = []) => {
	const local = Array.isArray(localRows) ? localRows : [];
	const fromClass = Array.isArray(classRows) ? classRows : [];
	const out = local.map((row) => ({
		...row,
		css: Array.isArray(row?.css) ? row.css.map((item) => ({ ...item })) : [],
	}));
	const bySelector = new Map();
	const getInnerSelectorKey = (row) => {
		const selector = String(row?.selector || "")
			.trim()
			.toLowerCase();
		const normalizedType = String(row?.selectorType || "")
			.trim()
			.toLowerCase();
		const legacyScope = String(row?.scope || "")
			.trim()
			.toLowerCase();
		const selectorType =
			normalizedType ||
			(legacyScope === "root" ? "state" : legacyScope === "inner" ? "inner" : "");
		if (!selector) return "";
		return `${selectorType}|${selector}`;
	};

	out.forEach((row, index) => {
		const key = getInnerSelectorKey(row);
		if (key) bySelector.set(key, index);
	});

	fromClass.forEach((row) => {
		const key = getInnerSelectorKey(row);
		if (!key) return;
		if (bySelector.has(key)) {
			const index = bySelector.get(key);
			out[index] = {
				...out[index],
				css: mergeCssRows(out[index]?.css || [], row?.css || []),
			};
			return;
		}
		out.push({
			...row,
			id: row?.id || makeRowId("sub"),
			css: mergeCssRows([], row?.css || []),
		});
		bySelector.set(key, out.length - 1);
	});

	return out;
};

const mergeHtmlAttributes = (localAttrs = [], classAttrs = []) => {
	const local = Array.isArray(localAttrs) ? localAttrs : [];
	const fromClass = Array.isArray(classAttrs) ? classAttrs : [];
	const out = local.map((attr) => ({ ...attr }));
	const byName = new Set(
		out
			.map((attr) =>
				String(attr?.name || "")
					.trim()
					.toLowerCase()
			)
			.filter(Boolean)
	);

	fromClass.forEach((attr) => {
		const key = String(attr?.name || "")
			.trim()
			.toLowerCase();
		if (!key || byName.has(key)) return;
		byName.add(key);
		out.push({
			...attr,
			id: attr?.id || makeRowId("attr"),
		});
	});

	return out;
};

export const mergeMottoContent = (local, fromClass) => ({
	css: {
		desktop: mergeCssRows(local?.css?.desktop || [], fromClass?.css?.desktop || []),
		tablet: mergeCssRows(local?.css?.tablet || [], fromClass?.css?.tablet || []),
		landscapePhone: mergeCssRows(
			local?.css?.landscapePhone || [],
			fromClass?.css?.landscapePhone || []
		),
		phone: mergeCssRows(local?.css?.phone || [], fromClass?.css?.phone || []),
	},
	blockSelectors: {
		desktop: mergeBlockSelectorsRows(
			local?.blockSelectors?.desktop || [],
			fromClass?.blockSelectors?.desktop || []
		),
		tablet: mergeBlockSelectorsRows(
			local?.blockSelectors?.tablet || [],
			fromClass?.blockSelectors?.tablet || []
		),
		landscapePhone: mergeBlockSelectorsRows(
			local?.blockSelectors?.landscapePhone || [],
			fromClass?.blockSelectors?.landscapePhone || []
		),
		phone: mergeBlockSelectorsRows(
			local?.blockSelectors?.phone || [],
			fromClass?.blockSelectors?.phone || []
		),
	},
	html: {
		attributes: mergeHtmlAttributes(
			local?.html?.attributes || [],
			fromClass?.html?.attributes || []
		),
	},
});

export const hasNonEmptyCssRows = (rows) => {
	if (!Array.isArray(rows) || rows.length === 0) return false;
	return rows.some((row) => {
		const name = String(row?.name || "").trim();
		const value = String(row?.value || "").trim();
		return name !== "" || value !== "";
	});
};

export const hasInnerSelectorContent = (row) => {
	const selector = String(row?.selector || "").trim();
	if (selector !== "") return true;
	return hasNonEmptyCssRows(row?.css);
};

export const hasBlockSpacingContent = (blockSpacing) => {
	if (!blockSpacing || typeof blockSpacing !== "object") return false;
	if (blockSpacing.enabled !== true) return false;
	return Object.values(blockSpacing.values || {}).some(
		(value) => typeof value === "string" && value.trim() !== ""
	);
};

export const hasAnyMottoContent = (mottoStyler) => {
	const normalized = normalizeMottoStylerWithClasses(mottoStyler);
	const hasCss = Object.values(normalized.css).some((rows) => hasNonEmptyCssRows(rows));
	const hasHtml =
		Array.isArray(normalized?.html?.attributes) && normalized.html.attributes.length > 0;
	const hasClasses = Array.isArray(normalized?.cssClasses) && normalized.cssClasses.length > 0;
	const hasInner = Object.values(normalized.blockSelectors).some(
		(rows) => Array.isArray(rows) && rows.some((row) => hasInnerSelectorContent(row))
	);
	const hasBlockSpacing = hasBlockSpacingContent(normalized?.blockSpacing);
	return hasCss || hasHtml || hasClasses || hasInner || hasBlockSpacing;
};

export const hasBlockSelectorsByBreakpointContent = (blockSelectors) => {
	const source = normalizeBlockSelectorsByBreakpoint(blockSelectors);
	return Object.values(source).some(
		(rows) => Array.isArray(rows) && rows.some((row) => hasInnerSelectorContent(row))
	);
};

export const hasMainMottoContent = (mottoStyler) => {
	if (!mottoStyler || typeof mottoStyler !== "object") return false;
	const normalized = normalizeMottoStylerWithClasses(mottoStyler);
	const hasCss = Object.values(normalized.css).some((rows) => hasNonEmptyCssRows(rows));
	const hasHtml =
		Array.isArray(normalized?.html?.attributes) && normalized.html.attributes.length > 0;
	const hasClasses = Array.isArray(normalized?.cssClasses) && normalized.cssClasses.length > 0;
	return hasCss || hasHtml || hasClasses;
};

export const stripMottoStylerFromBlock = (block) => {
	if (!block || typeof block !== "object") return null;
	const attrs = { ...(block.attributes || {}) };
	if (attrs.mottoStyler) delete attrs.mottoStyler;
	const innerBlocks = Array.isArray(block.innerBlocks)
		? block.innerBlocks.map(stripMottoStylerFromBlock).filter(Boolean)
		: [];
	return createBlock(block.name, attrs, innerBlocks);
};

export const serializeClassInnerBlocks = (sourceBlock) => {
	const innerBlocks = Array.isArray(sourceBlock?.innerBlocks)
		? sourceBlock.innerBlocks.map(stripMottoStylerFromBlock).filter(Boolean)
		: [];
	return innerBlocks.length ? serialize(innerBlocks) : "";
};
