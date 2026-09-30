import { describe, expect, it } from "vitest";

import { resolveCascadedCssValuesByProp } from "./css-row-metadata";

const BREAKPOINTS = ["desktop", "tablet", "landscapePhone", "phone"];

describe("resolveCascadedCssValuesByProp", () => {
	it("carries a prop declared only on a wider breakpoint down to a narrower one", () => {
		const rowsByBreakpoint = {
			desktop: [{ id: "1", name: "display", value: "flex" }],
			tablet: [],
			landscapePhone: [],
			phone: [{ id: "2", name: "flex-direction", value: "column" }],
		};

		const cascaded = resolveCascadedCssValuesByProp(rowsByBreakpoint, BREAKPOINTS, "phone");

		expect(cascaded.get("display")).toEqual(["flex"]);
	});

	it("lets a narrower breakpoint's own declaration override the carried value", () => {
		const rowsByBreakpoint = {
			desktop: [{ id: "1", name: "display", value: "flex" }],
			tablet: [{ id: "2", name: "display", value: "block" }],
			landscapePhone: [],
			phone: [],
		};

		expect(
			resolveCascadedCssValuesByProp(rowsByBreakpoint, BREAKPOINTS, "tablet").get("display")
		).toEqual(["block"]);
		expect(
			resolveCascadedCssValuesByProp(rowsByBreakpoint, BREAKPOINTS, "landscapePhone").get(
				"display"
			)
		).toEqual(["block"]);
	});

	it("does not look ahead at narrower breakpoints past the current one", () => {
		const rowsByBreakpoint = {
			desktop: [],
			tablet: [],
			landscapePhone: [],
			phone: [{ id: "1", name: "display", value: "flex" }],
		};

		expect(
			resolveCascadedCssValuesByProp(rowsByBreakpoint, BREAKPOINTS, "desktop").has("display")
		).toBe(false);
	});

	it("ignores rows with an empty value", () => {
		const rowsByBreakpoint = {
			desktop: [{ id: "1", name: "display", value: "" }],
			tablet: [],
			landscapePhone: [],
			phone: [],
		};

		expect(
			resolveCascadedCssValuesByProp(rowsByBreakpoint, BREAKPOINTS, "phone").has("display")
		).toBe(false);
	});
});
