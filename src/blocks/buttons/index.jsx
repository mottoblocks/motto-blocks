import metadata from "./block.json";
import { BlockIcon } from "@components/primitives/BlockIcon";
import blockIcon from "@block-icons/buttons.svg?raw";
import { registerBlockType } from "@wordpress/blocks";
import { useBlockProps, useInnerBlocksProps } from "@wordpress/block-editor";
import { getMottoBaseLayoutClassName } from "../../styler/layout/base-layout";

const ALLOWED_BLOCKS = ["motto/button"];
const TEMPLATE = [["motto/button"]];
const BASE_LAYOUT_CLASS = getMottoBaseLayoutClassName(metadata.mottoBaseLayout);

registerBlockType(metadata.name, {
	...metadata,
	icon: {
		src: <BlockIcon svg={blockIcon} />,
	},
	edit: () => {
		const blockProps = useBlockProps({
			className: `motto-buttons ${BASE_LAYOUT_CLASS}`,
		});
		const innerBlocksProps = useInnerBlocksProps(blockProps, {
			allowedBlocks: ALLOWED_BLOCKS,
			template: TEMPLATE,
			templateLock: false,
			orientation: "horizontal",
		});

		return <div {...innerBlocksProps} />;
	},
	save: () => {
		const blockProps = useBlockProps.save({
			className: `motto-buttons ${BASE_LAYOUT_CLASS}`,
		});
		const innerBlocksProps = useInnerBlocksProps.save(blockProps);

		return <div {...innerBlocksProps} />;
	},
});
