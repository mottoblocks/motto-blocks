import metadata from "./block.json";
import { BlockIcon } from "@components/primitives/BlockIcon";
import blockIcon from "@block-icons/accordion-item.svg?raw";
import { createBlock, registerBlockType } from "@wordpress/blocks";
import {
	InnerBlocks,
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
} from "@wordpress/block-editor";
import { PanelBody, ToggleControl } from "@wordpress/components";
import { useDispatch, useSelect } from "@wordpress/data";
import { useContext, useEffect } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { clsx } from "clsx";
import { ChevronDown } from "lucide-react";
import { AccordionEditorContext } from "../accordion/editor-context";
import { normalizeButtonIconOptions } from "@components/controls/button-icons/button-icon-options";
import {
	TabTriggerContent,
	normalizeTabIconPosition,
} from "@components/ui/tabs/tab-trigger-content";
import {
	computeIsEditorOpen,
	generateAccordionItemId,
	getAccordionPanelId,
	getAccordionTriggerId,
	normalizeAccordionItemId,
} from "../accordion/utils";
import { getMottoBaseLayoutClassName } from "../../styler/layout/base-layout";

const ACCORDION_TRIGGER_BLOCK = "motto/accordion-trigger";
const ACCORDION_PANEL_BLOCK = "motto/accordion-panel";
// Deliberately shallow — see motto/tabs' TEMPLATE comment (SDD-022 §4.5): templateLock: "all"
// re-applies this via synchronizeBlocksWithTemplate() on every mount, which caps nested content
// at the template's literal length. No 3rd array element here means that recursion is always a
// no-op for the trigger's/panel's real content. Default seeding is done in the effect below instead.
const TEMPLATE = [[ACCORDION_TRIGGER_BLOCK], [ACCORDION_PANEL_BLOCK]];
const BASE_LAYOUT_CLASS = getMottoBaseLayoutClassName(metadata.mottoBaseLayout);

function useAccordionContext(clientId) {
	return useSelect(
		(select) => {
			const store = select("core/block-editor");
			const parents = store?.getBlockParents?.(clientId) || [];
			const parentClientId =
				parents.find((id) => store?.getBlockName?.(id) === "motto/accordion") || "";
			const siblings = parentClientId ? store?.getBlocks?.(parentClientId) || [] : [];
			return {
				parentClientId,
				siblings,
			};
		},
		[clientId]
	);
}

function Edit({ attributes, clientId, context, setAttributes }) {
	const directChildren = useSelect(
		(select) => select("core/block-editor").getBlocks(clientId),
		[clientId]
	);
	const { replaceInnerBlocks, updateBlockAttributes } = useDispatch("core/block-editor");
	const { siblings } = useAccordionContext(clientId);
	const { editorActiveItemId, setEditorActiveItemId, editorOpenItemIds } =
		useContext(AccordionEditorContext);
	const itemId = normalizeAccordionItemId(attributes.itemId);
	const isOpen = Boolean(attributes.isOpen);
	const closeOtherItems = Boolean(context["motto/accordion-closeOtherItems"]);
	const isEditorOpen = computeIsEditorOpen({
		itemId,
		isOpen,
		closeOtherItems,
		editorActiveItemId,
		editorOpenItemIds,
	});

	const triggerBlock =
		directChildren.find((block) => block.name === ACCORDION_TRIGGER_BLOCK) || null;
	const panelBlock = directChildren.find((block) => block.name === ACCORDION_PANEL_BLOCK) || null;

	// Own itemId repair — redundant by design with motto/accordion's own dedup effect (only the
	// parent can see all siblings and catch copy/paste collisions this effect can't).
	useEffect(() => {
		if (!itemId) {
			setAttributes({ itemId: generateAccordionItemId() });
		}
	}, [itemId, setAttributes]);

	// Seed the trigger/panel pair once (fresh insert, itemId already resolved), then keep their
	// duplicated itemId/isOpen copies (needed because save() has no access to block context) in
	// sync whenever this item's own itemId/isOpen change. Never deletes/replaces once both exist.
	useEffect(() => {
		if (!itemId) {
			return;
		}
		// Guard on the raw child count, not "no block named trigger/panel found" — a block
		// that ended up with *some* unexpected children (e.g. a deprecated/migrate() match
		// that didn't fully resolve, or any other unforeseen state) must never be silently
		// replaced with blank defaults. Only seed when this item is genuinely, fully empty.
		if (directChildren.length === 0) {
			replaceInnerBlocks(
				clientId,
				[
					createBlock(ACCORDION_TRIGGER_BLOCK, { itemId, isOpen }, [
						createBlock("core/paragraph", {
							content: __("Accordion item", "motto-blocks"),
						}),
					]),
					createBlock(ACCORDION_PANEL_BLOCK, { itemId, isOpen }, [
						createBlock("core/paragraph", {
							placeholder: __("Accordion content…", "motto-blocks"),
						}),
					]),
				],
				false
			);
			return;
		}
		if (!triggerBlock || !panelBlock) {
			return;
		}
		if (normalizeAccordionItemId(triggerBlock.attributes.itemId) !== itemId) {
			updateBlockAttributes(triggerBlock.clientId, { itemId });
		}
		if (normalizeAccordionItemId(panelBlock.attributes.itemId) !== itemId) {
			updateBlockAttributes(panelBlock.clientId, { itemId });
		}
		if (Boolean(triggerBlock.attributes.isOpen) !== isOpen) {
			updateBlockAttributes(triggerBlock.clientId, { isOpen });
		}
		if (Boolean(panelBlock.attributes.isOpen) !== isOpen) {
			updateBlockAttributes(panelBlock.clientId, { isOpen });
		}
	}, [
		itemId,
		isOpen,
		directChildren,
		triggerBlock,
		panelBlock,
		clientId,
		replaceInnerBlocks,
		updateBlockAttributes,
	]);

	const blockProps = useBlockProps({
		className: clsx("motto-accordion-item", BASE_LAYOUT_CLASS, isEditorOpen && "is-open"),
		"data-item-id": itemId,
	});
	const innerBlocksProps = useInnerBlocksProps(blockProps, {
		allowedBlocks: [ACCORDION_TRIGGER_BLOCK, ACCORDION_PANEL_BLOCK],
		template: TEMPLATE,
		templateLock: "all",
		renderAppender: false,
	});

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={__("Accordion Item", "motto-blocks")}
					className="motto-panel-body"
					initialOpen
				>
					<div className="motto-panel-section">
						<ToggleControl
							className="motto-toggle"
							label={__("Open by default", "motto-blocks")}
							checked={isOpen}
							onChange={(value) => {
								if (value && closeOtherItems) {
									siblings.forEach((block) => {
										if (
											block.clientId !== clientId &&
											block.name === metadata.name &&
											block.attributes?.isOpen
										) {
											updateBlockAttributes(block.clientId, {
												isOpen: false,
											});
										}
									});
								}
								if (value && closeOtherItems) {
									setEditorActiveItemId(itemId);
								}
								setAttributes({ isOpen: value });
							}}
						/>
					</div>
				</PanelBody>
			</InspectorControls>
			<div {...innerBlocksProps} />
		</>
	);
}

