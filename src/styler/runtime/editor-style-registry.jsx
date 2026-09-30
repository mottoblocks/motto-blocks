import cssOutputOrderConfig from "../data/motto-css-output-order.json";
import {
	getEditorCanvasResolutionStats,
	getInlineEditorCanvasDocument,
	getPreferredEditorCanvasDocument,
} from "./editor-canvas-resolver";

const STYLE_BUCKETS = [
	{
		key: "vars",
		id: "motto-blocks-styler-editor-vars",
	},
	{
		key: "classes",
		id: "motto-blocks-styler-editor-classes",
	},
	{
		key: "styles",
		id: "motto-blocks-styler-editor-styles",
	},
	{
		key: "customCss",
		id: "motto-blocks-styler-editor-custom-css",
	},
];

const getGlobalCustomCss = () => {
	const raw = typeof window !== "undefined" ? window.__MOTTO_BLOCKS_CUSTOM_CSS__ : "";
	return typeof raw === "string" ? raw : "";
};

const PREVIEW_STYLE_MARKERS = [
	"motto-blocks-preview-styler-classes",
	"motto-blocks-preview-styler-styles",
];

const PREVIEW_DISABLED_ATTR = "data-motto-preview-snapshot";
const PREVIEW_DISABLED_MEDIA = "not all";

const state = {
	stylesById: {},
	styleElsByBucket: {},
	lastDoc: null,
	retryScheduled: false,
	batchDepth: 0,
	pendingRender: false,
	orderObserver: null,
	previewCleanupObserver: null,
	isReordering: false,
	lastCanvasResolutionLog: "",
	forceRenderRaf: 0,
	lastForceRenderReason: "",
};

const logCanvasResolution = (level, message, details = {}) => {
	if (level === "info" && globalThis?.__MOTTO_DEBUG__ !== true) return;

	const signature = `${level}|${message}|${JSON.stringify(details)}`;
	if (state.lastCanvasResolutionLog === signature) return;
	state.lastCanvasResolutionLog = signature;

	const consoleApi = globalThis?.console;
	const logger =
		typeof consoleApi?.[level] === "function"
			? consoleApi[level]
			: typeof consoleApi?.warn === "function"
				? consoleApi.warn
				: null;
	if (!logger) return;

	logger(`[MottoStyler] ${message}`, details);
};

const getCanvasDocument = () => {
	const preferredDoc = getPreferredEditorCanvasDocument();
	if (preferredDoc) return preferredDoc;

	const stats = getEditorCanvasResolutionStats();
	const inlineDoc = getInlineEditorCanvasDocument();
	if (inlineDoc) {
		if (stats.iframeCount > 0) {
			logCanvasResolution(
				"info",
				"Editor canvas resolved without iframe; using inline document fallback.",
				{
					iframeCount: stats.iframeCount,
					namedIframeCount: stats.namedIframeCount,
					legacyIframeCount: stats.legacyIframeCount,
					hasInlineCanvas: stats.hasInlineCanvas,
				}
			);
		}
		return inlineDoc;
	}

	if (stats.iframeCount > 0) {
		logCanvasResolution(
			"info",
			"Editor canvas iframe not found and inline canvas fallback is unavailable.",
			{
				iframeCount: stats.iframeCount,
				namedIframeCount: stats.namedIframeCount,
				legacyIframeCount: stats.legacyIframeCount,
				hasInlineCanvas: stats.hasInlineCanvas,
			}
		);
		return null;
	}

	return document;
};

