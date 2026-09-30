export function generateAccordionItemId() {
	return `motto-accordion-item-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeAccordionItemId(value) {
	return typeof value === "string" ? value.trim() : "";
}

export function getAccordionTriggerId(itemId) {
	const normalizedId = normalizeAccordionItemId(itemId);
	return normalizedId ? `${normalizedId}-trigger` : "";
}

export function getAccordionPanelId(itemId) {
	const normalizedId = normalizeAccordionItemId(itemId);
	return normalizedId ? `${normalizedId}-panel` : "";
}

// Shared by motto/accordion-item (its own .is-open class), motto/accordion-trigger
// (aria-expanded), and motto/accordion-panel (aria-hidden) so the three blocks can't drift
// on what "this item is open in the editor" means, even though each reads it independently
// (isOpen/closeOtherItems arrive via block context; editorActiveItemId/editorOpenItemIds via
// the ephemeral AccordionEditorContext — neither is a single prop any one block fully owns).
export function computeIsEditorOpen({
	itemId,
	isOpen,
	closeOtherItems,
	editorActiveItemId,
	editorOpenItemIds,
}) {
	if (closeOtherItems) {
		return editorActiveItemId ? editorActiveItemId === itemId : Boolean(isOpen);
	}
	return Boolean(isOpen) || editorOpenItemIds.includes(itemId);
}
