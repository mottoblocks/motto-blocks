import {
	isColorKeyword,
	isColorToken,
	isLengthToken,
	splitCssAtDepthZero,
	tokenizeCssValue,
} from "./css-value-utils.js";
import { canVisualizeBorderRadiusValue } from "./border-radius-value-utils.js";
import { categorizeSpacingValue } from "./spacing-value-utils.js";
import { canVisualizeGridTemplateTracksValue } from "./grid-template-tracks-utils.js";
import { canVisualizeScaleValue } from "./scale-value-utils.js";
import { isVarFunctionValue } from "@components/primitives/var-unit-utils.js";

const TYPE_SPACING_SINGLE = "spacing-single";
const TYPE_SPACING_MULTIPLE = "spacing-multiple";
const TYPE_BACKGROUND_IMAGE = "background-image";
const TYPE_GRID_TEMPLATE_COLUMNS = "grid-template-columns";
const TYPE_GRID_TEMPLATE_ROWS = "grid-template-rows";
const TYPE_GRID_TEMPLATE_TRACKS = "grid-template-tracks";

export const normalizeValueType = (value) =>
	String(value || "")
		.trim()
		.toLowerCase();

const getEnumOptionName = (option) => {
	if (option && typeof option === "object") {
		return String(option.name || option.value || "");
	}
	return String(option || "");
};

const getEnumOptionNames = (options) =>
	Array.isArray(options) ? options.map(getEnumOptionName).filter(Boolean) : [];

export const canVisualizeSpacingToken = (token) => {
	const raw = String(token || "").trim();
	if (!raw) return false;
	if (raw.toLowerCase() === "auto") return true;
	const category = categorizeSpacingValue(raw);
	return category.kind === "custom" || category.kind === "preset" || category.kind === "css";
};

export const canVisualizeSpacingValue = (rawValue) => {
	const tokens = tokenizeCssValue(rawValue);
	if (tokens.length === 0 || tokens.length > 4) return false;
	return tokens.every((token) => canVisualizeSpacingToken(token));
};

export const canVisualizeColorValue = (rawValue) => {
	const value = String(rawValue || "").trim();
	if (!value) return true;
	if (/^var\(--wp--preset--color--[a-z0-9-]+(?:\s*,[\s\S]+)?\)$/i.test(value)) return true;
	if (isVarFunctionValue(value)) return false;
	if (/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)) return true;
	if (/^(rgb|rgba|hsl|hsla)\(/i.test(value)) return true;
	if (isColorKeyword(value)) return false;
	return isColorToken(value);
};

export const canVisualizeBackgroundValue = (rawValue) => {
	const value = String(rawValue || "").trim();
	if (!value) return true;
	if (!isVarFunctionValue(value)) return true;
	return /^var\(--wp--preset--color--[a-z0-9-]+(?:\s*,[\s\S]+)?\)$/i.test(value);
};

export const canVisualizeBackgroundImageValue = (rawValue) => {
	const value = String(rawValue || "").trim();
	if (!value) return true;
	const layers = splitCssAtDepthZero(value);
	if (layers.length === 0) return value.toLowerCase() === "none";
	return layers.every((layer) => {
		const token = String(layer || "").trim();
		if (!token) return false;
		if (token.toLowerCase() === "none") return true;
		return /^(url|linear-gradient|radial-gradient|conic-gradient)\(/i.test(token);
	});
};

export const canVisualizeFontSizeValue = (rawValue) => {
	const value = String(rawValue || "").trim();
	if (!value) return true;
	if (!isVarFunctionValue(value)) return true;
	return /^var\(--wp--preset--font-size--[a-z0-9-]+(?:\s*,[\s\S]+)?\)$/i.test(value);
};

export const canVisualizeFontFamilyValue = (rawValue) => {
	const value = String(rawValue || "").trim();
	if (!value) return true;
	if (!isVarFunctionValue(value)) return true;
	return true;
};

export const canVisualizeAspectRatioValue = (rawValue) => {
	const value = String(rawValue || "").trim();
	if (!value) return true;
	if (value.toLowerCase() === "auto") return true;
	const match = value.match(/^(\d*\.?\d+)(?:\s*\/\s*(\d*\.?\d+))?$/);
	if (!match) return false;
	const numerator = Number(match[1]);
	const denominator = Number(match[2] || "1");
	return (
		Number.isFinite(numerator) &&
		Number.isFinite(denominator) &&
		numerator > 0 &&
		denominator > 0
	);
};

export const canVisualizeEnumValue = (rawValue, enumOptions = []) => {
	const value = String(rawValue || "").trim();
	if (!value) return true;
	const options = getEnumOptionNames(enumOptions).map((entry) =>
		String(entry || "")
			.trim()
			.toLowerCase()
	);
	if (options.length === 0) return true;
	return options.includes(value.toLowerCase());
};

/** CSS `<number>` tokens editable by MottoNumberControl (flex-grow/shrink, etc.). */
export const canVisualizeCssNumberValue = (rawValue) => {
	const value = String(rawValue || "").trim();
	if (!value) return true;
	return /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value);
};

