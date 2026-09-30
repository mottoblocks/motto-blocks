import { BREAKPOINT_KEYS } from "../config/styler-breakpoints.js";

export const SELECTOR_TOKEN = "&{BLOCK}";
const VALIDATION_BASE_SELECTOR = ".motto-block-selector-preview";

/**
 * Migrates a selector entry to the composite { before, after } format.
 * - New format (before/after present): pass-through
 * - Legacy format (selector field): maps selector → after
 * - No modification of string values — spaces are semantic.
 */
export const migrateEntryToComposite = (entry = {}) => {
	if (entry === null || typeof entry !== "object") return { before: "", after: "" };
	if (entry.before !== undefined || entry.after !== undefined) {
		return {
			before: typeof entry.before === "string" ? entry.before : "",
			after: typeof entry.after === "string" ? entry.after : "",
		};
	}
	if (typeof entry.selector === "string") {
		const selector = entry.selector;
		// Template-format selector containing the token — can't cleanly split; treat as after
		if (selector.includes(SELECTOR_TOKEN)) return { before: "", after: selector };
		// If already has leading space, stored explicitly — preserve as-is
		if (selector.startsWith(" ")) return { before: "", after: selector };
		const selectorType =
			typeof entry.selectorType === "string" ? entry.selectorType.trim().toLowerCase() : "";
		// Old data stores selector WITHOUT leading space; selectorType "inner" means descendant (needs space).
		// When no selectorType, infer from first char — same logic as inferSelectorType.
		const first = selector.charAt(0);
		const looksLikeState =
			first === ":" || first === "[" || first === ">" || first === "+" || first === "~";
		const needsSpace =
			selectorType === "inner" || (!selectorType && !looksLikeState && selector.length > 0);
		return { before: "", after: needsSpace ? ` ${selector}` : selector };
	}
	return { before: "", after: "" };
};

/**
 * Migrates any selector entry format to a composite template string.
 * The template uses "&{block}" as a placeholder for the base selector class.
 *
 * Supported input formats:
 * - Template format: { selector: "...&{block}..." } → pass-through
 * - Intermediate format: { before, after } → "${before} &{block}${after}"
 * - Legacy format: { selector, selectorType } → "&{block}${after}" (via migrateEntryToComposite)
 */
export const migrateEntryToTemplate = (entry = {}) => {
	if (entry === null || typeof entry !== "object") return "";
	// Template format: selector already contains the token — pass-through
	if (typeof entry.selector === "string" && entry.selector.includes(SELECTOR_TOKEN)) {
		return entry.selector;
	}
	// Intermediate before/after format
	if (entry.before !== undefined || entry.after !== undefined) {
		const { before, after } = migrateEntryToComposite(entry);
		if (!before && !after) return "";
		return `${before ? before + " " : ""}${SELECTOR_TOKEN}${after}`;
	}
	// Legacy selector/selectorType format
	if (typeof entry.selector === "string" && entry.selector) {
		const { before, after } = migrateEntryToComposite(entry);
		return `${before ? before + " " : ""}${SELECTOR_TOKEN}${after}`;
	}
	return "";
};

export const resolveInnerSelectorTemplate = (template, baseSelector = VALIDATION_BASE_SELECTOR) => {
	if (typeof template !== "string") return "";
	return template.replaceAll(SELECTOR_TOKEN, String(baseSelector || ""));
};

const PSEUDO_ELEMENT_PATTERN = /::[a-zA-Z0-9_-]+(?:\([^)]*\))?/g;

export const sanitizeResolvedSelectorForValidation = (selector) =>
	String(selector || "").replace(PSEUDO_ELEMENT_PATTERN, "");

