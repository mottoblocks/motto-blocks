import { useMemo } from "@wordpress/element";
import { useSelect } from "@wordpress/data";
import { getResolvedBreakpointsConfig } from "@config/styler-breakpoints.js";
import { DEVICE_ORDER, RESPONSIVE_KEYS, PREVIEW_STORE_KEY } from "./constants";
import { normalizeTransitionEffect } from "./swiper-utils";

export function toNumber(value, fallback = 0) {
	const parsed = Number.parseInt(String(value), 10);
	return Number.isFinite(parsed) ? parsed : fallback;
}

export function toDecimal(value, fallback = 1) {
	const parsed = Number.parseFloat(String(value));
	return Number.isFinite(parsed) ? parsed : fallback;
}

export function useActiveMode() {
	const mode = useSelect((select) => select(PREVIEW_STORE_KEY)?.getMode?.() || "desktop");
	return DEVICE_ORDER.includes(mode) ? mode : "desktop";
}

export function normalizeResponsiveOptions(responsiveOptions) {
	const source =
		responsiveOptions && typeof responsiveOptions === "object" ? responsiveOptions : {};
	const normalized = {};
	for (const mode of DEVICE_ORDER) {
		if (mode === "desktop") {
			continue;
		}
		const modeValues = source[mode] && typeof source[mode] === "object" ? source[mode] : {};
		normalized[mode] = {};
		for (const key of RESPONSIVE_KEYS) {
			if (Object.prototype.hasOwnProperty.call(modeValues, key)) {
				normalized[mode][key] = modeValues[key];
			}
		}
	}
	return normalized;
}

export function getResponsiveValue(attributes, mode, key) {
	if (mode !== "desktop") {
		const responsive = normalizeResponsiveOptions(attributes.responsiveOptions);
		if (Object.prototype.hasOwnProperty.call(responsive[mode], key)) {
			return responsive[mode][key];
		}
	}
	return attributes[key];
}

export function getSettings(attributes, mode = "desktop") {
	const rawSlidesPerViewAuto = getResponsiveValue(attributes, mode, "slidesPerViewAuto");
	const rawSlidesPerView = getResponsiveValue(attributes, mode, "slidesPerView");
	const rawSpaceBetween = getResponsiveValue(attributes, mode, "spaceBetween");
	const slidesPerViewAuto = Boolean(rawSlidesPerViewAuto);
	const slidesPerView = slidesPerViewAuto
		? "auto"
		: Math.max(0.1, toDecimal(rawSlidesPerView, 1));

	return {
		mode,
		slidesPerViewAuto,
		slidesPerView,
		spaceBetween: Math.max(0, toNumber(rawSpaceBetween, 16)),
		speed: Math.max(0, toNumber(attributes.speed, 300)),
		loop: Boolean(attributes.loop),
		centeredSlides: Boolean(attributes.centeredSlides),
		freeMode: Boolean(attributes.freeMode),
		freeModeSticky: Boolean(attributes.freeModeSticky),
		mousewheelEnabled: Boolean(attributes.mousewheelEnabled),
		mousewheelForceToAxis: attributes.mousewheelForceToAxis !== false,
		mousewheelReleaseOnEdges: attributes.mousewheelReleaseOnEdges !== false,
		mousewheelSensitivity: Math.max(0.1, toDecimal(attributes.mousewheelSensitivity, 1)),
		autoplayEnabled: Boolean(attributes.autoplayEnabled),
		autoplayDelay: Math.max(300, toNumber(attributes.autoplayDelay, 3000)),
		navigation: Boolean(getResponsiveValue(attributes, mode, "navigation")),
		pagination: Boolean(getResponsiveValue(attributes, mode, "pagination")),
		paginationClickable: Boolean(attributes.paginationClickable),
		scrollbar: Boolean(attributes.scrollbar),
		transitionEffect: normalizeTransitionEffect(attributes.transitionEffect),
	};
}

export function isEnabledInAnyMode(attributes, key) {
	if (Boolean(attributes[key])) {
		return true;
	}

	const responsive = normalizeResponsiveOptions(attributes.responsiveOptions);
	for (const mode of DEVICE_ORDER) {
		if (mode === "desktop") {
			continue;
		}
		if (Boolean(responsive[mode]?.[key])) {
			return true;
		}
	}

	return false;
}

