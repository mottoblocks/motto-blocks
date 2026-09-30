import { toSafeString, toSafeNumber } from "../../lib/safe-coerce.js";

export const DEFAULT_NAVIGATION_ICON_OPTIONS = {
	prev: {
		type: "default",
		image: {
			id: 0,
			url: "",
		},
		svg: {
			source: "inline",
			inline: "",
			lucideIcon: "arrow-left",
		},
	},
	next: {
		type: "default",
		image: {
			id: 0,
			url: "",
		},
		svg: {
			source: "inline",
			inline: "",
			lucideIcon: "arrow-right",
		},
	},
};

export function createDefaultNavigationIconOptions() {
	return {
		prev: {
			type: DEFAULT_NAVIGATION_ICON_OPTIONS.prev.type,
			image: { ...DEFAULT_NAVIGATION_ICON_OPTIONS.prev.image },
			svg: { ...DEFAULT_NAVIGATION_ICON_OPTIONS.prev.svg },
		},
		next: {
			type: DEFAULT_NAVIGATION_ICON_OPTIONS.next.type,
			image: { ...DEFAULT_NAVIGATION_ICON_OPTIONS.next.image },
			svg: { ...DEFAULT_NAVIGATION_ICON_OPTIONS.next.svg },
		},
	};
}

export function normalizeNavigationIconOption(iconOptions, fallbackLucideIcon) {
	const hasExplicitType = typeof iconOptions?.type === "string" && iconOptions.type !== "";
	const type = toSafeString(iconOptions?.type, "default");
	const imageId = toSafeNumber(iconOptions?.image?.id, 0);
	const imageUrl = toSafeString(iconOptions?.image?.url, "");
	const source = toSafeString(iconOptions?.svg?.source, "inline");
	const lucideIcon = toSafeString(iconOptions?.svg?.lucideIcon, fallbackLucideIcon);
	const inline = toSafeString(iconOptions?.svg?.inline || iconOptions?.svg?.raw, "");
	const normalizedType =
		!hasExplicitType && type === "svg" ? (source === "lucide" ? "icon" : "svg") : type;
	const safeType = ["default", "image", "icon", "svg"].includes(normalizedType)
		? normalizedType
		: "default";

	return {
		type: safeType,
		image: {
			id: imageId,
			url: imageUrl,
		},
		svg: {
			source: safeType === "icon" ? "lucide" : "inline",
			lucideIcon,
			inline,
		},
	};
}

export function normalizeNavigationIconOptions(options = {}) {
	return {
		prev: normalizeNavigationIconOption(
			options?.prev,
			DEFAULT_NAVIGATION_ICON_OPTIONS.prev.svg.lucideIcon
		),
		next: normalizeNavigationIconOption(
			options?.next,
			DEFAULT_NAVIGATION_ICON_OPTIONS.next.svg.lucideIcon
		),
	};
}