function Save({ attributes }) {
	const itemId = normalizeAccordionItemId(attributes.itemId);
	const blockProps = useBlockProps.save({
		className: clsx("motto-accordion-item", BASE_LAYOUT_CLASS, attributes.isOpen && "is-open"),
		"data-item-id": itemId,
		"data-open": attributes.isOpen ? "true" : "false",
	});

	return (
		<div {...blockProps}>
			<InnerBlocks.Content />
		</div>
	);
}

// Pre-SDD-024 iconOptions shape (button-icons system) → motto/svg's svgAsset shape, for
// migrating real existing content (some accordion-item blocks were found in production with
// customIcon set, contrary to the "family confirmed unused" assumption SDD-024 shipped under).
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

registerBlockType(metadata.name, {
	...metadata,
	icon: {
		src: <BlockIcon svg={blockIcon} />,
	},
	edit: Edit,
	save: Save,
	deprecated: [
		{
			// Pre-SDD-024 shape: this block rendered the trigger/panel markup itself, with
			// label/customIcon/iconOptions/iconPosition attributes instead of the current
			// motto/accordion-trigger + motto/accordion-panel child blocks.
			attributes: {
				itemId: { type: "string", default: "" },
				label: { type: "string", default: "Accordion item" },
				isOpen: { type: "boolean", default: false },
				customIcon: { type: "boolean", default: false },
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
				const itemId = normalizeAccordionItemId(attributes.itemId);
				const customIcon = Boolean(attributes.customIcon);
				const iconPosition = normalizeTabIconPosition(attributes.iconPosition);
				const normalizedIconOptions = normalizeButtonIconOptions(attributes.iconOptions);
				const resolvedIconOptions = customIcon
					? normalizedIconOptions
					: normalizeButtonIconOptions({ type: "none" });
				const triggerId = getAccordionTriggerId(itemId);
				const panelId = getAccordionPanelId(itemId);
				const blockProps = useBlockProps.save({
					className: clsx(
						"motto-accordion-item",
						BASE_LAYOUT_CLASS,
						attributes.isOpen && "is-open"
					),
					"data-item-id": itemId,
					"data-open": attributes.isOpen ? "true" : "false",
				});

				return (
					<div {...blockProps}>
						<button
							type="button"
							className="motto-accordion-item__trigger"
							id={triggerId || undefined}
							aria-expanded={attributes.isOpen ? "true" : "false"}
							aria-controls={panelId || undefined}
						>
							<span className="motto-accordion-item__trigger-main">
								<TabTriggerContent
									label={attributes.label || ""}
									iconOptions={resolvedIconOptions}
									iconPosition={iconPosition}
								/>
							</span>
							<span className="motto-accordion-item__chevron" aria-hidden="true">
								<ChevronDown size={18} />
							</span>
						</button>
						<div
							className="motto-accordion-item__panel"
							id={panelId || undefined}
							role="region"
							aria-labelledby={triggerId || undefined}
						>
							<div className="motto-accordion-item__panel-inner">
								<InnerBlocks.Content />
							</div>
						</div>
					</div>
				);
			},
			migrate(attributes, innerBlocks = []) {
				const itemId =
					normalizeAccordionItemId(attributes.itemId) || generateAccordionItemId();
				const isOpen = Boolean(attributes.isOpen);
				const label = attributes.label || "Accordion item";
				const iconPosition = normalizeTabIconPosition(attributes.iconPosition);

				const triggerChildren = [createBlock("core/paragraph", { content: label })];
				if (attributes.customIcon) {
					const svgAsset = buildSvgAssetFromLegacyIconOptions(attributes.iconOptions);
					if (svgAsset) {
						const svgBlock = createBlock("motto/svg", { svgAsset });
						if (iconPosition === "right") {
							triggerChildren.push(svgBlock);
						} else {
							triggerChildren.unshift(svgBlock);
						}
					}
				}

				return [
					{ itemId, isOpen },
					[
						createBlock(ACCORDION_TRIGGER_BLOCK, { itemId, isOpen }, triggerChildren),
						createBlock(ACCORDION_PANEL_BLOCK, { itemId, isOpen }, innerBlocks),
					],
				];
			},
		},
	],
});
