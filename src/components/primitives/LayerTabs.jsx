import clsx from "clsx";
import { Button } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { Copy, GripVertical, Plus, X } from "lucide-react";
import { useDragReorder } from "../hooks/use-drag-reorder.js";

const getSafeIndex = (index, max) => {
	const numeric = Number(index);
	if (!Number.isFinite(numeric)) return 0;
	return Math.max(0, Math.min(max, numeric));
};

export const LayerTabs = ({
	items = [],
	activeIndex = 0,
	onActiveChange = () => {},
	onAdd = () => {},
	onRemove = () => {},
	onDuplicate = () => {},
	onReorder = () => {},
	canRemove = () => true,
	getItemLabel = (_item, index) => `${index + 1}`,
	tabBehavior = null,
	ariaLabel = __("Items", "motto-blocks"),
	addAriaLabel = __("Add item", "motto-blocks"),
	duplicateAriaLabel = __("Duplicate item", "motto-blocks"),
	removeAriaLabel = __("Remove item", "motto-blocks"),
	className = "",
}) => {
	const list = Array.isArray(items) ? items : [];
	const maxIndex = Math.max(0, list.length - 1);
	const currentActive = getSafeIndex(activeIndex, maxIndex);
	const behavior = {
		draggable: tabBehavior?.draggable !== false,
		duplicable: tabBehavior?.duplicable !== false,
		removable: tabBehavior?.removable !== false,
		addable: tabBehavior?.addable !== false,
		allowNoTabs: Boolean(tabBehavior?.allowNoTabs),
		addLabel: String(tabBehavior?.addLabel || ""),
		addAriaLabel: String(tabBehavior?.addAriaLabel || addAriaLabel || ""),
	};

	const isDraggable = behavior.draggable && list.length > 1;

	const { getDragItemProps } = useDragReorder({
		getKey: (_item, index) => index,
		onReorder: (fromIndex, toIndex) => {
			const from = getSafeIndex(fromIndex, maxIndex);
			const to = getSafeIndex(toIndex, maxIndex);
			if (from !== to) onReorder(from, to);
		},
		disabled: !isDraggable,
	});

	return (
		<div
			className={`motto-layer-tabs ${className}`.trim()}
			role="tablist"
			aria-label={String(ariaLabel || "")}
		>
			{list.map((item, index) => {
				const isActive = currentActive === index;
				const isRemovable =
					Boolean(canRemove(item, index, list)) &&
					(behavior.allowNoTabs || list.length > 1);
				const { isDropTarget, rowProps, handleProps } = getDragItemProps(item, index);
				return (
					<div
						key={item?.id || `layer-tab-${index}`}
						className={clsx("motto-layer-tab", {
							"motto-is-active": isActive,
							"is-drop-target": isDropTarget,
						})}
						role="tab"
						aria-selected={isActive}
						{...rowProps}
						{...handleProps}
					>
						{isDraggable && (
							<span className="motto-layer-tab-drag" aria-hidden="true">
								<GripVertical size={12} />
							</span>
						)}
						<Button
							variant="tertiary"
							onClick={() => onActiveChange(index)}
							className="motto-ui-button motto-layer-tab-label motto-no-focus-ring"
						>
							<span className="motto-layer-tab-label-text">
								{getItemLabel(item, index)}
							</span>
						</Button>
						<div className="motto-layer-tab-actions">
							{behavior.duplicable && (
								<Button
									variant="tertiary"
									onClick={() => onDuplicate(index)}
									className="motto-ui-button is-icon-only motto-layer-tab-duplicate"
									aria-label={String(duplicateAriaLabel || "")}
									title={String(duplicateAriaLabel || "")}
								>
									<Copy size={10} />
								</Button>
							)}
							{behavior.removable && (
								<Button
									variant="tertiary"
									onClick={() => {
										if (!isRemovable) return;
										onRemove(index);
									}}
									className="motto-ui-button is-icon-only motto-layer-tab-remove"
									aria-label={String(removeAriaLabel || "")}
									title={String(removeAriaLabel || "")}
									disabled={!isRemovable}
								>
									<X size={10} />
								</Button>
							)}
						</div>
					</div>
				);
			})}
			{behavior.addable && (
				<Button
					variant="tertiary"
					onClick={() => {
						onAdd();
					}}
					className={`motto-layer-tab-add motto-ui-button${behavior.addLabel ? "" : " is-icon-only"}`}
					aria-label={behavior.addAriaLabel}
					title={behavior.addAriaLabel}
				>
					<Plus size={14} />
					{behavior.addLabel}
				</Button>
			)}
		</div>
	);
};
