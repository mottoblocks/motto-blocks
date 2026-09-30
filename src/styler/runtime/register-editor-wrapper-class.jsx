import { addFilter } from "@wordpress/hooks";
import { useSelect } from "@wordpress/data";
import { useEffect, useState } from "@wordpress/element";
import { isStandaloneStylerActive } from "./runtime-flags";
import { isStylerCoreMvpBlock } from "./supported-blocks";
import { withRuntimeBlockSelectors } from "../utils/block-selectors-shape";
import { defaultMottoStyler } from "../data/default-motto-styler";
import { collectConditionalClasses } from "./class-conditional-runtime";
import { resolveRawStylerAttributes } from "./styler-attributes";
import { hasAnyMottoContent } from "../utils/motto-content";
import { resolveValidInstanceId } from "../utils/instance-id";
import { normalizeCssClassSlug } from "../classes/css-class-slug";
import { CSS_CLASS_INDEX_CHANGE_EVENT } from "./css-class-index-event";

const useCssClassIndexVersion = () => {
	const [, setVersion] = useState(0);

	useEffect(() => {
		if (typeof window === "undefined" || typeof window.addEventListener !== "function") {
			return undefined;
		}

		const handleChange = () => {
			setVersion((current) => current + 1);
		};

		window.addEventListener(CSS_CLASS_INDEX_CHANGE_EVENT, handleChange);
		return () => {
			window.removeEventListener(CSS_CLASS_INDEX_CHANGE_EVENT, handleChange);
		};
	}, []);
};

if (!isStandaloneStylerActive()) {
	addFilter(
		"editor.BlockListBlock",
		"motto-blocks/add-editor-wrapper-class",
		(BlockListBlock) => {
			return (props) => {
				useCssClassIndexVersion();

				const { postType } = useSelect(
					(select) => ({
						postType: select("core/editor")?.getCurrentPostType?.(),
					}),
					[]
				);

				if (props?.name === "core/block" || postType === "motto_css_class") {
					return <BlockListBlock {...props} />;
				}

				const mottoStyler = withRuntimeBlockSelectors(
					resolveRawStylerAttributes(props?.attributes) || defaultMottoStyler
				);
				const supportedByTarget = isStylerCoreMvpBlock(props?.name);
				const hasExistingStylerContent = hasAnyMottoContent(mottoStyler);
				if (!supportedByTarget && !hasExistingStylerContent) {
					return <BlockListBlock {...props} />;
				}
				if (!mottoStyler || typeof mottoStyler !== "object") {
					return <BlockListBlock {...props} />;
				}

				const safeInstanceId =
					resolveValidInstanceId(mottoStyler?.instanceId) ||
					resolveValidInstanceId(props?.clientId);

				const extraClasses = collectConditionalClasses(mottoStyler);
				const classList = [];
				const classSet = new Set();

				const addClass = (value) => {
					if (!value || classSet.has(value)) return;
					classSet.add(value);
					classList.push(value);
				};

				if (props.className) {
					props.className
						.split(" ")
						.map((item) => item.trim())
						.filter(Boolean)
						.forEach((item) => addClass(item));
				}

				const conditionalClasses = [];
				const panelClasses = [];
				if (Array.isArray(mottoStyler?.cssClasses)) {
					const classIndex = window?.__mottoCssClassIndex || {};
					const byId = classIndex.byId || {};
					const bySlug = classIndex.bySlug || {};
					const slugById = classIndex.slugById || {};

					mottoStyler.cssClasses.forEach((item) => {
						let value = "";
						let extras = [];
						if (typeof item === "object" && item?.id && Number(item.id) > 0) {
							const id = Number(item.id);
							value = normalizeCssClassSlug(slugById[id] || item?.slug || "");
							extras = Array.isArray(byId[id]) ? byId[id] : [];
							if ((!extras || extras.length === 0) && value) {
								extras = Array.isArray(bySlug[value]) ? bySlug[value] : [];
							}
						} else {
							const raw = typeof item === "string" ? item : item?.slug;
							value = normalizeCssClassSlug(raw || "");
							extras = Array.isArray(bySlug[value]) ? bySlug[value] : [];
						}
						if (value) {
							panelClasses.push(value);
							extras.forEach((extra) => {
								const candidate = normalizeCssClassSlug(extra || "");
								if (candidate) conditionalClasses.push(candidate);
							});
						}
					});
				}

				panelClasses.forEach((value) => addClass(value));
				addClass("has-motto-styler");
				if (safeInstanceId) {
					addClass(`motto-styler-${safeInstanceId}`);
				}

				if (Array.isArray(extraClasses)) {
					extraClasses.forEach((item) => {
						if (item) conditionalClasses.push(item);
					});
				}

				conditionalClasses.forEach((item) => addClass(item));

				return <BlockListBlock {...props} className={classList.join(" ")} />;
			};
		}
	);
}
