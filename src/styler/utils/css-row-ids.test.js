import { describe, expect, it, vi } from "vitest";
import { repairCssRowIds } from "./css-row-ids";

describe("repairCssRowIds", () => {
	it("keeps valid unique row ids unchanged", () => {
		const rows = [
			{ id: "css-a", name: "color", value: "red" },
			{ id: "css-b", name: "padding", value: "1rem" },
		];

		const result = repairCssRowIds(rows);

		expect(result.changed).toBe(false);
		expect(result.rows).toBe(rows);
	});

	it("repairs missing or duplicated row ids", () => {
		vi.spyOn(Date, "now").mockReturnValue(1712600000000);
		vi.spyOn(Math, "random").mockReturnValueOnce(0.123456).mockReturnValueOnce(0.654321);

		const rows = [
			{ id: "css-a", name: "color", value: "red" },
			{ id: "css-a", name: "padding", value: "1rem" },
			{ name: "margin", value: "0" },
		];

		const result = repairCssRowIds(rows);

		expect(result.changed).toBe(true);
		expect(result.rows).toHaveLength(3);
		expect(result.rows[0]).toBe(rows[0]);
		expect(result.rows[1].id).not.toBe("css-a");
		expect(result.rows[1].id).toMatch(/^css-/);
		expect(result.rows[2].id).toMatch(/^css-/);
		expect(new Set(result.rows.map((row) => row.id)).size).toBe(3);
	});
});
