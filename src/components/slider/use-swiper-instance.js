import { useEffect } from "@wordpress/element";
import Swiper from "swiper/bundle";
import { SWIPER_NAVIGATION_DEFAULTS, SWIPER_PAGINATION_DEFAULTS } from "./constants";
import {
	applySwiperRuntimeParams,
	buildSwiperModuleSignature,
	clearSwiperModuleClasses,
	getSwiperEffectConfig,
	normalizeBreakpointsWithModules,
} from "./swiper-utils";

function toClassSelector(className) {
	return String(className || "")
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.map((token) => `.${token}`)
		.join("");
}

export function useSwiperInstance({
	enabled = true,
	swiperElementRef,
	swiperInstanceRef,
	swiperModuleSignatureRef,
	settings,
	swiperBreakpoints,
	swiperBreakpointsSignature,
	hasSelectedInnerBlock,
	hasNavigationInAnyMode,
	hasPaginationInAnyMode,
	wrapperClass,
	slideClass,
	rootSelector = null,
	onRootClick = null,
}) {
	useEffect(() => {
		if (!enabled) {
			if (swiperInstanceRef.current) {
				swiperInstanceRef.current.destroy(true, true);
				swiperInstanceRef.current = null;
			}
			swiperModuleSignatureRef.current = "";
			return undefined;
		}

		const swiperElement = swiperElementRef.current;
		const root =
			swiperElement && rootSelector ? swiperElement.closest(rootSelector) : swiperElement;
		if (!root || !swiperElement) {
			return undefined;
		}

		// Keep Gutenberg stable while editing an inner block.
		if (hasSelectedInnerBlock) {
			if (swiperInstanceRef.current) {
				swiperInstanceRef.current.destroy(true, true);
				swiperInstanceRef.current = null;
			}
			return undefined;
		}

		const wrapperSelector = toClassSelector(wrapperClass);
		const slideSelector = toClassSelector(slideClass);

		const onEditorClick =
			typeof onRootClick === "function"
				? (event) => {
						if (!swiperInstanceRef.current) {
							return;
						}
						const wrapper = swiperElement.querySelector(wrapperSelector);
						onRootClick(event, {
							root,
							swiperElement,
							wrapper,
							swiper: swiperInstanceRef.current,
							slideSelector,
						});
					}
				: null;

		if (onEditorClick) {
			root.addEventListener("click", onEditorClick);
		}

		let frame = 0;
		let isTransitioning = false;
		let hasPendingUpdate = false;
		let lastObservedSlideCount = -1;
		let hasPendingStructureSync = false;
		let shouldForceRemountOnNextUpdate = false;

		const mountOrUpdate = () => {
			frame = 0;
			const wrapper = swiperElement.querySelector(wrapperSelector);
			if (!wrapper || !wrapper.children.length) {
				return;
			}

			const nextEl = root.querySelector(".swiper-button-next");
			const prevEl = root.querySelector(".swiper-button-prev");
			const paginationEl = root.querySelector(".swiper-pagination");
			const scrollbarEl = root.querySelector(".swiper-scrollbar");
			const slidesDetected = slideSelector
				? wrapper.querySelectorAll(slideSelector).length
				: wrapper.children.length;
			lastObservedSlideCount = slidesDetected;
			const canUseNavigation = Boolean(nextEl && prevEl);
			const canUsePagination = Boolean(paginationEl);
			const canUseScrollbar = Boolean(scrollbarEl);
			const normalizedBreakpoints = normalizeBreakpointsWithModules(swiperBreakpoints, {
				canUseNavigation,
				canUsePagination,
				canUseScrollbar,
				nextEl,
				prevEl,
				paginationEl,
				scrollbarEl,
			});

			const effectConfig = getSwiperEffectConfig(settings.transitionEffect);
			const freeModeConfig = settings.freeMode
				? {
						enabled: true,
						sticky: Boolean(settings.freeModeSticky),
					}
				: false;
			const mousewheelConfig = settings.mousewheelEnabled
				? {
						forceToAxis: Boolean(settings.mousewheelForceToAxis),
						releaseOnEdges: Boolean(settings.mousewheelReleaseOnEdges),
						sensitivity: settings.mousewheelSensitivity,
					}
				: false;
			const config = {
				slidesPerView: settings.slidesPerView,
				spaceBetween: settings.spaceBetween,
				breakpoints: normalizedBreakpoints,
				// In Gutenberg preview, viewport changes happen inside the editor canvas.
				// Use container-based breakpoints so Swiper reacts to canvas width changes.
				breakpointsBase: "container",
				speed: settings.speed,
				// Free mode + loop tend to produce inconsistent behavior; prefer deterministic config.
				loop: freeModeConfig ? false : settings.loop,
				centeredSlides: settings.centeredSlides,
				freeMode: freeModeConfig,
				mousewheel: mousewheelConfig,
				...effectConfig,
				autoplay: settings.autoplayEnabled
					? {
							delay: settings.autoplayDelay,
							disableOnInteraction: false,
							pauseOnMouseEnter: false,
						}
					: false,
				navigation: hasNavigationInAnyMode
					? { ...SWIPER_NAVIGATION_DEFAULTS, nextEl, prevEl }
					: false,
				pagination: hasPaginationInAnyMode
					? {
							...SWIPER_PAGINATION_DEFAULTS,
							el: paginationEl,
							clickable: settings.paginationClickable,
						}
					: false,
				scrollbar:
					settings.scrollbar && canUseScrollbar
						? { el: scrollbarEl, draggable: false }
						: false,
				wrapperClass,
				slideClass,
				observer: false,
				observeParents: false,
				watchSlidesProgress: true,
				allowTouchMove: false,
				simulateTouch: false,
			};

			const nextModuleSignature = buildSwiperModuleSignature(config);

			// Swiper navigation/pagination modules keep internal state.
			// Recreate instance when module/breakpoint config changes to avoid stale behavior.
			if (swiperInstanceRef.current && shouldForceRemountOnNextUpdate) {
				swiperInstanceRef.current.destroy(true, true);
				swiperInstanceRef.current = null;
				swiperModuleSignatureRef.current = "";
				isTransitioning = false;
				shouldForceRemountOnNextUpdate = false;
				clearSwiperModuleClasses(swiperElement, nextEl, prevEl, paginationEl);
			}

			if (
				swiperInstanceRef.current &&
				swiperModuleSignatureRef.current !== nextModuleSignature
			) {
				swiperInstanceRef.current.destroy(true, true);
				swiperInstanceRef.current = null;
				isTransitioning = false;
			}

			if (!swiperInstanceRef.current) {
				clearSwiperModuleClasses(swiperElement, nextEl, prevEl, paginationEl);
				swiperInstanceRef.current = new Swiper(swiperElement, config);
				swiperModuleSignatureRef.current = nextModuleSignature;
				isTransitioning = false;
				swiperInstanceRef.current.on("transitionStart", () => {
					isTransitioning = true;
				});
				swiperInstanceRef.current.on("transitionEnd", () => {
					isTransitioning = false;
					if (hasPendingUpdate) {
						hasPendingUpdate = false;
						schedule();
					}
				});
				return;
			}

			if (isTransitioning || swiperInstanceRef.current.animating) {
				hasPendingUpdate = true;
				return;
			}

			applySwiperRuntimeParams(swiperInstanceRef.current, config);
			swiperModuleSignatureRef.current = nextModuleSignature;
			// A single update is enough here; cascading update* calls can trigger
			// repeated internal slideTo() syncs in editor and cause visual jitter.
			swiperInstanceRef.current.update();
			if (swiperInstanceRef.current.pagination) {
				swiperInstanceRef.current.pagination.render();
				swiperInstanceRef.current.pagination.update();
			}
			if (swiperInstanceRef.current.navigation) {
				swiperInstanceRef.current.navigation.update();
			}
			if (swiperInstanceRef.current.scrollbar) {
				swiperInstanceRef.current.scrollbar.updateSize();
			}
		};

		const schedule = () => {
			const instance = swiperInstanceRef.current;
			if (instance && (isTransitioning || instance.animating)) {
				hasPendingUpdate = true;
				return;
			}
			window.cancelAnimationFrame(frame);
			frame = window.requestAnimationFrame(() => {
				mountOrUpdate();
			});
		};

		const scheduleStructureSync = () => {
			if (hasPendingStructureSync) {
				return;
			}
			hasPendingStructureSync = true;
			window.cancelAnimationFrame(frame);
			frame = window.requestAnimationFrame(() => {
				hasPendingStructureSync = false;
				mountOrUpdate();
			});
		};

		const observer = new MutationObserver(() => {
			const wrapper = swiperElement.querySelector(wrapperSelector);
			const nextSlideCount = wrapper
				? slideSelector
					? wrapper.querySelectorAll(slideSelector).length
					: wrapper.children.length
				: 0;
			const hasStructureChange = nextSlideCount !== lastObservedSlideCount;
			if (!hasStructureChange) {
				return;
			}
			lastObservedSlideCount = nextSlideCount;
			shouldForceRemountOnNextUpdate = true;
			scheduleStructureSync();
		});

		// Observe from swiper root so wrapper replacements by Gutenberg are also captured.
		observer.observe(swiperElement, { childList: true, subtree: true });

		schedule();

		return () => {
			if (onEditorClick) {
				root.removeEventListener("click", onEditorClick);
			}
			window.cancelAnimationFrame(frame);
			observer.disconnect();
			if (swiperInstanceRef.current) {
				swiperInstanceRef.current.destroy(true, true);
				swiperInstanceRef.current = null;
			}
		};
	}, [
		enabled,
		hasSelectedInnerBlock,
		settings.slidesPerView,
		settings.slidesPerViewAuto,
		settings.spaceBetween,
		settings.speed,
		settings.loop,
		settings.centeredSlides,
		settings.transitionEffect,
		settings.autoplayEnabled,
		settings.autoplayDelay,
		settings.freeMode,
		settings.freeModeSticky,
		settings.mousewheelEnabled,
		settings.mousewheelForceToAxis,
		settings.mousewheelReleaseOnEdges,
		settings.mousewheelSensitivity,
		settings.navigation,
		settings.pagination,
		settings.paginationClickable,
		settings.scrollbar,
		settings.mode,
		hasNavigationInAnyMode,
		hasPaginationInAnyMode,
		onRootClick,
		rootSelector,
		slideClass,
		swiperBreakpoints,
		swiperBreakpointsSignature,
		swiperElementRef,
		swiperInstanceRef,
		swiperModuleSignatureRef,
		wrapperClass,
	]);
}
