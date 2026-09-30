import { describe, expect, it } from "vitest";

import { resolveVisualPreview } from "./background-preview-utils";

describe("background-preview-utils", () => {
	it("keeps full background values for row previews", () => {
		const value = "linear-gradient(90deg, red, blue) 50% 50% / cover no-repeat scroll, #ffffff";

		expect(resolveVisualPreview("background", value)).toBe(value);
	});
});
