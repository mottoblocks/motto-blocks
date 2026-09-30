(function () {
	function clampNumber(value, fallback, min) {
		var numeric = Number(value);
		if (!Number.isFinite(numeric)) {
			return fallback;
		}
		return Math.max(min, numeric);
	}

	function normalizeSeparatorMode(value) {
		var mode = String(value || "").trim().toLowerCase();
		return mode === "custom" || mode === "none" ? mode : "locale";
	}

	function normalizeSeparatorCharacter(value) {
		return String(value || "").slice(0, 1);
	}

	function normalizeStepValue(value) {
		return clampNumber(value, 1, Number.EPSILON);
	}

	function roundValueToStep(value, step) {
		var safeStep = normalizeStepValue(step);
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

	function formatCounterValue(value, options) {
		var safeValue = roundValueToStep(value, options.step);
		var mode = normalizeSeparatorMode(options.thousandsSeparatorMode);
		var separator = normalizeSeparatorCharacter(options.thousandsSeparator);
		var locale = document && document.documentElement && document.documentElement.lang
			? document.documentElement.lang
			: undefined;

		if (mode === "locale") {
			return new Intl.NumberFormat(locale, { maximumFractionDigits: 20 }).format(safeValue);
		}

		var rawValue = trimTrailingZeros(String(safeValue));
		if (mode === "none") {
			return rawValue;
		}

		var parts = rawValue.split(".");
		var integerPart = parts[0];
		var decimalPart = parts[1] || "";
		var sign = integerPart.indexOf("-") === 0 ? "-" : "";
		var unsignedInteger = sign ? integerPart.slice(1) : integerPart;
		var formattedInteger = formatIntegerWithCustomSeparator(unsignedInteger, separator || ",");

		return decimalPart ? sign + formattedInteger + "." + decimalPart : sign + formattedInteger;
	}

	function prefersReducedMotion() {
		return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	}

	// Vanilla equivalents of COUNTER_EASING_OPTIONS in src/blocks/counter/counter-utils.js
	// (duplicated there for the editor preview, which runs in a separate bundle).
	var EASINGS = {
		"none": function (t) { return t; },
		"power1.out": function (t) { return 1 - Math.pow(1 - t, 2); },
		"power2.out": function (t) { return 1 - Math.pow(1 - t, 3); },
		"power3.out": function (t) { return 1 - Math.pow(1 - t, 4); },
		"back.out(1.7)": function (t) {
			var c1 = 1.7;
			var c3 = c1 + 1;
			return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
		},
		"elastic.out(1, 0.3)": function (t) {
			if (t === 0 || t === 1) {
				return t;
			}
			var c4 = (2 * Math.PI) / 3;
			return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
		}
	};

	function applyEasing(easingName, progress) {
		var ease = EASINGS[easingName] || EASINGS["power2.out"];
		return ease(Math.min(1, Math.max(0, progress)));
	}

	// Vanilla requestAnimationFrame tween: mutates `state.value` from its
	// current value to `options.endValue` over `options.duration` seconds
	// (after `options.delay`), calling onUpdate every frame and onComplete
	// once. Returns an object exposing `.kill()` to cancel mid-flight.
	function tweenValue(state, options) {
		var durationMs = Math.max(0, options.duration) * 1000;
		var delayMs = Math.max(0, options.delay) * 1000;
		var startValue = state.value;
		var endValue = options.endValue;
		var startTime = null;
		var rafId = null;
		var killed = false;

		function frame(timestamp) {
			if (killed) {
				return;
			}

			if (startTime === null) {
				startTime = timestamp + delayMs;
			}

			if (timestamp < startTime) {
				rafId = window.requestAnimationFrame(frame);
				return;
			}

			var elapsed = timestamp - startTime;
			var progress = durationMs <= 0 ? 1 : Math.min(1, elapsed / durationMs);
			state.value = startValue + (endValue - startValue) * applyEasing(options.easing, progress);

			if (typeof options.onUpdate === "function") {
				options.onUpdate();
			}

			if (progress >= 1) {
				if (typeof options.onComplete === "function") {
					options.onComplete();
				}
				return;
			}

			rafId = window.requestAnimationFrame(frame);
		}

		rafId = window.requestAnimationFrame(frame);

		return {
			kill: function () {
				killed = true;
				if (rafId !== null) {
					window.cancelAnimationFrame(rafId);
				}
			}
		};
	}

	function renderValue(element, value, config) {
		element.textContent = formatCounterValue(value, {
			step: config.step,
			thousandsSeparatorMode: config.thousandsSeparatorMode,
			thousandsSeparator: config.thousandsSeparator,
		});
	}

	function setState(root, isCounting, isComplete) {
		root.classList.toggle("is-counting", !!isCounting);
		root.classList.toggle("is-complete", !!isComplete);
	}

	function buildConfig(root) {
		return {
			startValue: Number(root.getAttribute("data-counter-start") || 0),
			endValue: Number(root.getAttribute("data-counter-end") || 0),
			duration: clampNumber(root.getAttribute("data-counter-duration"), 2, 0),
			delay: clampNumber(root.getAttribute("data-counter-delay"), 0, 0),
			easing: String(root.getAttribute("data-counter-easing") || "power2.out"),
			step: normalizeStepValue(root.getAttribute("data-counter-step")),
			replayMode: String(root.getAttribute("data-counter-replay") || "once"),
			thousandsSeparatorMode: normalizeSeparatorMode(root.getAttribute("data-counter-separator-mode")),
			thousandsSeparator: normalizeSeparatorCharacter(root.getAttribute("data-counter-separator")),
			respectReducedMotion: root.getAttribute("data-counter-reduced-motion") !== "false",
		};
	}

	function runCounter(root) {
		var valueElement = root.querySelector(".motto-counter__value");
		if (!valueElement) {
			return;
		}

		var config = buildConfig(root);
		if (root.__mottoCounterTween && typeof root.__mottoCounterTween.kill === "function") {
			root.__mottoCounterTween.kill();
		}

		if (
			(config.respectReducedMotion && prefersReducedMotion()) ||
			config.duration === 0 ||
			config.startValue === config.endValue
		) {
			renderValue(valueElement, config.endValue, config);
			setState(root, false, true);
			root.__mottoCounterPlayed = true;
			return;
		}

		var state = { value: config.startValue };
		root.__mottoCounterPlayed = true;
		setState(root, true, false);
		renderValue(valueElement, config.startValue, config);

		root.__mottoCounterTween = tweenValue(state, {
			endValue: config.endValue,
			duration: config.duration,
			delay: config.delay,
			easing: config.easing,
			onUpdate: function () {
				renderValue(valueElement, state.value, config);
			},
			onComplete: function () {
				renderValue(valueElement, config.endValue, config);
				setState(root, false, true);
			},
		});
	}

	function resetCounter(root) {
		var valueElement = root.querySelector(".motto-counter__value");
		if (!valueElement) {
			return;
		}

		var config = buildConfig(root);
		if (root.__mottoCounterTween && typeof root.__mottoCounterTween.kill === "function") {
			root.__mottoCounterTween.kill();
		}

		renderValue(valueElement, config.startValue, config);
		setState(root, false, false);
	}

	function initCounter(root) {
		var config = buildConfig(root);
		var onEnter = function () {
			if (config.replayMode !== "replay" && root.__mottoCounterPlayed) {
				return;
			}
			runCounter(root);
		};

		var onLeave = function () {
			if (config.replayMode !== "replay") {
				return;
			}
			root.__mottoCounterPlayed = false;
			resetCounter(root);
		};

		if (!("IntersectionObserver" in window)) {
			onEnter();
			return;
		}

		var observer = new IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				if (entry.isIntersecting) {
					onEnter();
					return;
				}
				onLeave();
			});
		}, { threshold: 0.25 });

		observer.observe(root);
	}

	function init() {
		var counters = document.querySelectorAll(".motto-counter");
		counters.forEach(initCounter);
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})();
