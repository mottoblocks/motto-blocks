import { useCallback, useMemo } from "@wordpress/element";
import {
	isColorKeyword,
	isColorToken,
	isLengthToken,
	tokenizeCssValue,
} from "../utils/css-value-utils.js";
import { canVisualizePopupValue } from "../utils/value-type-capabilities.js";
import {
	toCoreColorPresetVar,
	toCoreFontFamilyPresetVar,
	toCoreFontSizePresetVar,
	toCoreSpacingPresetVar,
} from "../utils/core-preset-values.js";

const META_OPTION_KEYS = new Set(["__patterns", "__aliases"]);
const TYPE_SPACING_SINGLE = "spacing-single";
const TYPE_SPACING_MULTIPLE = "spacing-multiple";

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const wildcardToRegex = (pattern) => {
	const source = String(pattern || "").trim();
	if (!source || !source.includes("*")) return null;
	const parts = source.split("*").map((part) => escapeRegex(part));
	return new RegExp(`^${parts.join(".*")}$`, "i");
};

const toPatternConfig = (entry = {}) => {
	const out = { ...entry };
	delete out.match;
	delete out.pattern;
	delete out.regex;
	return out;
};

const mergeConfig = (base, extra) => {
	if (!base && !extra) return null;
	if (!base) return extra;
	if (!extra) return base;
	return { ...base, ...extra };
};

const normalizeDefaultView = (value) => {
	const normalized = String(value || "")
		.trim()
		.toLowerCase();
	if (normalized === "code") return "code";
	return "visual";
};

const getConfigType = (config) =>
	String(config?.type || "")
		.trim()
		.toLowerCase();
const isSpacingSingleType = (config) => getConfigType(config) === TYPE_SPACING_SINGLE;
const isSpacingMultiType = (config) => getConfigType(config) === TYPE_SPACING_MULTIPLE;

const getValueOptionsMap = (valueOptions) => {
	const normalized = {};
	Object.keys(valueOptions || {}).forEach((key) => {
		const lowerKey = String(key).toLowerCase();
		if (META_OPTION_KEYS.has(lowerKey)) return;
		if (String(key).includes("*")) return;
		normalized[lowerKey] = valueOptions[key];
	});
	return normalized;
};

const getValueOptionsPatterns = (valueOptions) => {
	const patterns = [];

	Object.keys(valueOptions || {}).forEach((key) => {
		const lowerKey = String(key).toLowerCase();
		if (META_OPTION_KEYS.has(lowerKey)) return;
		if (!String(key).includes("*")) return;
		const regex = wildcardToRegex(lowerKey);
		if (!regex) return;
		patterns.push({
			regex,
			config: valueOptions[key],
		});
	});

	const extra = Array.isArray(valueOptions?.__patterns) ? valueOptions.__patterns : [];
	extra.forEach((entry) => {
		if (!entry || typeof entry !== "object") return;

		let regex = null;
		if (typeof entry.match === "string" && entry.match.trim()) {
			try {
				regex = new RegExp(entry.match, "i");
			} catch {
				regex = null;
			}
		}
		if (!regex && typeof entry.pattern === "string") {
			regex = wildcardToRegex(entry.pattern.toLowerCase());
		}
		if (!regex && typeof entry.regex === "string") {
			try {
				regex = new RegExp(entry.regex, "i");
			} catch {
				regex = null;
			}
		}
		if (!regex) return;

		patterns.push({
			regex,
			config: toPatternConfig(entry),
		});
	});

	return patterns;
};

const getValueOptionsAliases = (valueOptions) => {
	const rawAliases =
		valueOptions &&
		typeof valueOptions.__aliases === "object" &&
		!Array.isArray(valueOptions.__aliases)
			? valueOptions.__aliases
			: {};
	const aliases = {};
	Object.keys(rawAliases).forEach((key) => {
		const from = String(key || "")
			.trim()
			.toLowerCase();
		const to = String(rawAliases[key] || "")
			.trim()
			.toLowerCase();
		if (!from || !to) return;
		aliases[from] = to;
	});
	return aliases;
};

const resolveAliasKey = (key, aliasMap) => {
	const start = String(key || "")
		.trim()
		.toLowerCase();
	if (!start) return "";
	let current = start;
	const visited = new Set([start]);
	while (aliasMap[current]) {
		const next = String(aliasMap[current] || "")
			.trim()
			.toLowerCase();
		if (!next || visited.has(next)) break;
		current = next;
		visited.add(next);
	}
	return current;
};

