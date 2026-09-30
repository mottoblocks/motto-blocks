import { useEffect, useMemo, useState } from "@wordpress/element";
import { hasDynamicImageSource } from "./dynamic-image-utils";
import { createConcurrentRequestLimit } from "@lib/concurrent-request-limit.js";

// Shared across all hook instances so the editor coalesces the burst of
// dynamic-image preview fetches into small concurrent waves. Managed hosts
// with REST throttling (WP Engine) return 429 when a Query Loop fires all
// previews in parallel; staggering keeps each wave under their threshold.
const limitDynamicImagePreviewRequest = createConcurrentRequestLimit(4);

const EMPTY_PREVIEW = { url: null, id: 0 };

/**
 * Resolve a preview URL (and source attachment id) for a dynamic image
 * attribute in the block editor.
 *
 * @param {Object} dynamic  imageDynamic or backgroundDynamic attribute.
 * @param {Object} context  Block context ({ postId, termId }).
 * @returns {{url: string|null, id: number}} Preview URL/attachment id, or nulls when unresolved.
 */
export function useDynamicImagePreview(dynamic, context = {}) {
	const [preview, setPreview] = useState(EMPTY_PREVIEW);

	const requestPayload = useMemo(() => {
		if (!hasDynamicImageSource(dynamic)) {
			return null;
		}

		return {
			dynamic,
			post_id: Number(context?.postId) || 0,
			term_id: Number(context?.termId) || 0,
		};
	}, [context?.postId, context?.termId, dynamic]);

	const requestSignature = useMemo(
		() => JSON.stringify(requestPayload || null),
		[requestPayload]
	);

	useEffect(() => {
		if (!requestPayload) {
			setPreview(EMPTY_PREVIEW);
			return undefined;
		}

		const apiFetch = window?.wp?.apiFetch;
		if (typeof apiFetch !== "function") {
			setPreview(EMPTY_PREVIEW);
			return undefined;
		}

		let isCancelled = false;

		limitDynamicImagePreviewRequest(() => {
			if (isCancelled) return null;
			return apiFetch({
				path: "/motto-blocks-pro/v1/dynamic-image-preview",
				method: "POST",
				data: requestPayload,
			});
		})
			.then((response) => {
				if (isCancelled || response === null) {
					return;
				}

				const nextUrl = typeof response?.url === "string" ? response.url.trim() : "";
				const nextId = Number(response?.payload?.id) || 0;
				setPreview({ url: nextUrl || null, id: nextId });
			})
			.catch(() => {
				if (!isCancelled) {
					setPreview(EMPTY_PREVIEW);
				}
			});

		return () => {
			isCancelled = true;
		};
	}, [requestPayload, requestSignature]);

	return preview;
}
