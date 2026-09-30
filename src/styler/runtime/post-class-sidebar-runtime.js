import { subscribe, dispatch, select } from "@wordpress/data";

/**
 * For Gutenberg ≤6.3: block settings lived in a separate complementary area
 * ("edit-post/block"). When that area becomes active in a motto_css_class post,
 * switch back to the document/post area so the Styler panel stays visible.
 *
 * Gutenberg 6.4+ uses unified sidebar tabs (internal component state), so the
 * CSS rule in editor-ui.scss handles that case instead.
 */
export const initPostClassSidebarRuntime = () => {
	if (!window.wp?.data) return;

	subscribe(() => {
		const postType = select("core/editor")?.getCurrentPostType?.();
		if (postType !== "motto_css_class") return;

		const activeArea = select("core/interface")?.getActiveComplementaryArea?.("core/edit-post");
		if (activeArea === "edit-post/block") {
			dispatch("core/interface")?.enableComplementaryArea?.(
				"core/edit-post",
				"edit-post/document"
			);
		}
	}, "core/interface");
};
