import { normalizeImageSourceValue } from "@components/controls/image/ImageSourceControl.jsx";
import { __ } from "@wordpress/i18n";
import { getLucideComponent } from "@components/lucide/lucide-library";
import { sanitizeInlineSvgMarkup, SVG_ALLOWED_TAGS } from "../../lib/inline-svg-sanitizer.js";
import { toSafeString, toSafeNumber } from "../../lib/safe-coerce.js";

const SVG_SOURCE_OPTIONS = ["lucide", "media", "inline"];

const DEFAULT_SVG_ASSET = Object.freeze({
	source: "lucide",
	media: {
		id: 0,
		url: "",
		alt: "",
		title: "",
		width: 0,
		height: 0,
		mime: "",
		inlineSvg: "",
	},
	svg: {
		lucideIcon: "star",
		lucideSvg: "",
		inline: "",
	},
});

function escapeAttribute(value) {
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

function escapeText(value) {
	return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function serializeLucideNode(node) {
	if (!Array.isArray(node) || node.length < 2) {
		return "";
	}

	const [tagName, attributes] = node;
	const safeTag = toSafeString(tagName).trim().toLowerCase();
	if (!safeTag || !SVG_ALLOWED_TAGS[safeTag]) {
		return "";
	}

	const attrString = Object.entries(attributes || {})
		.filter(([name]) => {
			const normalizedName = String(name || "").toLowerCase();
			return (
				SVG_ALLOWED_TAGS[safeTag].has(name) || SVG_ALLOWED_TAGS[safeTag].has(normalizedName)
			);
		})
		.map(([name, value]) => `${name}="${escapeAttribute(value)}"`)
		.join(" ");

	return attrString ? `<${safeTag} ${attrString}></${safeTag}>` : `<${safeTag}></${safeTag}>`;
}

export function buildLucideSvgMarkup(iconName) {
	const IconComponent = getLucideComponent(iconName);
	if (!IconComponent || typeof IconComponent.render !== "function") {
		return "";
	}

	const renderedIcon = IconComponent.render(
		{
			size: 24,
			strokeWidth: 2,
		},
		null
	);
	const iconNode = Array.isArray(renderedIcon?.props?.iconNode)
		? renderedIcon.props.iconNode
		: [];
	if (iconNode.length === 0) {
		return "";
	}

	const label = escapeText(toSafeString(iconName, "icon"));
	const innerMarkup = iconNode.map(serializeLucideNode).join("");

	return sanitizeInlineSvgMarkup(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><title>${label}</title>${innerMarkup}</svg>`,
		[
			"motto-svg__inline",
			"motto-svg__inline--lucide",
			"lucide",
			`lucide-${toSafeString(iconName).trim().toLowerCase()}`,
		]
	);
}

export function normalizeSvgAsset(value = {}) {
	const source = SVG_SOURCE_OPTIONS.includes(value?.source)
		? value.source
		: DEFAULT_SVG_ASSET.source;
	const mediaSource = normalizeImageSourceValue(value?.media);
	const media = {
		...DEFAULT_SVG_ASSET.media,
		...mediaSource,
		mime: toSafeString(
			value?.media?.mime || (mediaSource.url ? "image/svg+xml" : ""),
			DEFAULT_SVG_ASSET.media.mime
		),
		inlineSvg: toSafeString(value?.media?.inlineSvg, DEFAULT_SVG_ASSET.media.inlineSvg),
	};
	const lucideIcon = toSafeString(value?.svg?.lucideIcon, DEFAULT_SVG_ASSET.svg.lucideIcon);
	const lucideSvg = toSafeString(value?.svg?.lucideSvg, "");

	return {
		source,
		media: {
			...media,
			id: toSafeNumber(media.id, DEFAULT_SVG_ASSET.media.id),
			width: toSafeNumber(media.width, DEFAULT_SVG_ASSET.media.width),
			height: toSafeNumber(media.height, DEFAULT_SVG_ASSET.media.height),
		},
		svg: {
			lucideIcon,
			lucideSvg: lucideSvg || buildLucideSvgMarkup(lucideIcon),
			inline: toSafeString(value?.svg?.inline, DEFAULT_SVG_ASSET.svg.inline),
		},
	};
}

export function resolveSvgAssetForEditor(value) {
	const svgAsset = normalizeSvgAsset(value);

	if (svgAsset.source === "media") {
		if (!svgAsset.media.url) {
			return {
				kind: "empty",
				message: __("Select an SVG file to preview it here.", "motto-blocks"),
			};
		}

		return {
			kind: "img",
			src: svgAsset.media.url,
			alt: svgAsset.media.alt || "",
			message: "",
		};
	}

	if (svgAsset.source === "lucide") {
		const markup = sanitizeInlineSvgMarkup(svgAsset.svg.lucideSvg, [
			"motto-svg__inline",
			"motto-svg__inline--lucide",
			"lucide",
			`lucide-${svgAsset.svg.lucideIcon}`,
		]);

		return markup
			? { kind: "inline", markup, message: "" }
			: {
					kind: "empty",
					message: __("The selected Lucide icon could not be resolved.", "motto-blocks"),
				};
	}

	const markup = sanitizeInlineSvgMarkup(svgAsset.svg.inline, [
		"motto-svg__inline",
		"motto-svg__inline--custom",
	]);
	return markup
		? { kind: "inline", markup, message: "" }
		: { kind: "empty", message: __("Inline SVG is empty or invalid.", "motto-blocks") };
}
