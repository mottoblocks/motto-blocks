const CSS_FUNCTIONS = [
	{ label: "var()", insertText: "var()" },
	{ label: "env()", insertText: "env()" },
	{ label: "calc()", insertText: "calc()" },
	{ label: "clamp()", insertText: "clamp()" },
	{ label: "min()", insertText: "min()" },
	{ label: "max()", insertText: "max()" },
	{ label: "minmax()", insertText: "minmax()" },
	{ label: "repeat()", insertText: "repeat()" },
	{ label: "fit-content()", insertText: "fit-content()" },
	{ label: "url()", insertText: "url()" },
	{ label: "image-set()", insertText: "image-set()" },
	{ label: "linear-gradient()", insertText: "linear-gradient()" },
	{ label: "radial-gradient()", insertText: "radial-gradient()" },
	{ label: "conic-gradient()", insertText: "conic-gradient()" },
	{ label: "repeating-linear-gradient()", insertText: "repeating-linear-gradient()" },
	{ label: "repeating-radial-gradient()", insertText: "repeating-radial-gradient()" },
	{ label: "repeating-conic-gradient()", insertText: "repeating-conic-gradient()" },
	{ label: "rgb()", insertText: "rgb()" },
	{ label: "rgba()", insertText: "rgba()" },
	{ label: "hsl()", insertText: "hsl()" },
	{ label: "hsla()", insertText: "hsla()" },
	{ label: "hwb()", insertText: "hwb()" },
	{ label: "lab()", insertText: "lab()" },
	{ label: "lch()", insertText: "lch()" },
	{ label: "oklab()", insertText: "oklab()" },
	{ label: "oklch()", insertText: "oklch()" },
	{ label: "color()", insertText: "color()" },
	{ label: "color-mix()", insertText: "color-mix()" },
	{ label: "light-dark()", insertText: "light-dark()" },
	{ label: "blur()", insertText: "blur()" },
	{ label: "brightness()", insertText: "brightness()" },
	{ label: "contrast()", insertText: "contrast()" },
	{ label: "drop-shadow()", insertText: "drop-shadow()" },
	{ label: "grayscale()", insertText: "grayscale()" },
	{ label: "hue-rotate()", insertText: "hue-rotate()" },
	{ label: "invert()", insertText: "invert()" },
	{ label: "opacity()", insertText: "opacity()" },
	{ label: "saturate()", insertText: "saturate()" },
	{ label: "sepia()", insertText: "sepia()" },
	{ label: "translate()", insertText: "translate()" },
	{ label: "translateX()", insertText: "translateX()" },
	{ label: "translateY()", insertText: "translateY()" },
	{ label: "translateZ()", insertText: "translateZ()" },
	{ label: "scale()", insertText: "scale()" },
	{ label: "scaleX()", insertText: "scaleX()" },
	{ label: "scaleY()", insertText: "scaleY()" },
	{ label: "rotate()", insertText: "rotate()" },
	{ label: "rotateX()", insertText: "rotateX()" },
	{ label: "rotateY()", insertText: "rotateY()" },
	{ label: "rotateZ()", insertText: "rotateZ()" },
	{ label: "skew()", insertText: "skew()" },
	{ label: "skewX()", insertText: "skewX()" },
	{ label: "skewY()", insertText: "skewY()" },
	{ label: "matrix()", insertText: "matrix()" },
	{ label: "matrix3d()", insertText: "matrix3d()" },
	{ label: "perspective()", insertText: "perspective()" },
	{ label: "cubic-bezier()", insertText: "cubic-bezier()" },
	{ label: "steps()", insertText: "steps()" },
	{ label: "attr()", insertText: "attr()" },
	{ label: "counter()", insertText: "counter()" },
	{ label: "counters()", insertText: "counters()" },
	{ label: "path()", insertText: "path()" },
	{ label: "polygon()", insertText: "polygon()" },
	{ label: "circle()", insertText: "circle()" },
	{ label: "ellipse()", insertText: "ellipse()" },
	{ label: "inset()", insertText: "inset()" },
];

const CSS_KEYWORDS = [
	{ label: "none", insertText: "none" },
	{ label: "auto", insertText: "auto" },
	{ label: "normal", insertText: "normal" },
	{ label: "inherit", insertText: "inherit" },
	{ label: "initial", insertText: "initial" },
	{ label: "unset", insertText: "unset" },
	{ label: "revert", insertText: "revert" },
	{ label: "revert-layer", insertText: "revert-layer" },
	{ label: "transparent", insertText: "transparent" },
	{ label: "currentColor", insertText: "currentColor" },
	{ label: "!important", insertText: "!important" },
];

const normalize = (value) =>
	String(value || "")
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "");

