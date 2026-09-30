import { isVarFunctionValue } from "@components/primitives/var-unit-utils.js";
import { splitCssAtDepthZero } from "./css-value-utils.js";
import { createItemId } from "./css-row-ids";

export const TRACK_MODE_CUSTOM = "custom";
export const TRACK_MODE_AUTO = "auto";
export const TRACK_MODE_MIN = "min-content";
export const TRACK_MODE_MAX = "max-content";
export const REPEAT_MODE_FIXED = "fixed";
export const REPEAT_MODE_AUTO_FIT = "auto-fit";
export const REPEAT_MODE_AUTO_FILL = "auto-fill";

const TRACK_KEYWORDS = new Set([TRACK_MODE_AUTO, TRACK_MODE_MIN, TRACK_MODE_MAX]);
export const REPEAT_MODES = new Set([
	REPEAT_MODE_FIXED,
	REPEAT_MODE_AUTO_FIT,
	REPEAT_MODE_AUTO_FILL,
]);

export const createGridTrackId = () => createItemId("grid-track");
const createId = createGridTrackId;

export const createDefaultTrack = (displayId = null) => ({
	id: createId(),
	displayId,
	type: "track",
	trackMode: TRACK_MODE_CUSTOM,
	useMinmax: false,
	value: "1fr",
	min: "0",
	max: "1fr",
	repeatMode: REPEAT_MODE_FIXED,
	count: "2",
});

export const createDefaultRepeat = (displayId = null) => ({
	...createDefaultTrack(displayId),
	type: "repeat",
	repeatMode: REPEAT_MODE_FIXED,
	count: "2",
});

/** Blank slate for an unreadable raw value: no phantom "1fr" to accidentally keep. */
export const createEmptyTrack = (displayId = null) => ({
	...createDefaultTrack(displayId),
	value: "",
});

const normalizeWhitespace = (value) =>
	String(value || "")
		.trim()
		.replace(/\s+/g, " ");

