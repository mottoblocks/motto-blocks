import { useEffect } from "@wordpress/element";

const DEFAULT_SELECTOR =
	'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), [contenteditable="true"]';

export const useModalAutofocus = ({
	enabled,
	containerRef,
	selector = DEFAULT_SELECTOR,
	selectText = true,
}) => {
	useEffect(() => {
		if (!enabled) return undefined;
		const frameId = window.requestAnimationFrame(() => {
			const root = containerRef?.current || null;
			if (!root || typeof root.querySelector !== "function") return;
			const input = root.querySelector(selector);
			if (!input || typeof input.focus !== "function") return;
			input.focus();
			if (selectText && typeof input.select === "function") {
				input.select();
			}
		});
		return () => window.cancelAnimationFrame(frameId);
	}, [enabled, containerRef, selector, selectText]);
};
