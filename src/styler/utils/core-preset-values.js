const toText = (value) => {
	if (value === undefined || value === null) return "";
	if (typeof value === "string") return value.trim();
	if (typeof value === "number") return String(value).trim();
	if (typeof value === "object") {
		const objectCandidates = ["slug", "size", "value", "fontFamily", "family", "color", "name"];
		for (const key of objectCandidates) {
			const candidate = value?.[key];
			if (typeof candidate === "string" || typeof candidate === "number") {
				return String(candidate).trim();
			}
		}
		return "";
	}
	return String(value).trim();
};
const toList = (value) => (Array.isArray(value) ? value : []);
const buildVar = (domain, slug, fallback) => `var(--wp--preset--${domain}--${slug}, ${fallback})`;
export const normalizePresetSlug = (slug) =>
	toText(slug)
		.toLowerCase()
		.replace(/([0-9])([a-z])/g, "$1-$2")
		.replace(/([a-z])([0-9])/g, "$1-$2");
export const normalizeSpacingPresetSlug = (slug) => normalizePresetSlug(slug);

export const toSpacingPresetToken = (slug) => {
	const normalized = normalizePresetSlug(slug);
	if (!normalized || normalized === "0") return "0";
	if (normalized === "default") return "";
	return `var:preset|spacing|${normalized}`;
};

const getPresetFallback = (preset, candidates = [], defaultValue = "") => {
	for (const key of toList(candidates)) {
		const next = toText(preset?.[key]);
		if (next) return next;
	}
	return toText(defaultValue);
};

const getSlugFromPresetValue = ({
	value,
	domain,
	presets = [],
	candidates = [],
	matchByValue = true,
}) => {
	const raw = toText(value);
	if (!raw) return { slug: "", fallback: "" };

	const tokenMatch = raw.match(new RegExp(`^var:preset\\|${domain}\\|([a-z0-9-]+)$`, "i"));
	if (tokenMatch?.[1]) {
		const tokenSlug = normalizePresetSlug(tokenMatch[1]);
		const preset = toList(presets).find(
			(entry) => normalizePresetSlug(entry?.slug) === tokenSlug.toLowerCase()
		);
		return {
			slug: tokenSlug,
			fallback: getPresetFallback(preset, candidates, raw),
		};
	}

	// Match both var(--wp--preset--domain--slug) and var(--wp--preset--domain--slug, fallback).
	const varMatch = raw.match(
		new RegExp(`^var\\(\\s*--wp--preset--${domain}--([a-z0-9-]+)\\s*[,)]`, "i")
	);
	if (varMatch?.[1]) {
		const varSlug = normalizePresetSlug(varMatch[1]);
		const preset = toList(presets).find(
			(entry) => normalizePresetSlug(entry?.slug) === varSlug.toLowerCase()
		);
		return {
			slug: varSlug,
			fallback: getPresetFallback(preset, candidates, raw),
		};
	}

	const bySlug =
		toList(presets).find(
			(preset) => normalizePresetSlug(preset?.slug) === normalizePresetSlug(raw)
		) || null;
	if (bySlug?.slug) {
		const normalizedSlug = normalizePresetSlug(bySlug.slug);
		return {
			slug: normalizedSlug,
			fallback: getPresetFallback(bySlug, candidates, raw),
		};
	}

	if (matchByValue) {
		const byValue =
			toList(presets).find((preset) =>
				toList(candidates).some(
					(key) => toText(preset?.[key]).toLowerCase() === raw.toLowerCase()
				)
			) || null;
		if (byValue?.slug) {
			return {
				slug: normalizePresetSlug(byValue.slug),
				fallback: getPresetFallback(byValue, candidates, raw),
			};
		}
	}

	return { slug: "", fallback: "" };
};

