import { useEffect, useRef, useState } from "@wordpress/element";
import { createItemId } from "../utils/css-row-ids";

const FUNCTION_TOKEN_RE = /([a-zA-Z0-9-]+)\(([^)]*)\)/g;

const buildTypeMap = (types) =>
	(Array.isArray(types) ? types : []).reduce((acc, item) => {
		acc[item.key] = item;
		return acc;
	}, {});

/**
 * Shared entry-list state for CSS values that are a space-separated list of
 * typed functions (`type(args) type(args) ...`) — used by TransformControl
 * and FilterControl. Handles parsing/building, dedup-by-type, and
 * add/update/remove; callers only supply the type registry and how one
 * entry's args are read (`parseArgs`) and written (`buildArgs`/`createEntryFields`).
 *
 * `normalizeType` exists because function-name casing isn't uniform: filter
 * functions are lowercase (`blur`, `drop-shadow`), transform functions mix
 * case (`translateX`, `skewY`) and must be matched/emitted as-is.
 */
export const useCssFunctionListEntries = ({
	value,
	onChange,
	types,
	idPrefix,
	normalizeType = (type) => type,
	parseArgs,
	buildArgs,
	createEntryFields,
}) => {
	const typeMap = buildTypeMap(types);

	const parseValue = (raw) => {
		const raw2 = String(raw || "").trim();
		if (!raw2 || raw2.toLowerCase() === "none") return [];
		const entries = [];
		const used = new Set();
		let match;
		FUNCTION_TOKEN_RE.lastIndex = 0;
		while ((match = FUNCTION_TOKEN_RE.exec(raw2))) {
			const type = normalizeType(String(match[1] || "").trim());
			const args = String(match[2] || "").trim();
			const cfg = typeMap[type];
			if (!type || !cfg || used.has(type)) continue;
			used.add(type);
			entries.push({ id: createItemId(idPrefix), type, ...parseArgs(args, cfg) });
		}
		return entries;
	};

	const buildValue = (entries) =>
		(Array.isArray(entries) ? entries : [])
			.map((entry) => {
				const cfg = typeMap[entry?.type];
				if (!cfg) return "";
				const args = buildArgs(entry, cfg);
				return args ? `${entry.type}(${args})` : "";
			})
			.filter(Boolean)
			.join(" ");

	const [entries, setEntries] = useState(() => parseValue(value));
	const lastValueRef = useRef(String(value || "").trim());

	useEffect(() => {
		const nextValue = String(value || "").trim();
		if (nextValue === lastValueRef.current) return;
		lastValueRef.current = nextValue;
		setEntries(parseValue(nextValue));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [value]);

	const getAvailableTypes = (currentId = null) => {
		const used = new Set(
			entries
				.filter((entry) => entry?.id !== currentId)
				.map((entry) => String(entry?.type || "").trim())
				.filter(Boolean)
		);
		return (Array.isArray(types) ? types : []).filter((item) => !used.has(item.key));
	};

	const updateEntries = (next) => {
		const unique = [];
		const used = new Set();
		(Array.isArray(next) ? next : []).forEach((entry) => {
			const type = normalizeType(String(entry?.type || "").trim());
			if (!type || used.has(type)) return;
			used.add(type);
			unique.push(entry);
		});
		setEntries(unique);
		const output = buildValue(unique);
		lastValueRef.current = output;
		onChange(output);
	};

	const updateEntry = (id, patch) => {
		updateEntries(entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
	};

	const addEntry = (cfg) => {
		const target = cfg || getAvailableTypes()[0];
		if (!target) return;
		updateEntries([
			...entries,
			{ id: createItemId(idPrefix), type: target.key, ...createEntryFields(target) },
		]);
	};

	const removeEntry = (id) => {
		updateEntries(entries.filter((entry) => entry.id !== id));
	};

	return { entries, typeMap, getAvailableTypes, updateEntry, addEntry, removeEntry };
};
