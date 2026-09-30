import { __ } from "@wordpress/i18n";
import { BREAKPOINT_KEYS } from "@config/styler-breakpoints.js";

export const DEVICE_ORDER = BREAKPOINT_KEYS;
export const RESPONSIVE_KEYS = [
	"slidesPerView",
	"slidesPerViewAuto",
	"spaceBetween",
	"navigation",
	"pagination",
];
export const PREVIEW_STORE_KEY = "motto-styler/preview";

export const SWIPER_NAVIGATION_DEFAULTS = Object.freeze({
	hideOnClick: false,
	disabledClass: "swiper-button-disabled",
	hiddenClass: "swiper-button-hidden",
	lockClass: "swiper-button-lock",
	navigationDisabledClass: "swiper-navigation-disabled",
});

export const SWIPER_PAGINATION_DEFAULTS = Object.freeze({
	clickable: false,
	bulletClass: "swiper-pagination-bullet",
	bulletActiveClass: "swiper-pagination-bullet-active",
	modifierClass: "swiper-pagination-",
	currentClass: "swiper-pagination-current",
	totalClass: "swiper-pagination-total",
	hiddenClass: "swiper-pagination-hidden",
	progressbarFillClass: "swiper-pagination-progressbar-fill",
	progressbarOppositeClass: "swiper-pagination-progressbar-opposite",
	clickableClass: "swiper-pagination-clickable",
	lockClass: "swiper-pagination-lock",
	horizontalClass: "swiper-pagination-horizontal",
	verticalClass: "swiper-pagination-vertical",
	paginationDisabledClass: "swiper-pagination-disabled",
});

export const TRANSITION_EFFECT_OPTIONS = Object.freeze([
	{ label: __("Translate", "motto-blocks"), value: "translate" },
	{ label: __("Fade", "motto-blocks"), value: "fade" },
	{ label: __("Cube", "motto-blocks"), value: "cube" },
	{ label: __("Coverflow", "motto-blocks"), value: "coverflow" },
	{ label: __("Flip", "motto-blocks"), value: "flip" },
	{ label: __("Cards", "motto-blocks"), value: "cards" },
	{ label: __("Creative", "motto-blocks"), value: "creative" },
]);

export const TRANSITION_EFFECT_VALUES = new Set(
	TRANSITION_EFFECT_OPTIONS.map((option) => option.value)
);
