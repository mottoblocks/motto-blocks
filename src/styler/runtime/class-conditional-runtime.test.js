import { describe, expect, it } from "vitest";

import {
	collectConditionalClasses,
	collectConditionalClassesWithRules,
	getSharedBreakpoints,
} from "./class-conditional-runtime";

describe("collectConditionalClassesWithRules", () => {
	it("supports notExists and class template arrays", () => {
		const rules = [
			{
				id: "no-bg",
				breakpoints: ["desktop"],
				normalize: true,
				conditions: [{ prop: "background-color", match: { type: "notExists" } }],
				class: ["no-bg--{bp}", "no-bg-rule-{id}"],
			},
		];
		const classes = collectConditionalClassesWithRules(
			{
				css: {
					desktop: [{ name: "display", value: "flex" }],
				},
			},
			{
				rules,
				breakpoints: {
					desktop: { media: "", maxWidth: null },
				},
			}
		);

		expect(classes).toEqual(["no-bg--desktop", "no-bg-rule-no-bg"]);
	});

	it("expands {value} template for multiple matches", () => {
		const rules = [
			{
				id: "display-layout",
				breakpoints: ["desktop"],
				normalize: true,
				conditions: [{ prop: "display", match: { type: "in", value: ["flex", "grid"] } }],
				class: "has-layout-{value}",
			},
		];
		const classes = collectConditionalClassesWithRules(
			{
				css: {
					desktop: [
						{ name: "display", value: "flex" },
						{ name: "display", value: "grid" },
					],
				},
			},
			{
				rules,
				breakpoints: {
					desktop: { media: "", maxWidth: null },
				},
			}
		);

		expect(classes).toEqual(["has-layout-flex", "has-layout-grid"]);
	});
});

describe("collectConditionalClasses", () => {
	it("returns configured classes for default rules config", () => {
		const classes = collectConditionalClasses({
			css: {
				desktop: [{ name: "display", value: "flex" }],
			},
		});

		expect(classes).toContain("motto-is-layout-flex--desktop");
	});

	it("uses configured breakpoints map", () => {
		const breakpoints = getSharedBreakpoints();
		expect(Object.keys(breakpoints)).toEqual(["desktop", "tablet", "landscapePhone", "phone"]);
	});
});