const getEnumOptionName = (option) => {
	if (option && typeof option === "object") {
		return String(option.name || option.value || "");
	}
	return String(option || "");
};

const getEnumOptionNames = (options) =>
	Array.isArray(options) ? options.map(getEnumOptionName).filter(Boolean) : [];

const parseCompositeValueParts = (rawValue, fieldCount) => {
	const count = Number.isFinite(Number(fieldCount)) ? Number(fieldCount) : 0;
	if (count <= 0) return [];
	const tokens = tokenizeCssValue(rawValue || "");
	const parts = Array(count).fill("");
	tokens.slice(0, count).forEach((token, index) => {
		parts[index] = token;
	});
	return parts;
};

const getCompositeFieldDefaultValue = (fieldMetaEntry) => {
	const raw = String(fieldMetaEntry?.config?.default || "").trim();
	return raw;
};

const mergeCompositeValueParts = (parts = [], fieldMeta = []) => {
	const list = Array.isArray(parts) ? parts : [];
	let lastFilledIndex = -1;
	list.forEach((part, index) => {
		if (String(part || "").trim() !== "") lastFilledIndex = index;
	});
	if (lastFilledIndex < 0) return "";
	const tokens = [];
	for (let index = 0; index <= lastFilledIndex; index += 1) {
		const direct = String(list[index] || "").trim();
		if (direct) {
			tokens.push(direct);
			continue;
		}
		const fallback = getCompositeFieldDefaultValue(fieldMeta[index]);
		if (fallback) {
			tokens.push(fallback);
		}
	}
	return tokens.join(" ");
};

