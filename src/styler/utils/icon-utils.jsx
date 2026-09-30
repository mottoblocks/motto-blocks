import { useMemo } from "@wordpress/element";
import { LUCIDE_ICON_REGISTRY } from "@components/lucide/lucide-registry.js";

const toLucideKey = (iconName) =>
	String(iconName || "")
		.trim()
		.replace(/([a-z0-9])([A-Z])/g, "$1-$2")
		.replace(/([a-zA-Z])([0-9])/g, "$1-$2")
		.replace(/([0-9])([a-zA-Z])/g, "$1-$2")
		.replace(/[_\s]+/g, "-")
		.toLowerCase();

export const resolveLucideIcon = (iconName) => {
	const normalized = String(iconName || "").trim();
	if (!normalized) return null;
	return (
		LUCIDE_ICON_REGISTRY[normalized] || LUCIDE_ICON_REGISTRY[toLucideKey(normalized)] || null
	);
};

export const useLucideIconMap = (iconNames = []) => {
	return useMemo(() => {
		const map = {};
		const seen = new Set();
		(iconNames || []).forEach((name) => {
			const normalized = String(name || "").trim();
			if (!normalized || seen.has(normalized)) return;
			seen.add(normalized);
			map[normalized] = resolveLucideIcon(normalized);
		});
		return map;
	}, [iconNames]);
};
