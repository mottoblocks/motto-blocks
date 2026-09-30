import clsx from "clsx";
import { __ } from "@wordpress/i18n";
import { useCallback, useEffect, useMemo, useRef } from "@wordpress/element";
import { useSelect } from "@wordpress/data";
import { Button, ComboboxControl, Popover } from "@wordpress/components";
import { Pencil, X, Link2Off, GripVertical } from "lucide-react";
import { withMottoPopupClass } from "@components/ui/popup-class-name";
import { useDragReorder } from "@components";

import { canonicalizeCssClassRef } from "../css-class-editor-session";
import { normalizeCssClassSlug } from "../css-class-slug";

// Small dot shown on a class chip while it has an unsaved edit staged in
// core-data (e.g. the popover was closed by switching blocks instead of
// Save/Cancel) — the edit itself isn't lost, but this gives immediate visual
// feedback instead of relying only on the native save/beforeunload prompts.
function UnsavedClassIndicator({ classId }) {
	const hasUnsavedEdits = useSelect(
		(select) =>
			classId
				? Boolean(
						select("core")?.hasEditsForEntityRecord?.(
							"postType",
							"motto_css_class",
							classId
						)
					)
				: false,
		[classId]
	);
	if (!hasUnsavedEdits) return null;
	return (
		<span
			className="motto-class-tag-unsaved-dot"
			title={__("Unsaved changes", "motto-blocks")}
			aria-label={__("Unsaved changes", "motto-blocks")}
		/>
	);
}

export function AttachedClassTags({
	cssClasses,
	onDetachClass,
	onEditClass,
	onRemoveClass,
	onReorderClass,
	resolveLinkedClassRef,
}) {
	const getClassKey = (item) => {
		const canonical = canonicalizeCssClassRef(item, resolveLinkedClassRef).value;
		const resolvedId = canonical?.id || 0;
		const resolvedSlug = canonical?.slug || item?.slug || "";
		return resolvedId ? `id:${resolvedId}` : `slug:${resolvedSlug}`;
	};

	const isDraggable =
		typeof onReorderClass === "function" && Array.isArray(cssClasses) && cssClasses.length > 1;

	const { getDragItemProps } = useDragReorder({
		getKey: (item) => getClassKey(item),
		onReorder: (fromKey, toKey) => {
			const source = Array.isArray(cssClasses) ? cssClasses : [];
			const fromIndex = source.findIndex((candidate) => getClassKey(candidate) === fromKey);
			const toIndex = source.findIndex((candidate) => getClassKey(candidate) === toKey);
			if (fromIndex >= 0 && toIndex >= 0 && fromIndex !== toIndex) {
				onReorderClass(fromIndex, toIndex);
			}
		},
		disabled: !isDraggable,
	});

	const renderClassTag = (item) => {
		const canonical = canonicalizeCssClassRef(item, resolveLinkedClassRef);
		const resolvedId = canonical.value?.id || 0;
		const resolvedSlug = canonical.value?.slug || "";
		const linkedItem = {
			...item,
			id: resolvedId,
			slug: resolvedSlug || item?.slug || "",
		};
		const hasPostClass = Boolean(resolvedId);
		const itemKey = resolvedSlug || item?.slug || (item?.id ? String(item.id) : "");
		const { isDragging, isDropTarget, rowProps, handleProps } = getDragItemProps(item);

		return (
			<div
				key={itemKey}
				className={clsx("motto-class-tag", {
					"is-dragging": isDragging,
					"is-drop-target": isDropTarget,
				})}
				{...rowProps}
				{...handleProps}
			>
				{isDraggable ? (
					<span className="motto-class-tag-drag" aria-hidden="true">
						<GripVertical size={12} />
					</span>
				) : null}
				<span className="motto-class-tag-label">
					.{resolvedSlug || item.slug || (item.id ? String(item.id) : "")}
				</span>
				{hasPostClass ? <UnsavedClassIndicator classId={resolvedId} /> : null}
				<div className="motto-class-tag-actions">
					{hasPostClass && (
						<Button
							// variant="tertiary"
							className="motto-ui-button is-icon-only motto-no-focus-ring"
							onClick={() => onDetachClass(linkedItem)}
							aria-label={__("Detach class", "motto-blocks")}
							title={__("Detach class", "motto-blocks")}
						>
							<Link2Off size={12} aria-hidden="true" />
						</Button>
					)}
					{hasPostClass ? (
						<Button
							// variant="tertiary"
							className="motto-ui-button is-icon-only motto-no-focus-ring"
							onClick={() => onEditClass(linkedItem)}
							aria-label={__("Edit class", "motto-blocks")}
							title={__("Edit class", "motto-blocks")}
						>
							<Pencil size={12} aria-hidden="true" />
						</Button>
					) : null}
					<Button
						// variant="tertiary"
						className="motto-ui-button is-icon-only motto-no-focus-ring"
						onClick={(event) => {
							event.preventDefault();
							event.stopPropagation();
							onRemoveClass(linkedItem);
						}}
						aria-label={__("Remove class", "motto-blocks")}
						title={__("Remove class", "motto-blocks")}
					>
						<X size={12} aria-hidden="true" />
					</Button>
				</div>
			</div>
		);
	};

	return Array.isArray(cssClasses) && cssClasses.length > 0 ? (
		<div className="motto-class-tags">{cssClasses.map(renderClassTag)}</div>
	) : null;
}

