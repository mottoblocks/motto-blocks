import { useMemo } from "@wordpress/element";
import { useSelect } from "@wordpress/data";

const normalizeColorEntry = (raw) => {
	if (!raw || typeof raw !== "object") return null;
	const color = String(raw?.color || "").trim();
	if (!color) return null;
	const slug = String(raw?.slug || "").trim();
	const name = String(raw?.name || slug || color).trim();
	return { color, slug, name };
};

const normalizeColorList = (raw) => {
	if (!Array.isArray(raw)) return [];
	return raw.map(normalizeColorEntry).filter(Boolean);
};

const mergeColorPalettes = (lists = []) => {
	const out = [];
	const seen = new Set();
	(Array.isArray(lists) ? lists : []).forEach((list) => {
		normalizeColorList(list).forEach((entry) => {
			const slugKey = entry.slug ? `slug:${entry.slug.toLowerCase()}` : "";
			const colorKey = `color:${entry.color.toLowerCase()}`;
			const key = slugKey || colorKey;
			if (!key || seen.has(key)) return;
			seen.add(key);
			out.push(entry);
		});
	});
	return out;
};

const getThemeDefaultPalette = (settings = {}) => {
	const preferred = mergeColorPalettes([
		settings?.color?.palette?.theme,
		settings?.color?.palette?.default,
		settings?.__experimentalFeatures?.color?.palette?.theme,
		settings?.__experimentalFeatures?.color?.palette?.default,
	]);
	if (preferred.length > 0) return preferred;
	return mergeColorPalettes([settings?.color?.palette, settings?.colors]);
};

const getCustomPalette = (settings = {}) =>
	mergeColorPalettes([
		settings?.color?.palette?.custom,
		settings?.__experimentalFeatures?.color?.palette?.custom,
	]);

const getEditorColorPalette = (settings = {}) =>
	mergeColorPalettes([getThemeDefaultPalette(settings), getCustomPalette(settings)]);

const getDisableCustomColors = (settings = {}) =>
	Boolean(settings?.disableCustomColors ?? settings?.color?.disableCustomColors);

const normalizeFontSizeEntry = (raw) => {
	if (!raw || typeof raw !== "object") return null;
	const slug = String(raw?.slug || "").trim();
	const size = String(raw?.size || raw?.value || "").trim();
	if (!slug || !size) return null;
	const name = String(raw?.name || slug).trim();
	return { slug, size, name };
};

const normalizeFontSizesList = (raw) => {
	if (!Array.isArray(raw)) return [];
	return raw.map(normalizeFontSizeEntry).filter(Boolean);
};

const mergeFontSizes = (lists = []) => {
	const out = [];
	const seenBySlug = new Set();
	(Array.isArray(lists) ? lists : []).forEach((list) => {
		normalizeFontSizesList(list).forEach((entry) => {
			const key = entry.slug.toLowerCase();
			if (seenBySlug.has(key)) return;
			seenBySlug.add(key);
			out.push(entry);
		});
	});
	return out;
};

const getIncludeDefaultFontSizes = (settings = {}) => {
	const raw =
		settings?.defaultFontSizes ??
		settings?.typography?.defaultFontSizes ??
		settings?.__experimentalFeatures?.typography?.defaultFontSizes;
	if (typeof raw === "boolean") return raw;
	return true;
};

const getEditorFontSizes = (settings = {}) => {
	const customList = mergeFontSizes([
		settings?.__experimentalFeatures?.typography?.fontSizes?.custom,
	]);
	const customSlugs = new Set(customList.map((entry) => String(entry?.slug || "").toLowerCase()));
	const includeDefaultFontSizes = getIncludeDefaultFontSizes(settings);
	const merged = mergeFontSizes([
		settings?.typography?.fontSizes,
		settings?.fontSizes,
		settings?.__experimentalFeatures?.typography?.fontSizes?.theme,
		includeDefaultFontSizes
			? settings?.__experimentalFeatures?.typography?.fontSizes?.default
			: [],
		settings?.__experimentalFeatures?.typography?.fontSizes?.custom,
	]);
	const nonCustom = merged.filter(
		(entry) => !customSlugs.has(String(entry?.slug || "").toLowerCase())
	);
	const custom = merged.filter((entry) =>
		customSlugs.has(String(entry?.slug || "").toLowerCase())
	);
	return [...nonCustom, ...custom];
};

