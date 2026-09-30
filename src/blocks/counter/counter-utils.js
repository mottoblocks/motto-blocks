import { __ } from "@wordpress/i18n";

const TAG_OPTIONS = new Set(["div", "p", "span", "h1", "h2", "h3", "h4", "h5", "h6"]);
const LABEL_POSITION_OPTIONS = new Set(["top", "bottom"]);
const REPLAY_MODE_OPTIONS = new Set(["once", "replay"]);
const SEPARATOR_MODE_OPTIONS = new Set(["locale", "custom", "none"]);

export const COUNTER_EASING_OPTIONS = [
	{ label: __("Linear", "motto-blocks"), value: "none" },
	{ label: __("Power 1 Out", "motto-blocks"), value: "power1.out" },
	{ label: __("Power 2 Out", "motto-blocks"), value: "power2.out" },
	{ label: __("Power 3 Out", "motto-blocks"), value: "power3.out" },
	{ label: __("Back Out", "motto-blocks"), value: "back.out(1.7)" },
	{ label: __("Elastic Out", "motto-blocks"), value: "elastic.out(1, 0.3)" },
];

// Vanilla equivalents of the named eases in COUNTER_EASING_OPTIONS, applied
// to a 0-1 progress value. Shared by the editor preview (use-counter-preview.js)
// and the frontend runtime (assets/js/counter-frontend.js, duplicated there
// since that file runs standalone, outside the editor bundle).
const COUNTER_EASINGS = {
	none: (t) => t,
	"power1.out": (t) => 1 - Math.pow(1 - t, 2),
	"power2.out": (t) => 1 - Math.pow(1 - t, 3),
	"power3.out": (t) => 1 - Math.pow(1 - t, 4),
	"back.out(1.7)": (t) => {
		const c1 = 1.7;
		const c3 = c1 + 1;
		return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
	},
	"elastic.out(1, 0.3)": (t) => {
		if (t === 0 || t === 1) {
			return t;
		}
		const c4 = (2 * Math.PI) / 3;
		return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
	},
};

export function applyCounterEasing(easingName, progress) {
	const ease = COUNTER_EASINGS[easingName] || COUNTER_EASINGS["power2.out"];
	return ease(Math.min(1, Math.max(0, progress)));
}

export function clampNumber(value, fallback = 0, { min = -Infinity, max = Infinity } = {}) {
	const numeric = Number(value);
	if (!Number.isFinite(numeric)) {
		return fallback;
	}
	return Math.min(max, Math.max(min, numeric));
}

export function normalizeTagName(value) {
	const tagName = String(value || "")
		.trim()
		.toLowerCase();
	return TAG_OPTIONS.has(tagName) ? tagName : "div";
}

export function normalizeLabelPosition(value) {
	const labelPosition = String(value || "")
		.trim()
		.toLowerCase();
	return LABEL_POSITION_OPTIONS.has(labelPosition) ? labelPosition : "bottom";
}

export function normalizeReplayMode(value) {
	const replayMode = String(value || "")
		.trim()
		.toLowerCase();
	return REPLAY_MODE_OPTIONS.has(replayMode) ? replayMode : "once";
}

export function normalizeSeparatorMode(value) {
	const separatorMode = String(value || "")
		.trim()
		.toLowerCase();
	return SEPARATOR_MODE_OPTIONS.has(separatorMode) ? separatorMode : "locale";
}

export function normalizeSeparatorCharacter(value) {
	return String(value || "").slice(0, 1);
}

export function normalizeStepValue(value) {
	const numeric = Number(value);
	if (!Number.isFinite(numeric) || numeric <= 0) {
		return 1;
	}
	return numeric;
}

export function normalizeCounterAttributes(attributes = {}) {
	return {
		tagName: normalizeTagName(attributes.tagName),
		prefix: String(attributes.prefix || ""),
		startValue: clampNumber(attributes.startValue, 0),
		endValue: clampNumber(attributes.endValue, 0),
		suffix: String(attributes.suffix || ""),
		label: String(attributes.label || ""),
		showLabel: attributes.showLabel !== false,
		labelPosition: normalizeLabelPosition(attributes.labelPosition),
		duration: clampNumber(attributes.duration, 2, { min: 0 }),
		delay: clampNumber(attributes.delay, 0, { min: 0 }),
		easing: String(attributes.easing || "power2.out"),
		step: normalizeStepValue(attributes.step),
		replayMode: normalizeReplayMode(attributes.replayMode),
		respectReducedMotion: attributes.respectReducedMotion !== false,
		thousandsSeparatorMode: normalizeSeparatorMode(attributes.thousandsSeparatorMode),
		thousandsSeparator: normalizeSeparatorCharacter(attributes.thousandsSeparator),
	};
}

export function roundValueToStep(value, step) {
	const safeStep = normalizeStepValue(step);
	return Math.round(Number(value) / safeStep) * safeStep;
}

function trimTrailingZeros(value) {
	return String(value)
		.replace(/(\.\d*?[1-9])0+$/u, "$1")
		.replace(/\.0+$/u, "")
		.replace(/^-0$/u, "0");
}

function formatIntegerWithCustomSeparator(value, separator) {
	if (!separator) {
		return value;
	}
	return value.replace(/\B(?=(\d{3})+(?!\d))/gu, separator);
}

export function formatCounterValue(value, options = {}) {
	const safeValue = roundValueToStep(value, options.step);
	const mode = normalizeSeparatorMode(options.thousandsSeparatorMode);
	const separator = normalizeSeparatorCharacter(options.thousandsSeparator);
	const locale =
		typeof options.locale === "string" && options.locale.trim() ? options.locale : undefined;

	if (mode === "locale") {
		return new Intl.NumberFormat(locale, { maximumFractionDigits: 20 }).format(safeValue);
	}

	const rawValue = trimTrailingZeros(String(safeValue));
	if (mode === "none") {
		return rawValue;
	}

	const [integerPart, decimalPart = ""] = rawValue.split(".");
	const sign = integerPart.startsWith("-") ? "-" : "";
	const unsignedInteger = sign ? integerPart.slice(1) : integerPart;
	const formattedInteger = formatIntegerWithCustomSeparator(unsignedInteger, separator || ",");

	return decimalPart ? `${sign}${formattedInteger}.${decimalPart}` : `${sign}${formattedInteger}`;
}

export function getCounterLocale() {
	if (typeof document !== "undefined") {
		const lang = document?.documentElement?.lang;
		if (typeof lang === "string" && lang.trim()) {
			return lang.trim();
		}
	}

	if (typeof navigator !== "undefined" && typeof navigator.language === "string") {
		return navigator.language;
	}

	return undefined;
}
