import { describe, expect, it } from "vitest";
import {
	canVisualizeLengthFieldValue,
	canVisualizeSpacingValue,
} from "./value-type-capabilities.js";

describe("value-type-capabilities", () => {
	it("keeps spacing values visualizable when one axis uses the css slot", () => {
		expect(canVisualizeSpacingValue("35px inherit")).toBe(true);
		expect(canVisualizeSpacingValue("35px var(--space-x)")).toBe(true);
		expect(canVisualizeSpacingValue("35px calc(10px + 1rem)")).toBe(true);
	});

	it("keeps numeric spacing shorthands visualizable", () => {
		expect(canVisualizeSpacingValue("35px 10px")).toBe(true);
	});

	it("visualizes unitless numbers for length props whose units allow an empty unit (line-height)", () => {
		const lineHeightConfig = {
			units: [
				{ value: "", label: "N" },
				{ value: "em", label: "em" },
				{ value: "px", label: "px" },
			],
		};
		expect(canVisualizeLengthFieldValue("1.5", lineHeightConfig)).toBe(true);
		expect(canVisualizeLengthFieldValue("20", lineHeightConfig)).toBe(true);
		expect(canVisualizeLengthFieldValue("1.5em", lineHeightConfig)).toBe(true);
	});

	it("keeps forcing code view for unitless numbers on length props without an empty unit (e.g. flex-basis)", () => {
		expect(canVisualizeLengthFieldValue("20", { hasAutoValue: true })).toBe(false);
		expect(canVisualizeLengthFieldValue("20")).toBe(false);
	});
});