const getDisableCustomFontSizes = (settings = {}) =>
	Boolean(
		settings?.disableCustomFontSizes ??
		settings?.typography?.disableCustomFontSizes ??
		settings?.__experimentalFeatures?.typography?.disableCustomFontSizes
	);

const normalizeSettingsList = (raw) => {
	if (Array.isArray(raw)) return raw;
	if (raw && typeof raw === "object") {
		const merged = [];
		const seen = new Set();
		["theme", "custom", "default"].forEach((bucket) => {
			const list = Array.isArray(raw[bucket]) ? raw[bucket] : [];
			list.forEach((entry) => {
				const slug = String(entry?.slug || "").trim();
				const value = String(
					entry?.fontFamily || entry?.family || entry?.value || ""
				).trim();
				const key = `${slug}::${value}`;
				if (seen.has(key)) return;
				seen.add(key);
				merged.push(entry);
			});
		});
		return merged;
	}
	return [];
};

const normalizeFontFamiliesList = (raw) => {
	const out = [];
	const seen = new Set();
	const pushEntry = (entry) => {
		if (!entry || typeof entry !== "object") return;
		const slug = String(entry?.slug || "").trim();
		const family = String(entry?.fontFamily || entry?.family || entry?.value || "").trim();
		if (!slug && !family) return;
		const key = `${slug.toLowerCase()}::${family.toLowerCase()}`;
		if (seen.has(key)) return;
		seen.add(key);
		out.push(entry);
	};
	const walk = (value) => {
		if (!value) return;
		if (Array.isArray(value)) {
			value.forEach(walk);
			return;
		}
		if (typeof value !== "object") return;
		const buckets = ["theme", "default", "custom", "user"];
		let usedBucket = false;
		buckets.forEach((bucket) => {
			if (Array.isArray(value[bucket])) {
				usedBucket = true;
				value[bucket].forEach(walk);
			}
		});
		if (!usedBucket) pushEntry(value);
	};
	walk(raw);
	return out;
};

export const useStylerEditorSettings = () => {
	const settingsData = useSelect((select) => {
		const settings = select("core/block-editor")?.getSettings?.() || {};
		const colors = getEditorColorPalette(settings);
		const spacing =
			settings?.spacing?.spacingSizes ||
			settings?.spacingSizes ||
			settings?.spacing?.sizes ||
			settings?.__experimentalFeatures?.spacing?.spacingSizes?.theme ||
			settings?.__experimentalFeatures?.spacing?.spacingSizes?.default ||
			[];
		const fontSizes = getEditorFontSizes(settings);
		const fontFamilies = normalizeFontFamiliesList([
			settings?.typography?.fontFamilies,
			settings?.fontFamilies,
			settings?.__experimentalFeatures?.typography?.fontFamilies,
			settings?.__experimentalFeatures?.typography?.fontFamilies?.theme,
			settings?.__experimentalFeatures?.typography?.fontFamilies?.default,
			settings?.__experimentalFeatures?.typography?.fontFamilies?.custom,
			settings?.__experimentalFeatures?.typography?.fontFamilies?.user,
		]);
		const disableCustomFamily =
			settings?.disableCustomFontFamilies ??
			settings?.typography?.disableCustomFontFamilies ??
			settings?.__experimentalFeatures?.typography?.disableCustomFontFamilies;

		return {
			themeColors: colors,
			spacingSizesFromSettings: Array.isArray(spacing) ? spacing : [],
			disableCustomColors: getDisableCustomColors(settings),
			fontSizesFromSettings: fontSizes,
			fontFamiliesFromSettings: fontFamilies,
			disableCustomFontSizes: getDisableCustomFontSizes(settings),
			disableCustomFontFamilies: Boolean(disableCustomFamily),
		};
	}, []);

	return useMemo(
		() => ({
			themeColors: settingsData.themeColors,
			spacingSizes: normalizeSettingsList(settingsData.spacingSizesFromSettings),
			disableCustomColors: Boolean(settingsData.disableCustomColors),
			fontSizes: normalizeSettingsList(settingsData.fontSizesFromSettings),
			fontFamilies: normalizeFontFamiliesList(settingsData.fontFamiliesFromSettings),
			disableCustomFontSizes: Boolean(settingsData.disableCustomFontSizes),
			disableCustomFontFamilies: Boolean(settingsData.disableCustomFontFamilies),
		}),
		[settingsData]
	);
};
