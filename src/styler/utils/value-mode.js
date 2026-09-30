import { categorizeSpacingValue } from "./spacing-value-utils";

export const MODE_PRESET = "preset";
export const MODE_CUSTOM = "custom";
export const MODE_CSS = "css";

// "0" is the None preset slug and also the shorthand/axial placeholder the CSS
// serializer writes for an untouched side/corner — it must stay in preset
// mode, not flip to a custom "0". "auto" (spacing only) has its own toggle
// orthogonal to mode, so it also stays in preset mode rather than opening the
// custom editor with a blank/auto number.
export const detectValueMode = (raw) => {
	const value = String(raw ?? "").trim();
	if (!value || value === "0" || value === "auto") return MODE_PRESET;
	const kind = categorizeSpacingValue(value).kind;
	if (kind === "preset") return MODE_PRESET;
	if (kind === "css") return MODE_CSS;
	return MODE_CUSTOM;
};

// Ephemeral per-popup memory of the last value seen for each mode of a slot
// (side/corner), so switching modes shows what was last there instead of a
// resolved placeholder or blank editor. Lives only in the owning control's
// React state — never persisted to the block attribute, gone once the popup
// unmounts. `categorizeSpacingValue`'s own kind ("custom"/"preset"/"css")
// decides the slot to write to, regardless of which UI mode produced the
// value — e.g. typing "2px" into the css textarea still files under
// "custom", so switching to the numeric editor later shows it there.
export const writeSlotMemory = (memory, key, value) => {
	const trimmed = String(value ?? "").trim();
	if (!trimmed || trimmed === "auto") return memory;
	const kind = categorizeSpacingValue(trimmed).kind;
	if (kind !== MODE_CUSTOM && kind !== MODE_PRESET && kind !== MODE_CSS) return memory;
	return {
		...memory,
		[key]: { ...memory[key], [kind]: trimmed },
	};
};

// Clearing a slot's value clears all 3 remembered modes for it too — stale
// memory shouldn't resurface once the user has explicitly emptied the field.
export const clearSlotMemory = (memory, key) => {
	if (!memory[key]) return memory;
	const next = { ...memory };
	delete next[key];
	return next;
};

export const readSlotMemory = (memory, key, mode, fallback) => memory[key]?.[mode] ?? fallback;

// What to fall back to when a mode has no memory yet. The custom editor
// deliberately resolves a preset down to its concrete size (PresetValueRow's
// own resolvedForCustom) — "what is this preset currently worth" is a
// meaningful seed for a numeric field. The free-text css editor has no such
// meaningful derivation: entering it fresh must never auto-populate with a
// preset's var() or a plain numeric value — it should start from whatever the
// live value already IS as a css expression, or blank otherwise.
export const resolveDisplayFallback = (mode, rawValue) => {
	if (mode !== MODE_CSS) return rawValue;
	return detectValueMode(rawValue) === MODE_CSS ? rawValue : "";
};
