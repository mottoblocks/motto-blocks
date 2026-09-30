import {
	normalizeSpacingPresetSlug,
	toCoreSpacingPresetVar,
	toSpacingPresetToken,
} from "./core-preset-values.js";
import {
	expandFourValueShorthand,
	splitAtFirstTopLevelDelimiter,
	splitTopLevelTokens,
	stripTrailingImportant,
} from "./top-level-token-utils.js";
import {
	isCssExpressionValue,
	isCssKeywordValue,
	CSS_UNIT,
} from "@components/primitives/var-unit-utils.js";

const SPACING_PRESET_TOKEN_RE = /^var:preset\|spacing\|([a-z0-9-]+)$/i;
const NUMERIC_VALUE_RE = /^-?(?:\d+\.?\d*|\.\d+)[a-z%]+$/i;
const SPACING_PRESET_VAR_RE = /^var\(--wp--preset--spacing--([a-z0-9-]+)(?:\s*,[\s\S]+)?\)$/i;

const toTrimmed = (value) => (value === undefined || value === null ? "" : String(value).trim());

export const splitTopLevelSpaceTokens = (value) =>
	splitTopLevelTokens(value, { splitOnCommas: true });
export { splitAtFirstTopLevelDelimiter };

export const toSpacingControlToken = (value) => {
	const raw = toTrimmed(value);
	if (!raw) return undefined;
	if (raw === "0") return "0";
	const tokenMatch = raw.match(SPACING_PRESET_TOKEN_RE);
	if (tokenMatch?.[1]) return toSpacingPresetToken(tokenMatch[1]);
	const varMatch = raw.match(SPACING_PRESET_VAR_RE);
	if (varMatch?.[1]) return toSpacingPresetToken(varMatch[1]);
	return raw;
};

export const isSpacingPresetValue = (value) => {
	const token = toSpacingControlToken(value);
	if (!token) return false;
	return token === "0" || SPACING_PRESET_TOKEN_RE.test(token);
};

// True only for Motto's internal `var:preset|spacing|X` marker — never valid
// CSS. Unlike isSpacingPresetValue (which also matches the equivalent real
// `var(--wp--preset--spacing--X)` CSS form), this distinguishes "still the raw
// slider token" from "a CSS var() the user already typed/selected themselves".
export const isRawSpacingPresetToken = (value) => SPACING_PRESET_TOKEN_RE.test(toTrimmed(value));

export const getSpacingPresetSlug = (value) => {
	const token = toSpacingControlToken(value);
	if (!token) return undefined;
	if (token === "0") return "0";
	const match = token.match(SPACING_PRESET_TOKEN_RE);
	return match?.[1] || undefined;
};

export const toSpacingPresetOptionValue = (slug) => {
	return toSpacingPresetToken(slug);
};

export const getSpacingCustomValueFromPreset = (value, spacingSizes) => {
	if (!isSpacingPresetValue(value)) return value;
	const slug = getSpacingPresetSlug(value);
	const spacingSize = (Array.isArray(spacingSizes) ? spacingSizes : []).find(
		(size) => normalizeSpacingPresetSlug(size?.slug) === normalizeSpacingPresetSlug(slug)
	);
	return spacingSize?.size;
};

export const getSpacingPresetValueFromCustomValue = (value, spacingSizes) => {
	if (!value || isSpacingPresetValue(value) || String(value) === "0") {
		return value;
	}
	const spacingMatch = (Array.isArray(spacingSizes) ? spacingSizes : []).find(
		(size) => String(size?.size) === String(value)
	);
	if (spacingMatch?.slug) {
		return toSpacingPresetToken(spacingMatch.slug);
	}
	return value;
};

export const toSpacingCssValue = (next, spacingSizes = []) => {
	return toCoreSpacingPresetVar(next, spacingSizes);
};

export const mergeSpacingPatchToCss = (currentValue, patch, spacingSizes = []) => {
	const base = parseSpacingSidesForControl(currentValue);
	const merged = {
		...base,
		...(patch && typeof patch === "object" ? patch : {}),
	};
	return stringifySpacingSidesToCss(merged, spacingSizes);
};

export const parseSpacingSidesForControl = (value) => {
	const raw = stripTrailingImportant(toTrimmed(value));
	if (!raw) {
		return { top: "", right: "", bottom: "", left: "" };
	}

	const parts = splitTopLevelSpaceTokens(raw);
	const [top, right, bottom, left] = expandFourValueShorthand(parts.length ? parts : [raw]).map(
		(part) => toSpacingControlToken(part) || ""
	);
	return { top, right, bottom, left };
};

export const stringifySpacingSidesToCss = (sides, spacingSizes = []) => {
	const rawTop = toSpacingCssValue(sides?.top, spacingSizes);
	const rawRight = toSpacingCssValue(sides?.right ?? sides?.left ?? rawTop, spacingSizes);
	const rawBottom = toSpacingCssValue(sides?.bottom ?? rawTop, spacingSizes);
	const rawLeft = toSpacingCssValue(sides?.left ?? sides?.right ?? rawRight, spacingSizes);
	const hasAnyValue = [rawTop, rawRight, rawBottom, rawLeft].some(Boolean);

	if (!hasAnyValue) return "";

	// CSS shorthands cannot preserve "unset on one axis, set on the other".
	// Normalize missing sides to 0 so axial controls do not collapse into
	// ambiguous one-value shorthands like "auto", which would rehydrate both axes.
	const top = rawTop || "0";
	const right = rawRight || "0";
	const bottom = rawBottom || "0";
	const left = rawLeft || "0";

	if (top === right && top === bottom && top === left) return top;
	if (top === bottom && right === left) return `${top} ${right}`;
	if (right === left) return `${top} ${right} ${bottom}`;
	return `${top} ${right} ${bottom} ${left}`;
};

