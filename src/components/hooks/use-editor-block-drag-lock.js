import { useEffect, useRef } from "@wordpress/element";

export function useEditorBlockDragLock(anchorRef) {
	const stateRef = useRef({
		nodes: new Map(),
	});

	const restoreNode = (node, previousDraggable) => {
		if (previousDraggable === null) {
			node.removeAttribute("draggable");
		} else {
			node.setAttribute("draggable", previousDraggable);
		}
	};

	const restore = () => {
		const { nodes } = stateRef.current;
		for (const [node, previousDraggable] of nodes) {
			restoreNode(node, previousDraggable);
		}
		nodes.clear();
	};

	const sync = () => {
		const anchor = anchorRef?.current;
		if (!anchor) return;
		const root = anchor.closest("[data-block]");
		if (!root) return;

		const { nodes } = stateRef.current;
		// Lock the block wrapper itself plus every nested block (e.g. an
		// image dropped inside a slide) — native block drag-and-drop is
		// initiated per-node, so a lock on the root alone doesn't stop a
		// descendant from starting its own drag.
		const current = new Set([root, ...root.querySelectorAll("[data-block]")]);

		for (const node of nodes.keys()) {
			if (!current.has(node)) {
				restoreNode(node, nodes.get(node));
				nodes.delete(node);
			}
		}

		for (const node of current) {
			if (!nodes.has(node)) {
				nodes.set(node, node.getAttribute("draggable"));
			}
			node.setAttribute("draggable", "false");
		}
	};

	useEffect(() => {
		sync();
	});

	useEffect(
		() => () => {
			restore();
		},
		[]
	);
}
