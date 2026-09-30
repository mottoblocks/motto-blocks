import { toSafeString, toSafeNumber } from "../../../lib/safe-coerce.js";

export const DEFAULT_BUTTON_ICON_OPTIONS = {
	type: "none",
	image: {
		id: 0,
		url: "",
	},
	svg: {
		source: "inline",
		inline: "",
		lucideIcon: "check",
	},
};

export function normalizeButtonIconOptions(options = {}) {
	const type = toSafeString(options?.type, DEFAULT_BUTTON_ICON_OPTIONS.type);
	const imageUrl = toSafeString(options?.image?.url, DEFAULT_BUTTON_ICON_OPTIONS.image.url);
	const imageId = toSafeNumber(options?.image?.id, DEFAULT_BUTTON_ICON_OPTIONS.image.id);
	const svgSource = toSafeString(options?.svg?.source, DEFAULT_BUTTON_ICON_OPTIONS.svg.source);
	const svgInline = toSafeString(options?.svg?.inline, DEFAULT_BUTTON_ICON_OPTIONS.svg.inline);
	const lucideIcon = toSafeString(
		options?.svg?.lucideIcon,
		DEFAULT_BUTTON_ICON_OPTIONS.svg.lucideIcon
	);
	const allowedTypes = ["none", "image", "svg"];
	const safeType = allowedTypes.includes(type) ? type : DEFAULT_BUTTON_ICON_OPTIONS.type;
	const safeSvgSource = svgSource === "lucide" ? "lucide" : "inline";

	return {
		type: safeType,
		image: {
			id: imageId,
			url: imageUrl,
		},
		svg: {
			source: safeSvgSource,
			inline: svgInline,
			lucideIcon,
		},
	};
}
