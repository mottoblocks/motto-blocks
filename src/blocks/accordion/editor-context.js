import { createContext } from "@wordpress/element";

export const AccordionEditorContext = createContext({
	editorOpenItemIds: [],
	setEditorOpenItemIds: () => {},
	editorActiveItemId: "",
	setEditorActiveItemId: () => {},
});