export function buildSwiperBreakpoints(attributes, breakpointsConfig) {
	const responsive = normalizeResponsiveOptions(attributes.responsiveOptions);
	const hasOverridesForMode = (mode) => Object.keys(responsive[mode] || {}).length > 0;
	const configMap =
		breakpointsConfig && typeof breakpointsConfig === "object" ? breakpointsConfig : {};
	const deviceRanges = Object.entries(configMap)
		.filter(([mode]) => mode !== "desktop" && hasOverridesForMode(mode))
		.map(([mode, config]) => ({
			mode,
			maxWidth: Number.isFinite(Number(config?.maxWidth)) ? Number(config.maxWidth) : null,
		}))
		.filter((entry) => Number.isFinite(entry.maxWidth))
		.sort((a, b) => a.maxWidth - b.maxWidth);

	if (deviceRanges.length === 0) {
		return {};
	}

	const breakpoints = {};
	let minWidth = 0;

	for (const entry of deviceRanges) {
		const modeSettings = getSettings(attributes, entry.mode);
		breakpoints[minWidth] = {
			slidesPerView: modeSettings.slidesPerView,
			spaceBetween: modeSettings.spaceBetween,
			navigation: { enabled: modeSettings.navigation },
			pagination: {
				enabled: modeSettings.pagination,
				clickable: modeSettings.paginationClickable,
			},
		};
		minWidth = entry.maxWidth + 1;
	}

	const desktopSettings = getSettings(attributes, "desktop");
	breakpoints[minWidth] = {
		slidesPerView: desktopSettings.slidesPerView,
		spaceBetween: desktopSettings.spaceBetween,
		navigation: { enabled: desktopSettings.navigation },
		pagination: {
			enabled: desktopSettings.pagination,
			clickable: desktopSettings.paginationClickable,
		},
	};

	return breakpoints;
}

export function toDataAttributes(settings, breakpoints, featureAvailability = null) {
	const hasNavigation = featureAvailability?.navigation ?? settings.navigation;
	const hasPagination = featureAvailability?.pagination ?? settings.pagination;

	const dataAttributes = {
		"data-slides-per-view": String(settings.slidesPerView),
		"data-space-between": String(settings.spaceBetween),
		"data-speed": String(settings.speed),
		"data-loop": settings.loop ? "true" : "false",
		"data-centered-slides": settings.centeredSlides ? "true" : "false",
		"data-free-mode": settings.freeMode ? "true" : "false",
		"data-free-mode-sticky": settings.freeModeSticky ? "true" : "false",
		"data-autoplay": settings.autoplayEnabled ? "true" : "false",
		"data-autoplay-delay": String(settings.autoplayDelay),
		"data-navigation": hasNavigation ? "true" : "false",
		"data-pagination": hasPagination ? "true" : "false",
		"data-pagination-clickable": settings.paginationClickable ? "true" : "false",
		"data-scrollbar": settings.scrollbar ? "true" : "false",
		"data-transition-effect": settings.transitionEffect,
	};

	if (settings.mousewheelEnabled) {
		dataAttributes["data-mousewheel"] = "true";
		dataAttributes["data-mousewheel-force-to-axis"] = settings.mousewheelForceToAxis
			? "true"
			: "false";
		dataAttributes["data-mousewheel-release-on-edges"] = settings.mousewheelReleaseOnEdges
			? "true"
			: "false";
		dataAttributes["data-mousewheel-sensitivity"] = String(settings.mousewheelSensitivity);
	}

	const hasBreakpoints = breakpoints && Object.keys(breakpoints).length > 0;
	if (hasBreakpoints) {
		dataAttributes["data-breakpoints"] = JSON.stringify(breakpoints);
	}

	return dataAttributes;
}

export function setResponsiveAttribute(setAttributes, attributes, mode, key, value) {
	if (mode === "desktop") {
		setAttributes({ [key]: value });
		return;
	}

	const responsive = normalizeResponsiveOptions(attributes.responsiveOptions);
	const nextModeValues = {
		...(responsive[mode] || {}),
		[key]: value,
	};
	setAttributes({
		responsiveOptions: {
			...responsive,
			[mode]: nextModeValues,
		},
	});
}

export function useSwiperBreakpoints(attributes) {
	const {
		navigation,
		pagination,
		paginationClickable,
		responsiveOptions,
		slidesPerView,
		slidesPerViewAuto,
		spaceBetween,
	} = attributes;
	const resolvedBreakpointsConfig = useMemo(() => getResolvedBreakpointsConfig(), []);
	const swiperBreakpoints = useMemo(
		() =>
			buildSwiperBreakpoints(
				{
					navigation,
					pagination,
					paginationClickable,
					responsiveOptions,
					slidesPerView,
					slidesPerViewAuto,
					spaceBetween,
				},
				resolvedBreakpointsConfig
			),
		[
			navigation,
			pagination,
			paginationClickable,
			responsiveOptions,
			slidesPerView,
			slidesPerViewAuto,
			spaceBetween,
			resolvedBreakpointsConfig,
		]
	);
	const swiperBreakpointsSignature = useMemo(
		() => JSON.stringify(swiperBreakpoints),
		[swiperBreakpoints]
	);

	return { swiperBreakpoints, swiperBreakpointsSignature };
}
