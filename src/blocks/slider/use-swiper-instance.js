import { useCallback } from "@wordpress/element";
import { useSwiperInstance as useSwiperInstanceBase } from "@components/slider/use-swiper-instance";

export function useSwiperInstance({
	swiperElementRef,
	swiperInstanceRef,
	swiperModuleSignatureRef,
	settings,
	swiperBreakpoints,
	swiperBreakpointsSignature,
	hasSelectedInnerBlock,
	hasNavigationInAnyMode,
	hasPaginationInAnyMode,
	selectBlock,
}) {
	const onRootClick = useCallback(
		(event, { wrapper, swiperElement, swiper, slideSelector }) => {
			const target = event.target instanceof Element ? event.target : null;
			if (!target) {
				return;
			}

			const closestBlockEl = target.closest("[data-block]");
			if (!closestBlockEl) {
				return;
			}

			const slideElement = closestBlockEl.closest(slideSelector);
			if (!slideElement || !swiper) {
				return;
			}

			const wrapperEl =
				wrapper || swiperElement.querySelector(".block-editor-block-list__layout");
			const slideElements = wrapperEl
				? Array.from(wrapperEl.querySelectorAll(slideSelector))
				: [];
			const slideIndex = slideElements.indexOf(slideElement);
			if (slideIndex >= 0) {
				swiper.slideTo(slideIndex);
			}

			// Only force-select the slide when the click landed on the slide
			// itself; otherwise let Gutenberg select the inner block naturally.
			if (closestBlockEl === slideElement) {
				const selectedClientId = slideElement.getAttribute("data-block") || "";
				if (selectedClientId) {
					selectBlock(selectedClientId);
				}
			}
		},
		[selectBlock]
	);

	useSwiperInstanceBase({
		swiperElementRef,
		swiperInstanceRef,
		swiperModuleSignatureRef,
		settings,
		swiperBreakpoints,
		swiperBreakpointsSignature,
		hasSelectedInnerBlock,
		hasNavigationInAnyMode,
		hasPaginationInAnyMode,
		wrapperClass: "block-editor-block-list__layout",
		slideClass: "wp-block-motto-slide",
		rootSelector: ".wp-block-motto-slider",
		onRootClick,
	});
}