// --- Logical start/end pairs (margin-block, padding-inline, inset-block, …) ---
// These shorthands take at most two values — `<start> <end>` — along a single
// logical axis, so they can't reuse the four-side physical helpers above.

export const parseSpacingPairForControl = (value) => {
	const raw = stripTrailingImportant(toTrimmed(value));
	if (!raw) return { start: "", end: "" };

	const parts = splitTopLevelSpaceTokens(raw);
	if (parts.length <= 1) {
		const both = toSpacingControlToken(parts[0] || raw) || "";
		return { start: both, end: both };
	}

	const [start, end] = parts.map((part) => toSpacingControlToken(part) || "");
	return { start, end };
};

export const stringifySpacingPairToCss = (pair, spacingSizes = []) => {
	const rawStart = toSpacingCssValue(pair?.start, spacingSizes);
	const rawEnd = toSpacingCssValue(pair?.end ?? pair?.start, spacingSizes);

	if (!rawStart && !rawEnd) return "";

	// Mirror the four-side helper: a bare one-value shorthand rehydrates onto
	// both ends, so pad a missing end with 0 rather than let it inherit `start`.
	const start = rawStart || "0";
	const end = rawEnd || "0";
	return start === end ? start : `${start} ${end}`;
};

export const mergeSpacingPairToCss = (currentValue, patch, spacingSizes = []) => {
	const base = parseSpacingPairForControl(currentValue);
	const merged = {
		...base,
		...(patch && typeof patch === "object" ? patch : {}),
	};
	return stringifySpacingPairToCss(merged, spacingSizes);
};

/**
 * Categorizes a CSS spacing value into one of three non-empty kinds:
 *   "custom"  — recognizable numeric value with a unit (e.g. "16px", "1.5rem")
 *   "preset"  — spacing preset token (e.g. "var:preset|spacing|40")
 *   "css"     — CSS expression or keyword (e.g. "var(--token)", "calc(100% - 8px)", "inherit")
 *
 * Priority order matters: preset must be checked before css because preset
 * tokens pass the isCssExpressionValue test.
 */
export const categorizeSpacingValue = (value) => {
	const str = String(value ?? "").trim();
	if (!str) return { kind: "raw", unit: null };

	// 1. Numeric value with unit, or bare "0"
	if (str === "0" || NUMERIC_VALUE_RE.test(str)) {
		const unitMatch = str.match(/([a-z%]+)$/i);
		return { kind: "custom", unit: unitMatch ? unitMatch[1].toLowerCase() : null };
	}

	// 2. Spacing preset token — must come before css check
	if (isSpacingPresetValue(str)) {
		return { kind: "preset", unit: null };
	}

	// 3. CSS expression (var(), calc(), clamp(), etc.) or global keyword.
	if (isCssExpressionValue(str) || isCssKeywordValue(str)) {
		return { kind: "css", unit: CSS_UNIT };
	}

	// 4. Any remaining non-empty value is edited through the free CSS slot.
	return { kind: "css", unit: CSS_UNIT };
};

export const resolvePresetCustomTransition = ({
	isCustom,
	isPreset,
	presetSlug,
	rawValue,
	customValueForDisplay,
	selectedUnit,
	unitStep,
	minimumCustomValue,
	parseQuantityAndUnit,
	applyStep,
	VAR_UNIT,
}) => {
	// Rama A: custom → preset (volver al slider)
	if (isCustom) {
		if (isPreset) {
			return {
				nextMode: "presets",
				nextValue: toSpacingPresetOptionValue(presetSlug),
				nextUnit: VAR_UNIT,
				shouldEmit: true,
			};
		}
		return { nextMode: "presets", nextValue: null, nextUnit: null, shouldEmit: false };
	}

	// Rama B: preset real → custom
	if (isPreset) {
		return {
			nextMode: "custom",
			nextValue: customValueForDisplay,
			nextUnit: VAR_UNIT,
			shouldEmit: true,
		};
	}

	// Rama C: preset None ("0") → custom. Regla: "0" siempre es "0px"
	if (rawValue === "0") {
		const stepped = applyStep(0, unitStep, minimumCustomValue);
		const qty = Number.isFinite(stepped) ? stepped : 0;
		return {
			nextMode: "custom",
			nextValue: `${qty}px`,
			nextUnit: "px",
			shouldEmit: true,
		};
	}

	// Rama E: vacío ("") → custom. No forzar valor; "" es undefined, no 0
	if (rawValue === "") {
		return {
			nextMode: "custom",
			nextValue: "",
			nextUnit: selectedUnit || "px",
			shouldEmit: false,
		};
	}

	// Rama D: valor con unidad → custom. Preservar unit del valor existente
	const [quantity, unitRaw] = parseQuantityAndUnit(rawValue);
	const nextUnit =
		String(unitRaw || "")
			.trim()
			.toLowerCase() ||
		selectedUnit ||
		"px";
	const steppedNumeric = applyStep(quantity, unitStep, minimumCustomValue);
	const nextValue = Number.isFinite(steppedNumeric) ? `${steppedNumeric}${nextUnit}` : rawValue;
	return {
		nextMode: "custom",
		nextValue,
		nextUnit,
		shouldEmit: true,
	};
};
