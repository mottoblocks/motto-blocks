export const SVG_ALLOWED_TAGS = {
	svg: new Set([
		"xmlns",
		"id",
		"viewBox",
		"viewbox",
		"fill",
		"stroke",
		"stroke-width",
		"stroke-linecap",
		"stroke-linejoin",
		"width",
		"height",
		"class",
		"role",
		"aria-hidden",
		"focusable",
		"preserveAspectRatio",
		"preserveaspectratio",
	]),
	g: new Set(["id", "class", "clip-path", "fill", "stroke", "stroke-width", "transform"]),
	path: new Set([
		"id",
		"d",
		"class",
		"clip-path",
		"fill",
		"stroke",
		"stroke-width",
		"stroke-linecap",
		"stroke-linejoin",
		"transform",
	]),
	circle: new Set([
		"id",
		"cx",
		"cy",
		"r",
		"class",
		"clip-path",
		"fill",
		"stroke",
		"stroke-width",
	]),
	ellipse: new Set([
		"id",
		"cx",
		"cy",
		"rx",
		"ry",
		"class",
		"clip-path",
		"fill",
		"stroke",
		"stroke-width",
	]),
	rect: new Set([
		"id",
		"x",
		"y",
		"width",
		"height",
		"rx",
		"ry",
		"class",
		"clip-path",
		"fill",
		"stroke",
		"stroke-width",
	]),
	line: new Set([
		"id",
		"x1",
		"y1",
		"x2",
		"y2",
		"class",
		"clip-path",
		"stroke",
		"stroke-width",
		"stroke-linecap",
	]),
	polyline: new Set([
		"id",
		"points",
		"class",
		"clip-path",
		"fill",
		"stroke",
		"stroke-width",
		"stroke-linecap",
		"stroke-linejoin",
	]),
	polygon: new Set([
		"id",
		"points",
		"class",
		"clip-path",
		"fill",
		"stroke",
		"stroke-width",
		"stroke-linejoin",
	]),
	defs: new Set([]),
	clippath: new Set(["id", "clipPathUnits", "clippathunits"]),
	mask: new Set([
		"id",
		"x",
		"y",
		"width",
		"height",
		"maskUnits",
		"maskunits",
		"maskContentUnits",
		"maskcontentunits",
	]),
	lineargradient: new Set([
		"id",
		"x1",
		"y1",
		"x2",
		"y2",
		"gradientUnits",
		"gradientunits",
		"gradientTransform",
		"gradienttransform",
		"spreadMethod",
		"spreadmethod",
	]),
	radialgradient: new Set([
		"id",
		"cx",
		"cy",
		"r",
		"fx",
		"fy",
		"fr",
		"gradientUnits",
		"gradientunits",
		"gradientTransform",
		"gradienttransform",
		"spreadMethod",
		"spreadmethod",
	]),
	stop: new Set(["offset", "stop-color", "stop-opacity"]),
	title: new Set([]),
	desc: new Set([]),
	style: new Set([]),
	animate: new Set([
		"attributeName",
		"attributeType",
		"from",
		"to",
		"by",
		"values",
		"dur",
		"begin",
		"end",
		"min",
		"max",
		"restart",
		"repeatCount",
		"repeatDur",
		"fill",
		"calcMode",
		"keyTimes",
		"keySplines",
		"additive",
		"accumulate",
	]),
	animatetransform: new Set([
		"attributeName",
		"attributeType",
		"type",
		"from",
		"to",
		"by",
		"values",
		"dur",
		"begin",
		"end",
		"min",
		"max",
		"restart",
		"repeatCount",
		"repeatDur",
		"fill",
		"calcMode",
		"keyTimes",
		"keySplines",
		"additive",
		"accumulate",
	]),
	set: new Set([
		"attributeName",
		"attributeType",
		"to",
		"begin",
		"dur",
		"end",
		"min",
		"max",
		"restart",
		"repeatCount",
		"repeatDur",
		"fill",
	]),
};

