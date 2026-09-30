import { describe, expect, it, vi } from "vitest";

vi.mock("@wordpress/blocks", () => ({
	createBlock: vi.fn(),
	serialize: vi.fn(),
}));

import {
	getAutoApplyDefaultsPayload,
	hasAutoAppliedDefaultsMarker,
} from "./styler-defaults-auto-apply";

describe("hasAutoAppliedDefaultsMarker", () => {
	it("returns true only when marker is explicitly true", () => {
		expect(hasAutoAppliedDefaultsMarker({ ui: { defaults: { appliedOnInsert: true } } })).toBe(
			true
		);
		expect(hasAutoAppliedDefaultsMarker({ ui: { defaults: { appliedOnInsert: false } } })).toBe(
			false
		);
		expect(hasAutoAppliedDefaultsMarker({})).toBe(false);
	});
});

describe("getAutoApplyDefaultsPayload", () => {
	it("returns payload for pristine instance with non-empty defaults", () => {
		const payload = getAutoApplyDefaultsPayload(
			{},
			{
				css: { desktop: [{ id: "r-1", name: "display", value: "flex" }] },
				blockSelectors: {
					desktop: [{ id: "s-1", selector: ":hover", selectorType: "state", css: [] }],
				},
			},
			{ createInstanceId: () => "mp-test" }
		);

		expect(payload).toBeTruthy();
		expect(payload.instanceId).toBe("mp-test");
		expect(payload.css.desktop).toHaveLength(1);
		expect(payload.blockSelectors.desktop).toHaveLength(1);
		expect(payload.ui.defaults.appliedOnInsert).toBe(true);
	});

	it("creates an instanceId for pristine instances that do not have one yet", () => {
		const payload = getAutoApplyDefaultsPayload(
			{},
			{ css: { desktop: [{ id: "r-1", name: "display", value: "grid" }] } },
			{ createInstanceId: () => "mp-generated" }
		);

		expect(payload.instanceId).toBe("mp-generated");
	});

	it("returns null when current styler already has content", () => {
		const payload = getAutoApplyDefaultsPayload(
			{ css: { desktop: [{ id: "r-1", name: "display", value: "flex" }] } },
			{ css: { desktop: [{ id: "r-2", name: "display", value: "grid" }] } }
		);
		expect(payload).toBeNull();
	});

	it("returns null when block spacing already counts as existing content", () => {
		const payload = getAutoApplyDefaultsPayload(
			{
				blockSpacing: {
					enabled: true,
					values: { desktop: "2rem" },
				},
			},
			{ css: { desktop: [{ id: "r-2", name: "display", value: "grid" }] } }
		);
		expect(payload).toBeNull();
	});

	it("returns null when marker already exists", () => {
		const payload = getAutoApplyDefaultsPayload(
			{ ui: { defaults: { appliedOnInsert: true } } },
			{ css: { desktop: [{ id: "r-1", name: "display", value: "flex" }] } }
		);
		expect(payload).toBeNull();
	});

	it("returns null when styler is empty but already has an instanceId", () => {
		const payload = getAutoApplyDefaultsPayload(
			{ instanceId: "mp-existing", css: { desktop: [] } },
			{ css: { desktop: [{ id: "r-1", name: "display", value: "flex" }] } }
		);
		expect(payload).toBeNull();
	});

	it("returns null when defaults have no content", () => {
		const payload = getAutoApplyDefaultsPayload({}, { css: { desktop: [] } });
		expect(payload).toBeNull();
	});

	it("hydrates selector-list defaults without ids into runtime inner selectors with ids", () => {
		const payload = getAutoApplyDefaultsPayload(
			{},
			{
				css: { desktop: [{ name: "--swiper-theme-color" }] },
				blockSelectors: [
					{
						selector: ":where(.motto-slide)",
						selectorType: "inner",
						label: "Slides",
						css: {
							desktop: [{ name: "display", value: "grid" }],
						},
					},
					{
						selector: ":where(.swiper-pagination)",
						selectorType: "inner",
						label: "Pagination",
						css: {
							desktop: [{ name: "--swiper-pagination-bullet-size" }],
						},
					},
				],
			},
			{ createInstanceId: () => "mp-test" }
		);

		expect(payload).toBeTruthy();
		expect(payload.blockSelectors.desktop).toHaveLength(2);
		payload.blockSelectors.desktop.forEach((selectorRow) => {
			expect(typeof selectorRow.id).toBe("string");
			expect(selectorRow.id.length).toBeGreaterThan(0);
		});
		expect(payload.blockSelectors.desktop[0].css[0].id).toMatch(/^motto-selector-row-/);
	});
});
