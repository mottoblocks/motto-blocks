import metadata from "./block.json";
import { BlockIcon } from "@components/primitives/BlockIcon";
import blockIcon from "@block-icons/image.svg?raw";
import { createBlock, registerBlockType } from "@wordpress/blocks";
import {
	BlockControls,
	InspectorControls,
	MediaPlaceholder,
	MediaReplaceFlow,
	useBlockProps,
} from "@wordpress/block-editor";
import { FormToggle, PanelBody } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { useRef } from "@wordpress/element";
import { applyFilters } from "@wordpress/hooks";
import { BLOCKS_HOOKS } from "../freepro/blocks-freepro-ids";
import {
	getDynamicImageMode,
	hasDynamicImageSource,
	hasImageSource,
} from "@components/hooks/dynamic-image/dynamic-image-utils";
import { useDynamicImagePreview } from "@components/hooks/dynamic-image/use-dynamic-image-preview";
import { hasActivePatternOverride } from "@lib/pattern-overrides";
import { Image as ImageIcon } from "lucide-react";

import {
	ImageSourcePositionControl,
	mapFocalPointToPosition,
	normalizeImageSourcePositionValue,
} from "@components";
import { normalizeMediaSelection } from "@components/controls/image/ImageSourceControl.jsx";
import { getMottoBaseLayoutClassName } from "../../styler/layout/base-layout";

const BASE_LAYOUT_CLASS = getMottoBaseLayoutClassName(metadata.mottoBaseLayout);
const PARALLAX_CLASS_NAME = "is-parallax";
const DEFAULT_PARALLAX_OFFSET = 120;
const MIN_PARALLAX_OFFSET = 20;
const MAX_PARALLAX_OFFSET = 400;

function getImageDimensionsAttributes(image) {
	const width = Number(image?.width);
	const height = Number(image?.height);

	return {
		width: Number.isFinite(width) && width > 0 ? width : undefined,
		height: Number.isFinite(height) && height > 0 ? height : undefined,
	};
}

function getParallaxOffsetStyle(isParallaxEnabled, offset) {
	if (!isParallaxEnabled) {
		return undefined;
	}

	const parsed = Number.parseFloat(offset);
	const clamped = Number.isFinite(parsed)
		? Math.max(MIN_PARALLAX_OFFSET, Math.min(MAX_PARALLAX_OFFSET, parsed))
		: DEFAULT_PARALLAX_OFFSET;

	return { "--motto-parallax-offset": `${clamped}px` };
}

