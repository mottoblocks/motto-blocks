import { Button, Dropdown, MenuGroup, MenuItem } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "@wordpress/element";
import { useDispatch } from "@wordpress/data";
import { applyFilters } from "@wordpress/hooks";
import { withMottoPopupClass } from "@components/ui/popup-class-name";
import {
	ArrowUpAZ,
	ClipboardPaste,
	ClipboardCopy,
	Repeat,
	EllipsisVertical,
	Paintbrush,
	Plus,
	RotateCcw,
	SwatchBook,
	Trash,
} from "lucide-react";
import { moveItemToId, useDragReorder } from "@components";
import { STYLER_ACTION_IDS, STYLER_HOOKS, STYLER_SECTION_IDS } from "../freepro/freepro-ids";
import { PRESETS } from "../data/motto-css-presets";
import { useStylerEditorSettings } from "../hooks/use-styler-editor-settings";
import { useCssListClipboard } from "../hooks/use-css-list-clipboard";
import { useCssListPresetPicker } from "../hooks/use-css-list-preset-picker";
import { collectCssRowMetadata, resolveCascadedCssValuesByProp } from "../utils/css-row-metadata";
import { resolveEffectiveDisplay } from "../utils/display-cascade";
import { createUniqueId, repairCssRowIds } from "../utils/css-row-ids";
import { BREAKPOINT_KEYS as BREAKPOINTS } from "../config/styler-breakpoints.js";
import { normalizeBlockSelectorsByBreakpoint } from "../utils/block-selectors-shape";
import { hasNonEmptyCssRows } from "../utils/motto-content";
import {
	isEmptyCssRow,
	normalizeByBreakpoint,
	toSafeBreakpoint,
} from "../utils/css-row-list-helpers";
import { StylerRuleRow } from "./StylerRuleRow";
import { StylerPresetPickerModal } from "./StylerPresetPickerModal";

