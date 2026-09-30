import { useEffect, useRef } from "@wordpress/element";

const PARALLAX_CONFIG = {
	fromYMultiplier: -1,
	toYMultiplier: 1,
};

function supportsReducedMotion() {
	if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
		return false;
	}

	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

function getLayerTranslateY(layer, offset, viewportHeight) {
	if (!layer || !viewportHeight) {
		return 0;
	}

	const rect = layer.getBoundingClientRect();
	const progress = clamp((viewportHeight - rect.top) / (viewportHeight + rect.height), 0, 1);
	return (
		offset * PARALLAX_CONFIG.fromYMultiplier +
		progress * offset * (PARALLAX_CONFIG.toYMultiplier - PARALLAX_CONFIG.fromYMultiplier)
	);
}

// Editor-only preview: drives a live scroll-linked translateY on `layerRef`
// while scrolling inside `containerRef`'s bounds, via a manual
// requestAnimationFrame loop tied to `ownerWindow`'s own scroll/resize
// events (works whether the canvas renders in the parent window or the
// block-editor canvas iframe). Reused by any block that needs the same
// parallax feel (Container background, Image media, ...).
export function useScrollParallaxPreview({ enabled, offset, sourceKey = "" }) {
	const containerRef = useRef(null);
	const layerRef = useRef(null);

	useEffect(() => {
		const layer = layerRef.current;
		const container = containerRef.current;

		if (!layer || !container || !layer.isConnected || !container.isConnected) {
			return undefined;
		}

		layer.style.willChange = "";
		layer.style.transform = "";

		if (!enabled || !Number.isFinite(offset) || offset <= 0 || supportsReducedMotion()) {
			return undefined;
		}

		const ownerWindow = layer.ownerDocument?.defaultView;
		if (!ownerWindow) {
			return undefined;
		}

		layer.style.willChange = "transform";

		let frameId = 0;
		const update = () => {
			frameId = 0;
			layer.style.transform = `translateY(${getLayerTranslateY(layer, offset, ownerWindow.innerHeight || 0)}px)`;
		};
		const scheduleUpdate = () => {
			if (frameId) {
				return;
			}

			frameId = ownerWindow.requestAnimationFrame(update);
		};

		scheduleUpdate();
		ownerWindow.addEventListener("scroll", scheduleUpdate, { passive: true });
		ownerWindow.addEventListener("resize", scheduleUpdate, { passive: true });

		return () => {
			if (frameId) {
				ownerWindow.cancelAnimationFrame(frameId);
			}
			ownerWindow.removeEventListener("scroll", scheduleUpdate);
			ownerWindow.removeEventListener("resize", scheduleUpdate);
			layer.style.transform = "";
			layer.style.willChange = "";
		};
	}, [enabled, offset, sourceKey]);

	return {
		containerRef,
		layerRef,
	};
}
