import { buildEditorCssForSelector } from "./style-engine";
import { setEditorBlockStyles } from "./editor-style-registry";
import { buildMottoStylerCssSignature } from "./motto-styler-signature";
import { normalizeMottoStyler } from "../utils/normalize-motto-styler";
import { resolveClassMetaStyler } from "../classes/class-meta";
import { scheduleEditorFrameTask } from "./editor-frame-scheduler";

export const initPostClassStyleCollector = () => {
	if (!window.wp?.data) return;

	const { select, subscribe } = window.wp.data;
	let lastSignature = "";

	const run = () => {
		const postType = select("core/editor")?.getCurrentPostType?.();
		if (postType !== "motto_css_class") {
			lastSignature = "";
			setEditorBlockStyles("post:motto_css_class", "");
			return;
		}

		const slug = select("core/editor")?.getEditedPostAttribute?.("slug") || "";
		const meta = select("core/editor")?.getEditedPostAttribute?.("meta") || {};
		const raw = resolveClassMetaStyler(meta) || {};
		const mottoStyler = normalizeMottoStyler(raw, {
			includeHtml: false,
		});
		if (!slug) {
			lastSignature = "";
			setEditorBlockStyles("post:motto_css_class", "");
			return;
		}
		const signature = `${slug}:${buildMottoStylerCssSignature(mottoStyler)}`;
		if (signature === lastSignature) return;
		lastSignature = signature;

		const css = buildEditorCssForSelector(`.${slug}`, mottoStyler) || "";
		setEditorBlockStyles("post:motto_css_class", css);
	};

	const schedule = () => {
		scheduleEditorFrameTask("post-class-style-runtime", run);
	};

	subscribe(schedule);
	run();
};