function Edit({ attributes, setAttributes, context }) {
	const image = normalizeImageSourcePositionValue({
		id: attributes.mediaId,
		url: attributes.url,
		alt: attributes.alt,
		title: attributes.title,
		width: attributes.width,
		height: attributes.height,
		sizeSlug: attributes.sizeSlug,
		sizes: attributes.sizes,
		position: attributes.objectPosition,
	});
	const blockProps = useBlockProps({
		className: `motto-image ${BASE_LAYOUT_CLASS}`,
	});
	const imageDimensions = getImageDimensionsAttributes(image);

	const { url: dynamicPreviewUrl } = useDynamicImagePreview(attributes.imageDynamic, context);
	const displayUrl = dynamicPreviewUrl || image.url;
	const isDynamicEnabled = Boolean(getDynamicImageMode(attributes.imageDynamic));
	const hasSource = hasImageSource({ url: image.url, dynamic: attributes.imageDynamic });
	const isParallaxEnabled = Boolean(attributes.imageParallax) && hasSource;
	const mediaRef = useRef(null);
	const showReplaceControl = !isDynamicEnabled && Boolean(image.url);

	const handlePlaceholderSelect = (media) => {
		const nextImage = normalizeMediaSelection(media, image);
		setAttributes({
			mediaId: nextImage.id,
			url: nextImage.url,
			alt: nextImage.alt,
			title: nextImage.title,
			width: nextImage.width,
			height: nextImage.height,
			sizeSlug: nextImage.sizeSlug,
			sizes: nextImage.sizes,
		});
	};

	const dynamicImgSection = applyFilters(BLOCKS_HOOKS.imageSourceDynamicSection, null, {
		context: "image-src",
		dynamic: attributes.imageDynamic || {},
		onChange: (next) => setAttributes({ imageDynamic: next }),
	});

	const parallaxSection = hasSource
		? applyFilters(BLOCKS_HOOKS.imageParallaxSection, null, {
				enabled: Boolean(attributes.imageParallax),
				offset: Number.isFinite(attributes.imageParallaxOffset)
					? attributes.imageParallaxOffset
					: DEFAULT_PARALLAX_OFFSET,
				mediaRef,
				onChange: ({ enabled, offset }) =>
					setAttributes({
						imageParallax: Boolean(enabled),
						imageParallaxOffset: Number.isFinite(offset)
							? offset
							: DEFAULT_PARALLAX_OFFSET,
					}),
			})
		: null;

	const staticImageSection = isDynamicEnabled ? (
		<div className="motto-panel-section">
			<p className="motto-section-help">
				{__(
					"Pattern overrides won't affect this image while a dynamic source is enabled — the dynamic source always takes precedence.",
					"motto-blocks"
				)}
			</p>
		</div>
	) : (
		<div className="motto-panel-section">
			<ImageSourcePositionControl
				value={image}
				previewUrl={dynamicPreviewUrl || undefined}
				onChange={(nextImage) =>
					setAttributes({
						mediaId: nextImage.id,
						url: nextImage.url,
						alt: nextImage.alt,
						title: nextImage.title,
						width: nextImage.width,
						height: nextImage.height,
						sizeSlug: nextImage.sizeSlug,
						sizes: nextImage.sizes,
						objectPosition: nextImage.position,
					})
				}
				i18nDomain="motto-blocks"
				focalPointLabel={__("Object position", "motto-blocks")}
				imageSourceControlProps={{
					labels: {
						placeholderTitle: __("Image", "motto-blocks"),
						placeholderInstructions: __(
							"Upload, pick from media library, or paste an image URL.",
							"motto-blocks"
						),
						urlAriaLabel: __("Image URL", "motto-blocks"),
						urlPlaceholder: __("Image URL", "motto-blocks"),
						replaceButtonLabel: __("Replace image", "motto-blocks"),
						removeButtonLabel: __("Remove image", "motto-blocks"),
						sizeLabel: __("Size version", "motto-blocks"),
					},
					showSizeSelector: true,
				}}
			/>
		</div>
	);
	const canvasContent = displayUrl ? (
		<img
			ref={mediaRef}
			className={`motto-image__media${isParallaxEnabled ? ` ${PARALLAX_CLASS_NAME}` : ""}`}
			src={displayUrl}
			alt={image.alt}
			title={image.title || undefined}
			style={{
				objectPosition: image.position,
				...getParallaxOffsetStyle(isParallaxEnabled, attributes.imageParallaxOffset),
			}}
			{...imageDimensions}
		/>
	) : isDynamicEnabled ? (
		<div className="motto-image__dynamic-placeholder motto-image__media" aria-hidden="true">
			<ImageIcon size={32} strokeWidth={1.5} />
		</div>
	) : (
		<MediaPlaceholder
			onSelect={handlePlaceholderSelect}
			accept="image/*"
			allowedTypes={["image"]}
			multiple={false}
			labels={{
				title: __("Image", "motto-blocks"),
				instructions: __(
					"Upload an image or choose one from the media library.",
					"motto-blocks"
				),
			}}
		/>
	);

	const hasImageOverride = hasActivePatternOverride(attributes, "url");

	const imageSourcePanel = (
		<PanelBody
			title={__("Image Source", "motto-blocks")}
			className="motto-panel-body"
			initialOpen={hasImageOverride}
		>
			{staticImageSection}
		</PanelBody>
	);

	return (
		<>
			{showReplaceControl ? (
				<BlockControls group="other">
					<MediaReplaceFlow
						mediaId={image.id}
						mediaURL={image.url}
						allowedTypes={["image"]}
						accept="image/*"
						onSelect={handlePlaceholderSelect}
						onSelectURL={(nextUrl) => handlePlaceholderSelect({ url: nextUrl })}
						name={__("Replace image", "motto-blocks")}
					/>
				</BlockControls>
			) : null}

			{/* "Image Source" only needs group="content" while editing motto/image as a
			synced-pattern instance with an active override (Gutenberg's "content only"
			editing mode hides every Inspector tab except this one — see
			docs/conventions/block-layout.md's "Native Pattern Overrides" section).
			Without an active override it stays in the default group below, in its
			usual spot — Dynamic Image / Parallax always live in their own default-group
			panels regardless, since neither is overridable per-instance. */}
			{hasImageOverride && (
				<InspectorControls group="content">{imageSourcePanel}</InspectorControls>
			)}

			<InspectorControls>
				{!hasImageOverride && imageSourcePanel}
				<PanelBody
					title={__("Dynamic Image", "motto-blocks")}
					className="motto-panel-body"
					initialOpen={false}
				>
					{dynamicImgSection !== null ? (
						dynamicImgSection
					) : (
						<div className="motto-panel-section">
							<div className="motto-section-heading">
								<div className="motto-section-title">
									<span className="motto-section-title-text">
										{__("Enable", "motto-blocks")}
									</span>
								</div>
								<div className="motto-section-actions gap-sm">
									<FormToggle
										disabled
										checked={false}
										aria-label={__("Enable (Pro feature)", "motto-blocks")}
									/>
									<span className="motto-badge motto-badge--pro">
										{__("PRO", "motto-blocks")}
									</span>
								</div>
							</div>
						</div>
					)}
				</PanelBody>
				{hasSource && (
					<PanelBody
						title={__("Parallax", "motto-blocks")}
						className="motto-panel-body"
						initialOpen={false}
					>
						{parallaxSection !== null ? (
							parallaxSection
						) : (
							<div className="motto-panel-section">
								<div className="motto-section-heading">
									<div className="motto-section-title">
										<span className="motto-section-title-text">
											{__("Enable", "motto-blocks")}
										</span>
									</div>
									<div className="motto-section-actions gap-sm">
										<FormToggle
											disabled
											checked={false}
											aria-label={__("Enable (Pro feature)", "motto-blocks")}
										/>
										<span className="motto-badge motto-badge--pro">
											{__("PRO", "motto-blocks")}
										</span>
									</div>
								</div>
							</div>
						)}
					</PanelBody>
				)}
			</InspectorControls>

			<div {...blockProps}>{canvasContent}</div>
		</>
	);
}

