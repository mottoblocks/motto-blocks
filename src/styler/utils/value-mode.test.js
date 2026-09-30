import { describe, expect, it } from "vitest";
import {
	MODE_CSS,
	MODE_CUSTOM,
	MODE_PRESET,
	clearSlotMemory,
	detectValueMode,
	readSlotMemory,
	resolveDisplayFallback,
	writeSlotMemory,
} from "./value-mode";

describe("detectValueMode", () => {
	it("keeps '0', 'auto' and empty values in preset mode", () => {
		expect(detectValueMode("")).toBe(MODE_PRESET);
		expect(detectValueMode("0")).toBe(MODE_PRESET);
		expect(detectValueMode("auto")).toBe(MODE_PRESET);
	});

	it("detects a real preset token as preset mode", () => {
		expect(detectValueMode("var:preset|spacing|40")).toBe(MODE_PRESET);
		expect(detectValueMode("var(--wp--preset--spacing--40)")).toBe(MODE_PRESET);
	});

	it("detects a numeric value as custom mode", () => {
		expect(detectValueMode("16px")).toBe(MODE_CUSTOM);
		expect(detectValueMode("1.5rem")).toBe(MODE_CUSTOM);
	});

	it("detects a css expression or keyword as css mode", () => {
		expect(detectValueMode("var(--custom)")).toBe(MODE_CSS);
		expect(detectValueMode("calc(100% - 8px)")).toBe(MODE_CSS);
		expect(detectValueMode("inherit")).toBe(MODE_CSS);
	});
});

describe("writeSlotMemory", () => {
	it("files a value under the mode matching its own kind, regardless of which UI produced it", () => {
		let memory = {};
		memory = writeSlotMemory(memory, "top", "16px");
		memory = writeSlotMemory(memory, "top", "var:preset|spacing|40");
		memory = writeSlotMemory(memory, "top", "calc(100% - 8px)");
		expect(memory.top).toEqual({
			custom: "16px",
			preset: "var:preset|spacing|40",
			css: "calc(100% - 8px)",
		});
	});

	it("a numeric value typed as free-text css still files under custom", () => {
		const memory = writeSlotMemory({}, "top", "2px");
		expect(readSlotMemory(memory, "top", MODE_CUSTOM)).toBe("2px");
		expect(readSlotMemory(memory, "top", MODE_CSS)).toBeUndefined();
	});

	it("ignores empty values and 'auto'", () => {
		expect(writeSlotMemory({}, "top", "")).toEqual({});
		expect(writeSlotMemory({}, "top", "auto")).toEqual({});
	});

	it("does not clobber a sibling key's memory", () => {
		let memory = writeSlotMemory({}, "top", "16px");
		memory = writeSlotMemory(memory, "left", "1rem");
		expect(memory).toEqual({ top: { custom: "16px" }, left: { custom: "1rem" } });
	});
});

describe("clearSlotMemory", () => {
	it("removes all remembered modes for a key", () => {
		let memory = writeSlotMemory({}, "top", "16px");
		memory = writeSlotMemory(memory, "top", "calc(100% - 8px)");
		memory = clearSlotMemory(memory, "top");
		expect(memory.top).toBeUndefined();
	});

	it("leaves other keys untouched", () => {
		let memory = writeSlotMemory({}, "top", "16px");
		memory = writeSlotMemory(memory, "left", "1rem");
		memory = clearSlotMemory(memory, "top");
		expect(memory).toEqual({ left: { custom: "1rem" } });
	});
});

describe("resolveDisplayFallback", () => {
	it("leaves the preset/custom fallback untouched — custom keeps resolving a preset to its size", () => {
		expect(resolveDisplayFallback(MODE_CUSTOM, "var:preset|spacing|40")).toBe(
			"var:preset|spacing|40"
		);
		expect(resolveDisplayFallback(MODE_PRESET, "16px")).toBe("16px");
	});

	it("blanks the css fallback when the live value is a preset, not an actual css expression", () => {
		expect(resolveDisplayFallback(MODE_CSS, "var:preset|spacing|40")).toBe("");
		expect(
			resolveDisplayFallback(
				MODE_CSS,
				"var(--wp--preset--spacing--50, clamp(30px, 5vw, 50px))"
			)
		).toBe("");
	});

	it("blanks the css fallback for a plain numeric value too", () => {
		expect(resolveDisplayFallback(MODE_CSS, "16px")).toBe("");
	});

	it("keeps the css fallback when the live value is already a genuine css expression", () => {
		expect(resolveDisplayFallback(MODE_CSS, "calc(100% - 8px)")).toBe("calc(100% - 8px)");
		expect(resolveDisplayFallback(MODE_CSS, "var(--custom-thing)")).toBe("var(--custom-thing)");
	});
});

describe("readSlotMemory", () => {
	it("returns the remembered value, or the fallback when there is none", () => {
		const memory = writeSlotMemory({}, "top", "16px");
		expect(readSlotMemory(memory, "top", MODE_CUSTOM, "fallback")).toBe("16px");
		expect(readSlotMemory(memory, "top", MODE_PRESET, "fallback")).toBe("fallback");
		expect(readSlotMemory(memory, "right", MODE_CUSTOM, "fallback")).toBe("fallback");
	});
});
