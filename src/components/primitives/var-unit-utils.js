import { __ } from "@wordpress/i18n";

export const CSS_UNIT = "css";
/** @deprecated use CSS_UNIT */
export const VAR_UNIT = CSS_UNIT;

const CSS_UNIT_OPTION = { value: CSS_UNIT, label: __("CSS", "motto-blocks") };
const UNIT_VALUE_RE = /^-?(?:\d+\.?\d*|\.\d+)([a-z%]+)$/i;

/**
 * Ensure the "CSS" unit appears last in a units array.
 * Removes any existing "var" or "css" entry first, then appends it.
 */
export const ensureVarUnitLast = (units) => {
	const arr = Array.isArray(units) ? units : [];
	const filtered = arr.filter((u) => {
		const v = String(u?.value ?? u ?? "")
			.trim()
			.toLowerCase();
		return v !== "var" && v !== CSS_UNIT;
	});
	return [...filtered, CSS_UNIT_OPTION];
};

/**
 * Returns true if value is a CSS var() call referencing a custom property.
 */
export const isVarFunctionValue = (raw) => {
	const s = String(raw || "").trim();
	return /^var\(\s*--/i.test(s) && s.endsWith(")");
};

const CSS_KEYWORDS = new Set(["inherit", "initial", "unset", "revert", "revert-layer"]);

/**
 * Returns true if value is a global CSS keyword that maps to CSS mode in unit controls
 * (inherit, initial, unset, revert). Does NOT include "auto" which has separate handling.
 */
export const isCssKeywordValue = (raw) => {
	return CSS_KEYWORDS.has(
		String(raw || "")
			.trim()
			.toLowerCase()
	);
};

/**
 * Returns true if value is a CSS expression that can't be stored as Npx/Nem/etc.
 * Covers var(), clamp(), calc(), min(), max(), and any other non-numeric expression.
 * Excludes bare unit names (e.g. "em", "px") which are WP UnitControl artifacts
 * emitted when the numeric field is empty during a unit switch.
 */
export const isCssExpressionValue = (raw) => {
	const s = String(raw || "").trim();
	if (!s || s === "0") return false;
	// Plain number or number+unit → not a CSS expression
	if (/^-?(?:\d+\.?\d*|\.\d+)([a-z%]*)$/i.test(s)) return false;
	// Bare alphabetic/percentage token with no digits or special chars → WP artifact, not CSS
	if (/^[a-z%]+$/i.test(s)) return false;
	return true;
};

/**
 * Extracts "--token" from "var(--token)" or "var(--token, fallback)".
 */
export const extractVarToken = (raw) => {
	const match = String(raw || "")
		.trim()
		.match(/^var\(\s*(--[^,)\s]+)/i);
	return match ? match[1].trim() : "";
};

/**
 * Extracts the fallback value from "var(--token, fallback)".
 */
export const extractVarFallback = (raw) => {
	const s = String(raw || "").trim();
	if (!/^var\(/i.test(s) || !s.endsWith(")")) return "";
	let depth = 0;
	for (let i = 0; i < s.length; i++) {
		if (s[i] === "(") depth++;
		else if (s[i] === ")") depth--;
		else if (s[i] === "," && depth === 1) {
			return s.slice(i + 1, s.length - 1).trim();
		}
	}
	return "";
};

/**
 * Extracts a plain explicit unit from a non-var raw value (e.g. "1rem" -> "rem").
 */
export const extractNonVarUnit = (raw) => {
	const value = String(raw || "").trim();
	if (!value || isCssExpressionValue(value)) return "";
	const match = value.match(UNIT_VALUE_RE);
	return match?.[1] ? match[1].toLowerCase() : "";
};

/**
 * When leaving CSS mode, only restore a candidate whose explicit unit matches
 * the unit the user just selected.
 */
export const getCompatibleExitVarValue = ({ selectedUnit, lastNonVarValue, lastVarValue }) => {
	const desiredUnit = String(selectedUnit || "")
		.trim()
		.toLowerCase();
	if (desiredUnit === CSS_UNIT) return "";

	const candidates = [lastNonVarValue, extractVarFallback(lastVarValue)];
	for (const candidate of candidates) {
		const value = String(candidate || "").trim();
		if (!value || isCssExpressionValue(value)) continue;
		if (!desiredUnit) {
			if (extractNonVarUnit(value) === "" && /^-?(?:\d+\.?\d*|\.\d+)$/.test(value))
				return value;
			continue;
		}
		if (extractNonVarUnit(value) === desiredUnit) return value;
	}

	return "";
};

/**
 * Builds "var(--token)" or "var(--token, fallback)" from a token string.
 */
export const buildVarFunction = (token, fallback) => {
	const t = String(token || "").trim();
	if (!t) return "";
	const name = t.startsWith("--") ? t : `--${t}`;
	const fb = String(fallback || "").trim();
	return fb ? `var(${name}, ${fb})` : `var(${name})`;
};
