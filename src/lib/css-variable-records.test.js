import { describe, expect, it } from "vitest";

import {
	CSS_VARIABLE_PUBLISHED_QUERY_BASE,
	createCssVariableSuggestionsFromRecords,
	getVariableNameFromRecord,
	normalizeVariableLabel,
	selectAllCssVariableRecords,
} from "./css-variable-records.js";

describe("css variable records helpers", () => {
	it("reads all pages from the published css variable catalog", () => {
		const pages = new Map([
			[1, [{ id: 1, slug: "brand-color" }]],
			[2, [{ id: 2, slug: "space-md" }]],
		]);
		const coreStore = {
			getEntityRecordsTotalPages: (kind, name, query) => {
				expect(kind).toBe("postType");
				expect(name).toBe("motto_css_variable");
				expect(query).toEqual(CSS_VARIABLE_PUBLISHED_QUERY_BASE);
				return 2;
			},
			getEntityRecords: (kind, name, query) => {
				expect(kind).toBe("postType");
				expect(name).toBe("motto_css_variable");
				return pages.get(Number(query?.page || 1)) || [];
			},
		};

		const records = selectAllCssVariableRecords(coreStore);

		expect(records).toEqual([
			{ id: 1, slug: "brand-color" },
			{ id: 2, slug: "space-md" },
		]);
	});

	it("builds deduplicated suggestions from records", () => {
		const suggestions = createCssVariableSuggestionsFromRecords([
			{
				id: 1,
				title: { rendered: "brand-color" },
				meta: { motto_variable_value: "#f00" },
			},
			{
				id: 2,
				meta: {
					motto_variable_name: "--brand-color",
					motto_variable_value: "#0f0",
				},
			},
		]);

		expect(suggestions).toEqual([
			{
				label: "--brand-color",
				value: "--brand-color",
				meta: "#f00",
			},
		]);
	});

	it("normalizes variable labels and record names consistently", () => {
		expect(normalizeVariableLabel("token")).toBe("--token");
		expect(getVariableNameFromRecord({ slug: "space-sm" })).toBe("space-sm");
		expect(
			getVariableNameFromRecord({
				meta: { motto_variable_name: "  --brand-color  " },
				title: { rendered: "Ignored" },
			})
		).toBe("--brand-color");
	});
});
