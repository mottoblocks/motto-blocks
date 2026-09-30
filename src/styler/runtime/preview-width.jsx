import { getSharedBreakpoints } from "./class-conditional-runtime";
import { getPreferredEditorCanvasIframe } from "./editor-canvas-resolver";

const CUSTOM_WIDTH_CLASS = "motto-preview-custom-width";
const WIDTH_VAR = "--motto-preview-width";

export const setPreviewWidthForMode = (mode) => {
	const iframe = getPreferredEditorCanvasIframe();
	if (!iframe) return false;

	const breakpoints = getSharedBreakpoints();
	const width = Number(breakpoints?.[mode]?.maxWidth);
	const hasValidWidth = mode !== "desktop" && Number.isFinite(width) && width > 0;

	if (hasValidWidth) {
		iframe.classList.add(CUSTOM_WIDTH_CLASS);
		iframe.style.setProperty(WIDTH_VAR, `${width}px`);
	} else {
		iframe.classList.remove(CUSTOM_WIDTH_CLASS);
		iframe.style.removeProperty(WIDTH_VAR);
	}
	return true;
};
