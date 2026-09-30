import { normalizeCssClassSlug } from "./css-class-slug";
import { normalizeClassUid } from "./css-class-uid.js";

const CLASS_QUERY_BASE = {
	per_page: 100,
	status: ["publish", "private", "draft", "pending", "future"],
	context: "edit",
	_fields: ["id", "slug", "title", "meta"],
};

/**
 * Records created in this session that aren't reflected in the
 * `getEntityRecords` list cache yet (that cache is invalidated, not
 * refetched, right after `saveEntityRecord` creates a new class — the
 * refetch only happens lazily next time the list selector is read, which
 * can be slow on slow servers). Registered by `registerPendingCssClassRecord`
 * right after creation so consumers see the new class immediately; entries
 * are dropped once the real list catches up and contains that id.
 */
const pendingRecordsById = new Map();

export const registerPendingCssClassRecord = (record) => {
	const recordId = Number(record?.id);
	if (!(recordId > 0)) return;
	pendingRecordsById.set(recordId, record);
};

/**
 * Fetches page 1 directly instead of probing `getEntityRecordsTotalPages`
 * first — that probe resolves under a different core-data cache key (no
 * `page` param) than the actual page fetch, doubling the REST requests
 * this triggers. Only continues to page 2+ if page 1 came back full,
 * which in practice never happens while the site has under `per_page`
 * classes. Keep this single-request shape in sync with the preloaded
 * path in `includes/class-post-type.php`.
 *
 * @param {object} coreStore Result of `select("core")` (must provide getEntityRecords).
 */
export const collectMottoCssClassRecords = (coreStore) => {
	if (!coreStore) return [];
	const perPage = CLASS_QUERY_BASE.per_page;
	const records = [];
	let page = 1;
	let pageRecords;
	do {
		pageRecords = coreStore.getEntityRecords?.("postType", "motto_css_class", {
			...CLASS_QUERY_BASE,
			page,
		});
		if (!Array.isArray(pageRecords)) return records;
		pageRecords.forEach((record) => {
			const recordId = Number(record?.id);
			if (recordId > 0) pendingRecordsById.delete(recordId);
			records.push(record);
		});
		page += 1;
	} while (pageRecords.length === perPage);
	pendingRecordsById.forEach((record) => records.push(record));
	return records;
};

/**
 * @param {Array<Record<string, unknown>>} classRecords
 */
export const buildCssClassRegistryMaps = (classRecords) => {
	const recordsById = new Map();
	const recordBySlug = new Map();
	const slugById = new Map();
	const idBySlug = new Map();
	const uidById = new Map();
	const idByUid = new Map();

	(Array.isArray(classRecords) ? classRecords : []).forEach((record) => {
		const recordId = Number(record?.id);
		const slug = normalizeCssClassSlug(record?.slug || record?.title?.rendered || "");
		const uid = normalizeClassUid(record?.meta?.motto_class_uid);
		if (recordId > 0) {
			recordsById.set(recordId, record);
		}
		if (slug) {
			recordBySlug.set(slug, record);
		}
		if (recordId > 0 && slug) {
			slugById.set(recordId, slug);
			idBySlug.set(slug, recordId);
		}
		if (recordId > 0 && uid) {
			uidById.set(recordId, uid);
			idByUid.set(uid, recordId);
		}
	});

	return { recordsById, recordBySlug, slugById, idBySlug, uidById, idByUid };
};