export function AttachedClassesSection({
	addClassAnchorRef,
	classInput,
	classRecords,
	cssClasses,
	isAddPopoverOpen,
	onAddClass,
	onCloseAddPopover,
	onDetachClass,
	onEditClass,
	onRemoveClass,
	onReorderClass,
	resolveLinkedClassRef,
	setClassInput,
}) {
	const classSuggestions = useMemo(() => {
		return classRecords
			.map((record) => normalizeCssClassSlug(record?.slug || record?.title?.rendered || ""))
			.filter(Boolean);
	}, [classRecords]);

	const classOptions = useMemo(() => {
		const applied = new Set();
		if (Array.isArray(cssClasses)) {
			cssClasses.forEach((item) => {
				const resolved = resolveLinkedClassRef(item);
				if (resolved.slug) applied.add(resolved.slug);
			});
		}

		const base = classSuggestions
			.filter((slug) => !applied.has(slug))
			.map((slug) => ({ label: slug, value: slug }));
		const draft = normalizeCssClassSlug(classInput);
		if (draft && !applied.has(draft) && !base.find((opt) => opt.value === draft)) {
			return [{ label: draft, value: draft }, ...base];
		}
		return base;
	}, [classInput, classSuggestions, cssClasses, resolveLinkedClassRef]);

	const addPopoverContentRef = useRef(null);

	useEffect(() => {
		if (!isAddPopoverOpen) return undefined;
		let cancelled = false;
		const focusComboboxInput = () => {
			if (cancelled) return;
			const root = addPopoverContentRef.current;
			if (!root) return;
			const input = root.querySelector(
				'input.components-combobox-control__input, input[role="combobox"], input[type="text"]'
			);
			input?.focus?.();
		};
		const id = requestAnimationFrame(() => {
			requestAnimationFrame(focusComboboxInput);
		});
		return () => {
			cancelled = true;
			cancelAnimationFrame(id);
		};
	}, [isAddPopoverOpen]);

	const handleAddRowKeyDown = useCallback(
		(event) => {
			if (!isAddPopoverOpen) return;
			if (event.key !== "Enter" || event.nativeEvent?.isComposing) return;
			if (event.target?.closest?.("button")) return;
			// If the combobox dropdown is open, let ComboboxControl handle Enter (it calls onChange with the selected suggestion).
			if (event.target?.getAttribute?.("aria-expanded") === "true") return;
			const slug = normalizeCssClassSlug(classInput);
			if (!slug) return;
			event.preventDefault();
			onAddClass(slug);
			onCloseAddPopover();
		},
		[classInput, isAddPopoverOpen, onAddClass, onCloseAddPopover]
	);

	const popover = isAddPopoverOpen ? (
		<Popover
			anchor={addClassAnchorRef?.current}
			placement="bottom-start"
			flip={true}
			shift={true}
			offset={4}
			className={withMottoPopupClass("motto-class-add-popup")}
			focusOnMount={false}
			onClose={onCloseAddPopover}
		>
			<div
				ref={addPopoverContentRef}
				className="motto-class-add-popup-inner"
				onKeyDown={handleAddRowKeyDown}
			>
				<ComboboxControl
					className="motto-class-input"
					value={classInput}
					aria-label={__("Add class", "motto-blocks")}
					onChange={(next) => {
						const slug = normalizeCssClassSlug(next || "");
						if (!slug) {
							setClassInput("");
							return;
						}
						onAddClass(slug);
						onCloseAddPopover();
					}}
					onFilterValueChange={(next) => {
						setClassInput(normalizeCssClassSlug(next || ""));
					}}
					options={classOptions}
					placeholder={__("Add class", "motto-blocks")}
					allowReset={false}
				/>
			</div>
		</Popover>
	) : null;

	if (!Array.isArray(cssClasses) || cssClasses.length === 0) {
		return popover;
	}

	return (
		<div className="motto-attached-classes-content">
			<AttachedClassTags
				cssClasses={cssClasses}
				onDetachClass={onDetachClass}
				onEditClass={onEditClass}
				onRemoveClass={onRemoveClass}
				onReorderClass={onReorderClass}
				resolveLinkedClassRef={resolveLinkedClassRef}
			/>
			{popover}
		</div>
	);
}
