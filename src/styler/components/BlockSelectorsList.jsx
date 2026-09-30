import { __ } from "@wordpress/i18n";
import { useCallback, useEffect, useMemo, useState } from "@wordpress/element";
import { Button, Dropdown, MenuGroup, MenuItem, Tooltip } from "@wordpress/components";
import { useDispatch } from "@wordpress/data";
import { applyFilters } from "@wordpress/hooks";
import { withMottoPopupClass } from "@components/ui/popup-class-name";
import { STYLER_ACTION_IDS, STYLER_HOOKS, STYLER_SECTION_IDS } from "../freepro/freepro-ids";
import {
	CircleHelp,
	ClipboardCopy,
	ClipboardPaste,
	EllipsisVertical,
	Group,
	Plus,
	RotateCcw,
	SwatchBook,
	Trash,
} from "lucide-react";
import { moveItemToId, useDragReorder } from "@components";
import { BREAKPOINT_KEYS } from "../config/styler-breakpoints.js";
import { InnerSelectorItem } from "./InnerSelectorItem";
import { SelectorPresetPickerModal } from "./SelectorPresetPickerModal";
import { EditSelectorModal } from "./EditSelectorModal";
import { useBlockSelectorsClipboard } from "../hooks/use-block-selectors-clipboard";
import { useBlockSelectorEditModal } from "../hooks/use-block-selector-edit-modal";
import { useBlockSelectorPresets } from "../hooks/use-block-selector-presets";
import {
	emptyBlockSelectorsByBreakpoint,
	normalizeBlockSelectorsByBreakpoint,
	normalizeBlockSelectorsSelectorList,
	SELECTOR_TOKEN,
} from "../utils/block-selectors-shape";
import {
	applySharedSelectorListToBreakpoints,
	buildSharedSelectorList,
	cloneInnerSelectorCss,
	createEmptyInnerSelectorItem,
	createInnerSelectorId,
	getDisplayLabel,
	pickSelectorMeta,
} from "../utils/block-selectors-list-helpers";

