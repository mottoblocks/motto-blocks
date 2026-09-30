import metadata from "./block.json";
import { BlockIcon } from "@components/primitives/BlockIcon";
import blockIcon from "@block-icons/list.svg?raw";
import { createBlock, registerBlockType } from "@wordpress/blocks";
import { InspectorControls, useBlockProps, useInnerBlocksProps } from "@wordpress/block-editor";
import { PanelBody } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { normalizeBulletOptions } from "@components/controls/bullets/bullet-options";
import { BulletSelector } from "@components/controls/bullets/bullet-selector";
import { getMottoBaseLayoutClassName } from "../../styler/layout/base-layout";

const ALLOWED_BLOCKS = ["motto/list-item"];
const TEMPLATE = [
	["motto/list-item", { content: "Item 1" }],
	["motto/list-item", { content: "Item 2" }],
	["motto/list-item", { content: "Item 3" }],
];
const BASE_LAYOUT_CLASS = getMottoBaseLayoutClassName(metadata.mottoBaseLayout);

function getListDataAttributes(bulletOptions) {
	const attrs = {
		"data-bullet-type": bulletOptions.type,
	};

	if (bulletOptions.type === "counter") {
		attrs["data-counter-style"] = bulletOptions.counter.style;
		return attrs;
	}

	if (bulletOptions.type === "image" && bulletOptions.image.url) {
		attrs["data-bullet-image-url"] = bulletOptions.image.url;
		return attrs;
	}

	if (bulletOptions.type === "icon" || bulletOptions.type === "svg") {
		attrs["data-bullet-svg-source"] = bulletOptions.svg.source;

		if (bulletOptions.type === "icon" && bulletOptions.svg.lucideIcon) {
			attrs["data-bullet-lucide-icon"] = bulletOptions.svg.lucideIcon;
		}
	}

	return attrs;
}

function transformCoreListItem(item) {
	const content = String(item.attributes.content ?? "");
	const nestedCoreList = (item.innerBlocks || []).find((child) => child.name === "core/list");
	const innerBlocks = nestedCoreList ? [transformCoreList(nestedCoreList)] : [];

	return createBlock("motto/list-item", { content }, innerBlocks);
}

function transformCoreList(block) {
	const { ordered, start } = block.attributes;
	const bulletOptions = normalizeBulletOptions(
		ordered
			? { type: "counter", counter: { style: "decimal", start: start || 1 } }
			: { type: "default" }
	);

	return createBlock(
		metadata.name,
		{ bulletOptions },
		(block.innerBlocks || []).map(transformCoreListItem)
	);
}

function transformMottoListItemToCore(item) {
	const content = String(item.attributes.content ?? "");
	const nestedMottoList = (item.innerBlocks || []).find((child) => child.name === "motto/list");
	const innerBlocks = nestedMottoList ? [transformMottoListToCore(nestedMottoList)] : [];

	return createBlock("core/list-item", { content }, innerBlocks);
}

function transformMottoListToCore(block) {
	const bulletOptions = normalizeBulletOptions(block.attributes.bulletOptions);
	const isOrdered = bulletOptions.type === "counter";
	const attrs = isOrdered
		? { ordered: true, start: bulletOptions.counter.start }
		: { ordered: false };

	return createBlock(
		"core/list",
		attrs,
		(block.innerBlocks || []).map(transformMottoListItemToCore)
	);
}

registerBlockType(metadata.name, {
	...metadata,
	icon: {
		src: <BlockIcon svg={blockIcon} />,
	},
	transforms: {
		from: [
			{
				type: "block",
				blocks: ["core/list"],
				transform: (attributes, innerBlocks = []) =>
					transformCoreList({ attributes, innerBlocks }),
			},
		],
		to: [
			{
				type: "block",
				blocks: ["core/list"],
				transform: (attributes, innerBlocks = []) =>
					transformMottoListToCore({ attributes, innerBlocks }),
			},
		],
	},
	edit: ({ attributes, setAttributes }) => {
		const bulletOptions = normalizeBulletOptions(attributes.bulletOptions);
		const ListTag = bulletOptions.type === "counter" ? "ol" : "ul";
		const counterStart = Math.max(
			1,
			Number.parseInt(String(bulletOptions.counter.start), 10) || 1
		);
		const listStyle =
			bulletOptions.type === "counter"
				? {
						"--motto-counter-start": String(counterStart),
						counterReset: `motto-list-item ${counterStart - 1}`,
					}
				: undefined;

		const blockProps = useBlockProps({
			className: `motto-list ${BASE_LAYOUT_CLASS}`,
			...getListDataAttributes(bulletOptions),
			style: listStyle,
		});
		const innerBlocksProps = useInnerBlocksProps(blockProps, {
			allowedBlocks: ALLOWED_BLOCKS,
			template: TEMPLATE,
			templateLock: false,
			orientation: "vertical",
		});

		return (
			<>
				<InspectorControls>
					<PanelBody
						title={__("List Settings", "motto-blocks")}
						className="motto-panel-body"
						initialOpen
					>
						<div className="motto-panel-section">
							<div className="motto-section-heading">
								<div className="motto-section-title">
									<span className="motto-section-title-text">
										{__("Bullet", "motto-blocks")}
									</span>
								</div>
							</div>
							<BulletSelector
								value={bulletOptions}
								onChange={(nextBulletOptions) =>
									setAttributes({
										bulletOptions: normalizeBulletOptions(nextBulletOptions),
									})
								}
							/>
						</div>
					</PanelBody>
				</InspectorControls>

				<ListTag
					{...innerBlocksProps}
					start={ListTag === "ol" ? counterStart : undefined}
				/>
			</>
		);
	},
	save: ({ attributes }) => {
		const bulletOptions = normalizeBulletOptions(attributes.bulletOptions);
		const ListTag = bulletOptions.type === "counter" ? "ol" : "ul";
		const counterStart = Math.max(
			1,
			Number.parseInt(String(bulletOptions.counter.start), 10) || 1
		);
		const listStyle =
			bulletOptions.type === "counter"
				? {
						"--motto-counter-start": String(counterStart),
						counterReset: `motto-list-item ${counterStart - 1}`,
					}
				: undefined;

		const blockProps = useBlockProps.save({
			className: `motto-list ${BASE_LAYOUT_CLASS}`,
			...getListDataAttributes(bulletOptions),
			style: listStyle,
		});
		const innerBlocksProps = useInnerBlocksProps.save(blockProps);

		return (
			<ListTag {...innerBlocksProps} start={ListTag === "ol" ? counterStart : undefined} />
		);
	},
});
