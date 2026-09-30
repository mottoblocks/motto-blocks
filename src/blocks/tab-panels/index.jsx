import metadata from "./block.json";
import { BlockIcon } from "@components/primitives/BlockIcon";
import blockIcon from "@block-icons/tab-panels.svg?raw";
import { registerBlockType } from "@wordpress/blocks";
import { InnerBlocks, useBlockProps, useInnerBlocksProps } from "@wordpress/block-editor";
import { getMottoBaseLayoutClassName } from "../../styler/layout/base-layout";

const ALLOWED_BLOCKS = ["motto/tab"];
const BASE_LAYOUT_CLASS = getMottoBaseLayoutClassName(metadata.mottoBaseLayout);

registerBlockType(metadata.name, {
	...metadata,
	icon: {
		src: <BlockIcon svg={blockIcon} />,
	},
	edit: () => {
		const blockProps = useBlockProps({ className: `motto-tabs__panels ${BASE_LAYOUT_CLASS}` });
		const innerBlocksProps = useInnerBlocksProps(blockProps, {
			allowedBlocks: ALLOWED_BLOCKS,
			templateLock: false,
			renderAppender: InnerBlocks.ButtonBlockAppender,
		});

		return <div {...innerBlocksProps} />;
	},
	save: () => {
		const blockProps = useBlockProps.save({
			className: `motto-tabs__panels ${BASE_LAYOUT_CLASS}`,
		});
		return (
			<div {...blockProps}>
				<InnerBlocks.Content />
			</div>
		);
	},
});
