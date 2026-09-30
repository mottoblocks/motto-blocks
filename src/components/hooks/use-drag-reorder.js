import { useCallback, useState } from "@wordpress/element";

const EMPTY_DRAG_ITEM_PROPS = {
	isDragging: false,
	isDropTarget: false,
	rowProps: {},
	handleProps: {},
};

// Shared native HTML5 drag-and-drop reorder state for list-style controls
// (LayerTabs, AttachedClassTags, EntityTokenPicker, StylerRuleRow, InnerSelectorItem).
// `handleProps` carries the draggable/dragstart/dragend triggers — spread it onto
// whichever element should be the actual drag source (the row itself, or a
// dedicated grip handle). `rowProps` carries the dragover/drop receivers and
// always belongs on the row/item container.
export const useDragReorder = ({ getKey, onReorder, disabled = false }) => {
	const [draggingKey, setDraggingKey] = useState("");
	const [dropTargetKey, setDropTargetKey] = useState("");

	const clearDragState = useCallback(() => {
		setDraggingKey("");
		setDropTargetKey("");
	}, []);

	const isDraggingActive = draggingKey !== "";

	const getDragItemProps = useCallback(
		(item, index) => {
			const key = getKey(item, index);
			const hasKey = key !== undefined && key !== null && key !== "";
			if (disabled || !hasKey) return EMPTY_DRAG_ITEM_PROPS;

			const isDragging = draggingKey === key;
			const isDropTarget = !isDragging && isDraggingActive && dropTargetKey === key;

			return {
				isDragging,
				isDropTarget,
				rowProps: {
					onDragOver: (event) => {
						if (!isDraggingActive || draggingKey === key) return;
						event.preventDefault();
						if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
						setDropTargetKey(key);
					},
					onDrop: (event) => {
						if (!isDraggingActive || draggingKey === key) return;
						event.preventDefault();
						onReorder(draggingKey, key);
						clearDragState();
					},
				},
				handleProps: {
					draggable: true,
					onDragStart: (event) => {
						setDraggingKey(key);
						if (event.dataTransfer) {
							event.dataTransfer.effectAllowed = "move";
							event.dataTransfer.setData("text/plain", String(key));
						}
					},
					onDragEnd: clearDragState,
				},
			};
		},
		[clearDragState, disabled, draggingKey, dropTargetKey, getKey, isDraggingActive, onReorder]
	);

	return { getDragItemProps };
};