const defaultValidateResolvedSelector = (selector) => {
	const normalizedSelector = String(selector || "").trim();
	if (!normalizedSelector) return false;
	const sanitizedSelector = sanitizeResolvedSelectorForValidation(normalizedSelector).trim();

	if (typeof globalThis.CSS?.supports === "function") {
		try {
			if (globalThis.CSS.supports(`selector(${normalizedSelector})`)) {
				return true;
			}
		} catch {}
		try {
			if (sanitizedSelector && sanitizedSelector !== normalizedSelector) {
				if (globalThis.CSS.supports(`selector(${sanitizedSelector})`)) {
					return true;
				}
			}
		} catch {}
	}

	if (typeof globalThis.document?.createDocumentFragment === "function") {
		try {
			globalThis.document.createDocumentFragment().querySelector(normalizedSelector);
			return true;
		} catch {}
		try {
			if (sanitizedSelector && sanitizedSelector !== normalizedSelector) {
				globalThis.document.createDocumentFragment().querySelector(sanitizedSelector);
				return true;
			}
		} catch {}
	}

	// Do not hard-fail in non-DOM environments. Browser validation still runs in the editor.
	return true;
};

export const validateInnerSelectorTemplate = (
	template,
	{
		baseSelector = VALIDATION_BASE_SELECTOR,
		validateResolvedSelector = defaultValidateResolvedSelector,
	} = {}
) => {
	const rawTemplate = typeof template === "string" ? template : "";
	if (!rawTemplate.trim()) {
		return { isValid: false, reason: "empty", resolvedSelector: "" };
	}

	if (!rawTemplate.includes(SELECTOR_TOKEN)) {
		return { isValid: false, reason: "missing-token", resolvedSelector: "" };
	}

	const resolvedSelector = resolveInnerSelectorTemplate(rawTemplate, baseSelector);
	if (!String(resolvedSelector || "").trim()) {
		return { isValid: false, reason: "empty", resolvedSelector: "" };
	}

	if (!validateResolvedSelector(resolvedSelector)) {
		return { isValid: false, reason: "invalid-selector", resolvedSelector };
	}

	return { isValid: true, reason: "", resolvedSelector };
};

export const emptyBlockSelectorsByBreakpoint = () => ({
	desktop: [],
	tablet: [],
	landscapePhone: [],
	phone: [],
});

const sanitizeText = (value) => (typeof value === "string" ? value : "");
const normalizeCssRows = (rows) =>
	Array.isArray(rows) ? rows.filter((row) => row && typeof row === "object") : [];
const sanitizeId = (value) => sanitizeText(value).trim();

const ensureCssRowIds = (rows, prefix) => {
	let nextId = 1;
	return normalizeCssRows(rows).map((row, index) => {
		const existingId = sanitizeId(row?.id);
		return {
			...row,
			id: existingId || `${prefix}-${index + 1}-${nextId++}`,
		};
	});
};

const normalizeSelectorEntryMeta = (entry = {}) => ({
	id: sanitizeText(entry?.id),
	selector: migrateEntryToTemplate(entry),
	label: sanitizeText(entry?.label),
	description: sanitizeText(entry?.description),
});

const isListArray = (value) => Array.isArray(value);

const buildSelectorIdentityBaseKey = (row = {}) => {
	const selector = sanitizeText(row?.selector).trim().toLowerCase();
	if (selector) {
		const selectorType = sanitizeText(row?.selectorType).trim().toLowerCase();
		const scope = sanitizeText(row?.scope).trim().toLowerCase();
		const normalizedType =
			selectorType || (scope === "root" ? "state" : scope === "inner" ? "inner" : "");
		return `selector|${normalizedType}|${selector}`;
	}
	const label = sanitizeText(row?.label).trim().toLowerCase();
	const description = sanitizeText(row?.description).trim().toLowerCase();
	if (label || description) {
		return `meta|${label}|${description}`;
	}
	return "fallback";
};

const buildSelectorOccurrenceKeys = (rows = []) => {
	const counts = new Map();
	return rows.map((row) => {
		const baseKey = buildSelectorIdentityBaseKey(row);
		const nextCount = (counts.get(baseKey) || 0) + 1;
		counts.set(baseKey, nextCount);
		return `${baseKey}|occurrence:${nextCount}`;
	});
};