export const BlockSelectorsList = ({
	mode = "desktop",
	mottoStyler,
	updateMottoStyler,
	attributes,
	setAttributes,
	title = __("Block selectors", "motto-blocks"),
	helpText = "",
	showResetToDefaults = false,
	onResetToDefaults = null,
	popupScope = "",
}) => {
	const rawBlockSelectors =
		mottoStyler?.blockSelectors !== undefined
			? mottoStyler.blockSelectors
			: mottoStyler?.innerSelectors;
	const byBp = normalizeBlockSelectorsByBreakpoint(rawBlockSelectors);
	const sharedSelectors = useMemo(() => buildSharedSelectorList(byBp, mode), [byBp, mode]);
	const syncedByBp = useMemo(
		() => applySharedSelectorListToBreakpoints(sharedSelectors, byBp),
		[sharedSelectors, byBp]
	);
	const blockSelectors = useMemo(
		() => (Array.isArray(syncedByBp?.[mode]) ? syncedByBp[mode] : []),
		[mode, syncedByBp]
	);
	// Cross-breakpoint CSS rows per selector id, keyed the same way mottoStyler.css is,
	// so each selector's StylerCssList can resolve "requires" dependency warnings (e.g.
	// display) declared on a wider breakpoint instead of only the current one — see
	// docs/conventions/architecture.md's cascade-direction notes.
	const cssByBreakpointById = useMemo(() => {
		const map = {};
		sharedSelectors.forEach((selector) => {
			const id = selector?.id;
			if (!id) return;
			const byBp = {};
			BREAKPOINT_KEYS.forEach((bp) => {
				const list = Array.isArray(syncedByBp?.[bp]) ? syncedByBp[bp] : [];
				const item = list.find((entry) => entry?.id === id);
				byBp[bp] = Array.isArray(item?.css) ? item.css : [];
			});
			map[id] = byBp;
		});
		return map;
	}, [sharedSelectors, syncedByBp]);
	const [openById, setOpenById] = useState({});
	const [reorderedSelectorId, setReorderedSelectorId] = useState("");

	const { createSuccessNotice, createWarningNotice } = useDispatch("core/notices");

	const persistAllByBp = useCallback(
		(nextByBp) => {
			updateMottoStyler?.(() => ({
				blockSelectors: normalizeBlockSelectorsSelectorList(nextByBp),
			}));
		},
		[updateMottoStyler]
	);

	const { canCopySelectors, handleCopySelectors, handleCopySelector, handlePasteSelectors } =
		useBlockSelectorsClipboard({
			sharedSelectors,
			syncedByBp,
			persistAllByBp,
			setOpenById,
			createSuccessNotice,
			createWarningNotice,
		});

	const updateInnerSelectorCss = useCallback(
		(id, nextCssRows) => {
			const nextByBp = {
				...syncedByBp,
				[mode]: blockSelectors.map((s) =>
					s.id !== id ? s : { ...s, css: Array.isArray(nextCssRows) ? nextCssRows : [] }
				),
			};
			persistAllByBp(nextByBp);
		},
		[syncedByBp, mode, blockSelectors, persistAllByBp]
	);

	const updateInnerSelectorMeta = useCallback(
		(id, patch) => {
			const nextShared = sharedSelectors.map((s) =>
				s.id !== id ? s : pickSelectorMeta({ ...s, ...patch })
			);
			const nextByBp = applySharedSelectorListToBreakpoints(nextShared, syncedByBp);
			persistAllByBp(nextByBp);
		},
		[sharedSelectors, syncedByBp, persistAllByBp]
	);

	const { showPresetPicker, setShowPresetPicker, selectorPresetGroups, addPresetInnerSelector } =
		useBlockSelectorPresets({ sharedSelectors, syncedByBp, persistAllByBp, setOpenById });

	const removeInnerSelector = (id) => {
		const nextShared = sharedSelectors.filter((s) => s.id !== id);
		const nextByBp = applySharedSelectorListToBreakpoints(nextShared, syncedByBp);
		persistAllByBp(nextByBp);
		setOpenById((prev) => {
			if (!prev[id]) return prev;
			const nextMap = { ...prev };
			delete nextMap[id];
			return nextMap;
		});
	};

	const {
		editState,
		setEditState,
		editError,
		setEditError,
		selectorInputWrapRef,
		editModalContentRef,
		openEditInnerSelector,
		confirmEditInnerSelector,
		cancelEditInnerSelector,
		insertToken,
	} = useBlockSelectorEditModal({ removeInnerSelector, updateInnerSelectorMeta });

	const addInnerSelector = () => {
		const newItem = createEmptyInnerSelectorItem();
		const nextShared = [...sharedSelectors, pickSelectorMeta(newItem)];
		const nextByBp = applySharedSelectorListToBreakpoints(nextShared, syncedByBp);
		persistAllByBp(nextByBp);
		setOpenById((prev) => ({ ...prev, [newItem.id]: true }));
		setEditError("");
		setEditState({
			id: newItem.id,
			isNew: true,
			label: "",
			description: "",
			selector: SELECTOR_TOKEN,
		});
	};

	const clearBlockSelectors = () => {
		if (!window.confirm(__("This will delete all selectors. Continue?", "motto-blocks")))
			return;
		persistAllByBp(emptyBlockSelectorsByBreakpoint());
		setOpenById({});
		setEditError("");
		setEditState(null);
	};

	const duplicateInnerSelector = useCallback(
		(id) => {
			const sourceItem = blockSelectors.find((item) => item.id === id);
			if (!sourceItem) return;

			const duplicatedId = createInnerSelectorId();
			const duplicatedLabel = `${getDisplayLabel(sourceItem)} Copy`;
			const nextByBp = Object.fromEntries(
				Object.entries(syncedByBp).map(([bp, list]) => {
					const nextList = [];
					(list || []).forEach((item) => {
						nextList.push(item);
						if (item?.id !== id) return;
						nextList.push({
							...item,
							id: duplicatedId,
							label: duplicatedLabel,
							css: cloneInnerSelectorCss(item?.css),
						});
					});
					return [bp, nextList];
				})
			);

			persistAllByBp(nextByBp);
			setOpenById((prev) => ({ ...prev, [duplicatedId]: true }));
		},
		[blockSelectors, syncedByBp, persistAllByBp]
	);

	const handleReorderSelector = useCallback(
		(fromId, toId) => {
			const next = moveItemToId(sharedSelectors, fromId, toId);
			if (next === sharedSelectors) return;
			persistAllByBp(applySharedSelectorListToBreakpoints(next, syncedByBp));
			setReorderedSelectorId(String(fromId || ""));
		},
		[sharedSelectors, syncedByBp, persistAllByBp]
	);

	const { getDragItemProps } = useDragReorder({
		getKey: (sub) => sub?.id,
		onReorder: handleReorderSelector,
		disabled: blockSelectors.length < 2,
	});

	useEffect(() => {
		if (!reorderedSelectorId) return undefined;
		const timeoutId = window.setTimeout(() => setReorderedSelectorId(""), 240);
		return () => window.clearTimeout(timeoutId);
	}, [reorderedSelectorId]);

	useEffect(() => {
		const ids = new Set(
			blockSelectors.map((item) => String(item?.id || "").trim()).filter(Boolean)
		);
		setOpenById((prev) => {
			const next = {};
			let changed = false;
			Object.keys(prev).forEach((id) => {
				if (ids.has(id) && prev[id]) next[id] = true;
				else changed = true;
			});
			return changed ? next : prev;
		});
	}, [blockSelectors]);

	return (
		<div className="motto-inner-selectors">
			<div className="motto-section-heading motto-inner-selectors-heading">
				<div className="motto-section-title">
					<Group
						size={14}
						className="motto-breakpoint-styles-title-icon"
						aria-hidden="true"
					/>
					{title ? <h2 className="motto-section-title-text">{title}</h2> : <span />}
					{helpText ? (
						<Tooltip text={helpText}>
							<Button
								variant="tertiary"
								className="motto-ui-button is-icon-only motto-tooltip-button"
								aria-label={helpText}
								title={helpText}
							>
								<CircleHelp size={14} aria-hidden="true" />
							</Button>
						</Tooltip>
					) : null}
				</div>
				<div className="motto-section-actions">
					<Dropdown
						popoverProps={{
							placement: "bottom-end",
							className: withMottoPopupClass("motto-actions-popup"),
						}}
						renderToggle={({ isOpen, onToggle }) => (
							<Button
								variant="tertiary"
								onClick={onToggle}
								aria-expanded={isOpen}
								aria-label={__("Actions", "motto-blocks")}
								className="motto-ui-button is-icon-only motto-no-focus-ring"
							>
								<EllipsisVertical size={14} aria-hidden="true" />
							</Button>
						)}
						renderContent={({ onClose }) => (
							<>
								<MenuGroup>
									{applyFilters(
										STYLER_HOOKS.sectionActions,
										[
											{
												// Pro stub (upgraded via filter in Pro plugin)
												id: STYLER_ACTION_IDS.selectorListCopy,
												title: __("Copy selectors (Pro)", "motto-blocks"),
												icon: ClipboardCopy,
												isDisabled: true,
												proBadge: true,
												onClick: handleCopySelectors,
											},
											{
												// Pro stub (upgraded via filter in Pro plugin)
												id: STYLER_ACTION_IDS.selectorListPaste,
												title: __("Paste selectors (Pro)", "motto-blocks"),
												icon: ClipboardPaste,
												isDisabled: true,
												proBadge: true,
												onClick: handlePasteSelectors,
											},
										],
										{
											sectionId: STYLER_SECTION_IDS.selectorList,
											mode,
											canCopy: canCopySelectors,
											actions: {
												copy: handleCopySelectors,
												paste: handlePasteSelectors,
											},
										}
									)
										.filter((action) => action && action.isHidden !== true)
										.map((action) => (
											<MenuItem
												key={action.id}
												icon={
													action.icon ? (
														<action.icon size={16} />
													) : undefined
												}
												onClick={() => {
													if (action.isDisabled) return;
													action.onClick?.();
													onClose();
												}}
												disabled={Boolean(action.isDisabled)}
											>
												{action.title}
											</MenuItem>
										))}
								</MenuGroup>
								{showResetToDefaults && typeof onResetToDefaults === "function" ? (
									<MenuGroup>
										<MenuItem
											icon={<RotateCcw size={16} />}
											isDestructive
											onClick={() => {
												onResetToDefaults();
												onClose();
											}}
										>
											{__("Reset to defaults", "motto-blocks")}
										</MenuItem>
									</MenuGroup>
								) : null}
								{blockSelectors.length > 0 ? (
									<MenuGroup>
										<MenuItem
											icon={<Trash size={16} />}
											isDestructive
											onClick={() => {
												clearBlockSelectors();
												onClose();
											}}
										>
											{__("Delete all selectors", "motto-blocks")}
										</MenuItem>
									</MenuGroup>
								) : null}
							</>
						)}
					/>
				</div>
			</div>

			{blockSelectors.length > 0 ? (
				<div className="motto-inner-selectors-list">
					{blockSelectors.map((sub, index) => (
						<InnerSelectorItem
							key={sub.id}
							sub={sub}
							isReordered={String(sub.id || "") === reorderedSelectorId}
							isOpen={Boolean(openById[sub.id])}
							dragItemProps={getDragItemProps(sub, index)}
							actions={{
								onToggleOpen: (id) => setOpenById((prev) => ({ [id]: !prev[id] })),
								onUpdateCss: updateInnerSelectorCss,
								onDuplicate: duplicateInnerSelector,
								onRemove: removeInnerSelector,
								onEdit: openEditInnerSelector,
								onCopy: handleCopySelector,
							}}
							attributes={attributes}
							setAttributes={setAttributes}
							mode={mode}
							popupScope={popupScope}
							cssByBreakpoint={cssByBreakpointById[sub.id]}
						/>
					))}
				</div>
			) : null}

			<div className="motto-css-actions">
				<div className="motto-css-actions-row">
					<Button
						variant="primary"
						onClick={addInnerSelector}
						className="motto-ui-button"
					>
						<Plus size={14} />
						{__("Selector", "motto-blocks")}
					</Button>
					{selectorPresetGroups.length > 0 ? (
						<Button
							variant="secondary"
							onClick={() => setShowPresetPicker(true)}
							className="motto-ui-button is-icon-only motto-add-preset-button"
							aria-label={__("Selector Presets", "motto-blocks")}
						>
							<SwatchBook size={14} />
						</Button>
					) : null}
				</div>
			</div>

			{selectorPresetGroups.length > 0 && showPresetPicker ? (
				<SelectorPresetPickerModal
					selectorPresetGroups={selectorPresetGroups}
					onApplyPreset={addPresetInnerSelector}
					onRequestClose={() => setShowPresetPicker(false)}
				/>
			) : null}

			{editState ? (
				<EditSelectorModal
					editState={editState}
					editError={editError}
					contentRef={editModalContentRef}
					selectorInputWrapRef={selectorInputWrapRef}
					onLabelChange={(label) =>
						setEditState((prev) => ({ ...prev, label: String(label || "") }))
					}
					onSelectorChange={(selector) => {
						setEditError("");
						setEditState((prev) => ({
							...prev,
							selector: String(selector ?? ""),
						}));
					}}
					onDescriptionChange={(description) => {
						setEditError("");
						setEditState((prev) => ({ ...prev, description }));
					}}
					onInsertToken={insertToken}
					onCancel={cancelEditInnerSelector}
					onConfirm={confirmEditInnerSelector}
				/>
			) : null}
		</div>
	);
};
