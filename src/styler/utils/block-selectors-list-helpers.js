import { __ } from "@wordpress/i18n";
import { createItemId } from "./css-row-ids";
import { mergeCssRows } from "./css-row-list-helpers";
import {
	emptyBlockSelectorsByBreakpoint,
	migrateEntryToTemplate,
	normalizeBlockSelectorsByBreakpoint,
	normalizeBlockSelectorsSelectorList,
	SELECTOR_TOKEN,
} from "./block-selectors-shape";

export const createInnerSelectorId = () => createItemId("inner");

export const createEmptyInnerSelectorItem = () => ({
	id: createInnerSelectorId(),
	selector: SELECTOR_TOKEN,
	label: "",
	description: "",
	css: [],
});

export const normalizeInnerSelectorItem = (item = {}) => ({
	id: String(item?.id || "").trim(),
	selector: migrateEntryToTemplate(item),
	label: typeof item?.label === "string" ? item.label : "",
	description: typeof item?.description === "string" ? item.description : "",
	css: Array.isArray(item?.css) ? item.css : [],
});

export const pickSelectorMeta = (item = {}) => {
	const normalized = normalizeInnerSelectorItem(item);
	return {
		id: normalized.id,
		selector: normalized.selector,
		label: normalized.label,
		description: normalized.description,
	};
};

export const buildSharedSelectorList = (byBp, preferredMode) => {
	const orderedIds = [];
	const idSet = new Set();
	const byId = new Map();
	const pushList = (list = []) => {
		list.forEach((item) => {
			const id = String(item?.id || "").trim();
			if (!id) return;
			if (!idSet.has(id)) {
				idSet.add(id);
				orderedIds.push(id);
			}
			if (!byId.has(id)) byId.set(id, pickSelectorMeta(item));
		});
	};
	pushList(byBp?.[preferredMode]);
	Object.keys(emptyBlockSelectorsByBreakpoint()).forEach((bp) => {
		if (bp === preferredMode) return;
		pushList(byBp?.[bp]);
	});
	return orderedIds.map((id) => byId.get(id)).filter(Boolean);
};

export const applySharedSelectorListToBreakpoints = (sharedList, byBp) => {
	const source = normalizeBlockSelectorsByBreakpoint(byBp);
	const out = emptyBlockSelectorsByBreakpoint();
	Object.keys(out).forEach((bp) => {
		const currentById = new Map(
			source[bp]
				.map((item) => [String(item?.id || "").trim(), item])
				.filter(([id]) => Boolean(id))
		);
		out[bp] = (Array.isArray(sharedList) ? sharedList : []).map((meta) => {
			const id = String(meta?.id || "").trim();
			const existing = currentById.get(id);
			return {
				...pickSelectorMeta(meta),
				css: Array.isArray(existing?.css) ? existing.css : [],
			};
		});
	});
	return out;
};

const getSelectorListItemKey = (item) =>
	String(item?.selector || "")
		.trim()
		.toLowerCase();

/**
 * Merges two block-selector sets by matching each logical selector once (on the flat
 * selector-list shape, where a selector's per-breakpoint css already lives under one id)
 * rather than independently per breakpoint. This is what keeps a matched selector's id
 * identical across all four breakpoints in the result — see SDD-019 §4 rule 4.
 */
export const mergeBlockSelectorsSelectorList = (existingRaw, incomingRaw) => {
	const existingList = normalizeBlockSelectorsSelectorList(existingRaw);
	const incomingList = normalizeBlockSelectorsSelectorList(incomingRaw);
	if (incomingList.length === 0) return existingList;

	const indexBySelector = new Map();
	const out = existingList.map((item, index) => {
		const key = getSelectorListItemKey(item);
		if (key) indexBySelector.set(key, index);
		return item;
	});

	incomingList.forEach((item) => {
		const key = getSelectorListItemKey(item);
		if (key && indexBySelector.has(key)) {
			const index = indexBySelector.get(key);
			const current = out[index];
			const mergedCss = { ...current.css };
			Object.keys(emptyBlockSelectorsByBreakpoint()).forEach((bp) => {
				mergedCss[bp] = mergeCssRows(current.css?.[bp], item.css?.[bp]);
			});
			out[index] = {
				...current,
				label: item.label || current.label,
				description: item.description || current.description,
				css: mergedCss,
			};
			return;
		}
		out.push({ ...item, id: createInnerSelectorId() });
		if (key) indexBySelector.set(key, out.length - 1);
	});

	return out;
};

export const blockSelectorsSelectorListOverlap = (existingRaw, incomingRaw) => {
	const existingKeys = new Set(
		normalizeBlockSelectorsSelectorList(existingRaw).map(getSelectorListItemKey).filter(Boolean)
	);
	return normalizeBlockSelectorsSelectorList(incomingRaw).some((item) => {
		const key = getSelectorListItemKey(item);
		return key && existingKeys.has(key);
	});
};

export const getDisplayLabel = (item) => {
	const explicit = String(item?.label || "").trim();
	if (explicit) return explicit;
	const selector = String(item?.selector ?? "");
	if (selector) return selector;
	return __("Untitled selector", "motto-blocks");
};

export const cloneInnerSelectorCss = (rows) =>
	JSON.parse(JSON.stringify(Array.isArray(rows) ? rows : []));
