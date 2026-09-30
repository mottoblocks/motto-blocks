import { createElement } from "@wordpress/element";
import { LUCIDE_ICON_REGISTRY } from "./lucide-registry.js";

function toKebabCase(value) {
	return value
		.replace(/([a-z0-9])([A-Z])/g, "$1-$2")
		.replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
		.toLowerCase();
}

function normalizeIconName(iconName) {
	if (typeof iconName !== "string") {
		return "";
	}

	const trimmed = iconName.trim();
	if (!trimmed) {
		return "";
	}

	if (trimmed.includes("-")) {
		return trimmed.toLowerCase();
	}

	return toKebabCase(trimmed);
}

export const LUCIDE_OPTIONS = Object.keys(LUCIDE_ICON_REGISTRY)
	.filter((name) => name === normalizeIconName(name))
	.sort((a, b) => a.localeCompare(b))
	.map((name) => ({
		name,
		component: LUCIDE_ICON_REGISTRY[name],
	}));

const LUCIDE_BY_NAME = new Map(LUCIDE_OPTIONS.map((icon) => [icon.name, icon.component]));
const DEFAULT_LUCIDE_COMPONENT = LUCIDE_OPTIONS[0]?.component || null;

export function getLucideComponent(iconName) {
	const normalizedName = normalizeIconName(iconName);
	return LUCIDE_BY_NAME.get(normalizedName) || DEFAULT_LUCIDE_COMPONENT;
}

export function LucideIcon({ iconName, className, size = 24, strokeWidth = 2, ...rest }) {
	const IconComponent = getLucideComponent(iconName);
	if (!IconComponent) {
		return null;
	}

	return createElement(IconComponent, {
		className,
		size,
		strokeWidth,
		...rest,
	});
}
