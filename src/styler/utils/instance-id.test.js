import { describe, expect, it } from "vitest";
import { hasValidInstanceId, resolveValidInstanceId, sanitizeInstanceId } from "./instance-id";

describe("instance id utils", () => {
	it("sanitizes ids to the CSS-safe contract", () => {
		expect(sanitizeInstanceId("Foo Bar!")).toBe("foobar");
		expect(sanitizeInstanceId("mp-ABC_123")).toBe("mp-abc_123");
	});

	it("treats ids that sanitize to empty as invalid", () => {
		expect(hasValidInstanceId({ instanceId: "!!!" })).toBe(false);
		expect(hasValidInstanceId({ instanceId: " mp-123 " })).toBe(true);
	});

	it("resolves valid ids directly from raw values", () => {
		expect(resolveValidInstanceId("Foo")).toBe("foo");
		expect(resolveValidInstanceId("")).toBe("");
	});
});
