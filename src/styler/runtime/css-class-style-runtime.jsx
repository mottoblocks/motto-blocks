import { buildEditorCssForSelector } from "./style-engine";
import { collectConditionalClasses } from "./class-conditional-runtime";
import { setEditorBlockStylesBatch } from "./editor-style-registry";
import { walkEditorInstances } from "./instance-tree-runtime";
import { buildMottoStylerCssSignature } from "./motto-styler-signature";
import { normalizeCssClassSlug } from "../classes/css-class-slug";
import {
	buildCssClassRegistryMaps,
	collectMottoCssClassRecords,
} from "../classes/css-class-registry-maps";
import { createCssClassRefResolver } from "../classes/css-class-editor-session";
import { resolveClassMetaConditionalClasses, resolveClassMetaStyler } from "../classes/class-meta";
import {
	getCssClassEditorSessionChangeEvent,
	getCssClassInlineDraft,
} from "../classes/css-class-editor-session";
import { resolveRawStylerAttributes } from "./styler-attributes";
import { scheduleEditorFrameTask } from "./editor-frame-scheduler";
import { dispatchCssClassIndexChange } from "./css-class-index-event";

const parseCssClassId = (value) => {
	const numeric = Number(value);
	return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
};

export const initCssClassStyleCollector = () => {
	if (!window.wp?.data) return;

	const { select, subscribe } = window.wp.data;
	const cache = { propsSigById: {}, cssById: {} };
	let lastGlobalSignature = "";
	let prevIds = [];

	// _fields skips `content` so core-data does not parse block markup of
	// the CSS class entity (which can be invalid and would log block-
	// validation warnings unrelated to the post being edited).
	const CLASS_RECORD_FIELDS = ["id", "slug", "meta"];

	const getClassRecordById = (coreStore, id) => {
		if (!(id > 0)) return null;
		return (
			coreStore?.getEntityRecord?.("postType", "motto_css_class", id, {
				_fields: CLASS_RECORD_FIELDS,
			}) || null
		);
	};

	const getClassRecordBySlug = (coreStore, slug) => {
		const normalizedSlug = normalizeCssClassSlug(slug);
		if (!normalizedSlug) return null;
		const records =
			coreStore?.getEntityRecords?.("postType", "motto_css_class", {
				per_page: 1,
				status: "publish",
				_fields: ["id", "slug", "meta"],
				context: "edit",
				slug: normalizedSlug,
			}) || [];
		return Array.isArray(records) && records.length > 0 ? records[0] : null;
	};

	const getResolvedClassRecord = (coreStore, ref) => {
		const byId = getClassRecordById(coreStore, ref?.id);
		if (byId) return byId;
		return getClassRecordBySlug(coreStore, ref?.slug);
	};

	// `bulkRecordsById`/`bulkRecordBySlug` come from the single paginated
	// getEntityRecords call already made for the whole class list. Preferring
	// them here avoids firing one extra getEntityRecord REST request per
	// referenced class id/slug, which floods hosts that rate-limit wp-json
	// (e.g. WP Engine 429s) once a post references more than a handful of
	// classes by id.
	const hydrateClassRecordMaps = (coreStore, refs, bulkRecordsById, bulkRecordBySlug) => {
		const recordById = new Map();
		const recordMap = new Map();
		(Array.isArray(refs) ? refs : []).forEach((ref) => {
			const record =
				(ref?.id > 0 && bulkRecordsById?.get(ref.id)) ||
				(ref?.slug && bulkRecordBySlug?.get(normalizeCssClassSlug(ref.slug))) ||
				getResolvedClassRecord(coreStore, ref);
			if (!record) return;
			const id = parseCssClassId(record?.id);
			const slug = normalizeCssClassSlug(record?.slug || "");
			if (id > 0) recordById.set(id, record);
			if (slug) recordMap.set(slug, record);
		});
		return { recordById, recordMap };
	};

	const run = () => {
		const coreStore = select("core");
		const blockEditor = select("core/block-editor");
		const orderedClassRefs = [];
		const orderedClassRefSet = new Set();
		const usedById = new Set();
		const usedBySlug = new Set();
		const conditionalByBlock = [];
		const conditionalByBlockSet = new Set();

		const classRecords = collectMottoCssClassRecords(coreStore);
		const { slugById, idBySlug, uidById, idByUid, recordsById, recordBySlug } =
			buildCssClassRegistryMaps(classRecords);
		const resolveClassRef = createCssClassRefResolver({
			classSlugById: slugById,
			classIdMap: idBySlug,
			classUidById: uidById,
			idByUid,
		});

		walkEditorInstances(coreStore, blockEditor, (block) => {
			const mp = resolveRawStylerAttributes(block?.attributes);
			if (!mp || typeof mp !== "object") return;
			const list = Array.isArray(mp?.cssClasses) ? mp.cssClasses : [];
			list.forEach((item) => {
				const resolved = resolveClassRef(item);
				if (resolved.id > 0) {
					const id = resolved.id;
					usedById.add(id);
					const key = `id:${id}`;
					if (!orderedClassRefSet.has(key)) {
						orderedClassRefSet.add(key);
						orderedClassRefs.push({ type: "id", id, slug: resolved.slug });
					}
					return;
				}
				if (resolved.slug) {
					usedBySlug.add(resolved.slug);
					const key = `slug:${resolved.slug}`;
					if (!orderedClassRefSet.has(key)) {
						orderedClassRefSet.add(key);
						orderedClassRefs.push({ type: "slug", slug: resolved.slug });
					}
				}
			});

			const conditional = collectConditionalClasses(mp);
			if (Array.isArray(conditional)) {
				conditional.forEach((cls) => {
					const slug = normalizeCssClassSlug(cls);
					if (slug && !conditionalByBlockSet.has(slug)) {
						conditionalByBlockSet.add(slug);
						conditionalByBlock.push(slug);
					}
				});
			}
		});

		if (usedById.size === 0 && usedBySlug.size === 0) {
			if (prevIds.length) {
				const updates = [];
				prevIds.forEach((id) => {
					delete cache.propsSigById[id];
					delete cache.cssById[id];
					updates.push([id, ""]);
				});
				setEditorBlockStylesBatch(updates);
				prevIds = [];
				lastGlobalSignature = "";
			}
			if (typeof window !== "undefined") {
				window.__mottoCssClassIndex = { byId: {}, bySlug: {}, slugById: {} };
				dispatchCssClassIndexChange();
			}
			return;
		}

		const { recordById, recordMap } = hydrateClassRecordMaps(
			coreStore,
			orderedClassRefs,
			recordsById,
			recordBySlug
		);
		const conditionalMapBySlug = {};
		const conditionalMapById = {};
		const referencedRecords = [];
		const referencedRecordIds = new Set();
		recordById.forEach((record, id) => {
			if (referencedRecordIds.has(id)) return;
			referencedRecordIds.add(id);
			referencedRecords.push(record);
		});
		recordMap.forEach((record) => {
			const id = parseCssClassId(record?.id);
			if (id > 0 && referencedRecordIds.has(id)) return;
			if (id > 0) referencedRecordIds.add(id);
			referencedRecords.push(record);
		});

		referencedRecords.forEach((resolvedRecord) => {
			const slug = normalizeCssClassSlug(resolvedRecord?.slug || "");
			const numericId = parseCssClassId(resolvedRecord?.id);
			const draft = numericId > 0 ? getCssClassInlineDraft(numericId) : null;
			const edits =
				numericId > 0
					? select("core")?.getEntityRecordEdits?.(
							"postType",
							"motto_css_class",
							numericId
						)
					: null;
			const mp =
				draft ||
				resolveClassMetaStyler(edits?.meta) ||
				resolveClassMetaStyler(resolvedRecord?.meta);
			const cond =
				mp && typeof mp === "object"
					? collectConditionalClasses(mp)
					: resolveClassMetaConditionalClasses(edits?.meta).length
						? resolveClassMetaConditionalClasses(edits?.meta)
						: resolveClassMetaConditionalClasses(resolvedRecord?.meta);
			if (slug) conditionalMapBySlug[slug] = Array.isArray(cond) ? cond : [];
			if (numericId > 0) conditionalMapById[numericId] = Array.isArray(cond) ? cond : [];
		});

		const nextIds = [];
		const nextCssById = {};
		const conditionalUsedSlugs = new Set();
		const orderedUsedIds = orderedClassRefs
			.filter((ref) => ref.type === "id")
			.map((ref) => ref.id);
		const orderedUsedSlugs = orderedClassRefs
			.filter((ref) => ref.type === "slug")
			.map((ref) => ref.slug);

		orderedUsedIds.forEach((idValue) => {
			const cond = Array.isArray(conditionalMapById[idValue])
				? conditionalMapById[idValue]
				: [];
			cond.forEach((cls) => {
				const slug = normalizeCssClassSlug(cls);
				if (slug && !usedBySlug.has(slug)) conditionalUsedSlugs.add(slug);
			});
		});
		orderedUsedSlugs.forEach((slug) => {
			const cond = Array.isArray(conditionalMapBySlug[slug])
				? conditionalMapBySlug[slug]
				: [];
			cond.forEach((cls) => {
				const nextSlug = normalizeCssClassSlug(cls);
				if (nextSlug && !usedBySlug.has(nextSlug)) conditionalUsedSlugs.add(nextSlug);
			});
		});
		conditionalByBlock.forEach((slug) => {
			if (slug && !usedBySlug.has(slug)) conditionalUsedSlugs.add(slug);
		});
		conditionalUsedSlugs.forEach((slug) => {
			if (recordMap.has(slug)) return;
			const record = recordBySlug?.get(slug) || getClassRecordBySlug(coreStore, slug);
			if (!record) return;
			const recordSlug = normalizeCssClassSlug(record?.slug || "");
			const recordId = parseCssClassId(record?.id);
			if (recordSlug) recordMap.set(recordSlug, record);
			if (recordId > 0) recordById.set(recordId, record);
		});

		orderedUsedIds.forEach((idValue) => {
			const record = recordById.get(idValue);
			const slug = normalizeCssClassSlug(record?.slug || "");
			if (!record || !slug) return;
			const draft = record?.id ? getCssClassInlineDraft(record.id) : null;
			const edits = record?.id
				? select("core")?.getEntityRecordEdits?.("postType", "motto_css_class", record.id)
				: null;
			const mp =
				draft ||
				resolveClassMetaStyler(edits?.meta) ||
				resolveClassMetaStyler(record?.meta);
			if (!mp || typeof mp !== "object") return;

			const propsSig = `${buildMottoStylerCssSignature(mp)}|${slug}`;
			const key = `class:${idValue}`;
			nextIds.push(key);
			if (cache.propsSigById[key] !== propsSig) {
				cache.propsSigById[key] = propsSig;
				cache.cssById[key] = buildEditorCssForSelector(`.${slug}`, mp) || "";
			}
			if (cache.cssById[key]) nextCssById[key] = cache.cssById[key];
		});

		orderedUsedSlugs.forEach((slug) => {
			const record = recordMap.get(slug);
			if (!record) return;
			if (record?.id && usedById.has(Number(record.id))) return;
			const draft = record?.id ? getCssClassInlineDraft(record.id) : null;
			const edits = record?.id
				? select("core")?.getEntityRecordEdits?.("postType", "motto_css_class", record.id)
				: null;
			const mp =
				draft ||
				resolveClassMetaStyler(edits?.meta) ||
				resolveClassMetaStyler(record?.meta);
			if (!mp || typeof mp !== "object") return;

			const propsSig = `${buildMottoStylerCssSignature(mp)}|${slug}`;
			const key = `class:${slug}`;
			nextIds.push(key);
			if (cache.propsSigById[key] !== propsSig) {
				cache.propsSigById[key] = propsSig;
				cache.cssById[key] = buildEditorCssForSelector(`.${slug}`, mp) || "";
			}
			if (cache.cssById[key]) nextCssById[key] = cache.cssById[key];
		});

		conditionalUsedSlugs.forEach((slug) => {
			const record = recordMap.get(slug);
			if (!record) return;
			const draft = record?.id ? getCssClassInlineDraft(record.id) : null;
			const edits = record?.id
				? select("core")?.getEntityRecordEdits?.("postType", "motto_css_class", record.id)
				: null;
			const mp =
				draft ||
				resolveClassMetaStyler(edits?.meta) ||
				resolveClassMetaStyler(record?.meta);
			if (!mp || typeof mp !== "object") return;

			const propsSig = `${buildMottoStylerCssSignature(mp)}|${slug}`;
			const key = `conditional:${slug}`;
			nextIds.push(key);
			if (cache.propsSigById[key] !== propsSig) {
				cache.propsSigById[key] = propsSig;
				cache.cssById[key] = buildEditorCssForSelector(`.${slug}`, mp) || "";
			}
			if (cache.cssById[key]) nextCssById[key] = cache.cssById[key];
		});

		const ids = Array.from(new Set(nextIds));
		const globalSignature = ids.map((id) => `${id}:${cache.propsSigById[id] || ""}`).join("|");
		if (globalSignature === lastGlobalSignature) return;
		lastGlobalSignature = globalSignature;

		const idsSet = new Set(ids);
		const updates = [];
		prevIds.forEach((id) => {
			if (!idsSet.has(id)) {
				delete cache.propsSigById[id];
				delete cache.cssById[id];
				updates.push([id, ""]);
			}
		});

		ids.forEach((id) => {
			updates.push([id, nextCssById[id] || ""]);
		});
		setEditorBlockStylesBatch(updates);
		prevIds = ids;

		if (typeof window !== "undefined") {
			const slugById = {};
			recordById.forEach((record, id) => {
				const slug = normalizeCssClassSlug(record?.slug || "");
				if (slug) slugById[id] = slug;
			});
			window.__mottoCssClassIndex = {
				byId: conditionalMapById,
				bySlug: conditionalMapBySlug,
				slugById,
			};
			dispatchCssClassIndexChange();
		}
	};

	const schedule = () => {
		scheduleEditorFrameTask("css-class-style-runtime", run);
	};

	subscribe(schedule);
	const sessionEventName = getCssClassEditorSessionChangeEvent();
	if (typeof window !== "undefined" && sessionEventName) {
		window.addEventListener(sessionEventName, schedule);
	}
	run();
};
