import {
	isColorKeyword,
	isColorToken,
	splitCssAtDepthZero,
	tokenizeCssValue,
} from "./css-value-utils.js";

const toColorCandidate = (token) =>
	String(token || "")
		.trim()
		.replace(/[;,]+$/, "");

export const pickPreviewColor = (rawValue = "") => {
	const tokens = tokenizeCssValue(rawValue);
	for (let i = 0; i < tokens.length; i += 1) {
		const candidate = toColorCandidate(tokens[i]);
		if (!candidate || isColorKeyword(candidate)) continue;
		if (isColorToken(candidate)) return candidate;
	}
	return "";
};

const getLayerImageOrGradientToken = (rawLayer = "") => {
	const tokens = tokenizeCssValue(rawLayer);
	for (let i = 0; i < tokens.length; i += 1) {
		const token = String(tokens[i] || "").trim();
		if (!token) continue;
		if (/^url\(/i.test(token)) return token;
		if (/^(linear-gradient|radial-gradient|conic-gradient)\(/i.test(token)) return token;
	}
	return "";
};

export const pickBackgroundPreview = (rawValue = "") => {
	const layers = splitCssAtDepthZero(rawValue);
	for (let i = 0; i < layers.length; i += 1) {
		const sample = getLayerImageOrGradientToken(layers[i]);
		if (sample) return sample;
	}
	return "";
};

export const isBackgroundPreviewType = (popupType) => {
	const type = String(popupType || "")
		.trim()
		.toLowerCase();
	return (
		type === "background" ||
		type === "background-layers" ||
		type === "background-image" ||
		type === "background-image-source"
	);
};

export const hasVisualPreviewType = (popupType) => {
	const type = String(popupType || "")
		.trim()
		.toLowerCase();
	if (!type) return false;
	if (type === "color") return true;
	if (type === "border" || type === "box-shadow") return true;
	return isBackgroundPreviewType(type);
};

export const resolveVisualPreview = (popupType, rawValue = "") => {
	if (!hasVisualPreviewType(popupType)) return "";
	if (isBackgroundPreviewType(popupType)) return String(rawValue || "").trim();
	const colorSample = pickPreviewColor(rawValue);
	if (colorSample) return colorSample;
	return "";
};