/** True when the property's `units` config explicitly allows a bare (unitless) number, e.g. line-height. */
const allowsUnitlessLength = (config) => {
	const units = Array.isArray(config?.units) ? config.units : null;
	if (!units) return false;
	return units.some((entry) => {
		const unitValue = typeof entry === "object" ? entry?.value : entry;
		return String(unitValue ?? "").trim() === "";
	});
};

/**
 * Length-ish tokens for composite fields (e.g. flex-basis).
 * Conservative: unknown functions / intrinsic keywords → not visualizable (open in code).
 */
export const canVisualizeLengthFieldValue = (rawValue, config) => {
	const value = String(rawValue || "").trim();
	if (!value) return true;
	const lower = value.toLowerCase();
	if (lower === "auto") return true;
	if (isLengthToken(value)) return true;
	if (allowsUnitlessLength(config) && canVisualizeCssNumberValue(value)) return true;
	if (/^var\(--wp--preset--spacing--[a-z0-9-]+(?:\s*,[\s\S]+)?\)$/i.test(value)) return true;
	if (/^var:preset\|spacing\|[a-z0-9-]+$/i.test(value)) return true;
	if (/^var\(\s*--/i.test(value) && value.endsWith(")")) return true;
	if (/calc\s*\(|min\s*\(|max\s*\(|clamp\s*\(/i.test(value)) return false;
	if (["min-content", "max-content", "content"].includes(lower)) return false;
	if (/^fit-content\s*\(/i.test(value)) return false;
	return false;
};

const VALUE_TYPE_CAPABILITIES = {
	"aspect-ratio": {
		canVisualize: ({ value }) => canVisualizeAspectRatioValue(value),
	},
	background: {
		canVisualize: ({ value }) => canVisualizeBackgroundValue(value),
	},
	[TYPE_BACKGROUND_IMAGE]: {
		canVisualize: ({ value }) => canVisualizeBackgroundImageValue(value),
	},
	"border-radius": {
		canVisualize: ({ value }) => canVisualizeBorderRadiusValue(value),
	},
	color: {
		canVisualize: ({ value }) => canVisualizeColorValue(value),
	},
	enum: {
		canVisualize: ({ value, enumOptions }) => canVisualizeEnumValue(value, enumOptions),
	},
	length: {
		canVisualize: ({ value, config }) => canVisualizeLengthFieldValue(value, config),
	},
	number: {
		canVisualize: ({ value }) => canVisualizeCssNumberValue(value),
	},
	"font-family": {
		canVisualize: ({ value }) => canVisualizeFontFamilyValue(value),
	},
	scale: {
		canVisualize: ({ value }) => canVisualizeScaleValue(value),
	},
	"font-size": {
		canVisualize: ({ value }) => canVisualizeFontSizeValue(value),
	},
	[TYPE_GRID_TEMPLATE_COLUMNS]: {
		canVisualize: ({ value }) => canVisualizeGridTemplateTracksValue(value),
	},
	[TYPE_GRID_TEMPLATE_ROWS]: {
		canVisualize: ({ value }) => canVisualizeGridTemplateTracksValue(value),
	},
	[TYPE_GRID_TEMPLATE_TRACKS]: {
		canVisualize: ({ value }) => canVisualizeGridTemplateTracksValue(value),
	},
	[TYPE_SPACING_MULTIPLE]: {
		canVisualize: ({ value }) => canVisualizeSpacingValue(value),
	},
	[TYPE_SPACING_SINGLE]: {
		canVisualize: ({ value }) => canVisualizeSpacingValue(value),
	},
};

export const getValueTypeCapability = (popupType) => {
	const normalizedPopupType = normalizeValueType(popupType);
	if (!normalizedPopupType) return null;
	return VALUE_TYPE_CAPABILITIES[normalizedPopupType] || null;
};

export const canVisualizePopupValue = (popupType, rawValue, enumOptions = [], config) => {
	const value = String(rawValue || "").trim();
	if (!value) return true;
	const capability = getValueTypeCapability(popupType);
	if (!capability || typeof capability.canVisualize !== "function") return true;
	return capability.canVisualize({
		value,
		enumOptions,
		popupType: normalizeValueType(popupType),
		config,
	});
};
