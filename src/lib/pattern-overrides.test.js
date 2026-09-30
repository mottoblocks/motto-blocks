import { describe, expect, it } from "vitest";

import { hasActivePatternOverride } from "./pattern-overrides.js";

describe("hasActivePatternOverride", () => {
	it("is false when there are no bindings at all", () => {
		expect(hasActivePatternOverride({}, "url")).toBe(false);
		expect(hasActivePatternOverride({ metadata: {} }, "url")).toBe(false);
	});

	it("is true when __default is bound to core/pattern-overrides", () => {
		const attributes = {
			metadata: { bindings: { __default: { source: "core/pattern-overrides" } } },
		};
		expect(hasActivePatternOverride(attributes, "url")).toBe(true);
		expect(hasActivePatternOverride(attributes, "linkContainerUrl")).toBe(true);
	});

	it("is true when the specific attribute is bound to core/pattern-overrides", () => {
		const attributes = {
			metadata: { bindings: { url: { source: "core/pattern-overrides" } } },
		};
		expect(hasActivePatternOverride(attributes, "url")).toBe(true);
	});

	it("is false for a different binding source (e.g. a custom field)", () => {
		const attributes = {
			metadata: { bindings: { url: { source: "core/post-meta" } } },
		};
		expect(hasActivePatternOverride(attributes, "url")).toBe(false);
	});

	it("is false when the bound attribute doesn't match the one being checked", () => {
		const attributes = {
			metadata: { bindings: { alt: { source: "core/pattern-overrides" } } },
		};
		expect(hasActivePatternOverride(attributes, "url")).toBe(false);
	});
});