const transforms = {
	from: [
		{
			type: "block",
			blocks: ["core/image"],
			transform: ({ id, url, alt, title, width, height, sizeSlug, focalPoint }) =>
				createBlock("motto/image", {
					mediaId: id || 0,
					url: url || "",
					alt: alt || "",
					title: title || "",
					width: Number(width) || 0,
					height: Number(height) || 0,
					sizeSlug: sizeSlug || "",
					sizes: [],
					objectPosition: mapFocalPointToPosition(focalPoint),
				}),
		},
	],
};

// Pre-SDD-025 shape: the whole image selection lived in one comment-persisted
// `image` object attribute, so pattern-overrides had no flat/markup-derived
// field to bind to. migrate() reads that object (still available here, before
// WP re-parses against the current flat schema) to recover mediaId/width/
// height/sizeSlug/sizes, which aren't recoverable from the saved <img> markup.
const deprecated = [
	{
		attributes: {
			image: {
				type: "object",
				default: {
					id: 0,
					url: "",
					alt: "",
					title: "",
					width: 0,
					height: 0,
					sizeSlug: "",
					sizes: [],
				},
			},
			objectPosition: metadata.attributes.objectPosition,
			mottoStyler: metadata.attributes.mottoStyler,
			imageDynamic: metadata.attributes.imageDynamic,
			imageParallax: metadata.attributes.imageParallax,
			imageParallaxOffset: metadata.attributes.imageParallaxOffset,
		},
		supports: metadata.supports,
		save: ({ attributes }) => {
			const image = normalizeImageSourcePositionValue({
				...attributes.image,
				position: attributes.objectPosition,
			});
			const hasDynamicSource = hasDynamicImageSource(attributes.imageDynamic);

			if (!image.url && !hasDynamicSource) {
				return null;
			}

			const blockProps = useBlockProps.save({
				className: `motto-image ${BASE_LAYOUT_CLASS}`,
			});
			const imageDimensions = getImageDimensionsAttributes(image);

			return (
				<div {...blockProps}>
					{image.url ? (
						<img
							className={`motto-image__media${attributes.imageParallax ? ` ${PARALLAX_CLASS_NAME}` : ""}`}
							src={image.url}
							alt={image.alt}
							title={image.title || undefined}
							style={{
								objectPosition: image.position,
								...getParallaxOffsetStyle(
									attributes.imageParallax,
									attributes.imageParallaxOffset
								),
							}}
							{...imageDimensions}
						/>
					) : null}
				</div>
			);
		},
		migrate: (attributes) => {
			const oldImage = attributes.image || {};
			return {
				objectPosition: attributes.objectPosition,
				mottoStyler: attributes.mottoStyler,
				imageDynamic: attributes.imageDynamic,
				imageParallax: attributes.imageParallax,
				imageParallaxOffset: attributes.imageParallaxOffset,
				mediaId: Number(oldImage.id) || 0,
				url: oldImage.url || "",
				alt: oldImage.alt || "",
				title: oldImage.title || "",
				width: Number(oldImage.width) || 0,
				height: Number(oldImage.height) || 0,
				sizeSlug: oldImage.sizeSlug || "",
				sizes: Array.isArray(oldImage.sizes) ? oldImage.sizes : [],
			};
		},
	},
];

registerBlockType(metadata.name, {
	...metadata,
	icon: {
		src: <BlockIcon svg={blockIcon} />,
	},
	transforms,
	deprecated,
	edit: Edit,
	save: ({ attributes }) => {
		const { url, alt, title, width, height, objectPosition } = attributes;
		const hasDynamicSource = hasDynamicImageSource(attributes.imageDynamic);

		if (!url && !hasDynamicSource) {
			return null;
		}

		const blockProps = useBlockProps.save({
			className: `motto-image ${BASE_LAYOUT_CLASS}`,
		});
		const imageDimensions = getImageDimensionsAttributes({ width, height });

		return (
			<div {...blockProps}>
				{url ? (
					<img
						className={`motto-image__media${attributes.imageParallax ? ` ${PARALLAX_CLASS_NAME}` : ""}`}
						src={url}
						alt={alt}
						title={title || undefined}
						style={{
							objectPosition,
							...getParallaxOffsetStyle(
								attributes.imageParallax,
								attributes.imageParallaxOffset
							),
						}}
						{...imageDimensions}
					/>
				) : null}
			</div>
		);
	},
});
