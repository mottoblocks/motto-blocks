import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./style-engine", () => ({
	buildEditorCssForSelector: vi.fn(() => ".my-class{color:red;}"),
}));

vi.mock("./editor-style-registry", () => ({
	setEditorBlockStyles: vi.fn(),
	beginEditorStyleRegistryBatch: vi.fn(),
	endEditorStyleRegistryBatch: vi.fn(),
}));

vi.mock("./motto-styler-signature", () => ({
	buildMottoStylerCssSignature: vi.fn(() => "sig"),
}));

vi.mock("../utils/normalize-motto-styler", () => ({
	normalizeMottoStyler: vi.fn((value) => value || {}),
}));

vi.mock("../classes/class-meta", () => ({
	resolveClassMetaStyler: vi.fn((meta) => meta?.mottoStyler || {}),
}));

describe("initPostClassStyleCollector", () => {
	beforeEach(() => {
		vi.resetModules();
		globalThis.requestAnimationFrame = vi.fn((callback) => {
			callback();
			return 1;
		});
		globalThis.cancelAnimationFrame = vi.fn();
	});

	it("reapplies preview css when returning to the same class post", async () => {
		let currentPostType = "motto_css_class";
		let currentSlug = "my-class";
		let currentMeta = { mottoStyler: { css: { desktop: [{ name: "color", value: "red" }] } } };
		let subscriber = null;

		globalThis.window = {
			wp: {
				data: {
					select: (store) => {
						if (store === "core/editor") {
							return {
								getCurrentPostType: () => currentPostType,
								getEditedPostAttribute: (key) => {
									if (key === "slug") return currentSlug;
									if (key === "meta") return currentMeta;
									return undefined;
								},
							};
						}
						return {};
					},
					subscribe: (callback) => {
						subscriber = callback;
						return () => {};
					},
				},
			},
		};

		const { initPostClassStyleCollector } = await import("./post-class-style-runtime");
		const { setEditorBlockStyles } = await import("./editor-style-registry");

		initPostClassStyleCollector();
		expect(setEditorBlockStyles).toHaveBeenLastCalledWith(
			"post:motto_css_class",
			".my-class{color:red;}"
		);

		currentPostType = "post";
		subscriber();
		expect(setEditorBlockStyles).toHaveBeenLastCalledWith("post:motto_css_class", "");

		currentPostType = "motto_css_class";
		subscriber();
		expect(setEditorBlockStyles).toHaveBeenLastCalledWith(
			"post:motto_css_class",
			".my-class{color:red;}"
		);
		expect(setEditorBlockStyles).toHaveBeenCalledTimes(3);
	});
});
