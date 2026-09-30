import { BREAKPOINT_KEYS as BREAKPOINTS } from "../config/styler-breakpoints.js";
import { createUniqueId, takeIncomingIdOrCreate } from "./css-row-ids";

export const toSafeBreakpoint = (mode) => {
	const normalized = String(mode || "").trim();
	return BREAKPOINTS.includes(normalized) ? normalized : "desktop";
};

export const emptyByBreakpoint = () => ({
	desktop: [],
	tablet: [],
	landscapePhone: [],
	phone: [],
});

export const normalizeByBreakpoint = (raw) => {
	const source = raw && typeof raw === "object" ? raw : {};
	const out = emptyByBreakpoint();
	BREAKPOINTS.forEach((bp) => {
		out[bp] = Array.isArray(source[bp]) ? source[bp] : [];
	});
	return out;
};

export const isEmptyCssRow = (row) => {
	const name = String(row?.name || "").trim();
	const value = String(row?.value || "").trim();
	return name === "" && value === "";
};

export const toClipboardCssRows = (rows = []) => {
	const source = Array.isArray(rows) ? rows : [];
	return source
		.map((row) => ({
			name: String(row?.name || "").trim(),
			value: String(row?.value || "").trim(),
		}))
		.filter((row) => row.name !== "" || row.value !== "");
};

export const fromClipboardCssRows = (rows = []) => {
	const source = Array.isArray(rows) ? rows : [];
	const usedIds = new Set();
	return source
		.map((row) => {
			const name = String(row?.name || "").trim();
			const value = String(row?.value || "").trim();
			if (name === "" && value === "") return null;
			return {
				id: createUniqueId(usedIds, "css"),
				name,
				value,
			};
		})
		.filter(Boolean);
};

export const groupPresets = (presets) => {
	const groups = new Map();
	(Array.isArray(presets) ? presets : []).forEach((preset) => {
		const key =
			String(preset?.category || "general")
				.trim()
				.toLowerCase() || "general";
		if (!groups.has(key)) groups.set(key, []);
		groups.get(key).push(preset);
	});
	return Array.from(groups.entries()).map(([key, items]) => ({
		key,
		label: key.replace(/[-_]/g, " ").replace(/^\w/, (c) => c.toUpperCase()),
		items,
	}));
};

const getCssRowKey = (row) =>
	String(row?.name || "")
		.trim()
		.toLowerCase();

export const cssRowsOverlap = (existingRows = [], incomingRows = []) => {
	const existing = Array.isArray(existingRows) ? existingRows : [];
	const incoming = Array.isArray(incomingRows) ? incomingRows : [];
	const existingKeys = new Set(existing.map(getCssRowKey).filter(Boolean));
	return incoming.some((row) => {
		const key = getCssRowKey(row);
		return key && existingKeys.has(key);
	});
};

export const mergeCssRows = (existingRows = [], incomingRows = []) => {
	const existing = Array.isArray(existingRows) ? existingRows : [];
	const incoming = Array.isArray(incomingRows) ? incomingRows : [];
	if (incoming.length === 0) return existing;

	const byName = new Map();
	const usedIds = new Set();
	const out = existing.map((row, index) => {
		const key = getCssRowKey(row);
		if (key) byName.set(key, index);
		if (row?.id) usedIds.add(row.id);
		return row;
	});

	incoming.forEach((row) => {
		const key = getCssRowKey(row);
		if (!key) {
			out.push({ ...row, id: createUniqueId(usedIds, "css") });
			return;
		}
		if (byName.has(key)) {
			const index = byName.get(key);
			const current = out[index];
			out[index] = { ...current, ...row, id: current?.id };
			return;
		}
		out.push({ ...row, id: createUniqueId(usedIds, "css") });
	});

	return out;
};

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

// A selector must keep one id across every breakpoint. Incoming ids (preset
// "motto-selector-N", clipboard) can collide with the block's existing ones, and
// mergeInnerSelectorRows would then mint a different random id per breakpoint.
// Returns the incoming rows with each colliding id remapped once, consistently.
export const remapCollidingSelectorIds = (existingByBreakpoint, incomingByBreakpoint) => {
	const usedIds = new Set();
	Object.values(existingByBreakpoint || {}).forEach((rows) =>
		(rows || []).forEach((row) => row?.id && usedIds.add(row.id))
	);
	const remapped = new Map();
	const out = {};
	Object.entries(incomingByBreakpoint || {}).forEach(([bp, rows]) => {
		out[bp] = (rows || []).map((row) => {
			if (!usedIds.has(row?.id)) return row;
			if (!remapped.has(row.id)) remapped.set(row.id, createUniqueId(usedIds, "sub"));
			return { ...row, id: remapped.get(row.id) };
		});
	});
	return out;
};

export const innerSelectorRowsOverlap = (existingRows = [], incomingRows = []) => {
	const existing = Array.isArray(existingRows) ? existingRows : [];
	const incoming = Array.isArray(incomingRows) ? incomingRows : [];
	const existingKeys = new Set(existing.map(getInnerSelectorKey).filter(Boolean));
	return incoming.some((row) => {
		const key = getInnerSelectorKey(row);
		return key && existingKeys.has(key);
	});
};

export const mergeInnerSelectorRows = (existingRows = [], presetRows = []) => {
	const existing = Array.isArray(existingRows) ? existingRows : [];
	const incoming = Array.isArray(presetRows) ? presetRows : [];
	if (incoming.length === 0) return existing;

	const bySelector = new Map();
	const usedIds = new Set();
	const out = existing.map((row, index) => {
		const key = getInnerSelectorKey(row);
		if (key) bySelector.set(key, index);
		if (row?.id) usedIds.add(row.id);
		return row;
	});

	incoming.forEach((row) => {
		const key = getInnerSelectorKey(row);
		if (!key) {
			out.push({
				...row,
				id: takeIncomingIdOrCreate(usedIds, row?.id, "sub"),
				css: mergeCssRows([], row?.css),
			});
			return;
		}
		if (bySelector.has(key)) {
			const index = bySelector.get(key);
			const current = out[index];
			out[index] = {
				...current,
				...row,
				id: current?.id,
				css: mergeCssRows(current?.css, row?.css),
			};
			return;
		}
		out.push({
			...row,
			id: takeIncomingIdOrCreate(usedIds, row?.id, "sub"),
			css: mergeCssRows([], row?.css),
		});
	});

	return out;
};
