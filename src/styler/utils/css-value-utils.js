export const tokenizeCssValue = (raw) => {
	const value = String(raw || "").trim();
	if (!value) return [];
	const tokens = [];
	let current = "";
	let depth = 0;

	for (let i = 0; i < value.length; i += 1) {
		const char = value[i];
		if (char === "(") depth += 1;
		if (char === ")") depth = Math.max(0, depth - 1);
		if (depth === 0 && /\s/.test(char)) {
			if (current) {
				tokens.push(current);
				current = "";
			}
			continue;
		}
		current += char;
	}

	if (current) tokens.push(current);
	return tokens;
};

const NAMED_COLORS = {
	aliceblue: "#f0f8ff",
	antiquewhite: "#faebd7",
	aqua: "#00ffff",
	aquamarine: "#7fffd4",
	azure: "#f0ffff",
	beige: "#f5f5dc",
	bisque: "#ffe4c4",
	black: "#000000",
	blanchedalmond: "#ffebcd",
	blue: "#0000ff",
	blueviolet: "#8a2be2",
	brown: "#a52a2a",
	burlywood: "#deb887",
	cadetblue: "#5f9ea0",
	chartreuse: "#7fff00",
	chocolate: "#d2691e",
	coral: "#ff7f50",
	cornflowerblue: "#6495ed",
	cornsilk: "#fff8dc",
	crimson: "#dc143c",
	cyan: "#00ffff",
	darkblue: "#00008b",
	darkcyan: "#008b8b",
	darkgoldenrod: "#b8860b",
	darkgray: "#a9a9a9",
	darkgreen: "#006400",
	darkgrey: "#a9a9a9",
	darkkhaki: "#bdb76b",
	darkmagenta: "#8b008b",
	darkolivegreen: "#556b2f",
	darkorange: "#ff8c00",
	darkorchid: "#9932cc",
	darkred: "#8b0000",
	darksalmon: "#e9967a",
	darkseagreen: "#8fbc8f",
	darkslateblue: "#483d8b",
	darkslategray: "#2f4f4f",
	darkslategrey: "#2f4f4f",
	darkturquoise: "#00ced1",
	darkviolet: "#9400d3",
	deeppink: "#ff1493",
	deepskyblue: "#00bfff",
	dimgray: "#696969",
	dimgrey: "#696969",
	dodgerblue: "#1e90ff",
	firebrick: "#b22222",
	floralwhite: "#fffaf0",
	forestgreen: "#228b22",
	fuchsia: "#ff00ff",
	gainsboro: "#dcdcdc",
	ghostwhite: "#f8f8ff",
	gold: "#ffd700",
	goldenrod: "#daa520",
	gray: "#808080",
	green: "#008000",
	greenyellow: "#adff2f",
	grey: "#808080",
	honeydew: "#f0fff0",
	hotpink: "#ff69b4",
	indianred: "#cd5c5c",
	indigo: "#4b0082",
	ivory: "#fffff0",
	khaki: "#f0e68c",
	lavender: "#e6e6fa",
	lavenderblush: "#fff0f5",
	lawngreen: "#7cfc00",
	lemonchiffon: "#fffacd",
	lightblue: "#add8e6",
	lightcoral: "#f08080",
	lightcyan: "#e0ffff",
	lightgoldenrodyellow: "#fafad2",
	lightgray: "#d3d3d3",
	lightgreen: "#90ee90",
	lightgrey: "#d3d3d3",
	lightpink: "#ffb6c1",
	lightsalmon: "#ffa07a",
	lightseagreen: "#20b2aa",
	lightskyblue: "#87cefa",
	lightslategray: "#778899",
	lightslategrey: "#778899",
	lightsteelblue: "#b0c4de",
	lightyellow: "#ffffe0",
	lime: "#00ff00",
	limegreen: "#32cd32",
	linen: "#faf0e6",
	magenta: "#ff00ff",
	maroon: "#800000",
	mediumaquamarine: "#66cdaa",
	mediumblue: "#0000cd",
	mediumorchid: "#ba55d3",
	mediumpurple: "#9370db",
	mediumseagreen: "#3cb371",
	mediumslateblue: "#7b68ee",
	mediumspringgreen: "#00fa9a",
	mediumturquoise: "#48d1cc",
	mediumvioletred: "#c71585",
	midnightblue: "#191970",
	mintcream: "#f5fffa",
	mistyrose: "#ffe4e1",
	moccasin: "#ffe4b5",
	navajowhite: "#ffdead",
	navy: "#000080",
	oldlace: "#fdf5e6",
	olive: "#808000",
	olivedrab: "#6b8e23",
	orange: "#ffa500",
	orangered: "#ff4500",
	orchid: "#da70d6",
	palegoldenrod: "#eee8aa",
	palegreen: "#98fb98",
	paleturquoise: "#afeeee",
	palevioletred: "#db7093",
	papayawhip: "#ffefd5",
	peachpuff: "#ffdab9",
	peru: "#cd853f",
	pink: "#ffc0cb",
	plum: "#dda0dd",
	powderblue: "#b0e0e6",
	purple: "#800080",
	rebeccapurple: "#663399",
	red: "#ff0000",
	rosybrown: "#bc8f8f",
	royalblue: "#4169e1",
	saddlebrown: "#8b4513",
	salmon: "#fa8072",
	sandybrown: "#f4a460",
	seagreen: "#2e8b57",
	seashell: "#fff5ee",
	sienna: "#a0522d",
	silver: "#c0c0c0",
	skyblue: "#87ceeb",
	slateblue: "#6a5acd",
	slategray: "#708090",
	slategrey: "#708090",
	snow: "#fffafa",
	springgreen: "#00ff7f",
	steelblue: "#4682b4",
	tan: "#d2b48c",
	teal: "#008080",
	thistle: "#d8bfd8",
	tomato: "#ff6347",
	turquoise: "#40e0d0",
	violet: "#ee82ee",
	wheat: "#f5deb3",
	white: "#ffffff",
	whitesmoke: "#f5f5f5",
	yellow: "#ffff00",
	yellowgreen: "#9acd32",
};

