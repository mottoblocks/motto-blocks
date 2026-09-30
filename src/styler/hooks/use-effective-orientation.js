import { useMemo } from "@wordpress/element";
import { useSelect } from "@wordpress/data";
import { BREAKPOINT_KEYS } from "@config/styler-breakpoints.js";
import { resolveRawStylerAttributes } from "../runtime/styler-attributes";
import { resolveEffectiveOrientation } from "../utils/display-cascade";
import { resolveClassMetaStyler } from "../classes/class-meta";
import { canonicalizeCssClassRef } from "../classes/css-class-editor-session";
import { useCssClassRegistry } from "../classes/use-css-class-registry";
import { hasAnyMottoContent, pickMottoContent } from "../utils/motto-content";

// Mirrors preview-store.jsx's STORE_KEY — blocks/hooks outside src/styler/runtime
// can't import that module directly (see scripts/validate-import-boundaries.mjs),
// so the registered store key is duplicated here like elsewhere in the codebase
// (e.g. StylerPanel.jsx, DeviceToggleControl.jsx).
const PREVIEW_STORE_KEY = "motto-styler/preview";

// Resolves which axis (horizontal/vertical) a block's InnerBlocks are laid out on,
// following the same instance-CSS -> attached-classes -> baseLayout cascade Styler
// uses elsewhere, at whichever breakpoint is currently active in the editor's device
// preview toggle. Pass the result as `orientation` to useInnerBlocksProps so the
// native block-mover toolbar arrows point the right way.
export const useEffectiveMottoOrientation = (attributes, baseLayout) => {
	const mottoStyler = resolveRawStylerAttributes(attributes);
	const breakpoint = useSelect(
		(select) => select(PREVIEW_STORE_KEY)?.getMode?.() || "desktop",
		[]
	);
	const { classRecordsById, resolveLinkedClassRef } = useCssClassRegistry();

	const classMottoStylers = useMemo(() => {
		const refs = Array.isArray(mottoStyler?.cssClasses) ? mottoStyler.cssClasses : [];
		return refs.reduce((acc, item) => {
			const ref = canonicalizeCssClassRef(item, resolveLinkedClassRef).value;
			if (!ref?.id) return acc;
			const record = classRecordsById.get(Number(ref.id));
			const classMottoStyler = pickMottoContent(resolveClassMetaStyler(record?.meta) || {});
			if (hasAnyMottoContent(classMottoStyler)) acc.push(classMottoStyler);
			return acc;
		}, []);
	}, [mottoStyler?.cssClasses, classRecordsById, resolveLinkedClassRef]);

	return resolveEffectiveOrientation({
		instanceCssByBreakpoint: mottoStyler?.css,
		classMottoStylers,
		baseLayout,
		orderedBreakpoints: BREAKPOINT_KEYS,
		breakpoint,
	});
};
