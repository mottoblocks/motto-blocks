import metadata from "./block.json";
import { BlockIcon } from "@components/primitives/BlockIcon";
import blockIcon from "@block-icons/accordion-trigger.svg?raw";
import { registerBlockType } from "@wordpress/blocks";
import { InnerBlocks, useBlockProps, useInnerBlocksProps } from "@wordpress/block-editor";
import { useContext } from "@wordpress/element";
import { clsx } from "clsx";
import { ChevronDown } from "lucide-react";
import { AccordionEditorContext } from "../accordion/editor-context";
import {
	computeIsEditorOpen,
	getAccordionPanelId,
	getAccordionTriggerId,
	normalizeAccordionItemId,
} from "../accordion/utils";
import { getMottoBaseLayoutClassName } from "../../styler/layout/base-layout";

const BASE_LAYOUT_CLASS = getMottoBaseLayoutClassName(metadata.mottoBaseLayout);
const ALLOWED_BLOCKS = ["core/paragraph", "motto/svg"];
const TEMPLATE = [["core/paragraph", { content: "Accordion item" }]];

registerBlockType(metadata.name, {
	...metadata,
	icon: {
		src: <BlockIcon svg={blockIcon} />,
	},
	edit: ({ context }) => {
		const {
			editorActiveItemId,
			setEditorActiveItemId,
			editorOpenItemIds,
			setEditorOpenItemIds,
		} = useContext(AccordionEditorContext);
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

		const handleToggle = () => {
			if (closeOtherItems) {
				setEditorActiveItemId(editorActiveItemId === itemId ? "" : itemId);
				return;
			}
			if (isOpen) {
				return;
			}
			setEditorOpenItemIds((currentIds) =>
				currentIds.includes(itemId)
					? currentIds.filter((currentItemId) => currentItemId !== itemId)
					: [...currentIds, itemId]
			);
		};

		const blockProps = useBlockProps({
			className: clsx("motto-accordion-item__trigger", BASE_LAYOUT_CLASS),
			type: "button",
			id: triggerId || undefined,
			"aria-expanded": isEditorOpen ? "true" : "false",
			"aria-controls": panelId || undefined,
			onClick: handleToggle,
		});
		const innerBlocksProps = useInnerBlocksProps(
			{ className: "motto-accordion-item__trigger-main" },
			{
				allowedBlocks: ALLOWED_BLOCKS,
				template: TEMPLATE,
				templateLock: false,
			}
		);

		return (
			<button {...blockProps}>
				<span {...innerBlocksProps} />
				<span className="motto-accordion-item__chevron" aria-hidden="true">
					<ChevronDown size={18} />
				</span>
			</button>
		);
	},
	save: ({ attributes }) => {
		const itemId = normalizeAccordionItemId(attributes.itemId);
		const isOpen = Boolean(attributes.isOpen);
		const triggerId = getAccordionTriggerId(itemId);
		const panelId = getAccordionPanelId(itemId);
		const blockProps = useBlockProps.save({
			className: `motto-accordion-item__trigger ${BASE_LAYOUT_CLASS}`,
			type: "button",
			id: triggerId || undefined,
			"aria-expanded": isOpen ? "true" : "false",
			"aria-controls": panelId || undefined,
		});

		return (
			<button {...blockProps}>
				<span className="motto-accordion-item__trigger-main">
					<InnerBlocks.Content />
				</span>
				<span className="motto-accordion-item__chevron" aria-hidden="true">
					<ChevronDown size={18} />
				</span>
			</button>
		);
	},
});
