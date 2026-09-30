import { describe, expect, it } from "vitest";
import {
	BORDER_RADIUS_VIEW_ALL,
	BORDER_RADIUS_VIEW_CUSTOM,
	buildBorderRadiusValue,
	canVisualizeBorderRadiusValue,
	getBorderRadiusInitialView,
	parseBorderRadiusValue,
} from "./border-radius-value-utils";

describe("border-radius-value-utils", () => {
	it("expands 1/2/3/4-value shorthands into the four corners", () => {
		expect(parseBorderRadiusValue("10px")).toEqual({
			topLeft: "10px",
			topRight: "10px",
			bottomRight: "10px",
			bottomLeft: "10px",
		});
		expect(parseBorderRadiusValue("10px 20px")).toEqual({
			topLeft: "10px",
			topRight: "20px",
			bottomRight: "10px",
			bottomLeft: "20px",
		});
		expect(parseBorderRadiusValue("10px 20px 5px")).toEqual({
			topLeft: "10px",
			topRight: "20px",
			bottomRight: "5px",
			bottomLeft: "20px",
		});
		expect(parseBorderRadiusValue("10px 20px 5px 0")).toEqual({
			topLeft: "10px",
			topRight: "20px",
			bottomRight: "5px",
			bottomLeft: "0",
		});
	});

	it("collapses matching corners back to the shortest shorthand", () => {
		expect(
			buildBorderRadiusValue({
				topLeft: "10px",
				topRight: "10px",
				bottomRight: "10px",
				bottomLeft: "10px",
			})
		).toBe("10px");
		expect(
			buildBorderRadiusValue({
				topLeft: "10px",
				topRight: "20px",
				bottomRight: "10px",
				bottomLeft: "20px",
			})
		).toBe("10px 20px");
	});

	it("strips a trailing !important before splitting into corners instead of misreading it as a value", () => {
		expect(parseBorderRadiusValue("10px 20px !important")).toEqual({
			topLeft: "10px",
			topRight: "20px",
			bottomRight: "10px",
			bottomLeft: "20px",
		});
		expect(parseBorderRadiusValue("10px 20px 5px 0 !important")).toEqual({
			topLeft: "10px",
			topRight: "20px",
			bottomRight: "5px",
			bottomLeft: "0",
		});
	});

	it("no longer forces code view just because !important is present", () => {
		expect(canVisualizeBorderRadiusValue("10px 20px !important")).toBe(true);
		expect(getBorderRadiusInitialView("10px 20px !important")).toBe(BORDER_RADIUS_VIEW_CUSTOM);
		expect(getBorderRadiusInitialView("10px !important")).toBe(BORDER_RADIUS_VIEW_ALL);
	});

	it("still forces code view for genuinely unsupported values", () => {
		expect(canVisualizeBorderRadiusValue("10px 20px 5px 0 15px")).toBe(false);
		expect(canVisualizeBorderRadiusValue("10px / 20px")).toBe(false);
	});

	it("visualizes calc()/clamp() expressions (including a var() nested inside one) as css, not just a bare var()", () => {
		expect(canVisualizeBorderRadiusValue("calc(var(--border-radius))")).toBe(true);
		expect(parseBorderRadiusValue("calc(var(--border-radius))")).toEqual({
			topLeft: "calc(var(--border-radius))",
			topRight: "calc(var(--border-radius))",
			bottomRight: "calc(var(--border-radius))",
			bottomLeft: "calc(var(--border-radius))",
		});
		expect(canVisualizeBorderRadiusValue("clamp(4px, 2vw, 12px)")).toBe(true);
	});

	it("visualizes global CSS keywords", () => {
		expect(canVisualizeBorderRadiusValue("inherit")).toBe(true);
		expect(parseBorderRadiusValue("inherit")).toEqual({
			topLeft: "inherit",
			topRight: "inherit",
			bottomRight: "inherit",
			bottomLeft: "inherit",
		});
	});
});
