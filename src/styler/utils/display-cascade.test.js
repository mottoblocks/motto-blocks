import { describe, expect, it } from "vitest";

import { resolveEffectiveDisplay } from "./display-cascade";

const BREAKPOINTS = ["desktop", "tablet", "landscapePhone", "phone"];

describe("resolveEffectiveDisplay", () => {
	it("prefers the instance's own cascaded display over classes/base layout", () => {
		const resolved = resolveEffectiveDisplay({
			instanceCssByBreakpoint: {
				desktop: [{ id: "1", name: "display", value: "flex" }],
				tablet: [],
				landscapePhone: [],
				phone: [],
			},
			classMottoStylers: [
				{ css: { desktop: [{ id: "c1", name: "display", value: "grid" }] } },
			],
			baseLayout: "flow",
			orderedBreakpoints: BREAKPOINTS,
			breakpoint: "phone",
		});

		expect(resolved).toBe("flex");
	});

	it("falls back to an attached class's cascaded display when the instance declares none", () => {
		const resolved = resolveEffectiveDisplay({
			instanceCssByBreakpoint: { desktop: [], tablet: [], landscapePhone: [], phone: [] },
			classMottoStylers: [
				{ css: { desktop: [{ id: "c1", name: "display", value: "grid" }] } },
			],
			baseLayout: "flow",
			orderedBreakpoints: BREAKPOINTS,
			breakpoint: "phone",
		});

		expect(resolved).toBe("grid");
	});

	it("falls back to the block's base layout when neither instance nor classes declare display", () => {
		const resolved = resolveEffectiveDisplay({
			instanceCssByBreakpoint: { desktop: [], tablet: [], landscapePhone: [], phone: [] },
			classMottoStylers: [],
			baseLayout: "flex",
			orderedBreakpoints: BREAKPOINTS,
			breakpoint: "phone",
		});

		expect(resolved).toBe("flex");
	});

	it("returns an empty string when nothing resolves a display", () => {
		const resolved = resolveEffectiveDisplay({
			instanceCssByBreakpoint: { desktop: [], tablet: [], landscapePhone: [], phone: [] },
			classMottoStylers: [],
			baseLayout: "",
			orderedBreakpoints: BREAKPOINTS,
			breakpoint: "phone",
		});

		expect(resolved).toBe("");
	});
});