export const usePropValueConfig = ({
	valueOptions = {},
	propKey,
	isKnownProp,
	isVarProp,
	itemValue,
	editorConfig = {},
	onValueChange,
}) => {
	const { spacingSizes = [], fontSizes = [], fontFamilies = [], themeColors = [] } = editorConfig;
	const valueOptionsMap = useMemo(() => getValueOptionsMap(valueOptions), [valueOptions]);
	const valueOptionsPatterns = useMemo(
		() => getValueOptionsPatterns(valueOptions),
		[valueOptions]
	);
	const valueOptionsAliases = useMemo(() => getValueOptionsAliases(valueOptions), [valueOptions]);
	const normalizedPropKey = useMemo(
		() =>
			String(propKey || "")
				.trim()
				.toLowerCase(),
		[propKey]
	);

	const normalizeConfig = useCallback((config) => {
		if (!config) return null;
		if (Array.isArray(config)) return { type: "enum", options: config };
		if (typeof config === "object") return config;
		return null;
	}, []);

	const resolveOptionsRef = useCallback(
		(config) => {
			if (!config) return config;
			if (config.ref) {
				const ref = valueOptionsMap[String(config.ref).toLowerCase()];
				const resolved = normalizeConfig(ref);
				return resolved || config;
			}
			if (config.type !== "enum") return config;
			if (Array.isArray(config.options)) return config;
			if (config.optionsRef) {
				const ref = valueOptionsMap[String(config.optionsRef).toLowerCase()];
				const resolved = normalizeConfig(ref);
				if (resolved && Array.isArray(resolved.options)) {
					return { ...config, options: resolved.options };
				}
			}
			return config;
		},
		[normalizeConfig, valueOptionsMap]
	);

	const getPropConfig = useCallback(
		(key) => {
			if (!key) return null;
			const normalizedKey = String(key).toLowerCase();
			const resolvedKey = resolveAliasKey(normalizedKey, valueOptionsAliases);
			const base = normalizeConfig(valueOptionsMap[resolvedKey]);
			const matchedPatternConfigs = valueOptionsPatterns
				.filter((entry) => entry.regex?.test(resolvedKey))
				.map((entry) => normalizeConfig(entry.config))
				.filter(Boolean);
			let resolved = null;
			matchedPatternConfigs.forEach((cfg) => {
				resolved = mergeConfig(resolved, cfg);
			});
			resolved = mergeConfig(resolved, base || null);
			if (!resolved) return null;
			if (!resolved.type && !base) return null;
			return resolveOptionsRef(resolved);
		},
		[
			normalizeConfig,
			resolveOptionsRef,
			valueOptionsAliases,
			valueOptionsMap,
			valueOptionsPatterns,
		]
	);

	const singlePropConfig = useMemo(
		() => getPropConfig(normalizedPropKey),
		[getPropConfig, normalizedPropKey]
	);

	const valuePlaceholders = useMemo(() => {
		const propConfig = singlePropConfig;
		if (isSpacingMultiType(propConfig)) return [];
		if (propConfig?.type === "composite" && propConfig.fields) {
			return Object.keys(propConfig.fields);
		}
		return [];
	}, [singlePropConfig]);

	const spacingSizesMemo = spacingSizes;
	const fontSizesMemo = fontSizes;

	const colorToPresetVar = useCallback(
		(next) => toCoreColorPresetVar(next, themeColors),
		[themeColors]
	);

	const fontSizeToPresetVar = useCallback(
		(next) => toCoreFontSizePresetVar(next, fontSizesMemo),
		[fontSizesMemo]
	);

	const fontFamilyToPresetVar = useCallback(
		(next) => toCoreFontFamilyPresetVar(next, fontFamilies),
		[fontFamilies]
	);

	const spacingToPresetVar = useCallback(
		(next) => toCoreSpacingPresetVar(next, spacingSizesMemo),
		[spacingSizesMemo]
	);

	const fieldMeta = useMemo(() => {
		if (valuePlaceholders.length === 0) return [];
		const propConfig = singlePropConfig;
		if (!propConfig || propConfig.type !== "composite" || !propConfig.fields) return [];
		return valuePlaceholders.map((placeholder) => {
			const key = String(placeholder || "")
				.toLowerCase()
				.trim();
			const fieldConfig = resolveOptionsRef(propConfig.fields?.[key]);
			return {
				key,
				placeholder,
				config: fieldConfig,
				isWidth:
					key.includes("width") ||
					isSpacingSingleType(fieldConfig) ||
					getConfigType(fieldConfig) === "length" ||
					(getConfigType(fieldConfig) === "number" &&
						(String(fieldConfig?.unit || "").trim() !== "" ||
							String(fieldConfig?.initialUnit || "").trim() !== "" ||
							(Array.isArray(fieldConfig?.units) && fieldConfig.units.length > 0))),
				isColor: key.includes("color") || key === "color" || fieldConfig?.type === "color",
			};
		});
	}, [resolveOptionsRef, singlePropConfig, valuePlaceholders]);

	const valueParts = useMemo(() => {
		if (valuePlaceholders.length === 0) return [];
		if (valuePlaceholders.length === 1) return [itemValue || ""];
		const propConfig = singlePropConfig;
		const isComposite =
			String(propConfig?.type || "")
				.trim()
				.toLowerCase() === "composite";
		if (isComposite) {
			return parseCompositeValueParts(itemValue || "", valuePlaceholders.length);
		}
		const tokens = tokenizeCssValue(itemValue || "");
		const parts = Array(valuePlaceholders.length).fill("");
		const emptyIndex = () => parts.findIndex((part) => part === "");
		const findFieldIndex = (predicate) => fieldMeta.findIndex(predicate);
		const spacingFieldIndexes = fieldMeta
			.map((field, index) => (field.isWidth ? index : -1))
			.filter((index) => index >= 0);
		let nextSpacingPointer = 0;

		tokens.forEach((token) => {
			let index = -1;
			const enumIndex = findFieldIndex((field) => {
				const options = getEnumOptionNames(field?.config?.options);
				return options.includes(token);
			});
			if (enumIndex >= 0) index = enumIndex;
			if (index < 0 && (isColorToken(token) || isColorKeyword(token))) {
				const colorIndex = findFieldIndex((field) => field.isColor);
				if (colorIndex >= 0) index = colorIndex;
			}
			if (index < 0 && isLengthToken(token)) {
				if (spacingFieldIndexes.length > 0) {
					const nextIdx =
						spacingFieldIndexes[nextSpacingPointer] ?? spacingFieldIndexes[0];
					index = nextIdx;
					nextSpacingPointer = Math.min(
						nextSpacingPointer + 1,
						spacingFieldIndexes.length - 1
					);
				}
			}
			if (index < 0) index = emptyIndex();
			if (index < 0) return;
			if (parts[index] === "") parts[index] = token;
		});

		return parts;
	}, [fieldMeta, itemValue, singlePropConfig, valuePlaceholders.length]);

	const updateValuePart = useCallback(
		(index, nextValue) => {
			const nextParts = [...valueParts];
			nextParts[index] = nextValue;
			const propConfig = singlePropConfig;
			const isComposite =
				String(propConfig?.type || "")
					.trim()
					.toLowerCase() === "composite";
			const merged = isComposite
				? mergeCompositeValueParts(nextParts, fieldMeta)
				: nextParts
						.map((part) => (part || "").trim())
						.filter(Boolean)
						.join(" ");
			onValueChange(merged);
		},
		[fieldMeta, onValueChange, singlePropConfig, valueParts]
	);

	const propPopupType = useMemo(() => {
		if (!propKey) return null;
		if (!isKnownProp || isVarProp) return null;
		const propConfig = singlePropConfig;
		if (isSpacingMultiType(propConfig)) return TYPE_SPACING_MULTIPLE;
		return null;
	}, [isKnownProp, isVarProp, propKey, singlePropConfig]);

	const getFieldPopupType = useCallback(
		(field) => {
			if (propPopupType) return propPopupType;
			if (!field) return null;
			const fieldConfig = field.config;
			if (fieldConfig?.type) return fieldConfig.type;
			return null;
		},
		[propPopupType]
	);

	const singlePopupType = useMemo(() => {
		if (propPopupType) return propPopupType;
		const propConfig = singlePropConfig;
		if (isSpacingMultiType(propConfig)) return TYPE_SPACING_MULTIPLE;
		if (propConfig?.type === "box-shadow") return "box-shadow";
		if (propConfig?.type) return propConfig.type;
		return null;
	}, [propPopupType, singlePropConfig]);

	const hasExplicitDefaultView = useMemo(() => {
		const singleView = String(singlePropConfig?.defaultView || "").trim();
		if (singleView) return true;
		return fieldMeta.some((field) => String(field?.config?.defaultView || "").trim() !== "");
	}, [fieldMeta, singlePropConfig]);

	const defaultValueView = useMemo(() => {
		if (!hasExplicitDefaultView) return null;
		const single = normalizeDefaultView(singlePropConfig?.defaultView);
		if (
			singlePropConfig?.defaultView !== undefined &&
			singlePropConfig?.defaultView !== null &&
			String(singlePropConfig?.defaultView).trim() !== ""
		) {
			return single;
		}
		const fieldViews = fieldMeta
			.map((field) => String(field?.config?.defaultView || "").trim())
			.filter(Boolean)
			.map(normalizeDefaultView);
		if (fieldViews.length === 0) return null;
		return fieldViews.includes("code") ? "code" : "visual";
	}, [fieldMeta, hasExplicitDefaultView, singlePropConfig]);

	const hasVisualValueEditor = useMemo(() => {
		if (valuePlaceholders.length > 0) return true;
		return Boolean(singlePopupType && singlePopupType !== "plain");
	}, [singlePopupType, valuePlaceholders.length]);

	const singleEnumOptions = useMemo(() => {
		const resolved = resolveOptionsRef(singlePropConfig);
		if (resolved?.type === "enum" && Array.isArray(resolved.options)) {
			return resolved.options;
		}
		return [];
	}, [resolveOptionsRef, singlePropConfig]);

	const shouldForceValueCodeView = useMemo(() => {
		const propType = String(singlePropConfig?.type || "")
			.trim()
			.toLowerCase();
		if (propType === "composite" && valuePlaceholders.length > 0) {
			const trimmed = String(itemValue || "").trim();
			if (trimmed) {
				const tokens = tokenizeCssValue(trimmed);
				if (tokens.length > valuePlaceholders.length) return true;
			}
		}
		if (valuePlaceholders.length > 0) {
			return valuePlaceholders.some((_, index) => {
				const meta = fieldMeta[index];
				const popupType = getFieldPopupType(meta);
				if (!popupType) return false;
				const value = valueParts[index] || "";
				const enumOptions =
					popupType === "enum" && Array.isArray(meta?.config?.options)
						? meta.config.options
						: [];
				return !canVisualizePopupValue(popupType, value, enumOptions, meta?.config);
			});
		}
		return !canVisualizePopupValue(
			singlePopupType,
			itemValue || "",
			singleEnumOptions,
			singlePropConfig
		);
	}, [
		fieldMeta,
		getFieldPopupType,
		itemValue,
		singleEnumOptions,
		singlePopupType,
		singlePropConfig,
		valueParts,
		valuePlaceholders,
	]);

	return {
		getPropConfig,
		valuePlaceholders,
		fieldMeta,
		valueParts,
		updateValuePart,
		getFieldPopupType,
		singlePropConfig,
		singlePopupType,
		defaultValueView,
		hasVisualValueEditor,
		singleEnumOptions,
		shouldForceValueCodeView,
		colorToPresetVar,
		fontSizeToPresetVar,
		fontFamilyToPresetVar,
		spacingToPresetVar,
		fontSizesMemo,
		spacingSizesMemo,
	};
};