const StylerCssListComponent = ({
	rows,
	onRowsChange,
	cssByBreakpoint: controlledCssByBreakpoint = null,
	onCssByBreakpointChange = null,
	blockSelectorsByBreakpoint: controlledBlockSelectorsByBreakpoint = null,
	onBlockSelectorsByBreakpointChange = null,
	mode = "desktop",
	title: _title = null,
	extraControls = null,
	actionsExtra = null,
	children = null,
	showResetToDefaults = false,
	onResetToDefaults = null,
	popupScope = "",
	blockSpacingEnabled = false,
	classMottoStylers = null,
	baseLayout = "",
}) => {
	const breakpointKey = toSafeBreakpoint(mode);
	const controlledRowsByBreakpoint = useMemo(
		() => normalizeByBreakpoint(controlledCssByBreakpoint),
		[controlledCssByBreakpoint]
	);
	const controlledSelectorsByBreakpoint = useMemo(
		() => normalizeBlockSelectorsByBreakpoint(controlledBlockSelectorsByBreakpoint),
		[controlledBlockSelectorsByBreakpoint]
	);
	const canApplyPresetAcrossBreakpoints =
		controlledCssByBreakpoint !== null &&
		typeof controlledCssByBreakpoint === "object" &&
		typeof onCssByBreakpointChange === "function";
	const canApplyPresetSelectorsAcrossBreakpoints =
		controlledBlockSelectorsByBreakpoint !== null &&
		typeof controlledBlockSelectorsByBreakpoint === "object" &&
		typeof onBlockSelectorsByBreakpointChange === "function";
	const resolvedRows = useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);
	const editorSettings = useStylerEditorSettings();
	const { createSuccessNotice, createWarningNotice } = useDispatch("core/notices");
	const rowsRef = useRef(resolvedRows);
	const prevResolvedRowsRef = useRef(resolvedRows);
	if (prevResolvedRowsRef.current !== resolvedRows) {
		// Sync synchronously during render (not in a useEffect) so external attribute
		// updates (e.g. pasting styles from the block toolbar) are reflected in the
		// `list` memo below immediately, instead of one render late.
		rowsRef.current = resolvedRows;
		prevResolvedRowsRef.current = resolvedRows;
	}
	const [rowsVersion, setRowsVersion] = useState(0);
	const manualFocusDraftIdRef = useRef("");
	const [draftRow, setDraftRow] = useState(() => {
		const initialRows = Array.isArray(rows) ? rows : [];
		if (initialRows.length > 0) return null;
		const usedIds = new Set(initialRows.map((r) => String(r?.id || "")).filter(Boolean));
		return { id: createUniqueId(usedIds, "css"), name: "", value: "" };
	});
	const [shouldFocusDraftNameInput, setShouldFocusDraftNameInput] = useState(false);
	const [isReorderMode, setIsReorderMode] = useState(false);

	useEffect(() => {
		if (resolvedRows.length < 2 && isReorderMode) {
			setIsReorderMode(false);
		}
	}, [isReorderMode, resolvedRows.length]);

	const persistRows = useCallback(
		(nextRows) => {
			const rowsToPersist = Array.isArray(nextRows) ? nextRows : [];
			rowsRef.current = rowsToPersist;
			// resolvedRows reflects the new rows only once it round-trips through the
			// parent (e.g. class editor draft state), which isn't reliable when persistRows
			// runs from an async continuation (paste, after a confirm() dialog). Bump a local
			// version so the `list` memo below always picks up the ref mutation immediately.
			setRowsVersion((version) => version + 1);
			onRowsChange?.(rowsToPersist);
		},
		[onRowsChange]
	);

	const { handleCopy, handlePaste, handleSort } = useCssListClipboard({
		rowsRef,
		persistRows,
		setDraftRow,
		createSuccessNotice,
		createWarningNotice,
	});

	useEffect(() => {
		const repaired = repairCssRowIds(resolvedRows);
		if (repaired.changed) {
			persistRows(repaired.rows);
		}
	}, [persistRows, resolvedRows]);

	const list = useMemo(() => {
		const baseRows = Array.isArray(rowsRef.current) ? rowsRef.current : resolvedRows;
		if (!draftRow) return baseRows;
		const draftId = String(draftRow?.id || "");
		const withoutDraft = draftId
			? baseRows.filter((row) => String(row?.id || "") !== draftId)
			: baseRows;
		return [...withoutDraft, draftRow];
		// eslint-disable-next-line react-hooks/exhaustive-deps -- rowsVersion forces recompute after persistRows mutates rowsRef
	}, [draftRow, resolvedRows, rowsVersion]);
	const inlineVariablesStyle = useMemo(() => {
		const out = {};
		list.forEach((row) => {
			const name = String(row?.name || "").trim();
			if (!name.startsWith("--")) return;
			const value = String(row?.value || "").trim();
			if (!value) return;
			out[name] = value;
		});
		return out;
	}, [list]);
	const { cssNameCounts, cssValuesByProp: ownCssValuesByProp } = useMemo(
		() => collectCssRowMetadata(list),
		[list]
	);
	// Dependency warnings (e.g. "Requires display: flex") must see props declared on
	// wider breakpoints too, since desktop-first CSS carries them down the cascade
	// (see resolveCascadedCssValuesByProp). Fall back to the current breakpoint only
	// when no controlled cross-breakpoint map is available.
	const cssValuesByProp = useMemo(() => {
		const base = controlledCssByBreakpoint
			? resolveCascadedCssValuesByProp(
					{ ...controlledRowsByBreakpoint, [breakpointKey]: list },
					BREAKPOINTS,
					breakpointKey
				)
			: ownCssValuesByProp;
		// `display` can also come from attached reusable classes or the block's base
		// layout default, not just this instance's own rows — reuse the same SSOT
		// resolution the CSS engine uses (resolveEffectiveDisplay in display-cascade.js)
		// instead of re-deriving that priority order here.
		if (base.has("display") || (!Array.isArray(classMottoStylers) && !baseLayout)) return base;
		const resolvedDisplay = resolveEffectiveDisplay({
			instanceCssByBreakpoint: { ...controlledRowsByBreakpoint, [breakpointKey]: list },
			classMottoStylers,
			baseLayout,
			orderedBreakpoints: BREAKPOINTS,
			breakpoint: breakpointKey,
		});
		if (!resolvedDisplay) return base;
		const next = new Map(base);
		next.set("display", [resolvedDisplay]);
		return next;
	}, [
		baseLayout,
		breakpointKey,
		classMottoStylers,
		controlledCssByBreakpoint,
		controlledRowsByBreakpoint,
		list,
		ownCssValuesByProp,
	]);
	const hasExistingContent = useMemo(() => {
		if (canApplyPresetAcrossBreakpoints) {
			return BREAKPOINTS.some((bp) => hasNonEmptyCssRows(controlledRowsByBreakpoint[bp]));
		}
		return hasNonEmptyCssRows(list);
	}, [canApplyPresetAcrossBreakpoints, controlledRowsByBreakpoint, list]);

	const {
		showPresetPicker,
		setShowPresetPicker,
		activePresetTab,
		setActivePresetTab,
		presetGroups,
		presetIconMap,
		applyPresetBySlug,
	} = useCssListPresetPicker({
		popupScope,
		breakpointKey,
		rowsRef,
		persistRows,
		hasExistingContent,
		canApplyPresetAcrossBreakpoints,
		controlledRowsByBreakpoint,
		onCssByBreakpointChange,
		canApplyPresetSelectorsAcrossBreakpoints,
		controlledSelectorsByBreakpoint,
		onBlockSelectorsByBreakpointChange,
	});

	const handleAddRule = useCallback(
		({ shouldFocus = false } = {}) => {
			if (draftRow?.id) {
				// If a draft row already exists, focus its name input instead
				setShouldFocusDraftNameInput(true);
				return;
			}
			const source = (rowsRef.current || []).filter((row) => !isEmptyCssRow(row));
			const usedIds = new Set(source.map((row) => String(row?.id || "")).filter(Boolean));
			const id = createUniqueId(usedIds, "css");
			manualFocusDraftIdRef.current = shouldFocus ? id : "";
			setDraftRow({ id, name: "", value: "" });
		},
		[draftRow?.id]
	);

	useEffect(() => {
		if (draftRow?.id) return;
		if (resolvedRows.length > 0) return;
		if (rowsRef.current.length > 0) return;
		handleAddRule({ shouldFocus: false });
	}, [draftRow?.id, handleAddRule, resolvedRows.length]);

	const commitDraftIfNeeded = useCallback(
		(nextDraft) => {
			if (isEmptyCssRow(nextDraft)) {
				setDraftRow(nextDraft);
				return false;
			}
			const draftId = String(nextDraft?.id || "");
			const sourceRows = Array.isArray(rowsRef.current) ? rowsRef.current : [];
			const nextRows = draftId
				? [...sourceRows.filter((row) => String(row?.id || "") !== draftId), nextDraft]
				: [...sourceRows, nextDraft];
			persistRows(nextRows);
			manualFocusDraftIdRef.current = "";
			setDraftRow(null);
			return true;
		},
		[persistRows]
	);

	// Focus the draft row's name input when clicking Add Rule with an existing draft
	useEffect(() => {
		if (!shouldFocusDraftNameInput || !draftRow?.id) return;
		const nameInput = document.querySelector(
			".motto-css-list .motto-css-rule:last-child input"
		);
		nameInput?.focus();
		setShouldFocusDraftNameInput(false);
	}, [shouldFocusDraftNameInput, draftRow?.id]);

	const handleRemoveAll = () => {
		if (resolvedRows.length === 0 && !draftRow) return;
		const ok = window.confirm(
			__("This will delete all CSS rules in this list. Continue?", "motto-blocks")
		);
		if (!ok) return;
		manualFocusDraftIdRef.current = "";
		setDraftRow(null);
		persistRows([]);
	};

	const handleUpdateName = (rowId, nextName) => {
		if (draftRow && String(draftRow.id) === String(rowId || "")) {
			// Update draft state locally without committing to the store on each
			// keystroke. Calling persistRows here triggers editPost in the CSS class
			// post editor, which updates the store asynchronously — setDraftRow(null)
			// would then remove the row before the committed version appears in
			// resolvedRows, causing an unmount that closes any open popover.
			setDraftRow((prev) => (prev ? { ...prev, name: nextName } : prev));
			return;
		}
		persistRows(
			rowsRef.current.map((row) =>
				String(row?.id || "") === String(rowId || "")
					? { ...row, name: String(nextName || "") }
					: row
			)
		);
	};

	const handleDraftNameBlur = useCallback(
		(rowId) => {
			if (!draftRow || String(draftRow.id) !== String(rowId || "")) return;
			commitDraftIfNeeded(draftRow);
		},
		[commitDraftIfNeeded, draftRow]
	);

	const handleUpdateValue = (rowId, nextValue) => {
		if (draftRow && String(draftRow.id) === String(rowId || "")) {
			commitDraftIfNeeded({ ...draftRow, value: nextValue });
			return;
		}
		persistRows(
			rowsRef.current.map((row) =>
				String(row?.id || "") === String(rowId || "")
					? { ...row, value: String(nextValue || "") }
					: row
			)
		);
	};

	const handleRemoveRow = (rowId) => {
		if (draftRow && String(draftRow.id) === String(rowId || "")) {
			manualFocusDraftIdRef.current = "";
			setDraftRow(null);
			return;
		}
		persistRows(
			(rowsRef.current || []).filter((row) => String(row?.id || "") !== String(rowId || ""))
		);
	};

	const handleReorderRow = useCallback(
		(fromId, toId) => {
			const source = rowsRef.current || [];
			const next = moveItemToId(source, fromId, toId);
			if (next === source) return;
			persistRows(next);
		},
		[persistRows]
	);

	const { getDragItemProps } = useDragReorder({
		getKey: (row) => row?.id,
		onReorder: handleReorderRow,
		disabled: !isReorderMode,
	});

	return (
		<div
			className={`motto-css-rules${isReorderMode ? " is-reorder-mode" : ""}`}
			style={inlineVariablesStyle}
		>
			<div className="motto-section-heading">
				<div className="motto-section-title">
					<h2 className="motto-section-title-text motto-breakpoint-styles-title">
						<Paintbrush
							size={14}
							className="motto-breakpoint-styles-title-icon"
							aria-hidden="true"
						/>
						{__("Styles", "motto-blocks")}
					</h2>
				</div>
				<div className="motto-section-actions">
					{extraControls?.length
						? extraControls.map((ctrl, i) => {
								const Icon = ctrl.icon;
								return (
									<Button
										key={i}
										variant="tertiary"
										onClick={ctrl.onClick}
										disabled={Boolean(ctrl.isDisabled)}
										aria-label={ctrl.title}
										title={ctrl.title}
										className="motto-ui-button is-icon-only"
									>
										{Icon ? <Icon size={14} aria-hidden="true" /> : null}
									</Button>
								);
							})
						: null}
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
								title={__("Actions", "motto-blocks")}
								className="motto-actions-toggle motto-ui-button is-icon-only motto-no-focus-ring"
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
												id: STYLER_ACTION_IDS.cssListCopy,
												title: __("Copy rules (Pro)", "motto-blocks"),
												icon: ClipboardCopy,
												isDisabled: true,
												proBadge: true,
												onClick: handleCopy,
											},
											{
												// Pro stub (upgraded via filter in Pro plugin)
												id: STYLER_ACTION_IDS.cssListPaste,
												title: __("Paste rules (Pro)", "motto-blocks"),
												icon: ClipboardPaste,
												isDisabled: true,
												proBadge: true,
												onClick: handlePaste,
											},
											{
												// Pro stub (upgraded via filter in Pro plugin)
												id: STYLER_ACTION_IDS.cssListSortAz,
												title: __(
													"Sort alphabetically (Pro)",
													"motto-blocks"
												),
												icon: ArrowUpAZ,
												isDisabled: true,
												onClick: handleSort,
												proBadge: true,
											},
											{
												id: STYLER_ACTION_IDS.cssListReorderMode,
												title: __("Reorder rules", "motto-blocks"),
												icon: Repeat,
												isDisabled: resolvedRows.length < 2,
												isSelected: isReorderMode,
												onClick: () =>
													setIsReorderMode((current) => !current),
											},
										],
										{
											sectionId: STYLER_SECTION_IDS.cssList,
											mode: breakpointKey,
											rows: resolvedRows,
											onRowsChange: persistRows,
											isReorderMode,
											actions: {
												sortAz: handleSort,
												copy: handleCopy,
												paste: handlePaste,
												toggleReorderMode: () =>
													setIsReorderMode((current) => !current),
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
												role={
													action.isSelected !== undefined
														? "menuitemcheckbox"
														: undefined
												}
												aria-checked={
													action.isSelected !== undefined
														? Boolean(action.isSelected)
														: undefined
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
								{resolvedRows.length > 0 ? (
									<MenuGroup>
										<MenuItem
											icon={<Trash size={16} />}
											isDestructive
											onClick={() => {
												handleRemoveAll();
												onClose();
											}}
										>
											{__("Delete all rules", "motto-blocks")}
										</MenuItem>
									</MenuGroup>
								) : null}
							</>
						)}
					/>
				</div>
			</div>

			{children}

			<div className="motto-css-list">
				{list.map((row, index) => {
					const isDraftRow =
						draftRow?.id && String(draftRow.id) === String(row?.id || "");
					return (
						<StylerRuleRow
							key={row.id}
							row={row}
							cssNameCounts={cssNameCounts}
							cssValuesByProp={cssValuesByProp}
							editorSettings={editorSettings}
							onNameChange={(nextName) => handleUpdateName(row.id, nextName)}
							onNameBlur={() => handleDraftNameBlur(row.id)}
							onValueChange={(nextValue) => handleUpdateValue(row.id, nextValue)}
							onRemove={() => handleRemoveRow(row.id)}
							shouldAutoFocusName={
								isDraftRow &&
								String(manualFocusDraftIdRef.current || "") ===
									String(row?.id || "")
							}
							isReorderMode={isReorderMode}
							canReorder={!isDraftRow}
							dragItemProps={getDragItemProps(row, index)}
							popupScope={popupScope}
							blockSpacingEnabled={blockSpacingEnabled}
						/>
					);
				})}
			</div>

			<div className="motto-css-actions">
				<div className="motto-css-actions-row">
					<Button
						variant="primary"
						onClick={() => handleAddRule({ shouldFocus: true })}
						className="motto-add-css-rule motto-ui-button"
					>
						<Plus size={14} />
						{__("Rule", "motto-blocks")}
					</Button>
					{actionsExtra}
					{PRESETS.length > 0 ? (
						<Button
							variant="secondary"
							onClick={() => setShowPresetPicker(true)}
							className="motto-ui-button is-icon-only motto-add-preset-button"
							aria-label={__("Style Presets", "motto-blocks")}
						>
							<SwatchBook size={14} />
						</Button>
					) : null}
				</div>
			</div>

			{PRESETS.length > 0 && showPresetPicker ? (
				<StylerPresetPickerModal
					presetGroups={presetGroups}
					activePresetTab={activePresetTab}
					onActiveTabChange={setActivePresetTab}
					presetIconMap={presetIconMap}
					onApplyPreset={applyPresetBySlug}
					onRequestClose={() => {
						setShowPresetPicker(false);
						setActivePresetTab("");
					}}
				/>
			) : null}
		</div>
	);
};

StylerCssListComponent.displayName = "StylerCssList";

export const StylerCssList = memo(StylerCssListComponent);
