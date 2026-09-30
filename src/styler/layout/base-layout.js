// Re-exported from src/lib so it's reachable from src/pro and src/shared without
// a deep import into Styler internals (see scripts/validate-import-boundaries.mjs's
// pro-to-styler rule). Keep the implementation in src/lib/base-layout.js.
export {
	normalizeMottoBaseLayout,
	getMottoBaseLayoutDisplay,
	getMottoBaseLayoutClassName,
} from "@lib/base-layout.js";
