import { dispatch, resolveSelect, select, useDispatch, useSelect } from "@wordpress/data";
import { useCallback, useEffect, useMemo, useRef, useState } from "@wordpress/element";

import {
	canonicalizeCssClassRef,
	clearCssClassInlineDraft,
	repairCssClassRefs,
	setCssClassInlineDraft,
} from "./css-class-editor-session";
import { normalizeCssClassSlug } from "./css-class-slug";
import { CLASS_META_STYLER_KEY, resolveClassMetaStyler } from "./class-meta";
import { STORE_KEY as PREVIEW_STORE_KEY } from "../runtime/preview-store";
import { hasNonEmptyCssRows } from "../utils/motto-content";
import { BREAKPOINT_KEYS } from "../config/styler-breakpoints.js";

export const useInlineCssClassEditor = ({
	normalizeMottoStylerWithClasses,
	resolveLinkedClassRef,
	withPersistedBlockSelectors,
	classRecordsById,
} = {}) => {
	const [editingClassId, setEditingClassId] = useState(null);
	const [editingClassSlug, setEditingClassSlug] = useState("");
	const [editingClassDraft, setEditingClassDraft] = useState(null);
	const [isSavingEditingClass, setIsSavingEditingClass] = useState(false);
	const [editingClassSaveProgress, setEditingClassSaveProgress] = useState(0);

	const saveClassProgressIntervalRef = useRef(null);
	const editingClassMottoStylerRef = useRef(null);
	const initialEditingClassMottoStylerRef = useRef(null);
	const instanceModeBeforeEditingRef = useRef(null);
	// Bumped whenever an editing session ends (save success or cancel) so a
	// stale, still-in-flight core-data staging dispatch from
	// updateEditingClassMottoStyler (see below) can detect it's obsolete and
	// skip re-marking the class dirty after it was just cleared.
	const editSessionTokenRef = useRef(0);
	const { saveEntityRecord } = useDispatch("core");

	const editingClassRecord = useSelect(
		(select) => {
			if (!editingClassId) return null;
			// Prefer the bulk record already fetched by the class list query —
			// getEntityRecord has its own resolver cache separate from
			// getEntityRecords, so calling it unconditionally here would refetch
			// over the network even though the record is already in the store.
			const bulkRecord = classRecordsById?.get?.(editingClassId);
			if (bulkRecord) return bulkRecord;
			return select("core")?.getEntityRecord?.("postType", "motto_css_class", editingClassId);
		},
		[editingClassId, classRecordsById]
	);
	const editingClassRecordEdits = useSelect(
		(select) =>
			editingClassId
				? select("core")?.getEntityRecordEdits?.(
						"postType",
						"motto_css_class",
						editingClassId
					)
				: null,
		[editingClassId]
	);
	const sanitizeEditingClassMottoStyler = useCallback(
		(rawMottoStyler) => {
			const base = rawMottoStyler && typeof rawMottoStyler === "object" ? rawMottoStyler : {};
			const repairedCssClasses = repairCssClassRefs(
				base?.cssClasses || [],
				resolveLinkedClassRef
			).value;
			return {
				...base,
				cssClasses: repairedCssClasses,
			};
		},
		[resolveLinkedClassRef]
	);

	const buildEditingClassMeta = useCallback(
		(nextMottoStyler) => ({
			[CLASS_META_STYLER_KEY]: withPersistedBlockSelectors(
				sanitizeEditingClassMottoStyler(nextMottoStyler)
			),
		}),
		[sanitizeEditingClassMottoStyler, withPersistedBlockSelectors]
	);

	const editingClassMottoStyler = useMemo(
		() =>
			normalizeMottoStylerWithClasses(
				editingClassDraft ||
					resolveClassMetaStyler(editingClassRecordEdits?.meta) ||
					resolveClassMetaStyler(editingClassRecord?.meta) ||
					{}
			),
		[
			editingClassDraft,
			editingClassRecord,
			editingClassRecordEdits,
			normalizeMottoStylerWithClasses,
		]
	);
	const editingClassLabel = useMemo(() => {
		const raw = editingClassSlug || editingClassRecord?.slug || "";
		return normalizeCssClassSlug(raw);
	}, [editingClassRecord, editingClassSlug]);

	useEffect(() => {
		editingClassMottoStylerRef.current = editingClassMottoStyler;
	}, [editingClassMottoStyler]);

	useEffect(() => {
		if (editingClassDraft !== null || !editingClassId) return;
		if (!editingClassRecord && !editingClassRecordEdits) return;
		const initialMottoStyler = normalizeMottoStylerWithClasses(
			resolveClassMetaStyler(editingClassRecordEdits?.meta) ||
				resolveClassMetaStyler(editingClassRecord?.meta) ||
				{}
		);
		initialEditingClassMottoStylerRef.current = initialMottoStyler;
		setEditingClassDraft(initialMottoStyler);
		const firstNonEmptyBreakpoint = BREAKPOINT_KEYS.find((breakpoint) =>
			hasNonEmptyCssRows(initialMottoStyler?.css?.[breakpoint])
		);
		if (firstNonEmptyBreakpoint) {
			dispatch(PREVIEW_STORE_KEY)?.setMode?.(firstNonEmptyBreakpoint, "motto");
		}
	}, [
		editingClassDraft,
		editingClassId,
		editingClassRecord,
		editingClassRecordEdits,
		normalizeMottoStylerWithClasses,
	]);

	useEffect(() => {
		if (!editingClassId || !editingClassDraft || !Array.isArray(editingClassDraft?.cssClasses))
			return;
		const repaired = repairCssClassRefs(editingClassDraft.cssClasses, resolveLinkedClassRef);
		if (!repaired.changed) return;
		setEditingClassDraft((current) => {
			if (!current || !Array.isArray(current?.cssClasses)) return current;
			return {
				...current,
				cssClasses: repaired.value,
			};
		});
	}, [editingClassDraft, editingClassId, resolveLinkedClassRef]);

	useEffect(() => {
		if (!editingClassId || !editingClassDraft) return;
		setCssClassInlineDraft(editingClassId, withPersistedBlockSelectors(editingClassDraft));
		return () => {
			clearCssClassInlineDraft(editingClassId);
		};
	}, [editingClassDraft, editingClassId, withPersistedBlockSelectors]);

	useEffect(() => {
		return () => {
			if (saveClassProgressIntervalRef.current) {
				window.clearInterval(saveClassProgressIntervalRef.current);
				saveClassProgressIntervalRef.current = null;
			}
		};
	}, []);

	// Warms core-data's "default" context bucket for this class so
	// editEntityRecord (used below to register dirty-state with WP's native
	// unsaved-changes tracking) can read it — editEntityRecord always reads
	// via the "default" context, but the class list is fetched under
	// context:"edit", which populates a separate bucket.
	useEffect(() => {
		if (!editingClassId) return;
		resolveSelect("core").getEntityRecord("postType", "motto_css_class", editingClassId);
	}, [editingClassId]);

	const updateEditingClassMottoStyler = useCallback(
		(nextPartial) => {
			if (!editingClassId) return;
			const current = editingClassMottoStylerRef.current;
			const partial = typeof nextPartial === "function" ? nextPartial(current) : nextPartial;
			if (!partial || typeof partial !== "object") return;
			const next = sanitizeEditingClassMottoStyler({
				...current,
				...partial,
			});
			editingClassMottoStylerRef.current = next;
			setEditingClassDraft(next);
			const classId = editingClassId;
			// Stage the change in core-data too, so WP's native dirty-tracking
			// (beforeunload warning, "Update" multi-entity save panel) picks it
			// up. Read the ref at resolution time, not a captured value, so
			// rapid keystrokes before the warm-up resolves still converge on
			// the latest draft. Guarded by the session token so a call still
			// in flight when the session ends (save/cancel) can't resurrect
			// the edit after it was just cleared.
			const token = editSessionTokenRef.current;
			resolveSelect("core")
				.getEntityRecord("postType", "motto_css_class", classId)
				.then(() => {
					if (editSessionTokenRef.current !== token) return;
					dispatch("core").editEntityRecord("postType", "motto_css_class", classId, {
						meta: buildEditingClassMeta(editingClassMottoStylerRef.current),
					});
				});
		},
		[buildEditingClassMeta, editingClassId, sanitizeEditingClassMottoStyler]
	);

	const restoreInstanceMode = useCallback(() => {
		const previousMode = instanceModeBeforeEditingRef.current;
		instanceModeBeforeEditingRef.current = null;
		if (!previousMode) return;
		dispatch(PREVIEW_STORE_KEY)?.setMode?.(previousMode, "motto");
	}, []);

	const closeEditingClass = useCallback(async () => {
		if (!editingClassId || isSavingEditingClass) return;
		// Invalidate any staging dispatch from updateEditingClassMottoStyler
		// still in flight — the payload built below already reads the latest
		// draft directly, so skipping their (now redundant) core-data write
		// costs nothing and closes the race that left the class dirty after
		// a successful save.
		editSessionTokenRef.current += 1;
		let didSaveSucceed = false;
		setIsSavingEditingClass(true);
		setEditingClassSaveProgress(8);
		if (saveClassProgressIntervalRef.current) {
			window.clearInterval(saveClassProgressIntervalRef.current);
		}
		saveClassProgressIntervalRef.current = window.setInterval(() => {
			setEditingClassSaveProgress((prev) => {
				if (prev >= 92) return prev;
				return Math.min(92, prev + (prev < 40 ? 8 : prev < 75 ? 4 : 2));
			});
		}, 120);
		try {
			const repairedDraft = sanitizeEditingClassMottoStyler(
				editingClassMottoStylerRef.current
			);
			const nextMeta = buildEditingClassMeta(repairedDraft);
			editingClassMottoStylerRef.current = repairedDraft;
			await saveEntityRecord("postType", "motto_css_class", {
				id: editingClassId,
				meta: nextMeta,
			});
			didSaveSucceed = true;
			setEditingClassSaveProgress(100);
			// Explicitly discard the staged edit rather than relying solely on
			// core-data's own RECEIVE_ITEMS pruning. Deliberately NOT
			// editEntityRecord(..., { meta: undefined }): postType entities
			// have mergedEdits.meta = true, so editEntityRecord merges any new
			// `meta` value into the existing edited meta before its
			// self-clearing check runs — spreading `undefined` is a no-op, so
			// it silently re-asserts the same edit instead of clearing it.
			// clearEntityRecordEdits dispatches EDIT_ENTITY_RECORD directly,
			// bypassing that merge.
			dispatch("core").clearEntityRecordEdits("postType", "motto_css_class", editingClassId);
		} finally {
			if (saveClassProgressIntervalRef.current) {
				window.clearInterval(saveClassProgressIntervalRef.current);
				saveClassProgressIntervalRef.current = null;
			}
			setIsSavingEditingClass(false);
			if (didSaveSucceed) {
				setEditingClassId(null);
				setEditingClassSlug("");
				setEditingClassDraft(null);
				setEditingClassSaveProgress(0);
				initialEditingClassMottoStylerRef.current = null;
				restoreInstanceMode();
			}
		}
	}, [
		buildEditingClassMeta,
		editingClassId,
		isSavingEditingClass,
		restoreInstanceMode,
		saveEntityRecord,
		sanitizeEditingClassMottoStyler,
	]);

	const cancelEditingClass = useCallback(() => {
		if (!editingClassId || isSavingEditingClass) return;
		editSessionTokenRef.current += 1;
		// Discard whatever was staged in core-data via updateEditingClassMottoStyler
		// so the entity stops showing up as dirty (beforeunload / save panel).
		// See the comment in closeEditingClass for why this must be
		// clearEntityRecordEdits and not editEntityRecord(..., { meta: undefined }).
		dispatch("core").clearEntityRecordEdits("postType", "motto_css_class", editingClassId);
		setEditingClassId(null);
		setEditingClassSlug("");
		setEditingClassDraft(null);
		setEditingClassSaveProgress(0);
		initialEditingClassMottoStylerRef.current = null;
		restoreInstanceMode();
	}, [editingClassId, isSavingEditingClass, restoreInstanceMode]);

	const openEditingClass = useCallback(
		(item) => {
			const canonical = canonicalizeCssClassRef(item, resolveLinkedClassRef);
			if (!canonical.value?.id) return;
			editSessionTokenRef.current += 1;
			initialEditingClassMottoStylerRef.current = null;
			if (instanceModeBeforeEditingRef.current === null) {
				instanceModeBeforeEditingRef.current =
					select(PREVIEW_STORE_KEY)?.getMode?.() ?? null;
			}
			setEditingClassId(canonical.value.id);
			setEditingClassSlug(canonical.value.slug);
			setEditingClassDraft(null);
		},
		[resolveLinkedClassRef]
	);

	return {
		cancelEditingClass,
		closeEditingClass,
		editingClassDraft,
		editingClassId,
		editingClassLabel,
		editingClassMottoStyler,
		editingClassRecord,
		editingClassSaveProgress,
		isSavingEditingClass,
		openEditingClass,
		updateEditingClassMottoStyler,
	};
};
