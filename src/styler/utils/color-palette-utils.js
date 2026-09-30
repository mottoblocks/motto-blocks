import { isColorKeyword, isColorToken } from "./css-value-utils.js";

const PRESET_COLOR_VAR_RE = /^var\(--wp--preset--color--([a-z0-9-]+)(?:\s*,[\s\S]+)?\)$/i;

export const toPaletteColors = (colors) => (Array.isArray(colors) ? colors : []);

export const toPaletteVisualValue = (rawValue, colors = []) => {
	const current = String(rawValue || "").trim();
	if (!current) return "";
	const presetMatch = current.match(PRESET_COLOR_VAR_RE);
	if (presetMatch?.[1]) {
		const slug = presetMatch[1];
		const matched = toPaletteColors(colors).find(
			(color) => String(color?.slug || "").toLowerCase() === slug.toLowerCase()
		);
		return matched?.color || current;
	}
	if (isColorToken(current) || isColorKeyword(current)) return current;
	return current;
};

export const toStoredColorValue = (nextValue, colorToPresetVar = (next) => next) =>
	colorToPresetVar(nextValue);
