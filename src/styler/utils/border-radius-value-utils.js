import {
	isCssExpressionValue,
	isCssKeywordValue,
	isVarFunctionValue,
} from "@components/primitives/var-unit-utils.js";
import {
	expandFourValueShorthand,
	hasTopLevelDelimiter,
	splitAtFirstTopLevelDelimiter,
	splitTopLevelTokens,
	stripTrailingImportant,
} from "./top-level-token-utils.js";

export const BORDER_RADIUS_VIEW_ALL = "all";
export const BORDER_RADIUS_VIEW_CUSTOM = "custom";

const DEFAULT_RADIUS_UNIT = "px";
const LENGTH_UNITS_PATTERN = "(px|em|rem|%|vw|vh|vmin|vmax|ch|ex|cm|mm|in|pt|pc)";
const MALFORMED_UNIT_RE = /^(-?\d*\.?\d+)\s+undefined$/i;
const SPACED_UNIT_RE = new RegExp(`^(-?\\d*\\.?\\d+)\\s+${LENGTH_UNITS_PATTERN}$`, "i");
const NUMBER_RE = /^-?\d*\.?\d+$/;
const NORMALIZED_LENGTH_RE = new RegExp(`^-?\\d*\\.?\\d+(?:${LENGTH_UNITS_PATTERN})$`, "i");
const TRAILING_UNIT_RE = new RegExp(`^${LENGTH_UNITS_PATTERN}$`, "i");
const DEFAULT_VALUES = { topLeft: "", topRight: "", bottomRight: "", bottomLeft: "" };

const splitTopLevelSpaceTokens = (value) => splitTopLevelTokens(value);

export const normalizeBorderRadiusToken = (value) => {
	if (value === undefined || value === null) return "";

	if (typeof value === "number") {
		return value === 0 ? "0" : `${value}${DEFAULT_RADIUS_UNIT}`;
	}

	if (typeof value === "string") {
		const raw = value.trim();
		if (!raw) return "";

		const malformedMatch = raw.match(MALFORMED_UNIT_RE);
		if (malformedMatch) {
			const [, numeric] = malformedMatch;
			return numeric === "0" ? "0" : `${numeric}${DEFAULT_RADIUS_UNIT}`;
		}

		const spacedUnitMatch = raw.match(SPACED_UNIT_RE);
		if (spacedUnitMatch) {
			const [, numeric, unit] = spacedUnitMatch;
			return numeric === "0" ? "0" : `${numeric}${unit}`;
		}

		if (NUMBER_RE.test(raw)) {
			return raw === "0" ? "0" : `${raw}${DEFAULT_RADIUS_UNIT}`;
		}

		const lastParenIdx = raw.lastIndexOf(")");
		if (lastParenIdx >= 0 && lastParenIdx < raw.length - 1) {
			const afterParen = raw.slice(lastParenIdx + 1).trim();
			if (TRAILING_UNIT_RE.test(afterParen)) {
				const candidate = raw.slice(0, lastParenIdx + 1);
				if (isVarFunctionValue(candidate)) return candidate;
			}
		}

		return raw;
	}

	if (typeof value === "object") {
		const rawNumericValue =
			typeof value.value === "number" || typeof value.value === "string"
				? String(value.value).trim()
				: "";
		const normalizedUnit =
			typeof value.unit === "string" &&
			value.unit.trim() &&
			value.unit.trim().toLowerCase() !== "undefined"
				? value.unit.trim()
				: DEFAULT_RADIUS_UNIT;

		if (rawNumericValue) {
			if (rawNumericValue === "0") return "0";
			if (/^-?\d*\.?\d+$/.test(rawNumericValue)) {
				return `${rawNumericValue}${normalizedUnit}`;
			}
			return normalizeBorderRadiusToken(rawNumericValue);
		}

		if (typeof value.slug === "string" && value.slug.trim()) {
			return value.slug.trim();
		}
	}

	return "";
};

export const normalizeBorderRadiusControlToken = (value) => {
	const normalized = normalizeBorderRadiusToken(value);
	if (!normalized) return "";
	if (normalized === "0") return "0";
	if (NORMALIZED_LENGTH_RE.test(normalized)) return normalized;
	if (isVarFunctionValue(normalized)) return normalized;
	// Any other CSS expression (calc(), clamp(), min(), max(), a var() nested
	// inside one of those, …) or global keyword — the free-text css slot in
	// PresetValueRow already handles these; the token-acceptance check here
	// must not be stricter than what that slot can actually display.
	if (isCssExpressionValue(normalized) || isCssKeywordValue(normalized)) return normalized;
	return "";
};

export const parseBorderRadiusValue = (raw) => {
	const value = normalizeBorderRadiusToken(stripTrailingImportant(raw));
	if (!value) {
		return { ...DEFAULT_VALUES };
	}

	const radiusPart = splitAtFirstTopLevelDelimiter(value, "/");
	const tokens = splitTopLevelSpaceTokens(radiusPart);
	if (tokens.length === 0) {
		return { ...DEFAULT_VALUES };
	}

	const [topLeft, topRight, bottomRight, bottomLeft] = expandFourValueShorthand(tokens).map(
		(token) => normalizeBorderRadiusControlToken(token)
	);
	return { topLeft, topRight, bottomRight, bottomLeft };
};

export const buildBorderRadiusValue = (next) => {
	if (!next || typeof next !== "object") return "";
	const topLeft = normalizeBorderRadiusToken(next.topLeft);
	const topRight = normalizeBorderRadiusToken(next.topRight);
	const bottomRight = normalizeBorderRadiusToken(next.bottomRight);
	const bottomLeft = normalizeBorderRadiusToken(next.bottomLeft);

	if (!topLeft && !topRight && !bottomRight && !bottomLeft) return "";

	if (topLeft && topLeft === topRight && topLeft === bottomRight && topLeft === bottomLeft) {
		return topLeft;
	}

	if (
		topLeft &&
		bottomRight &&
		topRight &&
		bottomLeft &&
		topLeft === bottomRight &&
		topRight === bottomLeft
	) {
		return `${topLeft} ${topRight}`;
	}

	if (topLeft && topRight && bottomRight && bottomLeft && topRight === bottomLeft) {
		return `${topLeft} ${topRight} ${bottomRight}`;
	}

	return [topLeft, topRight, bottomRight, bottomLeft].filter(Boolean).join(" ");
};

export const getBorderRadiusInitialView = (rawCss) => {
	const normalized = normalizeBorderRadiusToken(stripTrailingImportant(rawCss));
	if (!normalized) return BORDER_RADIUS_VIEW_ALL;
	const tokens = splitTopLevelSpaceTokens(splitAtFirstTopLevelDelimiter(normalized, "/"));
	if (tokens.length <= 1) return BORDER_RADIUS_VIEW_ALL;
	const parsed = parseBorderRadiusValue(rawCss);
	const { topLeft, topRight, bottomRight, bottomLeft } = parsed;
	if (topLeft && topLeft === topRight && topLeft === bottomRight && topLeft === bottomLeft) {
		return BORDER_RADIUS_VIEW_ALL;
	}
	return BORDER_RADIUS_VIEW_CUSTOM;
};

export const canVisualizeBorderRadiusValue = (rawValue) => {
	const normalized = normalizeBorderRadiusToken(stripTrailingImportant(rawValue));
	if (!normalized) return true;
	if (hasTopLevelDelimiter(normalized, "/")) return false;
	const tokens = splitTopLevelSpaceTokens(normalized);
	if (tokens.length === 0 || tokens.length > 4) return false;
	return tokens.every((token) => normalizeBorderRadiusControlToken(token) !== "");
};