const splitTrackTokens = (rawValue = "") => {
	const value = String(rawValue || "").trim();
	if (!value) return [];
	const parts = [];
	let current = "";
	let depth = 0;
	let quote = "";

	for (let index = 0; index < value.length; index += 1) {
		const char = value[index];
		const prev = value[index - 1];
		if ((char === "'" || char === '"') && prev !== "\\") {
			if (!quote) quote = char;
			else if (quote === char) quote = "";
		}
		if (!quote) {
			if (char === "(") depth += 1;
			if (char === ")") depth = Math.max(0, depth - 1);
			if (/\s/.test(char) && depth === 0) {
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

const getFunctionArgs = (rawValue, functionName) => {
	const value = String(rawValue || "").trim();
	const prefix = `${String(functionName || "")
		.trim()
		.toLowerCase()}(`;
	if (!value.toLowerCase().startsWith(prefix) || !value.endsWith(")")) return null;
	return splitCssAtDepthZero(value.slice(prefix.length, -1), ",");
};

const isSimpleTrackSize = (rawValue) => {
	const value = normalizeWhitespace(rawValue);
	if (!value) return false;
	if (TRACK_KEYWORDS.has(value.toLowerCase())) return true;
	if (isVarFunctionValue(value)) return true;
	if (/^0(?:\.0+)?$/i.test(value)) return true;
	return /^-?(?:\d+\.?\d*|\.\d+)(px|em|rem|%|vw|vh|fr)$/i.test(value);
};

export const isRepeatCountValue = (rawValue) => {
	const value = normalizeWhitespace(rawValue);
	if (!value) return false;
	if (isVarFunctionValue(value)) return true;
	if (!/^\d+$/.test(value)) return false;
	return Number(value) > 0;
};

const parseTrackConfig = (rawTrack) => {
	const value = normalizeWhitespace(rawTrack);
	if (!value)
		return {
			ok: true,
			config: {
				trackMode: TRACK_MODE_CUSTOM,
				useMinmax: false,
				value: "1fr",
				min: "0",
				max: "1fr",
			},
		};

	const keyword = value.toLowerCase();
	if (TRACK_KEYWORDS.has(keyword)) {
		return {
			ok: true,
			config: {
				trackMode: keyword === TRACK_MODE_AUTO ? TRACK_MODE_AUTO : TRACK_MODE_CUSTOM,
				useMinmax: false,
				value: keyword === TRACK_MODE_AUTO ? "1fr" : keyword,
				min: "0",
				max: "1fr",
			},
		};
	}

	const minmaxArgs = getFunctionArgs(value, "minmax");
	if (minmaxArgs) {
		if (minmaxArgs.length !== 2) return { ok: false };
		const min = normalizeWhitespace(minmaxArgs[0]);
		const max = normalizeWhitespace(minmaxArgs[1]);
		if (!isSimpleTrackSize(min) || !isSimpleTrackSize(max)) return { ok: false };
		return {
			ok: true,
			config: {
				trackMode: TRACK_MODE_CUSTOM,
				useMinmax: true,
				value: "1fr",
				min,
				max,
			},
		};
	}

	if (!isSimpleTrackSize(value)) return { ok: false };
	return {
		ok: true,
		config: {
			trackMode: TRACK_MODE_CUSTOM,
			useMinmax: false,
			value,
			min: "0",
			max: "1fr",
		},
	};
};

const parseTrackItem = (rawTrack) => {
	const value = normalizeWhitespace(rawTrack);
	if (!value) return { ok: false };

	const repeatArgs = getFunctionArgs(value, "repeat");
	if (repeatArgs) {
		if (repeatArgs.length !== 2) return { ok: false };
		const repeatValue = normalizeWhitespace(repeatArgs[0]).toLowerCase();
		const trackValue = normalizeWhitespace(repeatArgs[1]);
		const parsedTrack = parseTrackConfig(trackValue);
		if (!parsedTrack.ok) return { ok: false };
		if (repeatValue === REPEAT_MODE_AUTO_FIT || repeatValue === REPEAT_MODE_AUTO_FILL) {
			return {
				ok: true,
				item: {
					...createDefaultRepeat(),
					...parsedTrack.config,
					type: "repeat",
					repeatMode: repeatValue,
					count: "",
				},
			};
		}
		if (!isRepeatCountValue(repeatValue)) return { ok: false };
		return {
			ok: true,
			item: {
				...createDefaultRepeat(),
				...parsedTrack.config,
				type: "repeat",
				repeatMode: REPEAT_MODE_FIXED,
				count: repeatValue,
			},
		};
	}

	const parsedTrack = parseTrackConfig(value);
	if (!parsedTrack.ok) return { ok: false };
	return {
		ok: true,
		item: {
			...createDefaultTrack(),
			...parsedTrack.config,
			type: "track",
		},
	};
};

export const parseGridTemplateTracks = (rawValue) => {
	const value = normalizeWhitespace(rawValue);
	if (!value || value.toLowerCase() === "none") {
		return { compatible: true, items: [createDefaultTrack()] };
	}
	const tokens = splitTrackTokens(value);
	const items = [];
	for (const token of tokens) {
		const parsed = parseTrackItem(token);
		if (!parsed.ok) return { compatible: false, items: [createEmptyTrack()] };
		items.push(parsed.item);
	}
	return { compatible: true, items: items.length > 0 ? items : [createDefaultTrack()] };
};

/** Whether `grid-template-columns`/`rows` raw CSS can round-trip through the visual tracks editor. */
export const canVisualizeGridTemplateTracksValue = (rawValue) =>
	parseGridTemplateTracks(rawValue).compatible;

export const buildTrackExpression = (item) => {
	const trackMode = String(item?.trackMode || TRACK_MODE_CUSTOM)
		.trim()
		.toLowerCase();
	if (item?.useMinmax) {
		const min = normalizeWhitespace(item?.min) || "0";
		const max = normalizeWhitespace(item?.max) || "1fr";
		return `minmax(${min}, ${max})`;
	}
	if (trackMode === TRACK_MODE_AUTO) return TRACK_MODE_AUTO;
	return normalizeWhitespace(item?.value) || "1fr";
};

export const buildGridTemplateTracks = (items = []) => {
	const list = Array.isArray(items) ? items : [];
	const parts = list
		.map((item) => {
			if (String(item?.type || "") === "repeat") {
				const repeatMode = REPEAT_MODES.has(
					String(item?.repeatMode || "")
						.trim()
						.toLowerCase()
				)
					? String(item.repeatMode).trim().toLowerCase()
					: REPEAT_MODE_FIXED;
				const repeatCount =
					repeatMode === REPEAT_MODE_FIXED
						? normalizeWhitespace(isRepeatCountValue(item?.count) ? item?.count : "2")
						: repeatMode;
				return `repeat(${repeatCount}, ${buildTrackExpression(item)})`;
			}
			return buildTrackExpression(item);
		})
		.filter(Boolean);
	return parts.length > 0 ? parts.join(" ") : "";
};

export const attachDisplayIds = (items = [], previousItems = []) => {
	let nextDisplayId = 1;
	return (Array.isArray(items) ? items : []).map((item, index) => {
		const previous = Array.isArray(previousItems) ? previousItems[index] : null;
		return {
			...item,
			id: item?.id || previous?.id || createId(),
			displayId: Number.isFinite(Number(item?.displayId))
				? Number(item.displayId)
				: Number.isFinite(Number(previous?.displayId))
					? Number(previous.displayId)
					: nextDisplayId++,
		};
	});
};
