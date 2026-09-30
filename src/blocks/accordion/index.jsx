import metadata from "./block.json";
import { BlockIcon } from "@components/primitives/BlockIcon";
import blockIcon from "@block-icons/accordion.svg?raw";
import { registerBlockType } from "@wordpress/blocks";
import {
	InnerBlocks,
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
} from "@wordpress/block-editor";
import { ToggleControl, PanelBody } from "@wordpress/components";
import { useDispatch, useSelect } from "@wordpress/data";
import { useEffect, useState } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { AccordionEditorContext } from "./editor-context";
import { generateAccordionItemId, normalizeAccordionItemId } from "./utils";
import { getMottoBaseLayoutClassName } from "../../styler/layout/base-layout";

const ACCORDION_ITEM_BLOCK = "motto/accordion-item";
const TEMPLATE = [[ACCORDION_ITEM_BLOCK], [ACCORDION_ITEM_BLOCK]];
const BASE_LAYOUT_CLASS = getMottoBaseLayoutClassName(metadata.mottoBaseLayout);

function Edit({ attributes, clientId, setAttributes }) {
	const itemBlocks = useSelect(
		(select) => select("core/block-editor").getBlocks(clientId),
		[clientId]
	);
	const { updateBlockAttributes } = useDispatch("core/block-editor");
	const closeOtherItems = Boolean(attributes.closeOtherItems);
	const [editorOpenItemIds, setEditorOpenItemIds] = useState([]);
	const [editorActiveItemId, setEditorActiveItemId] = useState("");

	useEffect(() => {
		const seenItemIds = new Set();
		itemBlocks.forEach((itemBlock) => {
			const itemId = normalizeAccordionItemId(itemBlock.attributes.itemId);
			if (!itemId || seenItemIds.has(itemId)) {
				updateBlockAttributes(itemBlock.clientId, { itemId: generateAccordionItemId() });
				return;
			}
			seenItemIds.add(itemId);
		});
	}, [itemBlocks, updateBlockAttributes]);

	useEffect(() => {
		if (!closeOtherItems) {
			return;
		}

		const openItems = itemBlocks.filter((itemBlock) => itemBlock.attributes?.isOpen);
		if (openItems.length <= 1) {
			return;
		}

		openItems.slice(1).forEach((itemBlock) => {
			updateBlockAttributes(itemBlock.clientId, { isOpen: false });
		});
	}, [closeOtherItems, itemBlocks, updateBlockAttributes]);

	useEffect(() => {
		const validItemIds = new Set(
			itemBlocks
				.map((itemBlock) => normalizeAccordionItemId(itemBlock.attributes?.itemId))
				.filter(Boolean)
		);

		setEditorOpenItemIds((currentIds) =>
			currentIds.filter((itemId) => validItemIds.has(itemId))
		);

		if (editorActiveItemId && !validItemIds.has(editorActiveItemId)) {
			setEditorActiveItemId("");
		}
	}, [editorActiveItemId, itemBlocks]);

	useEffect(() => {
		if (!closeOtherItems) {
			return;
		}

		setEditorOpenItemIds([]);
	}, [closeOtherItems]);

	const blockProps = useBlockProps({
		className: `motto-accordion ${BASE_LAYOUT_CLASS}`,
		"data-close-other-items": closeOtherItems ? "true" : "false",
	});
	const innerBlocksProps = useInnerBlocksProps(blockProps, {
		allowedBlocks: [ACCORDION_ITEM_BLOCK],
		template: TEMPLATE,
		templateLock: false,
		orientation: "vertical",
		renderAppender: InnerBlocks.ButtonBlockAppender,
	});

	return (
		<AccordionEditorContext.Provider
			value={{
				editorOpenItemIds,
				setEditorOpenItemIds,
				editorActiveItemId,
				setEditorActiveItemId,
			}}
		>
			<>
				<InspectorControls>
					<PanelBody
						title={__("Accordion Settings", "motto-blocks")}
						className="motto-panel-body"
						initialOpen
					>
						<div className="motto-panel-section">
							<ToggleControl
								className="motto-toggle"
								label={__("Close other items when one opens", "motto-blocks")}
								checked={closeOtherItems}
								onChange={(value) => setAttributes({ closeOtherItems: value })}
							/>
						</div>
					</PanelBody>
				</InspectorControls>
				<div {...innerBlocksProps} />
			</>
		</AccordionEditorContext.Provider>
	);
}

function Save({ attributes }) {
	const blockProps = useBlockProps.save({
		className: `motto-accordion ${BASE_LAYOUT_CLASS}`,
		"data-close-other-items": attributes.closeOtherItems ? "true" : "false",
	});

	return (
		<div {...blockProps}>
			<InnerBlocks.Content />
		</div>
	);
}

registerBlockType(metadata.name, {
	...metadata,
	icon: {
		src: <BlockIcon svg={blockIcon} />,
	},
	edit: Edit,
	save: Save,
});