const ensureStyleTag = () => {
	const doc = getCanvasDocument();
	if (!doc || !doc.head) return null;

	if (state.lastDoc !== doc) {
		if (state.orderObserver) {
			state.orderObserver.disconnect();
			state.orderObserver = null;
		}
		if (state.previewCleanupObserver) {
			state.previewCleanupObserver.disconnect();
			state.previewCleanupObserver = null;
		}
		state.styleElsByBucket = {};
		state.lastDoc = doc;
	}

	const host = doc.head;
	if (!host) return null;

	const neutralizePreviewSnapshotStyles = () => {
		// Gutenberg renders settings.styles as anonymous <style> tags, so the PHP
		// preview snapshot cannot be targeted by id. We mark those CSS payloads in
		// PHP and disable them only in the main editor canvas, keeping preview
		// iframes on the PHP path while the live canvas stays on the reactive JS path.
		// Never remove these nodes: React keys them by index, and detaching one makes
		// a later re-render write another entry's CSS (core/theme) into a detached node.
		doc.querySelectorAll("style").forEach((element) => {
			const css = element.textContent || "";
			const isSnapshot = PREVIEW_STYLE_MARKERS.some((marker) => css.includes(marker));
			if (isSnapshot) {
				element.setAttribute(PREVIEW_DISABLED_ATTR, "");
				element.setAttribute("media", PREVIEW_DISABLED_MEDIA);
				return;
			}
			if (element.hasAttribute(PREVIEW_DISABLED_ATTR)) {
				element.removeAttribute(PREVIEW_DISABLED_ATTR);
				element.removeAttribute("media");
			}
		});
	};

	neutralizePreviewSnapshotStyles();

	if (!state.orderObserver && host) {
		state.orderObserver = new MutationObserver(() => {
			if (state.isReordering) return;
			const orderedElements = STYLE_BUCKETS.map(
				(bucket) => state.styleElsByBucket[bucket.key]
			).filter(Boolean);
			if (orderedElements.length === 0) return;

			const expectedIds = orderedElements.map((element) => element.id);
			const tailIds = Array.from(host.children)
				.slice(-orderedElements.length)
				.map((element) => element.id);
			const isOrderedTail = expectedIds.every((id, index) => tailIds[index] === id);
			if (isOrderedTail) return;

			state.isReordering = true;
			orderedElements.forEach((element) => {
				host.appendChild(element);
			});
			state.isReordering = false;
		});
		state.orderObserver.observe(host, { childList: true });
	}

	if (!state.previewCleanupObserver && doc.documentElement) {
		state.previewCleanupObserver = new MutationObserver(() => {
			neutralizePreviewSnapshotStyles();
		});
		state.previewCleanupObserver.observe(doc.documentElement, {
			childList: true,
			subtree: true,
		});
	}

	return host;
};

const renderAll = () => {
	const host = ensureStyleTag();
	if (!host) {
		if (!state.retryScheduled) {
			state.retryScheduled = true;
			requestAnimationFrame(() => {
				state.retryScheduled = false;
				renderAll();
			});
		}
		return;
	}

	const keys = Object.keys(state.stylesById);
	const bucketOrder = Array.isArray(cssOutputOrderConfig?.order?.globalBuckets)
		? cssOutputOrderConfig.order.globalBuckets
		: ["global", "class", "instance", "conditional"];
	const keysByBucket = {
		global: [],
		class: [],
		instance: [],
		conditional: [],
	};

	keys.forEach((key) => {
		let bucket = "instance";
		if (key.startsWith("global:")) bucket = "global";
		else if (key.startsWith("class:")) bucket = "class";
		else if (key.startsWith("conditional:")) bucket = "conditional";
		keysByBucket[bucket]?.push(key);
	});

	const cssByStyleBucket = {
		vars: "",
		classes: "",
		styles: "",
		customCss: getGlobalCustomCss(),
	};
	const orderedKeys = [];
	bucketOrder.forEach((bucket) => orderedKeys.push(...(keysByBucket[bucket] || [])));
	orderedKeys.forEach((key) => {
		if (key.startsWith("global:")) {
			cssByStyleBucket.vars += state.stylesById[key];
			return;
		}
		if (key.startsWith("class:")) {
			cssByStyleBucket.classes += state.stylesById[key];
			return;
		}
		cssByStyleBucket.styles += state.stylesById[key];
	});

	const nextStyleElsByBucket = {};
	STYLE_BUCKETS.forEach((bucket) => {
		const css = cssByStyleBucket[bucket.key] || "";
		let element =
			state.styleElsByBucket[bucket.key] || host.ownerDocument.getElementById(bucket.id);
		if (css === "") {
			if (element?.parentNode) {
				element.remove();
			}
			return;
		}

		if (!element) {
			element = host.ownerDocument.createElement("style");
			element.id = bucket.id;
		}
		if (element.parentNode !== host) {
			host.appendChild(element);
		}
		if (element.textContent !== css) {
			element.textContent = css;
		}
		nextStyleElsByBucket[bucket.key] = element;
	});

	state.isReordering = true;
	STYLE_BUCKETS.forEach((bucket) => {
		const element = nextStyleElsByBucket[bucket.key];
		if (element) {
			host.appendChild(element);
		}
	});
	state.isReordering = false;

	state.styleElsByBucket = nextStyleElsByBucket;
};

