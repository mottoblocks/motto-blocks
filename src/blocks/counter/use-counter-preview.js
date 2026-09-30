import { useEffect, useRef, useState } from "@wordpress/element";

import {
	applyCounterEasing,
	formatCounterValue,
	getCounterLocale,
	normalizeCounterAttributes,
} from "./counter-utils";

function supportsReducedMotion() {
	if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
		return false;
	}

	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useCounterPreview(attributes) {
	const normalized = normalizeCounterAttributes(attributes);
	const [displayValue, setDisplayValue] = useState(() =>
		formatCounterValue(normalized.endValue, {
			step: normalized.step,
			thousandsSeparatorMode: normalized.thousandsSeparatorMode,
			thousandsSeparator: normalized.thousandsSeparator,
			locale: getCounterLocale(),
		})
	);
	const [isCounting, setIsCounting] = useState(false);
	const [isComplete, setIsComplete] = useState(true);
	const animationFrameRef = useRef(0);

	useEffect(() => {
		const locale = getCounterLocale();
		const renderValue = (value) =>
			formatCounterValue(value, {
				step: normalized.step,
				thousandsSeparatorMode: normalized.thousandsSeparatorMode,
				thousandsSeparator: normalized.thousandsSeparator,
				locale,
			});

		if (normalized.respectReducedMotion && supportsReducedMotion()) {
			setDisplayValue(renderValue(normalized.endValue));
			setIsCounting(false);
			setIsComplete(true);
			return undefined;
		}

		if (normalized.duration === 0 || normalized.startValue === normalized.endValue) {
			setDisplayValue(renderValue(normalized.endValue));
			setIsCounting(false);
			setIsComplete(true);
			return undefined;
		}

		const startAt = normalized.startValue;
		const delta = normalized.endValue - normalized.startValue;
		const durationMs = normalized.duration * 1000;
		const delayMs = normalized.delay * 1000;
		let startTime = 0;
		let stopped = false;

		setIsCounting(false);
		setIsComplete(false);
		setDisplayValue(renderValue(normalized.startValue));

		const tick = (timestamp) => {
			if (stopped) {
				return;
			}

			if (!startTime) {
				startTime = timestamp + delayMs;
			}

			if (timestamp < startTime) {
				animationFrameRef.current = window.requestAnimationFrame(tick);
				return;
			}

			setIsCounting(true);

			const elapsed = timestamp - startTime;
			const progress = Math.min(1, elapsed / durationMs);
			const nextValue = startAt + delta * applyCounterEasing(normalized.easing, progress);
			setDisplayValue(renderValue(nextValue));

			if (progress >= 1) {
				setIsCounting(false);
				setIsComplete(true);
				return;
			}

			animationFrameRef.current = window.requestAnimationFrame(tick);
		};

		animationFrameRef.current = window.requestAnimationFrame(tick);

		return () => {
			stopped = true;
			if (animationFrameRef.current) {
				window.cancelAnimationFrame(animationFrameRef.current);
			}
		};
	}, [
		normalized.delay,
		normalized.duration,
		normalized.endValue,
		normalized.easing,
		normalized.replayMode,
		normalized.respectReducedMotion,
		normalized.startValue,
		normalized.step,
		normalized.thousandsSeparator,
		normalized.thousandsSeparatorMode,
	]);

	return {
		displayValue,
		isCounting,
		isComplete,
	};
}
