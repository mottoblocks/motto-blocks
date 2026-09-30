import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createHost = () => {
	const host = {
		children: [],
		ownerDocument: null,
		appendChild(node) {
			if (!node) return node;
			if (node.parentNode && node.parentNode !== host) {
				node.parentNode.children = node.parentNode.children.filter(
					(child) => child !== node
				);
			} else if (node.parentNode === host) {
				host.children = host.children.filter((child) => child !== node);
			}
			node.parentNode = host;
			host.children.push(node);
			return node;
		},
	};

	Object.defineProperty(host, "lastElementChild", {
		get() {
			return host.children.length ? host.children[host.children.length - 1] : null;
		},
	});

	return host;
};

const createMockDocument = ({ hasEditorCanvas = false } = {}) => {
	const head = createHost();
	const body = createHost();
	const doc = {
		head,
		body,
		createElement(tagName) {
			const element = {
				tagName: String(tagName || "").toUpperCase(),
				id: "",
				textContent: "",
				ownerDocument: doc,
				parentNode: null,
				attributes: {},
				setAttribute(name, value) {
					element.attributes[name] = String(value);
				},
				getAttribute(name) {
					return name in element.attributes ? element.attributes[name] : null;
				},
				hasAttribute(name) {
					return name in element.attributes;
				},
				removeAttribute(name) {
					delete element.attributes[name];
				},
				remove() {
					if (!element.parentNode) return;
					element.parentNode.children = element.parentNode.children.filter(
						(child) => child !== element
					);
					element.parentNode = null;
				},
			};
			return element;
		},
		getElementById(id) {
			return (
				[...head.children, ...body.children].find((element) => element.id === id) || null
			);
		},
		querySelector(selector) {
			if (selector === ".editor-styles-wrapper") {
				return hasEditorCanvas ? { className: "editor-styles-wrapper" } : null;
			}
			return null;
		},
		querySelectorAll(selector) {
			const tag = selector.toUpperCase();
			return [...head.children, ...body.children].filter((el) => el.tagName === tag);
		},
	};

	head.ownerDocument = doc;
	body.ownerDocument = doc;

	return doc;
};

