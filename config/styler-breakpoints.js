import sharedBreakpointsConfig from "./motto-breakpoints.json";

const FALLBACK_BREAKPOINTS = {
	desktop: { media: "", maxWidth: null },
	tablet: { media: "@media (max-width: 900px)", maxWidth: 900 },
	landscapePhone: { media: "@media (max-width: 700px)", maxWidth: 700 },
	phone: { media: "@media (max-width: 430px)", maxWidth: 430 },
};

export const BREAKPOINT_KEYS = ["desktop", "tablet", "landscapePhone", "phone"];
const FALLBACK_DEVICE_ORDER = BREAKPOINT_KEYS;

const buildMediaFromWidth = (width) =>
	Number.isFinite(width) && width > 0 ? `@media (max-width: ${width}px)` : "";

const getRuntimeBreakpointsConfig = () => {
	if (typeof window === "undefined") return null;
	const runtimeConfig = window.__MOTTO_BREAKPOINTS__;
	return runtimeConfig && typeof runtimeConfig === "object" ? runtimeConfig : null;
};

const resolveBreakpointsInput = (input) => {
	if (input && typeof input === "object" && Object.keys(input).length > 0) {
		return input;
	}
	return getRuntimeBreakpointsConfig() || sharedBreakpointsConfig || FALLBACK_BREAKPOINTS;
};

export const normalizeBreakpointsConfig = (input) => {
	const source = resolveBreakpointsInput(input);
	const entries = Object.entries(source);
	const out = {};

	if (entries.length === 0) {
		return { ...FALLBACK_BREAKPOINTS };
	}

	entries.forEach(([key, value]) => {
		if (!value || typeof value !== "object") return;
		const widthRaw = Number(value.maxWidth);
		const maxWidth = Number.isFinite(widthRaw) && widthRaw > 0 ? widthRaw : null;
		const mediaRaw = typeof value.media === "string" ? value.media.trim() : "";
		const ui = value.ui && typeof value.ui === "object" ? { ...value.ui } : undefined;
		out[key] = {
			maxWidth,
			media: mediaRaw || buildMediaFromWidth(maxWidth),
			...(ui ? { ui } : {}),
		};
	});

	return Object.keys(out).length ? out : { ...FALLBACK_BREAKPOINTS };
};

export const getResolvedBreakpointsConfig = (input) => normalizeBreakpointsConfig(input);

export const getBreakpointOrder = (breakpoints) => {
	const normalized = normalizeBreakpointsConfig(breakpoints);
	const available = Object.keys(normalized);
	const preferred = FALLBACK_DEVICE_ORDER.filter((key) => available.includes(key));
	const rest = available.filter((key) => !preferred.includes(key));
	return [...preferred, ...rest];
};

export const getBreakpointMaxWidth = (breakpoints, key) => {
	const normalized = normalizeBreakpointsConfig(breakpoints);
	const value = Number(normalized?.[key]?.maxWidth);
	return Number.isFinite(value) && value > 0 ? value : null;
};
