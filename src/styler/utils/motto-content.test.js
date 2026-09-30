import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@wordpress/blocks", () => ({
	createBlock: vi.fn(),
	serialize: vi.fn(),
}));

let hasAnyMottoContent;
let mergeMottoContent;

beforeAll(async () => {
	({ hasAnyMottoContent, mergeMottoContent } = await import("./motto-content"));
});

describe("mergeMottoContent", () => {
	it("merges class inner selectors into block content on detach", () => {
		const merged = mergeMottoContent(
			{
				css: {
					desktop: [],
					tablet: [],
					landscapePhone: [],
					phone: [],
				},
				blockSelectors: {
					desktop: [],
					tablet: [],
					landscapePhone: [],
					phone: [],
				},
				html: { attributes: [] },
			},
			{
				css: {
					desktop: [],
					tablet: [],
					landscapePhone: [],
					phone: [],
				},
				blockSelectors: {
					desktop: [
						{
							id: "sel-1",
							selector: "&{BLOCK} .child",
							label: "Child",
							description: "",
							css: [{ name: "color", value: "red" }],
						},
					],
					tablet: [],
					landscapePhone: [],
					phone: [],
				},
				html: { attributes: [] },
			}
		);

		expect(merged.blockSelectors.desktop).toHaveLength(1);
		expect(merged.blockSelectors.desktop[0]).toMatchObject({
			id: "sel-1",
			selector: "&{BLOCK} .child",
			label: "Child",
			css: [{ name: "color", value: "red" }],
		});
	});
});

describe("hasAnyMottoContent", () => {
	it("returns true for enabled block spacing with a non-empty value", () => {
		expect(
			hasAnyMottoContent({
				blockSpacing: {
					enabled: true,
					values: { desktop: "1.5rem" },
				},
			})
		).toBe(true);
	});

	it("returns false for block spacing when enabled but empty", () => {
		expect(
			hasAnyMottoContent({
				blockSpacing: {
					enabled: true,
					values: { desktop: "" },
				},
			})
		).toBe(false);
	});
});