describe("editor style registry", () => {
	beforeEach(() => {
		vi.resetModules();
		global.requestAnimationFrame = vi.fn((callback) => {
			callback();
			return 1;
		});
		global.MutationObserver = class {
			disconnect() {}
			observe() {}
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
		delete global.document;
		delete global.requestAnimationFrame;
		delete global.MutationObserver;
		delete global.__MOTTO_DEBUG__;
		delete global.window;
	});

	it("disables preview snapshot styles without detaching React-owned nodes", async () => {
		const iframeDoc = createMockDocument({ hasEditorCanvas: true });
		const snapshot = iframeDoc.createElement("style");
		snapshot.textContent = "/* motto-blocks-preview-styler-styles */\n.x{color:red;}";
		iframeDoc.body.appendChild(snapshot);
		global.document = {
			querySelectorAll(selector) {
				if (selector === 'iframe[name="editor-canvas"]' || selector === "iframe") {
					return [{ contentDocument: iframeDoc }];
				}
				return [];
			},
		};

		const { setEditorBlockStyles } = await import("./editor-style-registry");

		setEditorBlockStyles("instance:abc", ":root .motto-styler-abc{color:blue;}");
		expect(snapshot.parentNode).toBe(iframeDoc.body);
		expect(snapshot.getAttribute("media")).toBe("not all");

		// React reuses the node (keyed by index) for a core/theme entry.
		snapshot.textContent = ".theme{color:green;}";
		setEditorBlockStyles("instance:def", ":root .motto-styler-def{color:blue;}");
		expect(snapshot.parentNode).toBe(iframeDoc.body);
		expect(snapshot.hasAttribute("media")).toBe(false);
		expect(snapshot.hasAttribute("data-motto-preview-snapshot")).toBe(false);
	});

	it("renders split style tags into the editor iframe head", async () => {
		const iframeDoc = createMockDocument({ hasEditorCanvas: true });
		global.document = {
			querySelectorAll(selector) {
				if (selector === 'iframe[name="editor-canvas"]') {
					return [{ contentDocument: iframeDoc }];
				}
				if (selector === "iframe") {
					return [{ contentDocument: iframeDoc }];
				}
				return [];
			},
		};

		const { setEditorBlockStyles } = await import("./editor-style-registry");

		setEditorBlockStyles("global:css-variables", ":root{--brand:red;}");
		setEditorBlockStyles("class:button", ":root .button{color:red;}");
		setEditorBlockStyles("instance:abc", ":root .motto-styler-abc{color:blue;}");
		setEditorBlockStyles("conditional:layout", ":root .has-layout{display:flex;}");

		expect(iframeDoc.head.children.map((element) => element.id)).toEqual([
			"motto-blocks-styler-editor-vars",
			"motto-blocks-styler-editor-classes",
			"motto-blocks-styler-editor-styles",
		]);
		expect(iframeDoc.body.children).toHaveLength(0);
		expect(iframeDoc.getElementById("motto-blocks-styler-editor-vars")?.textContent).toBe(
			":root{--brand:red;}"
		);
		expect(iframeDoc.getElementById("motto-blocks-styler-editor-classes")?.textContent).toBe(
			":root .button{color:red;}"
		);
		expect(iframeDoc.getElementById("motto-blocks-styler-editor-styles")?.textContent).toBe(
			":root .motto-styler-abc{color:blue;}:root .has-layout{display:flex;}"
		);
	});

	it("renders the global custom CSS tag last, after per-instance styles", async () => {
		const iframeDoc = createMockDocument({ hasEditorCanvas: true });
		global.document = {
			querySelectorAll(selector) {
				if (selector === 'iframe[name="editor-canvas"]') {
					return [{ contentDocument: iframeDoc }];
				}
				if (selector === "iframe") {
					return [{ contentDocument: iframeDoc }];
				}
				return [];
			},
		};
		global.window = { __MOTTO_BLOCKS_CUSTOM_CSS__: "body{background:red;}" };

		const { setEditorBlockStyles } = await import("./editor-style-registry");

		setEditorBlockStyles("instance:abc", ":root .motto-styler-abc{color:blue;}");

		expect(iframeDoc.head.children.map((element) => element.id)).toEqual([
			"motto-blocks-styler-editor-styles",
			"motto-blocks-styler-editor-custom-css",
		]);
		expect(iframeDoc.getElementById("motto-blocks-styler-editor-custom-css")?.textContent).toBe(
			"body{background:red;}"
		);
	});

	it("applies batch updates with the provided style order", async () => {
		const iframeDoc = createMockDocument({ hasEditorCanvas: true });
		global.document = {
			querySelectorAll(selector) {
				if (selector === 'iframe[name="editor-canvas"]') {
					return [{ contentDocument: iframeDoc }];
				}
				if (selector === "iframe") {
					return [{ contentDocument: iframeDoc }];
				}
				return [];
			},
		};

		const { setEditorBlockStylesBatch } = await import("./editor-style-registry");

		setEditorBlockStylesBatch([
			["instance:a", ":root .motto-styler-a{color:red;}"],
			["instance:b", ":root .motto-styler-b{color:blue;}"],
		]);
		setEditorBlockStylesBatch([
			["instance:b", ":root .motto-styler-b{color:blue;}"],
			["instance:a", ":root .motto-styler-a{color:red;}"],
		]);

		expect(iframeDoc.getElementById("motto-blocks-styler-editor-styles")?.textContent).toBe(
			":root .motto-styler-b{color:blue;}:root .motto-styler-a{color:red;}"
		);
	});

	it("defers registry rendering until the shared batch ends", async () => {
		const iframeDoc = createMockDocument({ hasEditorCanvas: true });
		global.document = {
			querySelectorAll(selector) {
				if (selector === 'iframe[name="editor-canvas"]') {
					return [{ contentDocument: iframeDoc }];
				}
				if (selector === "iframe") {
					return [{ contentDocument: iframeDoc }];
				}
				return [];
			},
		};

		const {
			beginEditorStyleRegistryBatch,
			endEditorStyleRegistryBatch,
			setEditorBlockStylesBatch,
		} = await import("./editor-style-registry");

		beginEditorStyleRegistryBatch();
		setEditorBlockStylesBatch([["instance:a", ":root .motto-styler-a{color:red;}"]]);

		expect(iframeDoc.head.children).toHaveLength(0);

		endEditorStyleRegistryBatch();

		expect(iframeDoc.getElementById("motto-blocks-styler-editor-styles")?.textContent).toBe(
			":root .motto-styler-a{color:red;}"
		);
	});

	it("moves the shared styles tag from iframe body into head", async () => {
		const iframeDoc = createMockDocument({ hasEditorCanvas: true });
		const legacyStylesTag = iframeDoc.createElement("style");
		legacyStylesTag.id = "motto-blocks-styler-editor-styles";
		iframeDoc.body.appendChild(legacyStylesTag);

		global.document = {
			querySelectorAll(selector) {
				if (selector === 'iframe[name="editor-canvas"]') {
					return [{ contentDocument: iframeDoc }];
				}
				if (selector === "iframe") {
					return [{ contentDocument: iframeDoc }];
				}
				return [];
			},
		};

		const { setEditorBlockStyles } = await import("./editor-style-registry");

		setEditorBlockStyles("instance:abc", ":root .motto-styler-abc{color:blue;}");

		expect(iframeDoc.body.children).toHaveLength(0);
		expect(iframeDoc.head.children.map((element) => element.id)).toEqual([
			"motto-blocks-styler-editor-styles",
		]);
		expect(iframeDoc.getElementById("motto-blocks-styler-editor-styles")?.parentNode).toBe(
			iframeDoc.head
		);
	});

	it("falls back to the inline editor document when unrelated iframes are present", async () => {
		const unrelatedIframeDoc = createMockDocument({ hasEditorCanvas: false });
		const inlineDoc = createMockDocument({ hasEditorCanvas: true });
		const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

		inlineDoc.querySelectorAll = (selector) => {
			if (selector === 'iframe[name="editor-canvas"]') {
				return [];
			}
			if (selector === "iframe") {
				return [{ contentDocument: unrelatedIframeDoc }];
			}
			return [];
		};

		global.document = inlineDoc;

		const { setEditorBlockStyles } = await import("./editor-style-registry");

		setEditorBlockStyles("instance:inline", ":root .motto-styler-inline{color:green;}");

		expect(inlineDoc.head.children.map((element) => element.id)).toEqual([
			"motto-blocks-styler-editor-styles",
		]);
		expect(inlineDoc.getElementById("motto-blocks-styler-editor-styles")?.textContent).toBe(
			":root .motto-styler-inline{color:green;}"
		);
		expect(unrelatedIframeDoc.head.children).toHaveLength(0);
		expect(infoSpy).not.toHaveBeenCalled();
	});

	it("logs inline editor document fallback when debug logging is enabled", async () => {
		const unrelatedIframeDoc = createMockDocument({ hasEditorCanvas: false });
		const inlineDoc = createMockDocument({ hasEditorCanvas: true });
		const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

		inlineDoc.querySelectorAll = (selector) => {
			if (selector === 'iframe[name="editor-canvas"]') {
				return [];
			}
			if (selector === "iframe") {
				return [{ contentDocument: unrelatedIframeDoc }];
			}
			return [];
		};

		global.document = inlineDoc;
		global.__MOTTO_DEBUG__ = true;

		const { setEditorBlockStyles } = await import("./editor-style-registry");

		setEditorBlockStyles("instance:inline", ":root .motto-styler-inline{color:green;}");

		expect(infoSpy).toHaveBeenCalledWith(
			"[MottoStyler] Editor canvas resolved without iframe; using inline document fallback.",
			expect.objectContaining({
				iframeCount: 1,
				hasInlineCanvas: true,
				namedIframeCount: 0,
				legacyIframeCount: 0,
			})
		);
	});

	it("prefers the named editor canvas iframe over legacy iframe candidates", async () => {
		const namedDoc = createMockDocument({ hasEditorCanvas: true });
		const legacyDoc = createMockDocument({ hasEditorCanvas: true });

		global.document = {
			querySelectorAll(selector) {
				if (selector === 'iframe[name="editor-canvas"]') {
					return [
						{
							contentDocument: namedDoc,
							isConnected: true,
							getBoundingClientRect: () => ({ width: 300, height: 200 }),
						},
					];
				}
				if (selector === "iframe") {
					return [
						{
							contentDocument: legacyDoc,
							isConnected: true,
							getBoundingClientRect: () => ({ width: 1200, height: 900 }),
						},
						{
							contentDocument: namedDoc,
							isConnected: true,
							getBoundingClientRect: () => ({ width: 300, height: 200 }),
						},
					];
				}
				return [];
			},
		};

		const { setEditorBlockStyles } = await import("./editor-style-registry");

		setEditorBlockStyles("instance:named", ":root .motto-styler-named{color:green;}");

		expect(namedDoc.getElementById("motto-blocks-styler-editor-styles")?.textContent).toBe(
			":root .motto-styler-named{color:green;}"
		);
		expect(legacyDoc.head.children).toHaveLength(0);
	});
});
