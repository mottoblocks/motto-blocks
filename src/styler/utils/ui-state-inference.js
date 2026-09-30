const SPACING_PRESET_TOKEN_RE = /^var:preset\|spacing\|([a-z0-9-]+)$/i;
const SPACING_PRESET_VAR_RE = /^var\(--wp--preset--spacing--([a-z0-9-]+)(?:\s*,[\s\S]+)?\)$/i;

const toTrimmed = (value) => (value === undefined || value === null ? "" : String(value).trim());

export const INPUT_MODE_PRESETS = "presets";
export const INPUT_MODE_CUSTOM = "custom";

export const isSpacingPresetToken = (value) => {
	const raw = toTrimmed(value);
	if (!raw) return false;
	if (raw === "0") return true;
	if (SPACING_PRESET_TOKEN_RE.test(raw)) return true;
	return SPACING_PRESET_VAR_RE.test(raw);
};

export const inferSpacingInputModeFromValue = (value) => {
	const raw = toTrimmed(value);
	if (!raw) return INPUT_MODE_PRESETS;
	return isSpacingPresetToken(raw) ? INPUT_MODE_PRESETS : INPUT_MODE_CUSTOM;
};

export const inferAxisInputModeFromValues = (a, b) => {
	const modeA = inferSpacingInputModeFromValue(a);
	const modeB = inferSpacingInputModeFromValue(b);
	return modeA === INPUT_MODE_CUSTOM || modeB === INPUT_MODE_CUSTOM
		? INPUT_MODE_CUSTOM
		: INPUT_MODE_PRESETS;
};
