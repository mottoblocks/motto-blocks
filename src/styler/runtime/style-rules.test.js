import { describe, expect, it } from "vitest";

import { buildDesktopStyleObject } from "./style-rules";

describe("buildDesktopStyleObject", () => {
	it("keeps standard properties that are not part of the reduced suggestion list", () => {
		const style = buildDesktopStyleObject({
			css: {
				desktop: [{ name: "word-break", value: "break-word" }],
			},
		});

		expect(style).toMatchObject({
			wordBreak: "break-word",
		});
	});
});
