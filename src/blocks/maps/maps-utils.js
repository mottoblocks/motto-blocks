import {
	DEFAULT_CONTROLS,
	DEFAULT_CENTER,
	DEFAULT_PIN_COLOR,
	PIN_ICON_TYPE_OPTIONS,
} from "./maps-constants";

export function generatePinId() {
	return `pin-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function toFiniteNumber(value, fallback) {
	const parsed = typeof value === "string" ? Number.parseFloat(value) : value;
	return Number.isFinite(parsed) ? parsed : fallback;
}

export function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

export function normalizePinColor(value) {
	const color = typeof value === "string" ? value.trim() : "";
	if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(color)) {
		return color;
	}
	if (/^rgba?\(/i.test(color) || /^hsla?\(/i.test(color)) {
		return color;
	}
	return DEFAULT_PIN_COLOR;
}

export function normalizeControls(value) {
	const raw = value && typeof value === "object" ? value : {};
	return {
		zoomControl: Boolean(raw.zoomControl ?? DEFAULT_CONTROLS.zoomControl),
		fullscreenControl: Boolean(raw.fullscreenControl ?? DEFAULT_CONTROLS.fullscreenControl),
		streetViewControl: Boolean(raw.streetViewControl ?? DEFAULT_CONTROLS.streetViewControl),
		mapTypeControl: Boolean(raw.mapTypeControl ?? DEFAULT_CONTROLS.mapTypeControl),
	};
}

function normalizePinIconValue(iconType, iconValue) {
	if (iconType === "svg-library") {
		return typeof iconValue === "string" ? iconValue : "map-pin";
	}
	if (iconType === "svg-inline") {
		return typeof iconValue === "string" ? iconValue : "";
	}
	if (iconType === "image") {
		const raw = iconValue && typeof iconValue === "object" ? iconValue : {};
		return {
			id: Number.isFinite(raw.id) ? raw.id : 0,
			url: typeof raw.url === "string" ? raw.url : "",
		};
	}
	return "";
}

export function normalizePin(pin, fallbackCenter = DEFAULT_CENTER) {
	const raw = pin && typeof pin === "object" ? pin : {};
	const iconType = PIN_ICON_TYPE_OPTIONS.some((option) => option.value === raw.iconType)
		? raw.iconType
		: "none";

	return {
		id: typeof raw.id === "string" && raw.id ? raw.id : generatePinId(),
		lat: clamp(toFiniteNumber(raw.lat, fallbackCenter.lat), -90, 90),
		lng: clamp(toFiniteNumber(raw.lng, fallbackCenter.lng), -180, 180),
		title: typeof raw.title === "string" ? raw.title : "",
		description: typeof raw.description === "string" ? raw.description : "",
		url: typeof raw.url === "string" ? raw.url : "",
		pinColor: normalizePinColor(raw.pinColor),
		iconType,
		iconValue: normalizePinIconValue(iconType, raw.iconValue),
		iconSvg: iconType === "svg-library" && typeof raw.iconSvg === "string" ? raw.iconSvg : "",
	};
}

export function normalizePins(pins, fallbackCenter = DEFAULT_CENTER) {
	if (!Array.isArray(pins)) {
		return [];
	}
	return pins.map((pin) => normalizePin(pin, fallbackCenter));
}

export function encodeInlineSvgDataUri(svgMarkup) {
	if (typeof svgMarkup !== "string" || !svgMarkup.includes("<svg")) {
		return "";
	}
	return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgMarkup)}`;
}

export function colorizeSvgMarkup(svgMarkup, color) {
	if (typeof svgMarkup !== "string" || !svgMarkup.includes("<svg")) {
		return "";
	}

	const normalizedColor = normalizePinColor(color);
	return svgMarkup.replace(/<svg\b([^>]*)>/i, (match, attrs) => {
		const withoutColor = String(attrs || "").replace(/\scolor=(["']).*?\1/i, "");
		return `<svg${withoutColor} color="${normalizedColor}">`;
	});
}

export function getLucideIconUrl(iconName) {
	if (typeof iconName !== "string" || !iconName.trim()) {
		return "";
	}
	const slug = iconName
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, "");
	if (!slug) {
		return "";
	}
	// Served from the plugin's own bundled copy (assets/vendor/lucide/icons/) — see
	// motto_blocks_register_editor_script() in motto-blocks.php, which localizes this base URL.
	// Never point this at a third-party CDN (disallowed for WordPress.org distribution).
	const baseUrl =
		typeof window !== "undefined" &&
		typeof window.__MOTTO_BLOCKS_LUCIDE_ICON_BASE_URL__ === "string"
			? window.__MOTTO_BLOCKS_LUCIDE_ICON_BASE_URL__
			: "";
	if (!baseUrl) {
		return "";
	}
	return `${baseUrl}${slug}.svg`;
}

export function toMarkerIcon(googleMaps, pin) {
	let iconUrl = "";

	if (pin.iconType === "svg-inline") {
		iconUrl = encodeInlineSvgDataUri(pin.iconValue);
	} else if (pin.iconType === "svg-library") {
		iconUrl = pin.iconSvg
			? encodeInlineSvgDataUri(colorizeSvgMarkup(pin.iconSvg, pin.pinColor))
			: getLucideIconUrl(pin.iconValue);
	} else if (pin.iconType === "image") {
		iconUrl = pin.iconValue?.url || "";
	}

	if (!iconUrl) {
		return null;
	}

	return {
		url: iconUrl,
		scaledSize: new googleMaps.Size(36, 36),
		anchor: new googleMaps.Point(18, 36),
	};
}