const isSubsequence = (needle, haystack) => {
	if (!needle) return true;
	let i = 0;
	for (let j = 0; j < haystack.length && i < needle.length; j += 1) {
		if (needle[i] === haystack[j]) i += 1;
	}
	return i === needle.length;
};

const getScore = (query, candidate) => {
	if (!query) return 1000 + candidate.length;
	const q = normalize(query);
	const c = normalize(candidate);
	if (!q || !c) return Number.POSITIVE_INFINITY;
	if (c === q) return 0;
	if (c.startsWith(q)) return 10 + (c.length - q.length);
	if (candidate.toLowerCase().startsWith(query.toLowerCase())) return 20 + (c.length - q.length);
	if (c.includes(q)) return 40 + c.indexOf(q);
	if (isSubsequence(q, c)) return 80 + (c.length - q.length);
	return Number.POSITIVE_INFINITY;
};

const getCssFunctionQueryState = (value, cursor) => {
	const raw = String(value || "");
	const safeCursor = Number.isFinite(cursor) ? cursor : raw.length;
	const left = raw.slice(0, safeCursor);
	const right = raw.slice(safeCursor);
	const leftMatch = left.match(/!?([a-z-]*)$/i);
	const rightMatch = right.match(/^([a-z-]*)/i);
	const leftToken = leftMatch ? leftMatch[0] : "";
	const rightToken = rightMatch ? rightMatch[1] : "";
	const token = `${leftToken}${rightToken}`;
	let start = safeCursor - leftToken.length;
	let end = safeCursor + rightToken.length;

	const varMatch = left.match(/var\s*\(\s*([a-z-]*)$/i);
	if (varMatch) {
		const varToken = varMatch[1] || "";
		return {
			query: `${varToken}${rightToken}`,
			start: safeCursor - varToken.length,
			end: safeCursor + rightToken.length,
			isVarContext: true,
		};
	}

	return { query: token, start, end, isVarContext: false };
};

const normalizeVariableName = (value) => {
	const raw = String(value || "").trim();
	if (!raw) return "";
	return raw.startsWith("--") ? raw : `--${raw}`;
};

export const getCssFunctionSuggestions = (
	value,
	cursor,
	limit = 30,
	variableSuggestions = null
) => {
	const { query, isVarContext } = getCssFunctionQueryState(value, cursor);
	const q = String(query || "")
		.toLowerCase()
		.trim();
	if (!q || q.length < 2) return [];

	if (isVarContext) {
		const suggestions = Array.isArray(variableSuggestions) ? variableSuggestions : [];
		const variableQuery = String(q || "").startsWith("--")
			? String(q).slice(2)
			: String(q || "");
		const seen = new Set();
		return suggestions
			.map((entry) => {
				if (typeof entry === "string") {
					const name = normalizeVariableName(entry);
					return name ? { label: name, value: name, meta: "" } : null;
				}
				const name = normalizeVariableName(
					entry?.label || entry?.name || entry?.value || entry?.insertText
				);
				if (!name) return null;
				return {
					label: name,
					value: normalizeVariableName(entry?.value || entry?.name || name),
					meta: String(entry?.meta || "").trim(),
				};
			})
			.filter(Boolean)
			.filter((entry) => {
				const key = String(entry.label || "").toLowerCase();
				if (seen.has(key)) return false;
				seen.add(key);
				return true;
			})
			.map((entry) => ({ ...entry, score: getScore(variableQuery, entry.label) }))
			.filter((item) => Number.isFinite(item.score))
			.sort(
				(a, b) =>
					a.score - b.score ||
					a.label.length - b.label.length ||
					a.label.localeCompare(b.label)
			)
			.slice(0, limit);
	}

	return [...CSS_FUNCTIONS, ...CSS_KEYWORDS]
		.map((item) => ({ ...item, score: getScore(q, item.label) }))
		.filter((item) => Number.isFinite(item.score))
		.sort(
			(a, b) =>
				a.score - b.score ||
				a.label.length - b.label.length ||
				a.label.localeCompare(b.label)
		)
		.slice(0, limit);
};

export const applyCssFunctionSuggestion = (value, cursor, insertText) => {
	const raw = String(value || "");
	const safeCursor = Number.isFinite(cursor) ? cursor : raw.length;
	const { start, end } = getCssFunctionQueryState(raw, safeCursor);
	const text = String(insertText || "");
	const nextValue = `${raw.slice(0, start)}${text}${raw.slice(end)}`;
	const caretOffset = text.includes("()") ? text.indexOf(")") : text.length;
	const nextCursor = start + Math.max(0, caretOffset);
	return { value: nextValue, cursor: nextCursor };
};
