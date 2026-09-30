import { normalizeCssClassSlug } from "./css-class-slug";
import { normalizeClassUid } from "./css-class-uid.js";

/**
 * CSS class ref resolution and repair for `mottoStyler.cssClasses`.
 * Contract (current + planned `uid`): docs/conventions/styler-css-classes.md
 */

const draftMap = new Map();
const CHANGE_EVENT = "motto:css-class-editor-session-change";
const parseCssClassId = (value) => {
	const numeric = Number(value);
	return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
};

const emitChange = () => {
	if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
	window.dispatchEvent(new window.CustomEvent(CHANGE_EVENT));
};

export const createCssClassRefResolver = ({
	classSlugById,
	classIdMap,
	classUidById,
	idByUid,
} = {}) => {
	const slugById = classSlugById instanceof Map ? classSlugById : new Map();
	const idBySlug = classIdMap instanceof Map ? classIdMap : new Map();
	const uidById = classUidById instanceof Map ? classUidById : new Map();
	const idByUidMap = idByUid instanceof Map ? idByUid : new Map();

	const pack = (id, slug, uid) => {
		const out = { id, slug: slug || "" };
		const u = normalizeClassUid(uid);
		if (u) {
			out.uid = u;
		}
		return out;
	};

	return (item) => {
		const currentId = typeof item === "object" ? parseCssClassId(item?.id) : 0;
		const fallbackSlug = normalizeCssClassSlug(
			typeof item === "string" ? item : item?.slug || ""
		);
		const itemUid = typeof item === "object" ? normalizeClassUid(item?.uid) : "";

		if (itemUid && idByUidMap.has(itemUid)) {
			const resolvedId = idByUidMap.get(itemUid);
			const canonSlug = slugById.get(resolvedId) || fallbackSlug;
			const canonUid = uidById.get(resolvedId) || itemUid;
			return pack(resolvedId, canonSlug, canonUid);
		}

		if (currentId > 0 && slugById.has(currentId)) {
			const canonSlug = slugById.get(currentId) || fallbackSlug;
			const canonUid = uidById.get(currentId) || "";
			return pack(currentId, canonSlug, canonUid);
		}

		if (currentId > 0) {
			if (fallbackSlug) {
				const bySlugId = idBySlug.get(fallbackSlug) || 0;
				if (bySlugId > 0 && slugById.has(bySlugId)) {
					return pack(
						bySlugId,
						slugById.get(bySlugId) || fallbackSlug,
						uidById.get(bySlugId) || ""
					);
				}
				return pack(
					bySlugId,
					fallbackSlug,
					bySlugId > 0 ? uidById.get(bySlugId) || "" : ""
				);
			}
			return { id: 0, slug: "" };
		}
		if (!fallbackSlug) {
			return { id: 0, slug: "" };
		}
		const bySlugOnly = idBySlug.get(fallbackSlug) || 0;
		if (bySlugOnly > 0) {
			return pack(
				bySlugOnly,
				slugById.get(bySlugOnly) || fallbackSlug,
				uidById.get(bySlugOnly) || ""
			);
		}
		return pack(0, fallbackSlug, "");
	};
};

export const canonicalizeCssClassRef = (item, resolveRef) => {
	if (typeof resolveRef !== "function") {
		const currentId = typeof item === "object" ? parseCssClassId(item?.id) : 0;
		const currentSlug = normalizeCssClassSlug(
			typeof item === "string" ? item : item?.slug || ""
		);
		return {
			value: currentSlug || currentId > 0 ? { id: currentId, slug: currentSlug } : null,
			changed: typeof item === "string",
		};
	}

	const resolved = resolveRef(item);
	const nextItem = {
		id: resolved.id,
		slug: resolved.slug || "",
	};
	const resolvedUid = normalizeClassUid(resolved?.uid);
	if (resolvedUid) {
		nextItem.uid = resolvedUid;
	}
	const currentId = typeof item === "object" ? parseCssClassId(item?.id) : 0;
	const currentSlug = normalizeCssClassSlug(typeof item === "string" ? item : item?.slug || "");
	const currentUid = typeof item === "object" ? normalizeClassUid(item?.uid) : "";
	const nextUid = normalizeClassUid(nextItem?.uid);
	const hasValue = nextItem.slug || nextItem.id > 0;

	return {
		value: hasValue ? nextItem : null,
		changed:
			!hasValue ||
			currentId !== nextItem.id ||
			currentSlug !== nextItem.slug ||
			currentUid !== nextUid ||
			typeof item === "string",
	};
};

export const repairCssClassRefs = (raw = [], resolveRef) => {
	if (!Array.isArray(raw) || typeof resolveRef !== "function") {
		return { value: Array.isArray(raw) ? raw : [], changed: false };
	}

	let changed = false;
	const seen = new Set();
	const out = [];

	raw.forEach((item) => {
		const canonical = canonicalizeCssClassRef(item, resolveRef);
		const nextItem = canonical.value;
		const key = nextItem?.uid
			? `uid:${nextItem.uid}`
			: nextItem?.slug
				? `slug:${nextItem.slug}`
				: nextItem?.id > 0
					? `id:${nextItem.id}`
					: "";
		if (!key || !nextItem || seen.has(key)) {
			changed = true;
			return;
		}
		seen.add(key);
		if (canonical.changed) {
			changed = true;
		}
		out.push(nextItem);
	});

	return { value: out, changed };
};

export const setCssClassInlineDraft = (id, mottoStyler) => {
	const numericId = Number(id);
	if (
		!Number.isFinite(numericId) ||
		numericId <= 0 ||
		!mottoStyler ||
		typeof mottoStyler !== "object"
	)
		return;
	draftMap.set(numericId, mottoStyler);
	emitChange();
};

export const clearCssClassInlineDraft = (id) => {
	const numericId = Number(id);
	if (!Number.isFinite(numericId) || numericId <= 0) return;
	if (!draftMap.has(numericId)) return;
	draftMap.delete(numericId);
	emitChange();
};

export const getCssClassInlineDraft = (id) => {
	const numericId = Number(id);
	if (!Number.isFinite(numericId) || numericId <= 0) return null;
	return draftMap.get(numericId) || null;
};

export const getCssClassEditorSessionChangeEvent = () => CHANGE_EVENT;
