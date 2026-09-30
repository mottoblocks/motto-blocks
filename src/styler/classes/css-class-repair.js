import { repairCssClassRefs } from "./css-class-editor-session";

export const getCanonicalCssClassesRepair = (cssClasses = [], resolveLinkedClassRef) =>
	repairCssClassRefs(cssClasses, resolveLinkedClassRef);
