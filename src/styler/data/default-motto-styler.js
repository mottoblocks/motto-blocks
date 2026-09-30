import {
	withPersistedBlockSelectors,
	withRuntimeBlockSelectors,
} from "../utils/block-selectors-shape";
import { PRESETS } from "./motto-css-presets";

export const defaultMottoStyler = {
	instanceId: "",
	cssClasses: [],
	css: {
		desktop: [],
		tablet: [],
		landscapePhone: [],
		phone: [],
	},
	blockSelectors: [],
	html: {
		attributes: [],
	},
	ui: {
		spacing: {
			controls: {},
		},
	},
};

export const isPlainObject = (value) =>
	Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const normalizeMottoDefaultsValue = (raw) => {
	if (!isPlainObject(raw)) return {};
	const normalized = withRuntimeBlockSelectors(raw);
	const withPersistedShape = withPersistedBlockSelectors(normalized);
	return isPlainObject(withPersistedShape) ? withPersistedShape : {};
};

const resolvePresetMottoStyler = (slug, blockName) => {
	const preset = PRESETS.find((entry) => entry.slug === slug);
	if (isPlainObject(preset?.mottoStyler)) {
		return preset.mottoStyler;
	}
	console.error(
		`[${blockName || "motto-blocks"}] mottoDefaults.presetSlug "${slug}" not found in PRESETS.`
	);
	return {};
};

export const resolveBlockTypeMottoDefaultsSource = (settings, attrs, blockName) => {
	const raw = isPlainObject(settings?.mottoDefaults)
		? settings.mottoDefaults
		: isPlainObject(attrs?.mottoDefaults?.default)
			? attrs.mottoDefaults.default
			: isPlainObject(attrs?.mottoStyler?.default)
				? attrs.mottoStyler.default
				: {};

	if (typeof raw.presetSlug === "string" && raw.presetSlug.trim()) {
		return resolvePresetMottoStyler(raw.presetSlug.trim(), blockName);
	}

	return raw;
};