// SMIL lets `attributeName` retarget any property on the animated element at
// runtime (e.g. "onmouseover", "href"), bypassing the on*= / javascript:
// checks below since those only scan literal attributes in the markup.
const SAFE_ANIMATABLE_ATTRIBUTE_NAMES = new Set([
	"fill",
	"fill-opacity",
	"stroke",
	"stroke-width",
	"stroke-opacity",
	"stroke-dasharray",
	"stroke-dashoffset",
	"stroke-linecap",
	"stroke-linejoin",
	"opacity",
	"transform",
	"d",
	"x",
	"y",
	"cx",
	"cy",
	"r",
	"rx",
	"ry",
	"width",
	"height",
	"points",
	"x1",
	"y1",
	"x2",
	"y2",
]);
const SVG_ANIMATION_TAGS = new Set(["animate", "animatetransform", "set"]);
const SVG_STYLE_BLOCKLIST_PATTERN =
	/(?:@import\b|url\s*\(|expression\s*\(|(?:javascript|data|vbscript)\s*:|behavior\s*:|-moz-binding\s*:|[<>])/i;

export function sanitizeInlineSvgStyleCss(cssText) {
	const withoutComments =
		typeof cssText === "string" ? cssText.replace(/\/\*[\s\S]*?\*\//g, "").trim() : "";

	if (!withoutComments || withoutComments.length > 10000) {
		return "";
	}

	return SVG_STYLE_BLOCKLIST_PATTERN.test(withoutComments) ? "" : withoutComments;
}

function sanitizeSvgAttributes(element, allowedAttributes) {
	Array.from(element.attributes || []).forEach((attribute) => {
		const attrName = String(attribute.name || "");
		const normalizedAttrName = attrName.toLowerCase();
		const value = String(attribute.value || "");

		if (
			normalizedAttrName.startsWith("on") ||
			/(?:javascript|data)\s*:/i.test(value) ||
			(!allowedAttributes.has(attrName) && !allowedAttributes.has(normalizedAttrName))
		) {
			element.removeAttribute(attrName);
		}
	});
}

function appendClassName(element, classNames) {
	if (!Array.isArray(classNames) || classNames.length === 0) {
		return;
	}

	const tokens = new Set(
		String(element.getAttribute("class") || "")
			.split(/\s+/)
			.map((token) => token.trim())
			.filter(Boolean)
	);

	classNames.forEach((token) => {
		const normalized = typeof token === "string" ? token.trim() : "";
		if (normalized) {
			tokens.add(normalized);
		}
	});

	if (tokens.size > 0) {
		element.setAttribute("class", Array.from(tokens).join(" "));
	}
}

function sanitizeSvgElementTree(rootElement) {
	sanitizeSvgAttributes(rootElement, SVG_ALLOWED_TAGS.svg);

	const walker = (node) => {
		const childNodes = Array.from(node.children || []);
		childNodes.forEach((child) => {
			const tagName = String(child.tagName || "").toLowerCase();
			const allowedAttributes = SVG_ALLOWED_TAGS[tagName];

			if (!allowedAttributes) {
				child.remove();
				return;
			}

			sanitizeSvgAttributes(child, allowedAttributes);

			if (tagName === "style") {
				const sanitizedCss = sanitizeInlineSvgStyleCss(child.textContent || "");
				if (!sanitizedCss) {
					child.remove();
					return;
				}
				child.textContent = sanitizedCss;
				return;
			}

			if (SVG_ANIMATION_TAGS.has(tagName)) {
				const attributeNameValue = String(child.getAttribute("attributeName") || "").trim();
				if (!SAFE_ANIMATABLE_ATTRIBUTE_NAMES.has(attributeNameValue)) {
					child.remove();
					return;
				}
			}

			walker(child);
		});
	};

	walker(rootElement);
}

/**
 * Normalize + sanitize inline SVG markup.
 *
 * Intended for editor-side preview rendering (dangerouslySetInnerHTML).
 * Returns empty string when input is unsafe or invalid.
 *
 * @param {unknown} svgMarkup
 * @param {string[]} extraClassNames
 * @return {string}
 */
export function sanitizeInlineSvgMarkup(svgMarkup, extraClassNames = []) {
	if (typeof window === "undefined" || typeof window.DOMParser !== "function") {
		return "";
	}

	const rawSvg = typeof svgMarkup === "string" ? svgMarkup.trim() : "";
	if (!rawSvg || !rawSvg.includes("<svg")) {
		return "";
	}
	if (/<\s*(script|iframe|object|embed|foreignObject)\b/i.test(rawSvg)) {
		return "";
	}
	if (/\son[a-z]+\s*=|(?:javascript|data)\s*:/i.test(rawSvg)) {
		return "";
	}

	const documentParser = new window.DOMParser();
	const parsedDocument = documentParser.parseFromString(rawSvg, "image/svg+xml");
	const parseError = parsedDocument.querySelector("parsererror");
	const rootElement = parsedDocument.documentElement;

	if (parseError || !rootElement || String(rootElement.tagName || "").toLowerCase() !== "svg") {
		return "";
	}

	sanitizeSvgElementTree(rootElement);
	rootElement.removeAttribute("width");
	rootElement.removeAttribute("height");
	rootElement.removeAttribute("style");
	rootElement.setAttribute("focusable", "false");
	rootElement.setAttribute("aria-hidden", "true");
	if (!rootElement.hasAttribute("preserveAspectRatio")) {
		rootElement.setAttribute("preserveAspectRatio", "xMidYMid meet");
	}
	appendClassName(rootElement, extraClassNames);

	return new window.XMLSerializer().serializeToString(rootElement);
}
