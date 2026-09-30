import clsx from "clsx";
import { __ } from "@wordpress/i18n";
import { useMemo } from "@wordpress/element";
import { Button, Dropdown, MenuGroup, MenuItem } from "@wordpress/components";
import { applyFilters } from "@wordpress/hooks";
import {
	Copy,
	ChevronDown,
	ChevronUp,
	CopyPlus,
	EllipsisVertical,
	GripVertical,
	Settings,
	Trash,
} from "lucide-react";
import { withMottoPopupClass } from "@components/ui/popup-class-name";
import { StylerCssList } from "./StylerCssList";
import { getDisplayLabel } from "../utils/block-selectors-list-helpers";
import { STYLER_ACTION_IDS, STYLER_HOOKS, STYLER_SECTION_IDS } from "../freepro/freepro-ids";

export const InnerSelectorItem = ({
	sub,
	isReordered,
	isOpen,
	dragItemProps,
	actions,
	attributes,
	setAttributes,
	mode,
	popupScope = "",
	cssByBreakpoint = null,
}) => {
	const { onToggleOpen, onUpdateCss, onDuplicate, onRemove, onEdit, onCopy } = actions;
	const { isDragging, isDropTarget, rowProps, handleProps } = dragItemProps || {};
	const isDraggable = Boolean(handleProps?.draggable);
	const label = getDisplayLabel(sub);
	const description = String(sub?.description || "").trim();
	const ToggleIcon = isOpen ? ChevronUp : ChevronDown;
	const nestedPopupScope = useMemo(() => {
		const scope = String(popupScope || "").trim();
		const selectorId = String(sub?.id || "").trim();
		return scope ? `${scope}:selector:${selectorId}` : `selector:${selectorId}`;
	}, [popupScope, sub?.id]);

	return (
		<div data-motto-inner-selector-id={sub.id}>
			<div
				className={clsx("motto-inner-selector-item", {
					"is-reordered": isReordered,
					"is-dragging": isDragging,
					"is-drop-target": isDropTarget,
				})}
				{...rowProps}
				{...handleProps}
			>
				<div className="motto-inner-selector-row">
					{isDraggable ? (
						<span className="motto-inner-selector-drag" aria-hidden="true">
							<GripVertical size={14} />
						</span>
					) : null}
					<div className="motto-inner-selector-summary">
						<div className="motto-section-heading motto-inner-selector-header">
							<Button
								className="motto-inner-selector-panel-toggle motto-no-focus-ring"
								aria-label={
									isOpen
										? __("Collapse selector panel", "motto-blocks")
										: __("Expand selector panel", "motto-blocks")
								}
								aria-expanded={isOpen}
								onClick={() => onToggleOpen(sub.id)}
							>
								<span className="motto-inner-selector-label">{label}</span>
								<ToggleIcon size={16} />
							</Button>
							<div className="motto-section-actions motto-inner-selector-actions">
								<Dropdown
									popoverProps={{
										placement: "bottom-end",
										className: withMottoPopupClass("motto-actions-popup"),
									}}
									renderToggle={({ isOpen: isMenuOpen, onToggle }) => (
										<Button
											variant="tertiary"
											onClick={onToggle}
											aria-expanded={isMenuOpen}
											aria-label={__("Selector actions", "motto-blocks")}
											className="motto-ui-button is-icon-only motto-no-focus-ring"
										>
											<EllipsisVertical size={14} aria-hidden="true" />
										</Button>
									)}
									renderContent={({ onClose }) => (
										<>
											<MenuGroup>
												<MenuItem
													icon={<Settings size={16} />}
													onClick={() => {
														onEdit(sub);
														onClose();
													}}
												>
													{__("Edit selector", "motto-blocks")}
												</MenuItem>
												{applyFilters(
													STYLER_HOOKS.sectionActions,
													[
														{
															// Pro stub (upgraded via filter in Pro plugin)
															id: STYLER_ACTION_IDS.selectorItemCopy,
															title: __(
																"Copy selector (Pro)",
																"motto-blocks"
															),
															icon: Copy,
															isDisabled: true,
															proBadge: true,
															onClick: () => onCopy?.(sub.id),
														},
													],
													{
														sectionId: STYLER_SECTION_IDS.selectorItem,
														mode,
														selectorId: sub.id,
														actions: {
															copy: () => onCopy?.(sub.id),
														},
													}
												)
													.filter(
														(action) =>
															action && action.isHidden !== true
													)
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
												<MenuItem
													icon={<CopyPlus size={16} />}
													onClick={() => {
														onDuplicate(sub.id);
														onClose();
													}}
												>
													{__("Duplicate Selector", "motto-blocks")}
												</MenuItem>
											</MenuGroup>
											<MenuGroup>
												<MenuItem
													icon={<Trash size={16} />}
													isDestructive
													onClick={() => {
														onClose();
														if (
															window.confirm(
																__(
																	"Delete this block selector?",
																	"motto-blocks"
																)
															)
														) {
															onRemove(sub.id);
														}
													}}
												>
													{__("Delete", "motto-blocks")}
												</MenuItem>
											</MenuGroup>
										</>
									)}
								/>
							</div>
						</div>
						{description ? (
							<div className="motto-inner-selector-description">{description}</div>
						) : null}
					</div>
				</div>
				{isOpen ? (
					<div className="motto-inner-selector-css">
						<StylerCssList
							attributes={attributes}
							setAttributes={setAttributes}
							mode={mode}
							rows={Array.isArray(sub?.css) ? sub.css : []}
							onRowsChange={(nextCssRows) =>
								onUpdateCss(sub.id, Array.isArray(nextCssRows) ? nextCssRows : [])
							}
							popupScope={nestedPopupScope}
							cssByBreakpoint={cssByBreakpoint}
						/>
					</div>
				) : null}
			</div>
		</div>
	);
};
