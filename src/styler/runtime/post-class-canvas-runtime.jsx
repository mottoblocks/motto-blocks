import { dispatch, select, subscribe } from "@wordpress/data";
import { collectConditionalClasses } from "./class-conditional-runtime";
import { resolveClassMetaConditionalClasses, resolveClassMetaStyler } from "../classes/class-meta";
import {
	getInlineEditorCanvasDocument,
	getPreferredEditorCanvasDocument,
} from "./editor-canvas-resolver";

const getCanvasWrapper = () => {
	const canvasDoc =
		getPreferredEditorCanvasDocument() || getInlineEditorCanvasDocument() || document;
	return (
		canvasDoc.querySelector(".is-root-container") ||
		canvasDoc.querySelector(".editor-styles-wrapper")
	);
};

export const initPostClassCanvasRuntime = () => {
	if (!window.wp?.data) return;

	let scheduled = false;
	let rafId = 0;
	let lastSlug = "";
	let lastConditionals = [];
	let lastWrapper = null;
	let lastAppliedWrapper = null;
	let lastSignature = "";
	let lastPropsSignature = "";
	let lastPropsConditionals = [];
	let lastInvalidatedPostId = 0;

	const apply = () => {
		const postType = select("core/editor")?.getCurrentPostType?.() || "";
		const postId = select("core/editor")?.getCurrentPostId?.() || 0;
		const slug = select("core/editor")?.getEditedPostAttribute?.("slug") || "";
		const meta = select("core/editor")?.getEditedPostAttribute?.("meta") || {};
		const rawProps = resolveClassMetaStyler(meta);
		const propsSignature = rawProps ? JSON.stringify(rawProps) : "";
		const fromMeta = resolveClassMetaConditionalClasses(meta);
		const fromMap =
			typeof window !== "undefined" && window.__mottoCssClassIndex
				? window.__mottoCssClassIndex.bySlug?.[slug] || []
				: [];
		const fromProps = rawProps
			? propsSignature === lastPropsSignature
				? lastPropsConditionals
				: collectConditionalClasses(rawProps)
			: [];
		const conditionals = fromProps.length ? fromProps : fromMeta.length ? fromMeta : fromMap;

		let wrapper = lastWrapper;
		if (!wrapper || !wrapper.isConnected) {
			wrapper = getCanvasWrapper();
			lastWrapper = wrapper || null;
		}
		if (!wrapper) return;

		const signature = `${postType}|${slug}|${conditionals.join("|")}`;
		const wrapperChanged = lastAppliedWrapper !== wrapper;
		const missingAppliedClasses = Boolean(
			postType === "motto_css_class" &&
			slug &&
			(!wrapper.classList.contains(slug) ||
				conditionals.some((cls) => cls && !wrapper.classList.contains(cls)))
		);
		if (!wrapperChanged && signature === lastSignature && !missingAppliedClasses) return;
		lastSignature = signature;

		if (lastSlug && lastSlug !== slug) {
			wrapper.classList.remove(lastSlug);
		}
		if (Array.isArray(lastConditionals) && lastConditionals.length) {
			lastConditionals.forEach((cls) => {
				if (cls) wrapper.classList.remove(cls);
			});
		}

		if (!postType) {
			lastPropsSignature = propsSignature;
			return;
		}
		if (postType !== "motto_css_class" || !slug) {
			lastSlug = "";
			lastConditionals = [];
			lastPropsSignature = propsSignature;
			return;
		}

		if (postId && postId !== lastInvalidatedPostId) {
			const invalidateResolution = dispatch("core/data")?.invalidateResolution;
			if (invalidateResolution) {
				invalidateResolution("core", "getEntityRecord", [
					"postType",
					"motto_css_class",
					postId,
				]);
			}
			lastInvalidatedPostId = postId;
		}

		if (!wrapper.classList.contains(slug)) {
			wrapper.classList.add(slug);
		}
		conditionals.forEach((cls) => {
			if (cls) wrapper.classList.add(cls);
		});

		lastSlug = slug;
		lastConditionals = conditionals;
		lastPropsSignature = propsSignature;
		lastAppliedWrapper = wrapper;
		if (rawProps) lastPropsConditionals = fromProps;
	};

	const schedule = () => {
		if (scheduled) return;
		scheduled = true;
		if (rafId) cancelAnimationFrame(rafId);
		rafId = requestAnimationFrame(() => {
			rafId = 0;
			scheduled = false;
			apply();
		});
	};

	subscribe(schedule);
	apply();
};
