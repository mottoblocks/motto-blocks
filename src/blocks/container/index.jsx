import metadata from "./block.json";
import { BlockIcon } from "@components/primitives/BlockIcon";
import blockIcon from "@block-icons/container.svg?raw";
import { createBlock, registerBlockType } from "@wordpress/blocks";
import {
	InspectorControls,
	InnerBlocks,
	useBlockProps,
	useInnerBlocksProps,
} from "@wordpress/block-editor";
import { FormToggle, PanelBody, RangeControl, SelectControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { useSelect, resolveSelect } from "@wordpress/data";
import { applyFilters } from "@wordpress/hooks";
import { BLOCKS_HOOKS } from "../freepro/blocks-freepro-ids";
import {
	hasImageSource,
	hasDynamicImageSource,
} from "@components/hooks/dynamic-image/dynamic-image-utils";
import { hasDynamicLinkSource } from "@components/controls/link/dynamic-link-utils";
import { hasActivePatternOverride } from "@lib/pattern-overrides";
import { useDynamicImagePreview } from "@components/hooks/dynamic-image/use-dynamic-image-preview";
import { BackgroundImageLayerControl, OverlayColorControl } from "@components";
import { MottoLinkControl } from "@components/controls/link/motto-link-control";
import { getMottoBaseLayoutClassName } from "../../styler/layout/base-layout";
import { useEffectiveMottoOrientation } from "../../styler/hooks/use-effective-orientation";
import { useScrollParallaxPreview } from "@components/hooks/use-scroll-parallax-preview";

const TAG_OPTIONS = [
	{ label: "div", value: "div" },
	{ label: "section", value: "section" },
	{ label: "article", value: "article" },
	{ label: "main", value: "main" },
	{ label: "header", value: "header" },
	{ label: "footer", value: "footer" },
	{ label: "aside", value: "aside" },
];

const PARALLAX_CLASS_NAME = "is-parallax";
const DEFAULT_PARALLAX_OFFSET = 120;
const MIN_PARALLAX_OFFSET = 20;
const MAX_PARALLAX_OFFSET = 400;
const BASE_LAYOUT_CLASS = getMottoBaseLayoutClassName(metadata.mottoBaseLayout);
const MULTI_BLOCK_ALIGNMENTS = ["wide", "full"];
const DEFAULT_BACKGROUND_POSITION = "center center";
const MEDIA_FOCUS_POINT_META_KEY = "bg_pos_desktop";
const MEDIA_FOCUS_POINT_NOOP_VALUE = "50% 50%";

function MottoInlineSelect({ label, value, options, onChange }) {
	return (
		<div className="motto-inline-select">
			<span className="motto-inline-select-label">{label}</span>
			<SelectControl
				className="motto-select motto-inline-select-control"
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				value={value}
				options={options}
				onChange={onChange}
				aria-label={label}
			/>
		</div>
	);
}

function mapPositionToFocalPoint(position) {
	const percentageMatch = String(position || "")
		.trim()
		.match(/^(-?\d+)%\s+(-?\d+)%$/);
	if (percentageMatch) {
		const x = Number.parseInt(percentageMatch[1], 10);
		const y = Number.parseInt(percentageMatch[2], 10);
		if (Number.isFinite(x) && Number.isFinite(y)) {
			return {
				x: Math.max(0, Math.min(1, x / 100)),
				y: Math.max(0, Math.min(1, y / 100)),
			};
		}
	}

	const map = {
		"left top": { x: 0, y: 0 },
		"center top": { x: 0.5, y: 0 },
		"right top": { x: 1, y: 0 },
		"left center": { x: 0, y: 0.5 },
		"center center": { x: 0.5, y: 0.5 },
		"right center": { x: 1, y: 0.5 },
		"left bottom": { x: 0, y: 1 },
		"center bottom": { x: 0.5, y: 1 },
		"right bottom": { x: 1, y: 1 },
	};

	return map[position] || { x: 0.5, y: 0.5 };
}

function isDefaultBackgroundPosition(position) {
	return !position || position === DEFAULT_BACKGROUND_POSITION;
}

// The "Media Focus Point" plugin (bg_pos_desktop postmeta) writes "50% 50%"
// whenever an attachment's details are saved, even if the user never touched
// the focus point picker — treat that value as "no real focus point set".
function normalizeMediaFocusPointPosition(rawValue) {
	const value = String(rawValue || "").trim();
	return value && value !== MEDIA_FOCUS_POINT_NOOP_VALUE ? value : null;
}

function normalizeUploadedMediaUrlForCurrentSite(rawUrl) {
	if (typeof rawUrl !== "string") {
		return "";
	}

	const urlValue = rawUrl.trim();
	if (!urlValue) {
		return "";
	}

	if (typeof window === "undefined" || !window.location || !/^https?:\/\//i.test(urlValue)) {
		return urlValue;
	}

	try {
		const parsedUrl = new URL(urlValue);
		const currentOrigin = window.location.origin;
		const isWpUpload = parsedUrl.pathname.includes("/wp-content/uploads/");
		if (isWpUpload && parsedUrl.origin !== currentOrigin) {
			return `${currentOrigin}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
		}
	} catch {
		return urlValue;
	}

	return urlValue;
}

function containerBackgroundNeedsDivFallback(attributes) {
	const repeat = attributes.backgroundRepeat;
	return Boolean(
		(repeat && repeat !== "no-repeat") || attributes.backgroundAttachment === "fixed"
	);
}

function mapBackgroundSizeToObjectFit(backgroundSize) {
	if (backgroundSize === "contain") {
		return "contain";
	}
	if (backgroundSize === "auto") {
		return "none";
	}
	return "cover";
}

function getBackgroundImageStyles(attributes, options = {}) {
	const { quoteUrl = true, normalizeSiteOrigin = true, asImg = false } = options;
	const sourceBackgroundUrl = attributes.backgroundImageUrl;
	if (!sourceBackgroundUrl) {
		return undefined;
	}

	const backgroundUrl = normalizeSiteOrigin
		? normalizeUploadedMediaUrlForCurrentSite(sourceBackgroundUrl)
		: String(sourceBackgroundUrl);
	const focalPoint = attributes.backgroundFocalPoint;
	const hasValidFocalPoint =
		focalPoint && Number.isFinite(focalPoint.x) && Number.isFinite(focalPoint.y);
	const backgroundPosition = hasValidFocalPoint
		? `${Math.round(focalPoint.x * 100)}% ${Math.round(focalPoint.y * 100)}%`
		: attributes.backgroundPosition || "center center";
	const parsedParallaxOffset = Number.parseFloat(attributes.backgroundParallaxOffset);
	const parallaxOffset = Number.isFinite(parsedParallaxOffset)
		? Math.max(MIN_PARALLAX_OFFSET, Math.min(MAX_PARALLAX_OFFSET, parsedParallaxOffset))
		: DEFAULT_PARALLAX_OFFSET;

	// Parallax's offset only ever expands `inset` (extra image real-estate to
	// translate within) — it never feeds into background/object position.
	// That stays the scroll-independent focal point in both branches.
	if (asImg) {
		return {
			objectFit: mapBackgroundSizeToObjectFit(attributes.backgroundSize),
			objectPosition: backgroundPosition,
			"--motto-parallax-offset": `${parallaxOffset}px`,
		};
	}

	return {
		backgroundImage: quoteUrl ? `url("${backgroundUrl}")` : `url(${backgroundUrl})`,
		backgroundPosition,
		backgroundSize: attributes.backgroundSize || "cover",
		backgroundRepeat: attributes.backgroundRepeat || "no-repeat",
		backgroundAttachment: attributes.backgroundAttachment || "scroll",
		"--motto-parallax-offset": `${parallaxOffset}px`,
	};
}

function getOverlayStyles(attributes) {
	const opacity = Number.isFinite(attributes.overlayOpacity) ? attributes.overlayOpacity : 0.4;
	const activeFillType = getActiveOverlayFillType(attributes);
	if (activeFillType === "gradient") {
		return {
			backgroundImage: attributes.overlayGradient || "",
			opacity,
		};
	}

	return {
		backgroundColor: attributes.overlayColor || "",
		opacity,
	};
}

function getActiveOverlayFillType(attributes) {
	const preferredType = attributes.overlayStyle === "gradient" ? "gradient" : "color";
	const hasColor = Boolean(attributes.overlayColor);
	const hasGradient = Boolean(attributes.overlayGradient);

	if (preferredType === "gradient" && hasGradient) {
		return "gradient";
	}

	if (preferredType === "color" && hasColor) {
		return "color";
	}

	if (hasGradient) {
		return "gradient";
	}

	if (hasColor) {
		return "color";
	}

	return null;
}

function getWidestSelectedAlignment(blocks = []) {
	return blocks.reduce((widestAlignment, block) => {
		const nextAlignment = block?.attributes?.align;
		return MULTI_BLOCK_ALIGNMENTS.indexOf(nextAlignment) >
			MULTI_BLOCK_ALIGNMENTS.indexOf(widestAlignment)
			? nextAlignment
			: widestAlignment;
	}, undefined);
}

function cloneSelectedBlocks(blocks = []) {
	return blocks.map((block) => createBlock(block.name, block.attributes, block.innerBlocks));
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
				isMultiBlock: true,
				blocks: ["*"],
				__experimentalConvert: (blocks = []) => {
					const widestAlignment = getWidestSelectedAlignment(blocks);

					return createBlock(
						metadata.name,
						widestAlignment ? { align: widestAlignment } : {},
						cloneSelectedBlocks(blocks)
					);
				},
			},
			{
				type: "block",
				blocks: ["core/group", "core/columns", "core/cover"],
				transform: (attributes = {}, innerBlocks = []) =>
					createBlock(
						metadata.name,
						{
							tagName: attributes?.tagName || "div",
						},
						innerBlocks
					),
			},
		],
		ungroup: (attributes, innerBlocks) => {
			void attributes;
			return Array.isArray(innerBlocks) ? innerBlocks : [];
		},
	},
	edit: ({ attributes, setAttributes, context }) => {
		const TagName = attributes.tagName || "div";
		const hasBackgroundSource = hasImageSource({
			url: attributes.backgroundImageUrl,
			dynamic: attributes.backgroundDynamic,
		});
		const parsedParallaxOffset = Number.parseFloat(attributes.backgroundParallaxOffset);
		const parallaxOffset = Number.isFinite(parsedParallaxOffset)
			? Math.max(MIN_PARALLAX_OFFSET, Math.min(MAX_PARALLAX_OFFSET, parsedParallaxOffset))
			: DEFAULT_PARALLAX_OFFSET;
		const dynamicBgPreview = useDynamicImagePreview(attributes.backgroundDynamic, context);
		const dynamicBgPreviewUrl = dynamicBgPreview.url;
		const isDynamicBackground = hasDynamicImageSource(attributes.backgroundDynamic);
		const focusPointAttachmentId = isDynamicBackground
			? dynamicBgPreview.id
			: Number.isFinite(attributes.backgroundImageId)
				? attributes.backgroundImageId
				: 0;
		const backgroundPositionIsCustomized = !isDefaultBackgroundPosition(
			attributes.backgroundPosition
		);
		// Editor-only fallback: if the user never customized the focal point, use
		// the focus point already defined on the source attachment (static or
		// resolved dynamic id) as a live preview. Persisted for static images in
		// updateBackgroundLayer; resolved per-request on the frontend for dynamic
		// images in the Pro render filter, since the attachment id varies per post.
		const focusPointMedia = useSelect(
			(select) =>
				!backgroundPositionIsCustomized && focusPointAttachmentId > 0
					? select("core").getEntityRecord(
							"postType",
							"attachment",
							focusPointAttachmentId,
							{
								context: "view",
							}
						)
					: null,
			[focusPointAttachmentId, backgroundPositionIsCustomized]
		);
		const focusPointFallbackPosition = backgroundPositionIsCustomized
			? null
			: normalizeMediaFocusPointPosition(focusPointMedia?.meta?.[MEDIA_FOCUS_POINT_META_KEY]);
		const displayAttributes = {
			...attributes,
			...(dynamicBgPreviewUrl
				? { backgroundImageUrl: dynamicBgPreviewUrl, backgroundImageEnabled: true }
				: {}),
			...(focusPointFallbackPosition
				? {
						backgroundPosition: focusPointFallbackPosition,
						backgroundFocalPoint: mapPositionToFocalPoint(focusPointFallbackPosition),
					}
				: {}),
		};
		const { containerRef, layerRef } = useScrollParallaxPreview({
			enabled: Boolean(attributes.backgroundParallax && hasBackgroundSource),
			offset: parallaxOffset,
			sourceKey: displayAttributes.backgroundImageUrl || "",
		});
		const blockProps = useBlockProps({
			className: `motto-container ${BASE_LAYOUT_CLASS}`,
			ref: containerRef,
		});
		const usedLayout = attributes.layout || { type: "default" };
		const orientation = useEffectiveMottoOrientation(attributes, metadata.mottoBaseLayout);
		const innerBlocksProps = useInnerBlocksProps(blockProps, {
			layout: usedLayout,
			orientation,
		});
		const { children: innerBlocksChildren, ...containerProps } = innerBlocksProps;
		const backgroundUsesDivFallback = containerBackgroundNeedsDivFallback(displayAttributes);
		const backgroundImageStyles = getBackgroundImageStyles(displayAttributes, {
			asImg: !backgroundUsesDivFallback,
		});
		const isBackgroundImageEnabled = Boolean(
			displayAttributes.backgroundImageEnabled || displayAttributes.backgroundImageUrl
		);
		const showParallaxControls = hasBackgroundSource;
		const backgroundLayer = {
			id: Number.isFinite(attributes.backgroundImageId) ? attributes.backgroundImageId : 0,
			url: attributes.backgroundImageUrl || "",
			position: attributes.backgroundPosition || "center center",
			size: attributes.backgroundSize || "cover",
			repeat: attributes.backgroundRepeat || "no-repeat",
			attachment: attributes.backgroundAttachment || "scroll",
			dynamic: attributes.backgroundDynamic || {},
		};

		const dynamicBgSection = applyFilters(BLOCKS_HOOKS.imageSourceDynamicSection, null, {
			context: "container-bg",
			dynamic: attributes.backgroundDynamic || {},
			onChange: (next) => setAttributes({ backgroundDynamic: next }),
		});

		const updateBackgroundLayer = (nextLayer) => {
			const layer = nextLayer && typeof nextLayer === "object" ? nextLayer : {};
			const nextUrl = String(layer.url || "");
			const nextDynamic =
				layer.dynamic && typeof layer.dynamic === "object"
					? layer.dynamic
					: attributes.backgroundDynamic || {};
			const nextHasBackgroundSource = hasImageSource({
				url: nextUrl,
				dynamic: nextDynamic,
			});
			const nextPosition = String(layer.position || "center center");
			const nextSize = String(layer.size || "cover");
			const nextRepeat = String(layer.repeat || "no-repeat");
			const nextAttachment = String(layer.attachment || "scroll");
			const nextId = Number.isFinite(Number(layer.id)) ? Number(layer.id) : 0;
			const isNewStaticImageSelection =
				nextHasBackgroundSource && nextId > 0 && nextId !== attributes.backgroundImageId;
			const positionWasDefault = isDefaultBackgroundPosition(attributes.backgroundPosition);

			setAttributes({
				backgroundImageUrl: nextUrl,
				backgroundImageEnabled: nextHasBackgroundSource,
				backgroundPosition: nextPosition,
				backgroundSize: nextSize,
				backgroundRepeat: nextRepeat,
				backgroundAttachment: nextAttachment,
				backgroundFocalPoint: mapPositionToFocalPoint(nextPosition),
				...(nextHasBackgroundSource ? {} : { backgroundParallax: false }),
				backgroundImageId: nextUrl ? nextId : 0,
			});

			// Bake the source attachment's focus point (if any) into the saved
			// attributes so the static frontend HTML reflects it too — save() is
			// pure and can't read attachment meta at render time.
			if (isNewStaticImageSelection && positionWasDefault) {
				resolveSelect("core")
					.getEntityRecord("postType", "attachment", nextId, { context: "view" })
					.then((media) => {
						const focusPosition = normalizeMediaFocusPointPosition(
							media?.meta?.[MEDIA_FOCUS_POINT_META_KEY]
						);
						if (focusPosition) {
							setAttributes({
								backgroundPosition: focusPosition,
								backgroundFocalPoint: mapPositionToFocalPoint(focusPosition),
							});
						}
					})
					.catch(() => {});
			}
		};

		const isLinkDynamic = hasDynamicLinkSource(attributes.linkDynamic);
		const hasLinkOverride = hasActivePatternOverride(attributes, "linkContainerUrl");

		const containerLinkPanelBody =
			hasLinkOverride && isLinkDynamic ? (
				<div className="motto-panel-section">
					<p className="motto-section-help">
						{__(
							"Pattern overrides won't affect this link while a dynamic source is enabled — the dynamic source always takes precedence.",
							"motto-blocks"
						)}
					</p>
				</div>
			) : (
				<div className="motto-panel-section">
					<MottoLinkControl
						variant="link-control"
						url={attributes.linkContainerUrl || ""}
						onUrlChange={(linkContainerUrl) => setAttributes({ linkContainerUrl })}
						opensInNewTab={Boolean(attributes.linkContainerNewTab)}
						onOpensInNewTabChange={(linkContainerNewTab) =>
							setAttributes({ linkContainerNewTab })
						}
						noFollow={Boolean(attributes.linkContainerNoFollow)}
						onNoFollowChange={(linkContainerNoFollow) =>
							setAttributes({ linkContainerNoFollow })
						}
						dynamic={attributes.linkDynamic || {}}
					/>
				</div>
			);
		const containerLinkPanel = (
			<PanelBody
				title={__("Container Link", "motto-blocks")}
				className="motto-panel-body"
				initialOpen={hasLinkOverride}
			>
				{containerLinkPanelBody}
			</PanelBody>
		);

		return (
			<>
				{/* URL/new-tab/no-follow are all role:"content" (SDD-032, parity with
				core/button's url/linkTarget/rel), so once "Enable overrides" is on for
				this container, the whole "Container Link" panel has to live in
				group="content" to stay visible while editing a synced-pattern instance
				(Gutenberg's "content only" editing mode hides every other Inspector tab
				— see docs/conventions/block-layout.md's "Native Pattern Overrides"
				section). Without an active override it stays in the default group,
				in its original position, as a single unified panel either way — the
				Dynamic Link source (Pro) is never overridable, so it always lives in
				its own panel below regardless of override state. */}
				{hasLinkOverride && (
					<InspectorControls group="content">{containerLinkPanel}</InspectorControls>
				)}
				<InspectorControls>
					<PanelBody
						title={__("Container Settings", "motto-blocks")}
						className="motto-panel-body"
						initialOpen
					>
						<div className="motto-panel-section">
							<div className="motto-section-heading">
								<div className="motto-section-title">
									<span className="motto-section-title-text">
										{__("Structure", "motto-blocks")}
									</span>
								</div>
							</div>
							<MottoInlineSelect
								label={__("Tag", "motto-blocks")}
								value={attributes.tagName || "div"}
								options={TAG_OPTIONS}
								onChange={(tagName) => setAttributes({ tagName })}
							/>
						</div>
					</PanelBody>
					<PanelBody
						title={__("Background and Effects", "motto-blocks")}
						className="motto-panel-body"
						initialOpen={false}
					>
						<div className="motto-panel-section">
							<BackgroundImageLayerControl
								layer={backgroundLayer}
								onChange={updateBackgroundLayer}
								previewUrl={dynamicBgPreviewUrl || undefined}
								i18nDomain="motto-blocks"
								isDynamicSourceActive={isDynamicBackground}
							/>
						</div>
						{dynamicBgSection !== null ? (
							dynamicBgSection
						) : (
							<div className="motto-panel-section">
								<div className="motto-section-heading">
									<div className="motto-section-title">
										<span className="motto-section-title-text">
											{__("Dynamic source", "motto-blocks")}
										</span>
									</div>
									<div className="motto-section-actions gap-sm">
										<FormToggle
											disabled
											checked={false}
											aria-label={__(
												"Dynamic source (Pro feature)",
												"motto-blocks"
											)}
										/>
										<span className="motto-badge motto-badge--pro">
											{__("PRO", "motto-blocks")}
										</span>
									</div>
								</div>
							</div>
						)}
						{showParallaxControls && (
							<div className="motto-panel-section">
								<div className="motto-section-heading">
									<div className="motto-section-title">
										<span className="motto-section-title-text">
											{__("Parallax", "motto-blocks")}
										</span>
									</div>
									<div className="motto-section-actions">
										<FormToggle
											checked={Boolean(attributes.backgroundParallax)}
											onChange={(event) => {
												const backgroundParallax = Boolean(
													event?.target?.checked
												);
												setAttributes({ backgroundParallax });
											}}
											aria-label={__("Enable parallax", "motto-blocks")}
										/>
									</div>
								</div>
								{attributes.backgroundParallax && (
									<RangeControl
										label={__("Offset (px)", "motto-blocks")}
										__next40pxDefaultSize
										__nextHasNoMarginBottom
										value={
											Number.isFinite(attributes.backgroundParallaxOffset)
												? attributes.backgroundParallaxOffset
												: DEFAULT_PARALLAX_OFFSET
										}
										onChange={(backgroundParallaxOffset) =>
											setAttributes({
												backgroundParallaxOffset: Number.isFinite(
													backgroundParallaxOffset
												)
													? backgroundParallaxOffset
													: DEFAULT_PARALLAX_OFFSET,
											})
										}
										min={MIN_PARALLAX_OFFSET}
										max={MAX_PARALLAX_OFFSET}
										step={1}
									/>
								)}
							</div>
						)}
						<div className="motto-panel-section">
							<div className="motto-section-heading">
								<div className="motto-section-title">
									<span className="motto-section-title-text">
										{__("Overlay", "motto-blocks")}
									</span>
								</div>
								<div className="motto-section-actions">
									<FormToggle
										checked={Boolean(attributes.overlayEnabled)}
										onChange={(event) => {
											const overlayEnabled = Boolean(event?.target?.checked);
											setAttributes({
												overlayEnabled,
												overlayColor:
													overlayEnabled && !attributes.overlayColor
														? "#000000"
														: attributes.overlayColor,
											});
										}}
										aria-label={__("Enable overlay", "motto-blocks")}
									/>
								</div>
							</div>
							{attributes.overlayEnabled && (
								<>
									<OverlayColorControl
										label={__("Opacity", "motto-blocks")}
										value={
											Number.isFinite(attributes.overlayOpacity)
												? attributes.overlayOpacity
												: 0.4
										}
										onChange={(overlayOpacity) =>
											setAttributes({
												overlayOpacity: Number.isFinite(overlayOpacity)
													? overlayOpacity
													: 0,
											})
										}
										min={0}
										max={1}
										step={0.05}
										colorLabel={__("Background", "motto-blocks")}
										colorValue={attributes.overlayColor}
										gradientValue={attributes.overlayGradient}
										onColorChange={(overlayColor) =>
											setAttributes({
												overlayStyle: "color",
												overlayColor: overlayColor || undefined,
												overlayGradient: undefined,
											})
										}
										onGradientChange={(overlayGradient) =>
											setAttributes({
												overlayStyle: "gradient",
												overlayGradient: overlayGradient || undefined,
												overlayColor: undefined,
											})
										}
									/>
								</>
							)}
						</div>
					</PanelBody>
					{!hasLinkOverride && containerLinkPanel}
					<PanelBody
						title={__("Dynamic Link", "motto-blocks")}
						className="motto-panel-body"
						initialOpen={false}
					>
						<div className="motto-panel-section">
							<MottoLinkControl
								variant="link-control"
								dynamic={attributes.linkDynamic || {}}
								onDynamicChange={(linkDynamic) => setAttributes({ linkDynamic })}
								dynamicOnly
								dynamicLabel={__("Enable", "motto-blocks")}
							/>
						</div>
					</PanelBody>
				</InspectorControls>
				<TagName {...containerProps}>
					{isBackgroundImageEnabled &&
						displayAttributes.backgroundImageUrl &&
						(backgroundUsesDivFallback ? (
							<div
								className={`motto-container__bg-media${attributes.backgroundParallax ? ` ${PARALLAX_CLASS_NAME}` : ""}`}
								style={backgroundImageStyles}
								ref={layerRef}
								aria-hidden="true"
							/>
						) : (
							<div className="motto-container__bg-media" aria-hidden="true">
								<img
									src={displayAttributes.backgroundImageUrl}
									alt=""
									className={
										attributes.backgroundParallax
											? PARALLAX_CLASS_NAME
											: undefined
									}
									style={backgroundImageStyles}
									ref={layerRef}
								/>
							</div>
						))}
					{hasDynamicImageSource(attributes.backgroundDynamic) &&
						!dynamicBgPreviewUrl && (
							<div
								className="motto-container__bg-dynamic-placeholder"
								aria-hidden="true"
							>
								<span className="motto-container__bg-dynamic-placeholder-badge">
									{__("Dynamic BG", "motto-blocks")}
								</span>
							</div>
						)}
					{attributes.overlayEnabled && getActiveOverlayFillType(attributes) && (
						<div
							className="motto-container__bg-overlay"
							style={getOverlayStyles(attributes)}
							aria-hidden="true"
						/>
					)}
					{innerBlocksChildren}
					{(attributes.linkContainerUrl ||
						hasDynamicLinkSource(attributes.linkDynamic)) && (
						<a
							className={`motto-container__link-overlay is-editor-preview${hasDynamicLinkSource(attributes.linkDynamic) && !attributes.linkContainerUrl ? " is-dynamic-preview" : ""}`}
							href={attributes.linkContainerUrl || "#"}
							target={attributes.linkContainerNewTab ? "_blank" : undefined}
							rel={
								attributes.linkContainerNoFollow
									? "noreferrer nofollow"
									: "noreferrer"
							}
							aria-label={__("Container link", "motto-blocks")}
						/>
					)}
				</TagName>
			</>
		);
	},
	save: ({ attributes }) => {
		const TagName = attributes.tagName || "div";
		const blockProps = useBlockProps.save({
			className: `motto-container ${BASE_LAYOUT_CLASS}`,
		});
		const backgroundUsesDivFallback = containerBackgroundNeedsDivFallback(attributes);
		const backgroundImageStyles = getBackgroundImageStyles(attributes, {
			normalizeSiteOrigin: false,
			asImg: !backgroundUsesDivFallback,
		});
		const isBackgroundImageEnabled = Boolean(
			attributes.backgroundImageEnabled || attributes.backgroundImageUrl
		);

		return (
			<TagName {...blockProps}>
				<InnerBlocks.Content />
				{isBackgroundImageEnabled &&
					attributes.backgroundImageUrl &&
					(backgroundUsesDivFallback ? (
						<div
							className={`motto-container__bg-media${attributes.backgroundParallax ? ` ${PARALLAX_CLASS_NAME}` : ""}`}
							style={backgroundImageStyles}
							aria-hidden="true"
						/>
					) : (
						<div className="motto-container__bg-media" aria-hidden="true">
							<img
								src={attributes.backgroundImageUrl}
								alt=""
								className={
									attributes.backgroundParallax ? PARALLAX_CLASS_NAME : undefined
								}
								style={backgroundImageStyles}
							/>
						</div>
					))}
				{attributes.overlayEnabled && getActiveOverlayFillType(attributes) && (
					<div
						className="motto-container__bg-overlay"
						style={getOverlayStyles(attributes)}
						aria-hidden="true"
					/>
				)}
				{attributes.linkContainerUrl && (
					<a
						className="motto-container__link-overlay"
						href={attributes.linkContainerUrl}
						target={attributes.linkContainerNewTab ? "_blank" : undefined}
						rel={
							attributes.linkContainerNoFollow ? "noreferrer nofollow" : "noreferrer"
						}
						aria-label={__("Container link", "motto-blocks")}
					/>
				)}
			</TagName>
		);
	},
	deprecated: [
		{
			// Pre-fix shape: bg-media/bg-overlay rendered before InnerBlocks.Content.
			// WP core's wp_render_layout_support_flag() picks "the last complete tag
			// before the first inner block" as the layout-classes target — with
			// bg-media/bg-overlay first, it misapplied `is-layout-constrained` (and the
			// unique max-width-carrying class) to the decorative overlay div instead of
			// real content, so the "Inner blocks use content width" toggle never
			// actually clamped anything on the frontend (editor was unaffected since it
			// wires layout via React props, not this markup heuristic). Kept only to
			// validate/migrate already-published content; new saves use the reordered
			// shape above.
			save: ({ attributes }) => {
				const TagName = attributes.tagName || "div";
				const blockProps = useBlockProps.save({
					className: `motto-container ${BASE_LAYOUT_CLASS}`,
				});
				const backgroundUsesDivFallback = containerBackgroundNeedsDivFallback(attributes);
				const backgroundImageStyles = getBackgroundImageStyles(attributes, {
					normalizeSiteOrigin: false,
					asImg: !backgroundUsesDivFallback,
				});
				const isBackgroundImageEnabled = Boolean(
					attributes.backgroundImageEnabled || attributes.backgroundImageUrl
				);

				return (
					<TagName {...blockProps}>
						{isBackgroundImageEnabled &&
							attributes.backgroundImageUrl &&
							(backgroundUsesDivFallback ? (
								<div
									className={`motto-container__bg-media${attributes.backgroundParallax ? ` ${PARALLAX_CLASS_NAME}` : ""}`}
									style={backgroundImageStyles}
									aria-hidden="true"
								/>
							) : (
								<div className="motto-container__bg-media" aria-hidden="true">
									<img
										src={attributes.backgroundImageUrl}
										alt=""
										className={
											attributes.backgroundParallax
												? PARALLAX_CLASS_NAME
												: undefined
										}
										style={backgroundImageStyles}
									/>
								</div>
							))}
						{attributes.overlayEnabled && getActiveOverlayFillType(attributes) && (
							<div
								className="motto-container__bg-overlay"
								style={getOverlayStyles(attributes)}
								aria-hidden="true"
							/>
						)}
						<InnerBlocks.Content />
						{attributes.linkContainerUrl && (
							<a
								className="motto-container__link-overlay"
								href={attributes.linkContainerUrl}
								target={attributes.linkContainerNewTab ? "_blank" : undefined}
								rel={
									attributes.linkContainerNoFollow
										? "noreferrer nofollow"
										: "noreferrer"
								}
								aria-label={__("Container link", "motto-blocks")}
							/>
						)}
					</TagName>
				);
			},
		},
		{
			save: ({ attributes }) => {
				const TagName = attributes.tagName || "div";
				const blockProps = useBlockProps.save({
					className: `motto-container ${BASE_LAYOUT_CLASS}`,
				});
				const backgroundImageStyles = getBackgroundImageStyles(attributes, {
					normalizeSiteOrigin: false,
				});
				const isBackgroundImageEnabled = Boolean(
					attributes.backgroundImageEnabled || attributes.backgroundImageUrl
				);

				return (
					<TagName {...blockProps}>
						<InnerBlocks.Content />
						{attributes.linkContainerUrl && (
							<a
								className="motto-container__link-overlay"
								href={attributes.linkContainerUrl}
								target={attributes.linkContainerNewTab ? "_blank" : undefined}
								rel={
									attributes.linkContainerNoFollow
										? "noreferrer nofollow"
										: "noreferrer"
								}
								aria-label={__("Container link", "motto-blocks")}
							/>
						)}
						{isBackgroundImageEnabled && attributes.backgroundImageUrl && (
							<div
								className={`motto-container__bg-image${attributes.backgroundParallax ? ` ${PARALLAX_CLASS_NAME}` : ""}`}
								style={backgroundImageStyles}
								aria-hidden="true"
							/>
						)}
						{attributes.overlayEnabled && getActiveOverlayFillType(attributes) && (
							<div
								className="motto-container__bg-overlay"
								style={getOverlayStyles(attributes)}
								aria-hidden="true"
							/>
						)}
					</TagName>
				);
			},
		},
		{
			save: ({ attributes }) => {
				const TagName = attributes.tagName || "div";
				const blockProps = useBlockProps.save({
					className: `motto-container ${BASE_LAYOUT_CLASS}`,
				});
				const backgroundImageStyles = getBackgroundImageStyles(attributes);
				const isBackgroundImageEnabled = Boolean(
					attributes.backgroundImageEnabled || attributes.backgroundImageUrl
				);

				return (
					<TagName {...blockProps}>
						{isBackgroundImageEnabled && attributes.backgroundImageUrl && (
							<div
								className={`motto-container__bg-image${attributes.backgroundParallax ? ` ${PARALLAX_CLASS_NAME}` : ""}`}
								style={backgroundImageStyles}
								aria-hidden="true"
							/>
						)}
						{attributes.overlayEnabled && getActiveOverlayFillType(attributes) && (
							<div
								className="motto-container__bg-overlay"
								style={getOverlayStyles(attributes)}
								aria-hidden="true"
							/>
						)}
						<InnerBlocks.Content />
						{attributes.linkContainerUrl && (
							<a
								className="motto-container__link-overlay"
								href={attributes.linkContainerUrl}
								target={attributes.linkContainerNewTab ? "_blank" : undefined}
								rel={
									attributes.linkContainerNoFollow
										? "noreferrer nofollow"
										: "noreferrer"
								}
								aria-label={__("Container link", "motto-blocks")}
							/>
						)}
					</TagName>
				);
			},
		},
		{
			save: ({ attributes }) => {
				const TagName = attributes.tagName || "div";
				const blockProps = useBlockProps.save({
					className: `motto-container ${BASE_LAYOUT_CLASS}`,
				});
				const backgroundImageStyles = getBackgroundImageStyles(attributes);
				const isBackgroundImageEnabled = Boolean(
					attributes.backgroundImageEnabled || attributes.backgroundImageUrl
				);

				return (
					<TagName {...blockProps}>
						{isBackgroundImageEnabled && attributes.backgroundImageUrl && (
							<div
								className={`motto-bg-image${attributes.backgroundParallax ? ` ${PARALLAX_CLASS_NAME}` : ""}`}
								style={backgroundImageStyles}
								aria-hidden="true"
							/>
						)}
						{attributes.overlayEnabled && getActiveOverlayFillType(attributes) && (
							<div
								className="motto-bg-overlay"
								style={getOverlayStyles(attributes)}
								aria-hidden="true"
							/>
						)}
						<InnerBlocks.Content />
						{attributes.linkContainerUrl && (
							<a
								className="motto-container-link-overlay"
								href={attributes.linkContainerUrl}
								target={attributes.linkContainerNewTab ? "_blank" : undefined}
								rel={
									attributes.linkContainerNoFollow
										? "noreferrer nofollow"
										: "noreferrer"
								}
								aria-label={__("Container link", "motto-blocks")}
							/>
						)}
					</TagName>
				);
			},
		},
		{
			save: ({ attributes }) => {
				const TagName = attributes.tagName || "div";
				const blockProps = useBlockProps.save({
					className: `motto-container ${BASE_LAYOUT_CLASS}`,
					style: { textAlign: "center" },
				});
				const backgroundImageStyles = getBackgroundImageStyles(attributes, {
					quoteUrl: false,
					normalizeSiteOrigin: false,
				});
				const isBackgroundImageEnabled = Boolean(
					attributes.backgroundImageEnabled || attributes.backgroundImageUrl
				);

				return (
					<TagName {...blockProps}>
						{isBackgroundImageEnabled && attributes.backgroundImageUrl && (
							<div
								className={`motto-bg-image${attributes.backgroundParallax ? ` ${PARALLAX_CLASS_NAME}` : ""}`}
								style={backgroundImageStyles}
								aria-hidden="true"
							/>
						)}
						{attributes.overlayEnabled && getActiveOverlayFillType(attributes) && (
							<div
								className="motto-bg-overlay"
								style={getOverlayStyles(attributes)}
								aria-hidden="true"
							/>
						)}
						<InnerBlocks.Content />
						{attributes.linkContainerUrl && (
							<a
								className="motto-container-link-overlay"
								href={attributes.linkContainerUrl}
								target={attributes.linkContainerNewTab ? "_blank" : undefined}
								rel={
									attributes.linkContainerNoFollow
										? "noreferrer nofollow"
										: "noreferrer"
								}
								aria-label={__("Container link", "motto-blocks")}
							/>
						)}
					</TagName>
				);
			},
		},
		{
			save: ({ attributes }) => {
				const TagName = attributes.tagName || "div";
				const blockProps = useBlockProps.save({
					className: `motto-container ${BASE_LAYOUT_CLASS}`,
				});
				const backgroundImageStyles = getBackgroundImageStyles(attributes, {
					quoteUrl: false,
					normalizeSiteOrigin: false,
				});
				const isBackgroundImageEnabled = Boolean(
					attributes.backgroundImageEnabled || attributes.backgroundImageUrl
				);

				return (
					<TagName {...blockProps}>
						{isBackgroundImageEnabled && attributes.backgroundImageUrl && (
							<div
								className={`motto-bg-image${attributes.backgroundParallax ? ` ${PARALLAX_CLASS_NAME}` : ""}`}
								style={backgroundImageStyles}
								aria-hidden="true"
							/>
						)}
						{attributes.overlayEnabled && getActiveOverlayFillType(attributes) && (
							<div
								className="motto-bg-overlay"
								style={getOverlayStyles(attributes)}
								aria-hidden="true"
							/>
						)}
						<InnerBlocks.Content />
						{attributes.linkContainerUrl && (
							<a
								className="motto-container-link-overlay"
								href={attributes.linkContainerUrl}
								target={attributes.linkContainerNewTab ? "_blank" : undefined}
								rel={
									attributes.linkContainerNoFollow
										? "noreferrer nofollow"
										: "noreferrer"
								}
								aria-label={__("Container link", "motto-blocks")}
							/>
						)}
					</TagName>
				);
			},
		},
	],
});
