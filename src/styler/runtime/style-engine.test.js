import { describe, expect, it, vi } from "vitest";

import { buildEditorCss, buildEditorCssForSelector } from "./style-engine";

vi.mock("@wordpress/hooks", () => ({
	applyFilters: vi.fn((_hookName, value) => value),
}));

describe("buildEditorCssForSelector", () => {
	it("builds base and inner selector rules across breakpoints", () => {
		const css = buildEditorCssForSelector(".motto-styler-a1", {
			css: {
				desktop: [{ name: "color", value: "red" }],
				tablet: [{ name: "margin-top", value: "10px" }],
				landscapePhone: [],
				phone: [],
			},
			blockSelectors: {
				desktop: [
					{
						selector: ".child",
						selectorType: "inner",
						css: [{ name: "opacity", value: "0.5" }],
					},
				],
				tablet: [],
				landscapePhone: [],
				phone: [],
			},
		});

		expect(css).toContain(":root .motto-styler-a1{color:red;");
		expect(css).toContain(":root .motto-styler-a1 .child{opacity:0.5 !important;}");
		expect(css).toContain(
			"@media (max-width: 900px){:root .motto-styler-a1{margin-top:10px !important;}"
		);
	});

	it("replaces every &{BLOCK} token in editor inner selectors", () => {
		const css = buildEditorCssForSelector(".motto-styler-a1", {
			css: {
				desktop: [],
				tablet: [],
				landscapePhone: [],
				phone: [],
			},
			blockSelectors: {
				desktop: [
					{
						selector:
							"&{BLOCK} .motto-list-item__bullet, &{BLOCK} .motto-list-item::marker",
						css: [{ name: "color", value: "red" }],
					},
				],
				tablet: [],
				landscapePhone: [],
				phone: [],
			},
		});

		expect(css).toContain(
			":root .motto-styler-a1 .motto-list-item__bullet, :root .motto-styler-a1 .motto-list-item::marker{color:red;}"
		);
		expect(css).not.toContain("&{BLOCK}");
	});

	it("derives layout helper rules from display declarations", () => {
		const css = buildEditorCssForSelector(".motto-styler-b2", {
			css: {
				desktop: [{ name: "display", value: "flex" }],
				tablet: [],
				landscapePhone: [],
				phone: [],
			},
			blockSelectors: {},
			blockSpacing: {
				enabled: true,
				values: {
					desktop: "2rem",
				},
			},
		});

		expect(css).toContain(":root .motto-styler-b2{display:flex !important;}");
		expect(css).not.toContain(".motto-styler-b2{gap:2rem;}");
	});

	it("carries block spacing to smaller breakpoints when no override is declared", () => {
		const css = buildEditorCssForSelector(".motto-styler-b2", {
			css: {
				desktop: [{ name: "display", value: "flex" }],
				tablet: [],
				landscapePhone: [],
				phone: [],
			},
			blockSelectors: {},
			blockSpacing: {
				enabled: true,
				values: {
					desktop: "2rem",
				},
			},
		});

		expect(css).not.toContain("gap:2rem");
	});

	it("keeps axial block spacing values as gap for flex layouts", () => {
		const css = buildEditorCssForSelector(".motto-styler-b2", {
			css: {
				desktop: [{ name: "display", value: "flex" }],
				tablet: [],
				landscapePhone: [],
				phone: [],
			},
			blockSelectors: {},
			blockSpacing: {
				enabled: true,
				values: {
					desktop: "2rem 1em",
				},
			},
		});

		expect(css).not.toContain("gap:2rem 1em");
	});

	it("uses only the vertical block spacing value for block layouts", () => {
		const css = buildEditorCssForSelector(".motto-styler-b2", {
			css: {
				desktop: [{ name: "display", value: "block" }],
				tablet: [],
				landscapePhone: [],
				phone: [],
			},
			blockSelectors: {},
			blockSpacing: {
				enabled: true,
				values: {
					desktop: "2rem 1em",
				},
			},
		});

		expect(css).not.toContain("margin-block-start:2rem");
		expect(css).not.toContain("margin-block-start:2rem 1em");
	});

	it("allows Pro to inject derived layout CSS via filter", async () => {
		const hooks = await import("@wordpress/hooks");
		hooks.applyFilters.mockImplementation((_hookName, value, ctx) => {
			if (_hookName !== "motto.styler.derivedLayoutCss") return value;
			if (ctx?.breakpoint !== "desktop") return "";
			return ".motto-styler-b2{gap:2rem;}";
		});

		const css = buildEditorCssForSelector(".motto-styler-b2", {
			css: {
				desktop: [{ name: "display", value: "flex" }],
				tablet: [],
				landscapePhone: [],
				phone: [],
			},
			blockSelectors: {},
			blockSpacing: {
				enabled: true,
				values: {
					desktop: "2rem",
				},
			},
		});

		expect(css).toContain(".motto-styler-b2{gap:2rem;}");
	});

	it("does not duplicate the root scope when already present", () => {
		const css = buildEditorCssForSelector(":root .motto-styler-c3", {
			css: {
				desktop: [{ name: "color", value: "red" }],
				tablet: [],
				landscapePhone: [],
				phone: [],
			},
			blockSelectors: {},
		});

		expect(css).toContain(":root .motto-styler-c3{color:red;");
		expect(css).not.toContain(":root :root .motto-styler-c3");
	});

	it("does not duplicate the root scope when already html:root-scoped", () => {
		const css = buildEditorCssForSelector("html:root .motto-styler-d4", {
			css: {
				desktop: [{ name: "color", value: "red" }],
				tablet: [],
				landscapePhone: [],
				phone: [],
			},
			blockSelectors: {},
		});

		expect(css).toContain("html:root .motto-styler-d4{color:red;");
		expect(css).not.toContain(":root html:root .motto-styler-d4");
	});

	it("preserves user-authored spacing shorthand values in generated CSS", () => {
		const css = buildEditorCssForSelector(".motto-styler-spacing", {
			css: {
				desktop: [{ name: "padding", value: "35px inherit" }],
				tablet: [],
				landscapePhone: [],
				phone: [],
			},
			blockSelectors: {},
		});

		expect(css).toContain("padding:35px inherit !important;");
		expect(css).not.toContain("padding-top:35px");
	});
});

describe("buildEditorCss", () => {
	it("emits only motto-styler selectors", () => {
		const css = buildEditorCss("abc123", {
			css: {
				desktop: [{ name: "color", value: "red" }],
				tablet: [],
				landscapePhone: [],
				phone: [],
			},
			blockSelectors: {},
		});

		expect(css).toContain("html:root .motto-styler-abc123{color:red;");
		expect(css).not.toContain(".motto-props-abc123{color:red;");
	});
});
