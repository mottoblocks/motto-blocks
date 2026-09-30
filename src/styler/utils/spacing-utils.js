const toTrimmed = (value) => (value === undefined || value === null ? "" : String(value).trim());

const tokenizeSpacingShorthand = (rawValue) => {
	const raw = toTrimmed(rawValue);
	if (!raw) return [];

	const tokens = [];
	let current = "";
	let depth = 0;

	for (let i = 0; i < raw.length; i += 1) {
		const char = raw[i];
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

export const parseSpacingSidesFromCss = (value) => {
	const raw = toTrimmed(value);
	if (!raw) {
		return { top: "", right: "", bottom: "", left: "" };
	}

	const parts = tokenizeSpacingShorthand(raw);
	if (parts.length <= 1) {
		const all = parts[0] || raw;
		return { top: all, right: all, bottom: all, left: all };
	}

	if (parts.length === 2) {
		const [vertical, horizontal] = parts;
		return { top: vertical, right: horizontal, bottom: vertical, left: horizontal };
	}

	if (parts.length === 3) {
		const [top, horizontal, bottom] = parts;
		return { top, right: horizontal, bottom, left: horizontal };
	}

	const [top, right, bottom, left] = parts;
	return { top, right, bottom, left };
};

export const stringifySpacingSidesToCss = (sides) => {
	const top = toTrimmed(sides?.top);
	const right = toTrimmed(sides?.right ?? sides?.left ?? top);
	const bottom = toTrimmed(sides?.bottom ?? top);
	const left = toTrimmed(sides?.left ?? sides?.right ?? right);

	if (!top && !right && !bottom && !left) return "";
	if (top === right && top === bottom && top === left) return top;
	if (top === bottom && right === left) return `${top} ${right}`.trim();
	if (right === left) return `${top} ${right} ${bottom}`.trim();
	return `${top} ${right} ${bottom} ${left}`.trim();
};