export const getCoreFontSizePresetMatch = (value, fontSizes = []) => {
	const raw = toText(value);
	if (!raw) return null;

	const tokenMatch = raw.match(/^var:preset\|font-size\|([a-z0-9-]+)$/i);
	const varMatch = raw.match(/^var\(\s*--wp--preset--font-size--([a-z0-9-]+)\s*[,)]/i);
	const slug = normalizePresetSlug(
		(tokenMatch && tokenMatch[1]) || (varMatch && varMatch[1]) || ""
	);
	if (!slug) return null;

	const preset =
		toList(fontSizes).find((entry) => normalizePresetSlug(entry?.slug) === slug) || null;
	if (!preset?.slug) return null;

	return {
		...preset,
		slug: normalizePresetSlug(preset.slug),
		fallback: getPresetFallback(preset, ["size", "value", "name"], raw),
	};
};

const toVarOrValue = ({ value, domain, presets = [], candidates = [], matchByValue = true }) => {
	const { slug, fallback } = getSlugFromPresetValue({
		value,
		domain,
		presets,
		candidates,
		matchByValue,
	});
	return slug ? buildVar(domain, slug, fallback || toText(value)) : value;
};

const tokenizeTopLevelValues = (value) => {
	const input = String(value ?? "");
	const parts = [];
	let current = "";
	let depth = 0;

	for (let i = 0; i < input.length; i += 1) {
		const char = input[i];
		if (char === "(") {
			depth += 1;
			current += char;
			continue;
		}
		if (char === ")") {
			depth = Math.max(0, depth - 1);
			current += char;
			continue;
		}
		if (depth === 0 && (/\s/.test(char) || char === ",")) {
			if (current) {
				parts.push({ type: "value", text: current });
				current = "";
			}
			parts.push({ type: "separator", text: char });
			continue;
		}
		current += char;
	}

	if (current) parts.push({ type: "value", text: current });
	return parts;
};

export const toCorePresetVar = ({ value, domain, presets = [], candidates = [] }) =>
	toVarOrValue({ value, domain, presets, candidates });

export const toCoreColorPresetVar = (value, themeColors = []) =>
	toVarOrValue({ value, domain: "color", presets: themeColors, candidates: ["color", "name"] });

export const toCoreFontSizePresetVar = (value, fontSizes = []) =>
	toVarOrValue({
		value: typeof value === "number" ? `${value}px` : value,
		domain: "font-size",
		presets: fontSizes,
		candidates: ["size", "value", "name"],
	});

export const toCoreFontFamilyPresetVar = (value, fontFamilies = []) =>
	toVarOrValue({
		value,
		domain: "font-family",
		presets: fontFamilies,
		candidates: ["fontFamily", "family", "value", "name"],
	});

export const toCoreSpacingPresetVar = (value, spacingSizes = []) =>
	// Spacing custom inputs can legitimately match a preset fallback (for example "1rem")
	// without meaning "switch back to preset mode". Only explicit preset tokens / vars should
	// resolve to the shared preset var contract.
	toVarOrValue({
		value,
		domain: "spacing",
		presets: spacingSizes,
		candidates: ["size", "name"],
		matchByValue: false,
	});

export const toCorePresetValueByType = ({
	value,
	type,
	themeColors = [],
	fontSizes = [],
	fontFamilies = [],
	spacingSizes = [],
}) => {
	const normalizedType = toText(type).toLowerCase();
	if (normalizedType === "color" || normalizedType === "background")
		return toCoreColorPresetVar(value, themeColors);
	if (normalizedType === "font-size") return toCoreFontSizePresetVar(value, fontSizes);
	if (normalizedType === "font-family") return toCoreFontFamilyPresetVar(value, fontFamilies);
	if (normalizedType === "spacing-single") return toCoreSpacingPresetVar(value, spacingSizes);
	if (normalizedType === "spacing-multiple") {
		return tokenizeTopLevelValues(value)
			.map((part) =>
				part.type === "value" ? toCoreSpacingPresetVar(part.text, spacingSizes) : part.text
			)
			.join("");
	}
	return value;
};
