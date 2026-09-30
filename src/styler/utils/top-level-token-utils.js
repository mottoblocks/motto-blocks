export const splitTopLevelTokens = (value, { splitOnCommas = false } = {}) => {
	const input = String(value ?? "");
	const tokens = [];
	let current = "";
	let depth = 0;
	let quote = "";

	for (let index = 0; index < input.length; index += 1) {
		const char = input[index];
		const prev = input[index - 1];

		if ((char === "'" || char === '"') && prev !== "\\") {
			if (!quote) quote = char;
			else if (quote === char) quote = "";
		}

		if (!quote) {
			if (char === "(") depth += 1;
			if (char === ")") depth = Math.max(0, depth - 1);
			if (depth === 0 && (/\s/.test(char) || (splitOnCommas && char === ","))) {
				if (current.trim()) tokens.push(current.trim());
				current = "";
				continue;
			}
		}

		current += char;
	}

	if (current.trim()) tokens.push(current.trim());
	return tokens;
};

export const splitAtFirstTopLevelDelimiter = (value, delimiter) => {
	const input = String(value ?? "");
	const target = String(delimiter ?? "");
	if (!target) return input.trim();
	let depth = 0;
	let quote = "";

	for (let index = 0; index < input.length; index += 1) {
		const char = input[index];
		const prev = input[index - 1];

		if ((char === "'" || char === '"') && prev !== "\\") {
			if (!quote) quote = char;
			else if (quote === char) quote = "";
		}

		if (!quote) {
			if (char === "(") depth += 1;
			if (char === ")") depth = Math.max(0, depth - 1);
			if (depth === 0 && char === target) {
				return input.slice(0, index).trim();
			}
		}
	}

	return input.trim();
};

// Declaration-level modifier, not a per-value token — strip it before shorthand
// tokenization so it can't be misread as one of the shorthand's positional
// values (e.g. "10px 20px !important" splitting into 3 tokens instead of 2).
const IMPORTANT_SUFFIX_RE = /\s*!\s*important\s*$/i;
export const stripTrailingImportant = (value) =>
	String(value ?? "")
		.replace(IMPORTANT_SUFFIX_RE, "")
		.trim();

// Expands a CSS box-shorthand token list (margin/padding/border-radius/inset,
// all of which share this exact 1/2/3/4-value rule) into the 4 positional
// slots: 1 value -> all four; 2 -> [a,b,a,b]; 3 -> [a,b,c,b]; 4 -> [a,b,c,d].
// Caller maps the returned array to its own slot names (top/right/bottom/left,
// or topLeft/topRight/bottomRight/bottomLeft).
export const expandFourValueShorthand = (tokens) => {
	const list = Array.isArray(tokens) ? tokens : [];
	if (list.length <= 1) {
		const all = list[0] ?? "";
		return [all, all, all, all];
	}
	if (list.length === 2) {
		const [a, b] = list;
		return [a, b, a, b];
	}
	if (list.length === 3) {
		const [a, b, c] = list;
		return [a, b, c, b];
	}
	const [a, b, c, d] = list;
	return [a, b, c, d];
};

export const hasTopLevelDelimiter = (value, delimiter) => {
	const input = String(value ?? "");
	const target = String(delimiter ?? "");
	if (!target) return false;
	let depth = 0;
	let quote = "";

	for (let index = 0; index < input.length; index += 1) {
		const char = input[index];
		const prev = input[index - 1];

		if ((char === "'" || char === '"') && prev !== "\\") {
			if (!quote) quote = char;
			else if (quote === char) quote = "";
		}

		if (!quote) {
			if (char === "(") depth += 1;
			if (char === ")") depth = Math.max(0, depth - 1);
			if (depth === 0 && char === target) return true;
		}
	}

	return false;
};
