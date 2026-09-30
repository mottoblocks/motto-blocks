import { splitTopLevelTokens } from "./top-level-token-utils.js";

export const SCALE_VIEW_LINKED = "linked";
export const SCALE_VIEW_SPLIT = "split";

const DEFAULT_SCALE_TOKEN = "1";
const NUMBER_RE = /^-?\d*\.?\d+$/;
const DEFAULT_VALUES = { x: "", y: "" };

export const normalizeScaleToken = (value) => {
	if (value === undefined || value === null) return "";
	if (typeof value === "number") return String(value);
	return String(value).trim();
};

export const parseScaleValue = (raw) => {
	const value = normalizeScaleToken(raw);
	if (!value) return { ...DEFAULT_VALUES };

	const tokens = splitTopLevelTokens(value);
	if (tokens.length === 0) return { ...DEFAULT_VALUES };
	if (tokens.length === 1) return { x: tokens[0], y: tokens[0] };
	return { x: tokens[0], y: tokens[1] };
};

// CSS `scale: <x>` applies uniformly to both axes, so equal x/y collapses to one token.
export const buildScaleValue = (next) => {
	if (!next || typeof next !== "object") return "";
	const x = normalizeScaleToken(next.x) || DEFAULT_SCALE_TOKEN;
	const y = normalizeScaleToken(next.y) || DEFAULT_SCALE_TOKEN;

	if (x === y) return x;
	return `${x} ${y}`;
};

export const getScaleInitialView = (rawCss) => {
	const value = normalizeScaleToken(rawCss);
	if (!value) return SCALE_VIEW_LINKED;
	const tokens = splitTopLevelTokens(value);
	if (tokens.length <= 1) return SCALE_VIEW_LINKED;
	const { x, y } = parseScaleValue(rawCss);
	return x === y ? SCALE_VIEW_LINKED : SCALE_VIEW_SPLIT;
};

export const canVisualizeScaleValue = (rawValue) => {
	const value = normalizeScaleToken(rawValue);
	if (!value) return true;
	const tokens = splitTopLevelTokens(value);
	if (tokens.length === 0 || tokens.length > 2) return false;
	return tokens.every((token) => NUMBER_RE.test(token));
};
