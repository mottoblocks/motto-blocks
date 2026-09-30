import { useDispatch } from "@wordpress/data";
import { Button } from "@wordpress/components";
import { useCallback, useMemo, useRef, useState } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { Plus } from "lucide-react";
import { canonicalizeCssClassRef, repairCssClassRefs } from "../classes/css-class-editor-session";
import { registerPendingCssClassRecord } from "../classes/css-class-registry-maps";
import { normalizeCssClassSlug } from "../classes/css-class-slug";
import { normalizeClassUid } from "../classes/css-class-uid.js";
import { CLASS_META_STYLER_KEY, resolveClassMetaStyler } from "../classes/class-meta";
import { useCanonicalCssClasses } from "../classes/use-canonical-css-classes";
import { withPersistedBlockSelectors } from "../utils/block-selectors-shape";
import {
	hasAnyMottoContent,
	mergeMottoContent,
	pickMottoContent,
	serializeClassInnerBlocks,
} from "../utils/motto-content";

export const useClassManagement = ({
	mottoStyler,
	updateMottoStyler,
	classRecords,
	classRecordsById,
	classIdMap,
	resolveLinkedClassRef,
	sourceBlock,
	openEditingClass,
	classUidById = new Map(),
}) => {
	const [classInput, setClassInput] = useState("");
	const [isCreatingClass, setIsCreatingClass] = useState(false);
	const [isAddClassPopoverOpen, setIsAddClassPopoverOpen] = useState(false);
	const addClassTriggerRef = useRef(null);
	const { saveEntityRecord } = useDispatch("core");

	const canonicalBlockCssClasses = useCanonicalCssClasses({
		cssClasses: mottoStyler?.cssClasses || [],
		resolveLinkedClassRef,
		onRepair: (nextCssClasses) => updateMottoStyler({ cssClasses: nextCssClasses }),
	});

	const hasAttachedBlockClasses =
		Array.isArray(canonicalBlockCssClasses) && canonicalBlockCssClasses.length > 0;

	const attachedClassMottoStylers = useMemo(
		() =>
			canonicalBlockCssClasses.reduce((acc, classRef) => {
				const record = classRecordsById.get(Number(classRef?.id));
				const classMottoStyler = pickMottoContent(
					resolveClassMetaStyler(record?.meta) || {}
				);
				if (hasAnyMottoContent(classMottoStyler)) acc.push(classMottoStyler);
				return acc;
			}, []),
		[canonicalBlockCssClasses, classRecordsById]
	);

	const closeAddClassPopover = useCallback(() => {
		setIsAddClassPopoverOpen(false);
	}, []);

	const removeAttachedClassRef = useCallback(
		(item) => {
			const target = canonicalizeCssClassRef(item, resolveLinkedClassRef).value;
			if (!target) {
				return repairCssClassRefs(mottoStyler?.cssClasses || [], resolveLinkedClassRef)
					.value;
			}
			const targetId = Number(target?.id);
			const hasTargetId = Number.isFinite(targetId) && targetId > 0;
			const targetSlug = normalizeCssClassSlug(target?.slug || "");
			const source = repairCssClassRefs(
				mottoStyler?.cssClasses || [],
				resolveLinkedClassRef
			).value;
			return source.filter((entry) => {
				const resolvedEntry = canonicalizeCssClassRef(entry, resolveLinkedClassRef).value;
				if (!resolvedEntry) return false;
				const entryId = Number(resolvedEntry?.id);
				const hasEntryId = Number.isFinite(entryId) && entryId > 0;
				const entrySlug = normalizeCssClassSlug(resolvedEntry?.slug || "");
				if (hasTargetId && hasEntryId && entryId === targetId) return false;
				if (targetSlug && entrySlug && entrySlug === targetSlug) return false;
				return true;
			});
		},
		[mottoStyler?.cssClasses, resolveLinkedClassRef]
	);

	const handleAddClassInput = useCallback(
		(incoming) => {
			const slug = normalizeCssClassSlug(
				typeof incoming === "string" ? incoming : classInput
			);
			if (!slug) return;
			const nextClasses = repairCssClassRefs(
				mottoStyler?.cssClasses || [],
				resolveLinkedClassRef
			).value;
			if (nextClasses.find((entry) => entry.slug === slug)) {
				setClassInput("");
				return;
			}
			const linkedId = classIdMap.get(slug) || 0;
			const nextRef = { id: linkedId, slug };
			const uid = linkedId > 0 ? normalizeClassUid(classUidById?.get?.(linkedId)) : "";
			if (uid) {
				nextRef.uid = uid;
			}
			nextClasses.push(nextRef);
			updateMottoStyler({ cssClasses: nextClasses });
			setClassInput("");
		},
		[
			classIdMap,
			classInput,
			classUidById,
			mottoStyler?.cssClasses,
			resolveLinkedClassRef,
			updateMottoStyler,
		]
	);

	const handleRemoveClass = useCallback(
		(item) => {
			updateMottoStyler({ cssClasses: removeAttachedClassRef(item) });
		},
		[removeAttachedClassRef, updateMottoStyler]
	);

	const handleReorderClass = useCallback(
		(fromIndex, toIndex) => {
			const source = repairCssClassRefs(
				mottoStyler?.cssClasses || [],
				resolveLinkedClassRef
			).value;
			if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
			if (fromIndex >= source.length || toIndex >= source.length) return;
			const nextClasses = [...source];
			const [moved] = nextClasses.splice(fromIndex, 1);
			nextClasses.splice(toIndex, 0, moved);
			updateMottoStyler({ cssClasses: nextClasses });
		},
		[mottoStyler?.cssClasses, resolveLinkedClassRef, updateMottoStyler]
	);

	const handleDetachClass = useCallback(
		(item) => {
			const target = canonicalizeCssClassRef(item, resolveLinkedClassRef).value;
			const nextClasses = removeAttachedClassRef(item);

			const classRecord = target?.id ? classRecordsById.get(Number(target.id)) || null : null;
			const classMottoStyler = pickMottoContent(
				resolveClassMetaStyler(classRecord?.meta) || {}
			);
			const classHasRules = hasAnyMottoContent(classMottoStyler);
			const localHasRules = hasAnyMottoContent({
				css: mottoStyler?.css || {},
				blockSelectors: mottoStyler?.blockSelectors || {},
				html: mottoStyler?.html || { attributes: [] },
			});

			if (classHasRules && localHasRules) {
				const ok = window.confirm(
					__(
						"This block already has local rules. Detach will merge class rules into local rules. Continue?",
						"motto-blocks"
					)
				);
				if (!ok) return;
			}

			if (classHasRules) {
				const merged = mergeMottoContent(
					{
						css: mottoStyler?.css || {},
						blockSelectors: mottoStyler?.blockSelectors || {},
						html: mottoStyler?.html || { attributes: [] },
					},
					classMottoStyler
				);
				updateMottoStyler({
					cssClasses: nextClasses,
					css: merged.css,
					blockSelectors: merged.blockSelectors,
					html: merged.html,
				});
				return;
			}

			updateMottoStyler({ cssClasses: nextClasses });
		},
		[
			classRecordsById,
			mottoStyler,
			removeAttachedClassRef,
			resolveLinkedClassRef,
			updateMottoStyler,
		]
	);

	const handleCancelCreateClass = useCallback(() => {
		setIsCreatingClass(false);
	}, []);

	const handleCreateClass = useCallback(
		async (className) => {
			const classMottoStyler = {
				css: mottoStyler?.css || {},
				blockSelectors: mottoStyler?.blockSelectors || {},
				html: mottoStyler?.html || { attributes: [] },
				blockSpacing: mottoStyler?.blockSpacing || { enabled: false, values: {} },
			};
			const content = serializeClassInnerBlocks(sourceBlock);

			const record = await saveEntityRecord("postType", "motto_css_class", {
				title: className,
				status: "publish",
				meta: { [CLASS_META_STYLER_KEY]: withPersistedBlockSelectors(classMottoStyler) },
				content: { raw: content },
			});
			registerPendingCssClassRecord(record);

			const slug = normalizeCssClassSlug(record?.slug || className);
			const uid = normalizeClassUid(record?.meta?.motto_class_uid);
			const nextClasses = repairCssClassRefs(
				mottoStyler?.cssClasses || [],
				resolveLinkedClassRef
			).value;
			if (slug && !nextClasses.find((item) => item.slug === slug)) {
				const ref = { id: record?.id || 0, slug };
				if (uid) {
					ref.uid = uid;
				}
				nextClasses.push(ref);
			}

			updateMottoStyler({
				cssClasses: nextClasses,
				css: { desktop: [], tablet: [], landscapePhone: [], phone: [] },
				blockSelectors: [],
				html: { attributes: [] },
				blockSpacing: { enabled: false, values: {} },
			});

			setIsCreatingClass(false);
			if (record?.id) {
				openEditingClass({ id: record.id, slug });
			}
		},
		[
			mottoStyler,
			openEditingClass,
			resolveLinkedClassRef,
			saveEntityRecord,
			sourceBlock,
			updateMottoStyler,
		]
	);

	const addClassTrigger = (
		<Button
			ref={addClassTriggerRef}
			type="button"
			variant="secondary"
			className="motto-class-add-trigger-wrap"
			onClick={() => setIsAddClassPopoverOpen((v) => !v)}
			aria-expanded={isAddClassPopoverOpen}
			aria-haspopup="dialog"
			aria-label={hasAttachedBlockClasses ? __("Add class", "motto-blocks") : undefined}
		>
			<Plus size={14} aria-hidden="true" />
			{__("Class", "motto-blocks")}
		</Button>
	);

	const attachedClassesSectionProps = {
		addClassAnchorRef: addClassTriggerRef,
		classInput,
		classRecords,
		cssClasses: canonicalBlockCssClasses,
		isAddPopoverOpen: isAddClassPopoverOpen,
		onAddClass: handleAddClassInput,
		onCloseAddPopover: closeAddClassPopover,
		onDetachClass: handleDetachClass,
		onEditClass: openEditingClass,
		onRemoveClass: handleRemoveClass,
		onReorderClass: handleReorderClass,
		resolveLinkedClassRef,
		setClassInput,
	};

	const createClassModalProps = {
		isOpen: isCreatingClass,
		onCancel: handleCancelCreateClass,
		onSave: handleCreateClass,
		existingClassIdMap: classIdMap,
	};

	return {
		addClassTrigger,
		attachedClassesSectionProps,
		attachedClassMottoStylers,
		createClassModalProps,
		startCreatingClass: () => setIsCreatingClass(true),
	};
};
