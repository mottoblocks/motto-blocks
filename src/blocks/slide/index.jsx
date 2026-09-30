import metadata from "./block.json";
import { BlockIcon } from "@components/primitives/BlockIcon";
import blockIcon from "@block-icons/slide.svg?raw";
import { registerBlockType } from "@wordpress/blocks";
import { InnerBlocks, useBlockProps, useInnerBlocksProps } from "@wordpress/block-editor";
import { __ } from "@wordpress/i18n";
import { getMottoBaseLayoutClassName } from "../../styler/layout/base-layout";

const TEMPLATE = [["core/paragraph", { placeholder: __("Slide content...", "motto-blocks") }]];
const disableCanvasDrag = (event) => event.preventDefault();
const BASE_LAYOUT_CLASS = getMottoBaseLayoutClassName(metadata.mottoBaseLayout);

registerBlockType(metadata.name, {
	...metadata,
	icon: {
		src: <BlockIcon svg={blockIcon} />,
	},
	edit: () => {
		const blockProps = useBlockProps({
			className: `motto-slide swiper-slide ${BASE_LAYOUT_CLASS}`,
			draggable: false,
			onDragStart: disableCanvasDrag,
		});
		const innerBlocksProps = useInnerBlocksProps(blockProps, {
			template: TEMPLATE,
			templateLock: false,
		});

		return <div {...innerBlocksProps} />;
	},
	save: () => {
		const blockProps = useBlockProps.save({
			className: `motto-slide swiper-slide ${BASE_LAYOUT_CLASS}`,
		});

		return (
			<div {...blockProps}>
				<InnerBlocks.Content />
			</div>
		);
	},
});
