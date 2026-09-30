import { describe, expect, it } from "vitest";
import { createCssClassRefResolver, repairCssClassRefs } from "./css-class-editor-session.js";

const mapsFromRecords = (records) => {
	const slugById = new Map();
	const idBySlug = new Map();
	records.forEach(({ id, slug }) => {
		const sid = Number(id);
		if (sid > 0 && slug) {
			slugById.set(sid, slug);
			idBySlug.set(slug, sid);
		}
	});
	return createCssClassRefResolver({ classSlugById: slugById, classIdMap: idBySlug });
};

describe("createCssClassRefResolver", () => {
	const resolve = mapsFromRecords([
		{ id: 10, slug: "alpha" },
		{ id: 20, slug: "beta" },
	]);

	it("uses registry slug when id is known (rename / canonical slug)", () => {
		expect(resolve({ id: 10, slug: "old-alpha" })).toEqual({ id: 10, slug: "alpha" });
	});

	it("reconciles by slug when stored id is unknown (migration: same slug, different id)", () => {
		expect(resolve({ id: 9999, slug: "beta" })).toEqual({ id: 20, slug: "beta" });
	});

	it("drops unknown id when slug matches nothing (local-only)", () => {
		expect(resolve({ id: 8888, slug: "local-only" })).toEqual({ id: 0, slug: "local-only" });
	});

	it("clears orphan id when slug is empty", () => {
		expect(resolve({ id: 7777, slug: "" })).toEqual({ id: 0, slug: "" });
	});

	it("attaches CPT id for slug-only ref", () => {
		expect(resolve({ id: 0, slug: "alpha" })).toEqual({ id: 10, slug: "alpha" });
	});

	it("prefers uid over stale id and slug", () => {
		const uid = "aaaaaaaa-bbbb-4ccc-bddd-eeeeeeeeeeee";
		const slugById = new Map([[10, "alpha"]]);
		const idBySlug = new Map([["alpha", 10]]);
		const uidById = new Map([[10, uid]]);
		const idByUid = new Map([[uid, 10]]);
		const resolve = createCssClassRefResolver({
			classSlugById: slugById,
			classIdMap: idBySlug,
			classUidById: uidById,
			idByUid,
		});
		expect(resolve({ id: 9999, slug: "wrong", uid })).toEqual({
			id: 10,
			slug: "alpha",
			uid,
		});
	});
});

describe("repairCssClassRefs", () => {
	it("dedupes by slug and flags changed when a ref was reconciled", () => {
		const resolve = mapsFromRecords([{ id: 30, slug: "gamma" }]);
		const { value, changed } = repairCssClassRefs(
			[
				{ id: 999, slug: "gamma" },
				{ id: 30, slug: "gamma" },
			],
			resolve
		);
		expect(changed).toBe(true);
		expect(value).toEqual([{ id: 30, slug: "gamma" }]);
	});

	it("dedupes by uid when present", () => {
		const uid = "bbbbbbbb-bbbb-4ccc-bddd-ffffffffffff";
		const slugById = new Map([[40, "zeta"]]);
		const idBySlug = new Map([["zeta", 40]]);
		const uidById = new Map([[40, uid]]);
		const idByUid = new Map([[uid, 40]]);
		const resolve = createCssClassRefResolver({
			classSlugById: slugById,
			classIdMap: idBySlug,
			classUidById: uidById,
			idByUid,
		});
		const { value, changed } = repairCssClassRefs(
			[
				{ id: 40, slug: "zeta", uid },
				{ id: 41, slug: "zeta", uid },
			],
			resolve
		);
		expect(changed).toBe(true);
		expect(value).toEqual([{ id: 40, slug: "zeta", uid }]);
	});
});
