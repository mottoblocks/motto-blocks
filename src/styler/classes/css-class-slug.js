const CLASS_SLUG_COMPATIBLE_RE = /^[A-Za-z_-][A-Za-z0-9_-]*$/;

export const normalizeCssClassSlug = (value) => {
	if (typeof value !== "string") return "";
	let name = value.trim();
	if (!name) return "";
	if (name.startsWith(".")) name = name.slice(1);
	name = name.replace(/\s+/g, "");
	name = name.replace(/[^a-zA-Z0-9_-]/g, "");
	return name;
};

export const sanitizeCssClassSlugInput = (value) => {
	const normalized = normalizeCssClassSlug(value);
	return normalized.replace(/^[^A-Za-z_-]+/, "");
};

export const isCssClassSlugCompatible = (value) =>
	CLASS_SLUG_COMPATIBLE_RE.test(String(value || ""));
