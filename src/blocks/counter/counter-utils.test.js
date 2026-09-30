import { describe, expect, it } from "vitest";

import { formatCounterValue, normalizeCounterAttributes, roundValueToStep } from "./counter-utils";

describe("counter-utils", () => {
	it("normalizes counter defaults into valid values", () => {
		expect(
			normalizeCounterAttributes({
				tagName: "article",
				labelPosition: "side",
				replayMode: "forever",
				thousandsSeparatorMode: "weird",
				step: 0,
			})
		).toMatchObject({
			tagName: "div",
			labelPosition: "bottom",
			replayMode: "once",
			thousandsSeparatorMode: "locale",
			step: 1,
		});
	});

	it("rounds values to the configured visual step", () => {
		expect(roundValueToStep(101.4, 5)).toBe(100);
		expect(roundValueToStep(103.6, 5)).toBe(105);
	});

	it("formats custom thousands separators", () => {
		expect(
			formatCounterValue(12500, {
				step: 1,
				thousandsSeparatorMode: "custom",
				thousandsSeparator: ".",
			})
		).toBe("12.500");
	});

	it("omits thousands separators when disabled", () => {
		expect(
			formatCounterValue(12500, {
				step: 1,
				thousandsSeparatorMode: "none",
				thousandsSeparator: ".",
			})
		).toBe("12500");
	});
});
