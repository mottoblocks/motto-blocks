/**
 * useVarSuggestions — combined CSS custom property suggestions for the var-unit picker.
 *
 * Merges:
 * 1. CPT "motto_css_variable" records (user-defined tokens)
 * 2. Runtime --wp--* variables from document root computed styles
 */
import { useSelect } from "@wordpress/data";
import { useMemo } from "@wordpress/element";
import {
	createCssVariableSuggestionsFromRecords,
	selectAllCssVariableRecords,
} from "@lib/css-variable-records.js";

const getCoreVariables = () => {
	if (typeof window === "undefined" || !window.document?.documentElement) return [];
	try {
		const rootStyle = window.getComputedStyle(window.document.documentElement);
		const suggestions = [];
		const seen = new Set();
		for (let i = 0; i < rootStyle.length; i += 1) {
			const name = rootStyle[i];
			if (!name?.startsWith("--wp--")) continue;
			const key = name.toLowerCase();
			if (seen.has(key)) continue;
			seen.add(key);
			suggestions.push({
				label: name,
				value: name,
				meta: rootStyle.getPropertyValue(name).trim(),
			});
		}
		return suggestions;
	} catch {
		return [];
	}
};

export const useVarSuggestions = () => {
	const cptVariableRecords = useSelect(
		(select) => selectAllCssVariableRecords(select("core")),
		[]
	);

	const cptSuggestions = useMemo(() => {
		return createCssVariableSuggestionsFromRecords(cptVariableRecords);
	}, [cptVariableRecords]);

	const runtimeSuggestions = useMemo(() => getCoreVariables(), []);

	return useMemo(() => {
		const seen = new Set();
		const merged = [];
		[...cptSuggestions, ...runtimeSuggestions].forEach((entry) => {
			const key = String(entry?.label || "").toLowerCase();
			if (!key || seen.has(key)) return;
			seen.add(key);
			merged.push(entry);
		});
		return merged;
	}, [cptSuggestions, runtimeSuggestions]);
};
