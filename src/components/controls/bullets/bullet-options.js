import { toSafeString, toSafeNumber } from "../../../lib/safe-coerce.js";

export const DEFAULT_BULLET_OPTIONS = {
	type: "icon",
	image: {
		id: 0,
		url: "",
	},
	svg: {
		source: "lucide",
		inline: "",
		lucideIcon: "star",
	},
	counter: {
		style: "decimal",
		start: 1,
	},
};

function clampInteger(value, fallback = 1) {
	const number = Math.trunc(toSafeNumber(value, fallback));
	return number >= 1 ? number : fallback;
}

export function normalizeBulletOptions(options = {}) {
	const hasExplicitType = typeof options?.type === "string" && options.type !== "";
	const fallbackValues = {
		type: options?.bulletType,
		imageUrl: options?.bulletImageUrl,
		imageId: options?.bulletImageId,
		svgSource: options?.bulletSvgSource,
		svgInline: options?.bulletSvgInline,
		lucideIcon: options?.bulletLucideIcon,
	};

	const rawType = toSafeString(options?.type || fallbackValues.type, DEFAULT_BULLET_OPTIONS.type);
	const imageUrl = toSafeString(
		options?.image?.url || fallbackValues.imageUrl,
		DEFAULT_BULLET_OPTIONS.image.url
	);
	const imageId = toSafeNumber(
		options?.image?.id ?? fallbackValues.imageId,
		DEFAULT_BULLET_OPTIONS.image.id
	);
	const svgSource = toSafeString(
		options?.svg?.source || fallbackValues.svgSource,
		DEFAULT_BULLET_OPTIONS.svg.source
	);
	const svgInline = toSafeString(
		options?.svg?.inline || fallbackValues.svgInline,
		DEFAULT_BULLET_OPTIONS.svg.inline
	);
	const lucideIcon = toSafeString(
		options?.svg?.lucideIcon || fallbackValues.lucideIcon,
		DEFAULT_BULLET_OPTIONS.svg.lucideIcon
	);
	const normalizedType =
		!hasExplicitType && rawType === "svg" ? (svgSource === "lucide" ? "icon" : "svg") : rawType;
	const allowedTypes = ["default", "image", "icon", "svg", "counter", "none"];
	const safeType = allowedTypes.includes(normalizedType)
		? normalizedType
		: DEFAULT_BULLET_OPTIONS.type;
	const allowedCounterStyles = [
		"decimal",
		"decimal-leading-zero",
		"lower-alpha",
		"upper-alpha",
		"lower-roman",
		"upper-roman",
	];
	const counterStyle = toSafeString(
		options?.counter?.style,
		DEFAULT_BULLET_OPTIONS.counter.style
	);
	const safeCounterStyle = allowedCounterStyles.includes(counterStyle)
		? counterStyle
		: DEFAULT_BULLET_OPTIONS.counter.style;
	const counterStart = clampInteger(
		options?.counter?.start,
		DEFAULT_BULLET_OPTIONS.counter.start
	);

	return {
		type: safeType,
		image: {
			id: imageId,
			url: imageUrl,
		},
		svg: {
			source: safeType === "icon" ? "lucide" : "inline",
			inline: svgInline,
			lucideIcon,
		},
		counter: {
			style: safeCounterStyle,
			start: counterStart,
		},
	};
}
