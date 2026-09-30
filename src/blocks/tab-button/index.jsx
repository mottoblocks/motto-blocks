import metadata from "./block.json";
import { BlockIcon } from "@components/primitives/BlockIcon";
import blockIcon from "@block-icons/tab-button.svg?raw";
import { createBlock, registerBlockType } from "@wordpress/blocks";
import {
	InnerBlocks,
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
} from "@wordpress/block-editor";
import { PanelBody, TextControl } from "@wordpress/components";
import { useDispatch, useSelect } from "@wordpress/data";
import { useEffect } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { clsx } from "clsx";
import { normalizeButtonIconOptions } from "@components/controls/button-icons/button-icon-options";
import {
	TabTriggerContent,
	normalizeTabIconPosition,
} from "@components/ui/tabs/tab-trigger-content";
import { normalizeTabId } from "../tabs/utils";
import { getMottoBaseLayoutClassName } from "../../styler/layout/base-layout";

const BASE_LAYOUT_CLASS = getMottoBaseLayoutClassName(metadata.mottoBaseLayout);
const ALLOWED_BLOCKS = ["core/paragraph", "motto/svg"];
const TEMPLATE = [["core/paragraph", { content: "Tab" }]];

// Pre-SDD-022 iconOptions shape (button-icons system) → motto/svg's svgAsset shape, for
// migrating real existing content saved before tab-button switched to InnerBlocks.
function buildSvgAssetFromLegacyIconOptions(iconOptions) {
	const normalized = normalizeButtonIconOptions(iconOptions);
	if (normalized.type === "image") {
		return {
			source: "media",
			media: {
				id: normalized.image.id,
				url: normalized.image.url,
				alt: "",
				title: "",
				width: 0,
				height: 0,
				mime: "",
				inlineSvg: "",
			},
			svg: { lucideIcon: "star", lucideSvg: "", inline: "" },
		};
	}
	if (normalized.type === "svg") {
		if (normalized.svg.source === "lucide") {
			return {
				source: "lucide",
				media: {
					id: 0,
					url: "",
					alt: "",
					title: "",
					width: 0,
					height: 0,
					mime: "",
					inlineSvg: "",
				},
				svg: { lucideIcon: normalized.svg.lucideIcon || "star", lucideSvg: "", inline: "" },
			};
		}
		return {
			source: "inline",
			media: {
				id: 0,
				url: "",
				alt: "",
				title: "",
				width: 0,
				height: 0,
				mime: "",
				inlineSvg: "",
			},
			svg: { lucideIcon: "star", lucideSvg: "", inline: normalized.svg.inline || "" },
		};
	}
	return null; // type "none" — no icon to migrate
}

function useTabButtonContext(clientId) {
	return useSelect(
		(select) => {
			const store = select("core/block-editor");
			const parents = store?.getBlockParents?.(clientId) || [];
			const tabsClientId =
				parents.find((id) => store?.getBlockName?.(id) === "motto/tabs") || "";

			return {
				tabsClientId,
			};
		},
		[clientId]
	);
}

registerBlockType(metadata.name, {
	...metadata,
	icon: {
		src: <BlockIcon svg={blockIcon} />,
	},
	edit: ({ attributes, setAttributes, clientId, context, isSelected }) => {
		const { tabsClientId } = useTabButtonContext(clientId);
		const { updateBlockAttributes } = useDispatch("core/block-editor");
		const activeTabId = normalizeTabId(context["motto/tabs-activeTabId"]);
		const syncUrlHash = !!context["motto/tabs-syncUrlHash"];
		const tabId = normalizeTabId(attributes.tabId);
		const isActive = tabId && tabId === activeTabId;

		useEffect(() => {
			if (isSelected && tabsClientId && tabId && tabId !== activeTabId) {
				updateBlockAttributes(tabsClientId, { activeTabId: tabId });
			}
		}, [activeTabId, isSelected, tabId, tabsClientId, updateBlockAttributes]);

		const blockProps = useBlockProps({
			className: clsx(
				"motto-tabs__nav-item",
				"motto-tab-button",
				BASE_LAYOUT_CLASS,
				isActive && "is-active"
			),
			type: "button",
			"data-tab-id": tabId,
			"aria-selected": isActive ? "true" : "false",
			onClick: (event) => {
				event.preventDefault();
				if (tabsClientId && tabId) {
					updateBlockAttributes(tabsClientId, { activeTabId: tabId });
				}
			},
		});
		const innerBlocksProps = useInnerBlocksProps(blockProps, {
			allowedBlocks: ALLOWED_BLOCKS,
			template: TEMPLATE,
			templateLock: false,
		});

		return (
			<>
				{syncUrlHash && (
					<InspectorControls>
						<PanelBody
							title={__("Tab Button Settings", "motto-blocks")}
							className="motto-panel-body"
							initialOpen
						>
							<div className="motto-panel-section">
								<TextControl
									className="motto-input"
									label={__("URL slug", "motto-blocks")}
									value={attributes.urlSlug || ""}
									onChange={(urlSlug) => setAttributes({ urlSlug })}
								/>
							</div>
						</PanelBody>
					</InspectorControls>
				)}
				<button {...innerBlocksProps} />
			</>
		);
	},
	save: ({ attributes }) => {
		const urlSlug = normalizeTabId(attributes.urlSlug);
		const blockProps = useBlockProps.save({
			className: `motto-tabs__nav-item motto-tab-button ${BASE_LAYOUT_CLASS}`,
			type: "button",
			"data-tab-id": normalizeTabId(attributes.tabId),
			...(urlSlug ? { "data-tab-slug": urlSlug } : {}),
		});

		return (
			<button {...blockProps}>
				<InnerBlocks.Content />
			</button>
		);
	},
	deprecated: [
		{
			// Pre-SDD-022 shape: this block rendered its label/icon itself, with
			// label/iconOptions/iconPosition attributes instead of real InnerBlocks
			// (core/paragraph + optional motto/svg).
			attributes: {
				tabId: { type: "string", default: "" },
				label: { type: "string", default: "Tab" },
				iconPosition: { type: "string", default: "left" },
				iconOptions: {
					type: "object",
					default: {
						type: "none",
						image: { id: 0, url: "" },
						svg: { source: "inline", inline: "", lucideIcon: "check" },
					},
				},
			},
			save({ attributes }) {
				const iconOptions = normalizeButtonIconOptions(attributes.iconOptions);
				const iconPosition = normalizeTabIconPosition(attributes.iconPosition);
				const blockProps = useBlockProps.save({
					className: `motto-tabs__nav-item motto-tab-button ${BASE_LAYOUT_CLASS}`,
					type: "button",
					"data-tab-id": normalizeTabId(attributes.tabId),
				});

				return (
					<button {...blockProps}>
						<TabTriggerContent
							label={attributes.label || ""}
							iconOptions={iconOptions}
							iconPosition={iconPosition}
						/>
					</button>
				);
			},
			migrate(attributes) {
				const tabId = normalizeTabId(attributes.tabId);
				const label = attributes.label || "Tab";
				const iconPosition = normalizeTabIconPosition(attributes.iconPosition);

				const children = [createBlock("core/paragraph", { content: label })];
				const svgAsset = buildSvgAssetFromLegacyIconOptions(attributes.iconOptions);
				if (svgAsset) {
					const svgBlock = createBlock("motto/svg", { svgAsset });
					if (iconPosition === "right") {
						children.push(svgBlock);
					} else {
						children.unshift(svgBlock);
					}
				}

				return [{ tabId, urlSlug: "" }, children];
			},
		},
	],
});
