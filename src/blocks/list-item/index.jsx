import metadata from "./block.json";
import { BlockIcon } from "@components/primitives/BlockIcon";
import blockIcon from "@block-icons/list-item.svg?raw";
import { createBlock, registerBlockType } from "@wordpress/blocks";
import {
	InspectorControls,
	RichText,
	useBlockProps,
	useInnerBlocksProps,
} from "@wordpress/block-editor";
import { useEffect, useMemo } from "@wordpress/element";
import { PanelBody, ToggleControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { normalizeBulletOptions } from "@components/controls/bullets/bullet-options";
import { BulletSelector } from "@components/controls/bullets/bullet-selector";
import { BulletMedia } from "@components/controls/bullets/bullet-media";
import { getMottoBaseLayoutClassName } from "../../styler/layout/base-layout";

const BASE_LAYOUT_CLASS = getMottoBaseLayoutClassName(metadata.mottoBaseLayout);
const NESTED_ALLOWED_BLOCKS = ["motto/list"];

function hasConfiguredBullet(bulletOptions) {
	if (bulletOptions.type === "default") {
		return true;
	}

	if (bulletOptions.type === "image") {
		return Boolean(bulletOptions.image.url);
	}

	if (bulletOptions.type === "counter") {
		return true;
	}

	if (bulletOptions.type === "none") {
		return true;
	}

	if (bulletOptions.type === "icon") {
		return Boolean(bulletOptions.svg.lucideIcon);
	}

	if (bulletOptions.type === "svg") {
		return Boolean(bulletOptions.svg.inline);
	}

	return false;
}

function getLocalBulletDataAttributes(overrideBullet, bulletOptions) {
	if (!overrideBullet) {
		return {};
	}

	const attrs = {
		"data-bullet-type": bulletOptions.type,
	};

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

registerBlockType(metadata.name, {
	...metadata,
	icon: {
		src: <BlockIcon svg={blockIcon} />,
	},
	merge(attributes, attributesToMerge) {
		return {
			...attributes,
			content: `${attributes.content ?? ""}${attributesToMerge.content ?? ""}`,
		};
	},
	edit: ({
		attributes,
		setAttributes,
		context = {},
		clientId,
		onReplace,
		mergeBlocks,
		onRemove,
	}) => {
		const { content, overrideBullet } = attributes;

		const parentContextBulletOptions = context["motto/bulletOptions"];
		const localBulletOptions = useMemo(
			() => normalizeBulletOptions(attributes.bulletOptions),
			[attributes.bulletOptions]
		);
		const parentBulletOptions = useMemo(
			() => normalizeBulletOptions(parentContextBulletOptions),
			[parentContextBulletOptions]
		);
		const localBulletSignature = useMemo(
			() => JSON.stringify(localBulletOptions),
			[localBulletOptions]
		);
		const parentBulletSignature = useMemo(
			() => JSON.stringify(parentBulletOptions),
			[parentBulletOptions]
		);
		const resolvedBulletOptions = overrideBullet ? localBulletOptions : parentBulletOptions;
		const isCounterBullet = resolvedBulletOptions.type === "counter";
		const isNoneBullet = resolvedBulletOptions.type === "none";
		const isDefaultBullet = resolvedBulletOptions.type === "default";
		const counterStyleClass = isCounterBullet
			? ` motto-list-item__bullet--counter-${resolvedBulletOptions.counter.style}`
			: "";
		const noBulletClass = isNoneBullet ? " motto-list-item--no-bullet" : "";
		const defaultBulletClass = isDefaultBullet ? " motto-list-item--default" : "";

		useEffect(() => {
			if (overrideBullet) {
				return;
			}

			if (localBulletSignature !== parentBulletSignature) {
				setAttributes({ bulletOptions: parentBulletOptions });
			}
		}, [
			overrideBullet,
			localBulletSignature,
			parentBulletSignature,
			parentBulletOptions,
			setAttributes,
		]);

		const blockProps = useBlockProps({
			className: `motto-list-item ${BASE_LAYOUT_CLASS}${isCounterBullet ? " motto-list-item--counter" : ""}${noBulletClass}${defaultBulletClass}`,
		});
		const { children: nestedListChildren, ...innerBlocksProps } = useInnerBlocksProps(
			blockProps,
			{
				allowedBlocks: NESTED_ALLOWED_BLOCKS,
				template: [],
			}
		);

		return (
			<>
				<InspectorControls>
					<PanelBody
						title={__("List Item Settings", "motto-blocks")}
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
							<ToggleControl
								className="motto-toggle"
								label={__("Override parent bullet for this item", "motto-blocks")}
								checked={overrideBullet}
								onChange={(value) => setAttributes({ overrideBullet: value })}
							/>
							{overrideBullet && (
								<BulletSelector
									value={localBulletOptions}
									onChange={(nextBulletOptions) =>
										setAttributes({
											bulletOptions:
												normalizeBulletOptions(nextBulletOptions),
										})
									}
								/>
							)}
						</div>
					</PanelBody>
				</InspectorControls>

				<li
					{...innerBlocksProps}
					data-override-bullet={overrideBullet ? "true" : "false"}
					data-resolved-bullet-type={resolvedBulletOptions.type}
					{...getLocalBulletDataAttributes(overrideBullet, localBulletOptions)}
				>
					<span
						className={`motto-list-item__bullet${isCounterBullet ? " motto-list-item__bullet--counter" : ""}${counterStyleClass}`}
						aria-hidden="true"
					>
						{!isNoneBullet && !isDefaultBullet && !isCounterBullet && (
							<BulletMedia value={resolvedBulletOptions} />
						)}
					</span>
					<RichText
						identifier="content"
						tagName="span"
						className="motto-list-item__text"
						value={content}
						onChange={(value) => setAttributes({ content: value })}
						placeholder={__("Write list item...", "motto-blocks")}
						onSplit={(value, isOriginal) => {
							const block = createBlock("motto/list-item", { content: value });
							if (isOriginal) block.clientId = clientId;
							return block;
						}}
						onReplace={onReplace}
						onMerge={mergeBlocks}
						onRemove={onRemove}
					/>
					{nestedListChildren}
				</li>
			</>
		);
	},
	save: ({ attributes, context = {} }) => {
		const { content, overrideBullet } = attributes;

		const localBulletOptions = normalizeBulletOptions(attributes.bulletOptions);
		const parentBulletOptions = normalizeBulletOptions(context["motto/bulletOptions"]);
		const resolvedBulletOptions = overrideBullet
			? localBulletOptions
			: hasConfiguredBullet(localBulletOptions)
				? localBulletOptions
				: parentBulletOptions;
		const isCounterBullet = resolvedBulletOptions.type === "counter";
		const isNoneBullet = resolvedBulletOptions.type === "none";
		const isDefaultBullet = resolvedBulletOptions.type === "default";
		const counterStyleClass = isCounterBullet
			? ` motto-list-item__bullet--counter-${resolvedBulletOptions.counter.style}`
			: "";
		const noBulletClass = isNoneBullet ? " motto-list-item--no-bullet" : "";
		const defaultBulletClass = isDefaultBullet ? " motto-list-item--default" : "";

		const blockProps = useBlockProps.save({
			className: `motto-list-item ${BASE_LAYOUT_CLASS}${isCounterBullet ? " motto-list-item--counter" : ""}${noBulletClass}${defaultBulletClass}`,
		});
		const { children: nestedListChildren, ...innerBlocksProps } =
			useInnerBlocksProps.save(blockProps);

		return (
			<li
				{...innerBlocksProps}
				data-override-bullet={overrideBullet ? "true" : "false"}
				data-resolved-bullet-type={resolvedBulletOptions.type}
				{...getLocalBulletDataAttributes(overrideBullet, localBulletOptions)}
			>
				<span
					className={`motto-list-item__bullet${isCounterBullet ? " motto-list-item__bullet--counter" : ""}${counterStyleClass}`}
					aria-hidden="true"
				>
					{!isNoneBullet && !isDefaultBullet && !isCounterBullet && (
						<BulletMedia value={resolvedBulletOptions} />
					)}
				</span>
				<RichText.Content
					tagName="span"
					className="motto-list-item__text"
					value={content}
				/>
				{nestedListChildren}
			</li>
		);
	},
});
