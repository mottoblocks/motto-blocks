import { dispatch, select, subscribe } from "@wordpress/data";
import { STORE_KEY } from "./preview-store";
import { requestEditorStyleRegistryRender } from "./editor-style-registry";
import { BREAKPOINT_KEYS } from "../config/styler-breakpoints.js";
import { getAllEditorCanvasDocuments, getNamedEditorCanvasIframes } from "./editor-canvas-resolver";

const VALID_MODES = BREAKPOINT_KEYS;
const MODE_SET = new Set(VALID_MODES);
const CHANGE_EVENT = "motto:preview-mode-change";

const normalizeMode = (mode) => {
	if (typeof mode !== "string") return "desktop";
	return MODE_SET.has(mode) ? mode : "desktop";
};

const applyModeToDocument = (doc, mode) => {
	if (!doc?.body) return false;
	const nextMode = normalizeMode(mode);
	doc.body.classList.remove(...VALID_MODES);
	doc.body.classList.add(nextMode);
	doc.body.dataset.mottoMode = nextMode;
	return true;
};

const getMode = () => {
	const getter = window?.getMottoPreviewMode;
	if (typeof getter === "function") {
		return normalizeMode(getter());
	}
	return "desktop";
};

const setMode = (mode) => {
	const setter = window?.setMottoPreviewMode;
	if (typeof setter === "function") {
		return normalizeMode(setter(mode));
	}
	return normalizeMode(mode);
};

const onModeChange = (listener) => {
	if (typeof listener !== "function") return () => {};
	const handler = (event) => {
		listener(normalizeMode(event?.detail?.mode));
	};
	window.addEventListener(CHANGE_EVENT, handler);
	return () => window.removeEventListener(CHANGE_EVENT, handler);
};

export const initEditorPreviewModeHook = () => {
	const initialStoreMode = select(STORE_KEY)?.getMode?.() || "desktop";
	setMode(initialStoreMode);

	const applyModeToEditor = (mode = getMode()) => {
		const docs = getAllEditorCanvasDocuments();
		for (const doc of docs) {
			applyModeToDocument(doc, mode);
		}
	};

	const applyCurrentMode = () => {
		applyModeToEditor();
		requestEditorStyleRegistryRender("preview-mode-hook");
	};

	applyCurrentMode();

	const cleanupPreviewEvent = onModeChange((mode) => {
		const previewSelect = select(STORE_KEY);
		const previewDispatch = dispatch(STORE_KEY);
		const currentStoreMode = previewSelect?.getMode?.() || "desktop";

		if (mode !== currentStoreMode) {
			previewDispatch?.setMode?.(mode, "motto");
			previewDispatch?.setLandscapeOverride?.(mode === "landscapePhone", "motto");
		}

		applyCurrentMode();
	});

	const observer = new MutationObserver(() => {
		applyCurrentMode();
	});

	if (document.body) {
		observer.observe(document.body, {
			childList: true,
			subtree: true,
		});
	}

	const iframeLoadCleanup = [];
	const bindIframeLoadListeners = () => {
		const iframes = getNamedEditorCanvasIframes();
		for (const iframe of iframes) {
			if (iframe.dataset?.mottoPreviewBound === "1") continue;
			iframe.dataset.mottoPreviewBound = "1";

			const onLoad = () => {
				applyCurrentMode();
			};
			iframe.addEventListener("load", onLoad);
			iframeLoadCleanup.push(() => {
				iframe.removeEventListener("load", onLoad);
			});
		}
	};

	bindIframeLoadListeners();
	const unsubscribeStore = subscribe(() => {
		const mode = select(STORE_KEY)?.getMode?.() || "desktop";
		setMode(mode);
		applyModeToEditor(mode);
		bindIframeLoadListeners();
	});

	return () => {
		cleanupPreviewEvent();
		observer.disconnect();
		unsubscribeStore?.();
		for (const cleanup of iframeLoadCleanup) cleanup();
	};
};
