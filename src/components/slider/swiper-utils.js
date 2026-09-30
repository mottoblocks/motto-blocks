import {
	SWIPER_NAVIGATION_DEFAULTS,
	SWIPER_PAGINATION_DEFAULTS,
	TRANSITION_EFFECT_VALUES,
} from "./constants";

export function normalizeTransitionEffect(value) {
	const effect = String(value || "").trim();
	return TRANSITION_EFFECT_VALUES.has(effect) ? effect : "translate";
}

export function getSwiperEffectConfig(transitionEffect) {
	const normalizedEffect = normalizeTransitionEffect(transitionEffect);

	switch (normalizedEffect) {
		case "fade":
			return { effect: "fade", fadeEffect: { crossFade: true } };
		case "cube":
			return {
				effect: "cube",
				cubeEffect: {
					shadow: false,
					slideShadows: true,
					shadowOffset: 20,
					shadowScale: 0.94,
				},
			};
		case "coverflow":
			return {
				effect: "coverflow",
				coverflowEffect: {
					rotate: 50,
					stretch: 0,
					depth: 100,
					modifier: 1,
					slideShadows: true,
				},
			};
		case "flip":
			return { effect: "flip", flipEffect: { slideShadows: true, limitRotation: true } };
		case "cards":
			return {
				effect: "cards",
				cardsEffect: { slideShadows: true, perSlideOffset: 8, perSlideRotate: 2 },
			};
		case "creative":
			return {
				effect: "creative",
				creativeEffect: {
					prev: { shadow: true, translate: [0, 0, -400] },
					next: { translate: ["100%", 0, 0] },
				},
			};
		default:
			return { effect: "slide" };
	}
}

export function clearSwiperModuleClasses(swiperElement, nextEl, prevEl, paginationEl) {
	swiperElement.classList.remove("swiper-navigation-disabled", "swiper-pagination-disabled");
	if (nextEl) {
		nextEl.classList.remove(
			"swiper-button-disabled",
			"swiper-button-lock",
			"swiper-button-hidden"
		);
	}
	if (prevEl) {
		prevEl.classList.remove(
			"swiper-button-disabled",
			"swiper-button-lock",
			"swiper-button-hidden"
		);
	}
	if (paginationEl) {
		paginationEl.classList.remove(
			"swiper-pagination-disabled",
			"swiper-pagination-lock",
			"swiper-pagination-hidden",
			"swiper-pagination-clickable"
		);
	}
}

export function normalizeBreakpointsWithModules(swiperBreakpoints, elementsAvailability) {
	if (!swiperBreakpoints || typeof swiperBreakpoints !== "object") {
		return swiperBreakpoints;
	}

	const {
		canUseNavigation,
		canUsePagination,
		canUseScrollbar,
		nextEl,
		prevEl,
		paginationEl,
		scrollbarEl,
	} = elementsAvailability;

	return Object.fromEntries(
		Object.entries(swiperBreakpoints).map(([key, bp]) => {
			const nextBp = { ...(bp || {}) };
			if (nextBp.navigation && typeof nextBp.navigation === "object") {
				nextBp.navigation = {
					...SWIPER_NAVIGATION_DEFAULTS,
					...nextBp.navigation,
					enabled: canUseNavigation ? Boolean(nextBp.navigation.enabled) : false,
					nextEl,
					prevEl,
				};
			}
			if (nextBp.pagination && typeof nextBp.pagination === "object") {
				nextBp.pagination = {
					...SWIPER_PAGINATION_DEFAULTS,
					...nextBp.pagination,
					enabled: canUsePagination ? Boolean(nextBp.pagination.enabled) : false,
					el: paginationEl,
				};
			}
			if (nextBp.scrollbar && typeof nextBp.scrollbar === "object") {
				nextBp.scrollbar = {
					...nextBp.scrollbar,
					enabled: canUseScrollbar ? Boolean(nextBp.scrollbar.enabled) : false,
					el: scrollbarEl,
				};
			}
			return [key, nextBp];
		})
	);
}

export function buildSwiperModuleSignature(config) {
	const signatureBreakpoints = Object.fromEntries(
		Object.entries(config.breakpoints || {}).map(([key, bp]) => [
			key,
			{
				slidesPerView: bp?.slidesPerView,
				spaceBetween: bp?.spaceBetween,
				navigationEnabled: bp?.navigation?.enabled ?? null,
				paginationEnabled: bp?.pagination?.enabled ?? null,
				paginationClickable: bp?.pagination?.clickable ?? null,
			},
		])
	);

	return JSON.stringify({
		breakpoints: signatureBreakpoints,
		navigationEnabled: Boolean(config.navigation),
		paginationEnabled: Boolean(config.pagination),
		paginationClickable: config.pagination?.clickable ?? false,
		scrollbarEnabled: Boolean(config.scrollbar),
		effect: config.effect ?? "slide",
		freeModeEnabled: Boolean(config.freeMode),
		freeModeSticky: config.freeMode?.sticky ?? false,
		mousewheelEnabled: Boolean(config.mousewheel),
		mousewheelForceToAxis: config.mousewheel?.forceToAxis ?? false,
		mousewheelReleaseOnEdges: config.mousewheel?.releaseOnEdges ?? false,
		mousewheelSensitivity: config.mousewheel?.sensitivity ?? 1,
	});
}

export function applySwiperRuntimeParams(instance, config) {
	instance.params.slidesPerView = config.slidesPerView;
	instance.params.spaceBetween = config.spaceBetween;
	instance.params.breakpoints = config.breakpoints;
	instance.params.breakpointsBase = config.breakpointsBase;
	instance.params.speed = config.speed;
	instance.params.loop = config.loop;
	instance.params.centeredSlides = config.centeredSlides;
	instance.params.freeMode = config.freeMode;
	instance.params.mousewheel = config.mousewheel;
	instance.params.autoplay = config.autoplay;
}