export const ensureBlockSelectorIdsByBreakpoint = (raw) => {
	const source = raw && typeof raw === "object" ? raw : {};
	const out = emptyBlockSelectorsByBreakpoint();
	const selectorIdByKey = new Map();
	let nextSelectorId = 1;

	BREAKPOINT_KEYS.forEach((bp) => {
		const list = Array.isArray(source?.[bp]) ? source[bp] : [];
		const occurrenceKeys = buildSelectorOccurrenceKeys(list);
		out[bp] = list
			.filter((row) => row && typeof row === "object")
			.map((row, index) => {
				const occurrenceKey = occurrenceKeys[index];
				const existingId = sanitizeId(row?.id);
				if (existingId && !selectorIdByKey.has(occurrenceKey)) {
					selectorIdByKey.set(occurrenceKey, existingId);
				}
				const selectorId =
					existingId ||
					selectorIdByKey.get(occurrenceKey) ||
					`motto-selector-${nextSelectorId++}`;
				if (!selectorIdByKey.has(occurrenceKey)) {
					selectorIdByKey.set(occurrenceKey, selectorId);
				}
				return {
					...row,
					id: selectorId,
					css: ensureCssRowIds(row?.css, `motto-selector-row-${selectorId}-${bp}`),
				};
			});
	});

	return out;
};

const buildSelectorEntryKey = (row) => {
	const id = sanitizeText(row?.id).trim();
	if (id) return `id:${id}`;
	const selector = sanitizeText(row?.selector).trim();
	if (selector) return selector;
	return "";
};

export const normalizeBlockSelectorsByBreakpoint = (raw) => {
	const out = emptyBlockSelectorsByBreakpoint();
	const source = raw && typeof raw === "object" ? raw : null;
	if (!source) return out;

	if (isListArray(source)) {
		source.forEach((entry) => {
			if (!entry || typeof entry !== "object") return;
			const meta = normalizeSelectorEntryMeta(entry);
			const cssByBp = entry?.css && typeof entry.css === "object" ? entry.css : {};
			BREAKPOINT_KEYS.forEach((bp) => {
				const rows = normalizeCssRows(cssByBp?.[bp]);
				out[bp].push({ ...meta, css: rows });
			});
		});
		return ensureBlockSelectorIdsByBreakpoint(out);
	}

	BREAKPOINT_KEYS.forEach((bp) => {
		const list = isListArray(source?.[bp]) ? source[bp] : [];
		out[bp] = list
			.filter((row) => row && typeof row === "object")
			.map((row) => ({
				...normalizeSelectorEntryMeta(row),
				css: normalizeCssRows(row?.css),
			}));
	});

	return ensureBlockSelectorIdsByBreakpoint(out);
};

export const normalizeBlockSelectorsSelectorList = (raw) => {
	const byBreakpoint = normalizeBlockSelectorsByBreakpoint(raw);
	const map = new Map();
	const orderedKeys = [];

	BREAKPOINT_KEYS.forEach((bp) => {
		const list = isListArray(byBreakpoint?.[bp]) ? byBreakpoint[bp] : [];
		list.forEach((row) => {
			const key = buildSelectorEntryKey(row);
			if (!key) return;
			if (!map.has(key)) {
				map.set(key, {
					...normalizeSelectorEntryMeta(row),
					css: emptyBlockSelectorsByBreakpoint(),
				});
				orderedKeys.push(key);
			}
			const entry = map.get(key);
			entry.css[bp] = normalizeCssRows(row?.css);
		});
	});

	return orderedKeys.map((key) => map.get(key));
};

const resolveRawBlockSelectors = (mottoStyler) =>
	mottoStyler?.blockSelectors !== undefined
		? mottoStyler.blockSelectors
		: mottoStyler?.innerSelectors;

export const withRuntimeBlockSelectors = (mottoStyler = {}) => {
	const nextValue = {
		...(mottoStyler && typeof mottoStyler === "object" ? mottoStyler : {}),
		blockSelectors: normalizeBlockSelectorsByBreakpoint(resolveRawBlockSelectors(mottoStyler)),
	};
	delete nextValue.innerSelectors;
	delete nextValue.selectors;
	return nextValue;
};

export const withPersistedBlockSelectors = (mottoStyler = {}) => {
	const nextValue = {
		...(mottoStyler && typeof mottoStyler === "object" ? mottoStyler : {}),
		blockSelectors: normalizeBlockSelectorsSelectorList(resolveRawBlockSelectors(mottoStyler)),
	};
	delete nextValue.innerSelectors;
	delete nextValue.selectors;
	return nextValue;
};

export const INNER_SELECTOR_BREAKPOINT_KEYS = BREAKPOINT_KEYS;
