import { useEffect, useMemo } from "@wordpress/element";

import { getCanonicalCssClassesRepair } from "./css-class-repair";

export const useCanonicalCssClasses = ({ cssClasses, resolveLinkedClassRef, onRepair }) => {
	const repair = useMemo(
		() => getCanonicalCssClassesRepair(cssClasses, resolveLinkedClassRef),
		[cssClasses, resolveLinkedClassRef]
	);

	useEffect(() => {
		if (!repair.changed || typeof onRepair !== "function") return;
		onRepair(repair.value);
	}, [onRepair, repair]);

	return repair.value;
};
