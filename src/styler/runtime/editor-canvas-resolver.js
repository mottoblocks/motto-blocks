const EDITOR_CANVAS_SELECTOR = 'iframe[name="editor-canvas"]';

export const isEditorCanvasDocument = (doc) =>
	Boolean(doc?.body && doc.querySelector(".editor-styles-wrapper"));

export const isVisibleCanvasIframe = (iframe) => {
	if (!iframe || typeof iframe.getBoundingClientRect !== "function") return false;
	if (!iframe.isConnected) return false;
	const rect = iframe.getBoundingClientRect();
	if (!(rect.width > 0 && rect.height > 0)) return false;
	const win = iframe.ownerDocument?.defaultView || globalThis;
	const style = typeof win?.getComputedStyle === "function" ? win.getComputedStyle(iframe) : null;
	if (style && (style.display === "none" || style.visibility === "hidden")) return false;
	return true;
};

const sortCanvasIframes = (iframes) => {
	return [...iframes].sort((a, b) => {
		const ra = a.getBoundingClientRect();
		const rb = b.getBoundingClientRect();
		return rb.width * rb.height - ra.width * ra.height;
	});
};

export const getNamedEditorCanvasIframes = () => {
	return Array.from(document.querySelectorAll(EDITOR_CANVAS_SELECTOR)).filter((iframe) => {
		const doc = iframe.contentDocument;
		return doc?.head && isEditorCanvasDocument(doc);
	});
};

export const getLegacyEditorCanvasIframes = () => {
	const iframes = Array.from(document.querySelectorAll("iframe"));
	return iframes.filter((iframe) => {
		if (iframe?.matches?.(EDITOR_CANVAS_SELECTOR)) return false;
		// Exclude block preview thumbnail iframes — they use blob: URLs and have
		// editor-styles-wrapper on the body, making them indistinguishable from the
		// real editor canvas by content alone. Injecting into them causes the Styler's
		// observers to attach to preview iframe DOM, triggering layout recalculations
		// that corrupt WordPress's preview aspect-ratio scaling.
		try {
			const href = iframe.contentWindow?.location?.href ?? "";
			if (href.startsWith("blob:")) return false;
		} catch {
			return false;
		}
		const doc = iframe.contentDocument;
		return doc?.head && isEditorCanvasDocument(doc);
	});
};

export const getPreferredEditorCanvasIframe = () => {
	const named = getNamedEditorCanvasIframes();
	if (named.length > 0) {
		const visibleNamed = named.filter(isVisibleCanvasIframe);
		const pool = visibleNamed.length > 0 ? visibleNamed : named;
		return sortCanvasIframes(pool)[0] || null;
	}

	const legacy = getLegacyEditorCanvasIframes();
	if (legacy.length === 0) return null;
	const visibleLegacy = legacy.filter(isVisibleCanvasIframe);
	const pool = visibleLegacy.length > 0 ? visibleLegacy : legacy;
	return sortCanvasIframes(pool)[0] || null;
};

export const getPreferredEditorCanvasDocument = () => {
	return getPreferredEditorCanvasIframe()?.contentDocument || null;
};

export const getAllEditorCanvasDocuments = () => {
	return getNamedEditorCanvasIframes()
		.map((iframe) => iframe.contentDocument)
		.filter(Boolean);
};

export const getInlineEditorCanvasDocument = () => {
	const inlineCanvas = document.querySelector(".editor-styles-wrapper");
	return inlineCanvas && document.head ? document : null;
};

export const getEditorCanvasResolutionStats = () => {
	const allIframes = Array.from(document.querySelectorAll("iframe"));
	return {
		iframeCount: allIframes.length,
		namedIframeCount: getNamedEditorCanvasIframes().length,
		legacyIframeCount: getLegacyEditorCanvasIframes().length,
		hasInlineCanvas: Boolean(getInlineEditorCanvasDocument()),
	};
};
