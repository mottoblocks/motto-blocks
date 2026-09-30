import { toSafeString, toSafeNumber } from "../../../lib/safe-coerce.js";

export const DEFAULT_TRIGGER_ICON_OPTIONS = {
	type: "icon",
	image: {
		id: 0,
		url: "",
	},
	inlineSvg: "",
	lucideIcon: "chevron-down",
};

export function normalizeTriggerIconOptions(options = {}) {
	const hasExplicitType = typeof options?.type === "string" && options.type !== "";
	const legacySource = toSafeString(
		options?.svg?.source,
		DEFAULT_TRIGGER_ICON_OPTIONS.type === "icon" ? "lucide" : "inline"
	);
	const rawType = toSafeString(options?.type, DEFAULT_TRIGGER_ICON_OPTIONS.type);
	const normalizedType =
		!hasExplicitType && rawType === "svg"
			? legacySource === "lucide"
				? "icon"
				: "svg"
			: rawType;
	const safeType = ["none", "image", "icon", "svg"].includes(normalizedType)
		? normalizedType
		: DEFAULT_TRIGGER_ICON_OPTIONS.type;

	return {
		type: safeType,
		image: {
			id: toSafeNumber(options?.image?.id, DEFAULT_TRIGGER_ICON_OPTIONS.image.id),
			url: toSafeString(options?.image?.url, DEFAULT_TRIGGER_ICON_OPTIONS.image.url),
		},
		inlineSvg: toSafeString(
			options?.inlineSvg || options?.svg?.inline || options?.svg?.raw,
			DEFAULT_TRIGGER_ICON_OPTIONS.inlineSvg
		),
		lucideIcon: toSafeString(
			options?.lucideIcon || options?.svg?.lucideIcon,
			DEFAULT_TRIGGER_ICON_OPTIONS.lucideIcon
		),
	};
}
