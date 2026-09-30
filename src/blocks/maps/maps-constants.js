import { __ } from "@wordpress/i18n";
import { Code, Image, MapPinned, Star } from "lucide-react";
import mapPinLucideIcons from "./map-pin-lucide-icons.json";

// Curated subset of the shared Lucide icon set, scoped to what's actually useful as a map
// pin marker (places, transport, amenities, ...) — not the full ~1864-icon library used
// elsewhere (List/Bullets). Keeps the locally-bundled SVG set small (assets/vendor/lucide/
// icons/, copied by scripts/copy-lucide-icons.mjs) and the picker easier to scan.
export const MAP_PIN_ICON_OPTIONS = mapPinLucideIcons.icons;

export const MAP_TYPE_OPTIONS = [
	{ label: __("Roadmap", "motto-blocks"), value: "roadmap" },
	{ label: __("Satellite", "motto-blocks"), value: "satellite" },
	{ label: __("Hybrid", "motto-blocks"), value: "hybrid" },
	{ label: __("Terrain", "motto-blocks"), value: "terrain" },
];

export const PIN_ICON_TYPE_OPTIONS = [
	{ label: __("Default", "motto-blocks"), value: "none", icon: MapPinned },
	{ label: __("SVG Library", "motto-blocks"), value: "svg-library", icon: Star },
	{ label: __("Inline SVG", "motto-blocks"), value: "svg-inline", icon: Code },
	{ label: __("Image", "motto-blocks"), value: "image", icon: Image },
];

export const DEFAULT_CONTROLS = Object.freeze({
	zoomControl: true,
	fullscreenControl: true,
	streetViewControl: false,
	mapTypeControl: false,
});

export const DEFAULT_CENTER = Object.freeze({
	lat: 40.7128,
	lng: -74.006,
});

export const DEFAULT_PIN_COLOR = "#d93025";