export const isNamedColor = (token) => {
	if (!token) return false;
	return Boolean(NAMED_COLORS[String(token).toLowerCase()]);
};

export const toHexColor = (token) => {
	if (!token) return "";
	return NAMED_COLORS[String(token).toLowerCase()] || "";
};

export const isColorToken = (token) => {
	if (!token) return false;
	if (/^var\(--wp--preset--color--[a-z0-9-]+(?:\s*,[\s\S]+)?\)$/i.test(token)) return true;
	if (/^var\(/i.test(token)) return true;
	if (/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(token)) return true;
	if (isNamedColor(token)) return true;
	return /^(rgb|rgba|hsl|hsla)\(/i.test(token);
};

export const isColorKeyword = (token) => {
	if (!token) return false;
	const lower = String(token).toLowerCase();
	return ["currentcolor", "transparent", "inherit", "initial", "unset"].includes(lower);
};

export const isLengthToken = (token) => {
	if (!token) return false;
	if (/^0$/.test(token)) return true;
	if (/^var\(--wp--preset--spacing--[a-z0-9-]+(?:\s*,[\s\S]+)?\)$/i.test(token)) return true;
	return /^-?\d*\.?\d+(px|em|rem|%|vw|vh|vmin|vmax|ch|ex|cm|mm|in|pt|pc)$/i.test(token);
};

export const parseLengthToken = (token) => {
	const raw = String(token || "").trim();
	if (!raw) return { raw: "", value: null, unit: "px", isNumeric: false };
	const match = raw.match(/^(-?\d*\.?\d+)([a-z%]+)?$/i);
	if (!match) return { raw, value: null, unit: "px", isNumeric: false };
	return {
		raw,
		value: Number(match[1]),
		unit: match[2] || "px",
		isNumeric: Number.isFinite(Number(match[1])),
	};
};

export const splitCssAtDepthZero = (rawValue = "", delimiter = ",") => {
	const value = String(rawValue || "").trim();
	if (!value) return [];
	const parts = [];
	let current = "";
	let depth = 0;
	let quote = "";

	for (let i = 0; i < value.length; i += 1) {
		const char = value[i];
		const prev = value[i - 1];
		if ((char === "'" || char === '"') && prev !== "\\") {
			if (!quote) quote = char;
			else if (quote === char) quote = "";
		}
		if (!quote) {
			if (char === "(") depth += 1;
			if (char === ")") depth = Math.max(0, depth - 1);
			if (char === delimiter && depth === 0) {
				if (current.trim()) parts.push(current.trim());
				current = "";
				continue;
			}
		}
		current += char;
	}

	if (current.trim()) parts.push(current.trim());
	return parts;
};
