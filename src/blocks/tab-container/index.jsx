import metadata from "./block.json";
import { BlockIcon } from "@components/primitives/BlockIcon";
import blockIcon from "@block-icons/tab-container.svg?raw";
import { registerBlockType } from "@wordpress/blocks";
import { InnerBlocks, useBlockProps, useInnerBlocksProps } from "@wordpress/block-editor";
import { getMottoBaseLayoutClassName } from "../../styler/layout/base-layout";

const ALLOWED_BLOCKS = ["motto/tab-button"];
const BASE_LAYOUT_CLASS = getMottoBaseLayoutClassName(metadata.mottoBaseLayout);

registerBlockType(metadata.name, {
	...metadata,
	icon: {
		src: <BlockIcon svg={blockIcon} />,
	},
	edit: () => {
		const blockProps = useBlockProps({ className: `motto-tabs__nav ${BASE_LAYOUT_CLASS}` });
		const innerBlocksProps = useInnerBlocksProps(blockProps, {
			allowedBlocks: ALLOWED_BLOCKS,
			templateLock: false,
			renderAppender: InnerBlocks.ButtonBlockAppender,
		});

		return <nav {...innerBlocksProps} />;
	},
	save: () => {
		const blockProps = useBlockProps.save({
			className: `motto-tabs__nav ${BASE_LAYOUT_CLASS}`,
		});
		return (
			<nav {...blockProps}>
				<InnerBlocks.Content />
			</nav>
		);
	},
});
