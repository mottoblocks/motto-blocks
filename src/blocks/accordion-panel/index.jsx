import metadata from "./block.json";
import { BlockIcon } from "@components/primitives/BlockIcon";
import blockIcon from "@block-icons/accordion-panel.svg?raw";
import { registerBlockType } from "@wordpress/blocks";
import { InnerBlocks, useBlockProps, useInnerBlocksProps } from "@wordpress/block-editor";
import { useContext } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { AccordionEditorContext } from "../accordion/editor-context";
import {
	computeIsEditorOpen,
	getAccordionPanelId,
	getAccordionTriggerId,
	normalizeAccordionItemId,
} from "../accordion/utils";
import { getMottoBaseLayoutClassName } from "../../styler/layout/base-layout";

const BASE_LAYOUT_CLASS = getMottoBaseLayoutClassName(metadata.mottoBaseLayout);
const TEMPLATE = [["core/paragraph", { placeholder: __("Accordion content…", "motto-blocks") }]];

registerBlockType(metadata.name, {
	...metadata,
	icon: {
		src: <BlockIcon svg={blockIcon} />,
	},
	edit: ({ context }) => {
		const { editorActiveItemId, editorOpenItemIds } = useContext(AccordionEditorContext);
		const itemId = normalizeAccordionItemId(context["motto/accordion-item-itemId"]);
		const isOpen = Boolean(context["motto/accordion-item-isOpen"]);
		const closeOtherItems = Boolean(context["motto/accordion-closeOtherItems"]);
		const isEditorOpen = computeIsEditorOpen({
			itemId,
			isOpen,
			closeOtherItems,
			editorActiveItemId,
			editorOpenItemIds,
		});
		const triggerId = getAccordionTriggerId(itemId);
		const panelId = getAccordionPanelId(itemId);

		const blockProps = useBlockProps({
			className: "motto-accordion-item__panel",
			id: panelId || undefined,
			role: "region",
			"aria-labelledby": triggerId || undefined,
			"aria-hidden": isEditorOpen ? "false" : "true",
		});
		const innerBlocksProps = useInnerBlocksProps(
			{ className: `motto-accordion-item__panel-inner ${BASE_LAYOUT_CLASS}` },
			{
				template: TEMPLATE,
				templateLock: false,
			}
		);

		return (
			<div {...blockProps}>
				<div {...innerBlocksProps} />
			</div>
		);
	},
	save: ({ attributes }) => {
		const itemId = normalizeAccordionItemId(attributes.itemId);
		const isOpen = Boolean(attributes.isOpen);
		const triggerId = getAccordionTriggerId(itemId);
		const panelId = getAccordionPanelId(itemId);
		const blockProps = useBlockProps.save({
			className: "motto-accordion-item__panel",
			id: panelId || undefined,
			role: "region",
			"aria-labelledby": triggerId || undefined,
			"aria-hidden": isOpen ? "false" : "true",
		});

		return (
			<div {...blockProps}>
				<div className={`motto-accordion-item__panel-inner ${BASE_LAYOUT_CLASS}`}>
					<InnerBlocks.Content />
				</div>
			</div>
		);
	},
});