export const requestEditorStyleRegistryRender = (reason = "") => {
	const normalizedReason = String(reason || "").trim();
	// Dedupe repeated callers in tight loops (store subscribe etc.)
	if (
		normalizedReason &&
		state.lastForceRenderReason === normalizedReason &&
		state.forceRenderRaf
	)
		return;
	if (normalizedReason) state.lastForceRenderReason = normalizedReason;

	if (state.forceRenderRaf) return;
	state.forceRenderRaf = requestAnimationFrame(() => {
		state.forceRenderRaf = 0;
		renderAll();
	});
};

const applyStyleUpdates = (updates) => {
	const list = Array.isArray(updates) ? updates : [];
	if (list.length === 0) return false;

	const touchedIds = new Set();
	const normalizedUpdates = [];
	list.forEach((entry) => {
		if (!Array.isArray(entry) || entry.length === 0) return;
		const instanceId = String(entry[0] || "").trim();
		if (!instanceId) return;
		touchedIds.add(instanceId);
		normalizedUpdates.push([instanceId, typeof entry[1] === "string" ? entry[1] : ""]);
	});

	if (normalizedUpdates.length === 0) return false;

	const nextStylesById = {};
	Object.keys(state.stylesById).forEach((key) => {
		if (touchedIds.has(key)) return;
		nextStylesById[key] = state.stylesById[key];
	});

	normalizedUpdates.forEach(([instanceId, css]) => {
		if (css === "") return;
		nextStylesById[instanceId] = css;
	});

	const prevKeys = Object.keys(state.stylesById);
	const nextKeys = Object.keys(nextStylesById);
	const hasKeyDiff =
		prevKeys.length !== nextKeys.length ||
		prevKeys.some((key, index) => key !== nextKeys[index]);
	const hasValueDiff =
		hasKeyDiff || nextKeys.some((key) => state.stylesById[key] !== nextStylesById[key]);

	if (!hasValueDiff) return false;
	state.stylesById = nextStylesById;
	return true;
};

export const setEditorBlockStylesBatch = (updates) => {
	if (!applyStyleUpdates(updates)) return;
	if (state.batchDepth > 0) {
		state.pendingRender = true;
		return;
	}
	renderAll();
};

export const setEditorBlockStyles = (instanceId, css) => {
	const normalizedId = String(instanceId || "").trim();
	if (!normalizedId) return;
	setEditorBlockStylesBatch([[normalizedId, css]]);
};

export const beginEditorStyleRegistryBatch = () => {
	state.batchDepth += 1;
};

export const endEditorStyleRegistryBatch = () => {
	if (state.batchDepth === 0) return;
	state.batchDepth -= 1;
	if (state.batchDepth > 0) return;
	if (!state.pendingRender) return;
	state.pendingRender = false;
	renderAll();
};
