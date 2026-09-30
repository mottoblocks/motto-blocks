import metadata from "./block.json";
import { BlockIcon } from "@components/primitives/BlockIcon";
import blockIcon from "@block-icons/svg.svg?raw";
import { registerBlockType } from "@wordpress/blocks";
import { BlockControls, InspectorControls, useBlockProps } from "@wordpress/block-editor";
import {
	BaseControl,
	Button,
	Notice,
	PanelBody,
	Popover,
	Spinner,
	ToolbarButton,
	__experimentalToggleGroupControl as ExperimentalToggleGroupControl,
	__experimentalToggleGroupControlOption as ExperimentalToggleGroupControlOption,
	ToggleGroupControl,
	ToggleGroupControlOption,
} from "@wordpress/components";
import { useState } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { Code, FileImage, Link2, Star } from "lucide-react";

import { ImageSourceControl, PlainTextField } from "@components";
import { MottoLinkControl } from "@components/controls/link/motto-link-control";
import { withMottoPopupClass } from "@components/ui/popup-class-name";
import { getMottoBaseLayoutClassName } from "../../styler/layout/base-layout";
import { LucideGallery } from "@components";
import { LUCIDE_ICON_REGISTRY } from "@components/lucide/lucide-registry.js";
import { buildLucideSvgMarkup, normalizeSvgAsset, resolveSvgAssetForEditor } from "./svg-asset";
import { sanitizeInlineSvgMarkup } from "../../lib/inline-svg-sanitizer.js";

const BASE_LAYOUT_CLASS = getMottoBaseLayoutClassName(metadata.mottoBaseLayout);
const SafeToggleGroupControl = ToggleGroupControl || ExperimentalToggleGroupControl;
const SafeToggleGroupControlOption =
	ToggleGroupControlOption || ExperimentalToggleGroupControlOption;
const SOURCE_OPTIONS = [
	{ label: __("Lucide", "motto-blocks"), value: "lucide", icon: Star },
	{ label: __("Media", "motto-blocks"), value: "media", icon: FileImage },
	{ label: __("Inline", "motto-blocks"), value: "inline", icon: Code },
];

function Edit({ attributes, setAttributes }) {
	const svgAsset = normalizeSvgAsset(attributes.svgAsset);
	const preview = resolveSvgAssetForEditor(svgAsset);
	const EmptySourceIcon =
		SOURCE_OPTIONS.find((option) => option.value === svgAsset.source)?.icon || FileImage;
	const [convertError, setConvertError] = useState("");
	const [isConverting, setIsConverting] = useState(false);
	const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
	const blockProps = useBlockProps({
		className: `motto-svg ${BASE_LAYOUT_CLASS}`,
	});

	const updateSvgAsset = (partial) => {
		const nextAsset = normalizeSvgAsset({
			...svgAsset,
			...partial,
			media: {
				...svgAsset.media,
				...(partial.media || {}),
			},
			svg: {
				...svgAsset.svg,
				...(partial.svg || {}),
			},
		});

		setAttributes({ svgAsset: nextAsset });
	};

	const handleLucideChange = (lucideIcon) => {
		updateSvgAsset({
			svg: {
				lucideIcon,
				lucideSvg: buildLucideSvgMarkup(lucideIcon),
			},
		});
	};

	const handleConvertToInline = async () => {
		if (!svgAsset.media.url || typeof window?.fetch !== "function") {
			return;
		}

		setConvertError("");
		setIsConverting(true);

		try {
			const response = await window.fetch(svgAsset.media.url, { credentials: "same-origin" });
			const rawSvg = await response.text();
			const normalizedInline = sanitizeInlineSvgMarkup(rawSvg, [
				"motto-svg__inline",
				"motto-svg__inline--custom",
			]);

			if (!normalizedInline) {
				throw new Error(__("The selected media file is not a valid SVG.", "motto-blocks"));
			}

			updateSvgAsset({
				source: "inline",
				media: {
					inlineSvg: normalizedInline,
				},
				svg: {
					inline: normalizedInline,
				},
			});
		} catch (error) {
			setConvertError(
				error instanceof Error && error.message
					? error.message
					: __("SVG conversion failed.", "motto-blocks")
			);
		} finally {
			setIsConverting(false);
		}
	};

	return (
		<>
			<BlockControls>
				<ToolbarButton
					label={__("Link", "motto-blocks")}
					isActive={Boolean(attributes.linkUrl)}
					onClick={() => setIsLinkPopoverOpen((prev) => !prev)}
				>
					<Link2 size={20} aria-hidden="true" />
				</ToolbarButton>
				{isLinkPopoverOpen && (
					<Popover
						placement="bottom"
						onClose={() => setIsLinkPopoverOpen(false)}
						focusOnMount
						className={withMottoPopupClass("motto-svg-link-popup")}
					>
						<div style={{ padding: "16px", minWidth: "300px" }}>
							<MottoLinkControl
								variant="link-control"
								autoFocus
								url={attributes.linkUrl || ""}
								onUrlChange={(linkUrl) => setAttributes({ linkUrl })}
								opensInNewTab={Boolean(attributes.linkNewTab)}
								onOpensInNewTabChange={(linkNewTab) =>
									setAttributes({ linkNewTab })
								}
								noFollow={Boolean(attributes.linkNoFollow)}
								onNoFollowChange={(linkNoFollow) => setAttributes({ linkNoFollow })}
							/>
						</div>
					</Popover>
				)}
			</BlockControls>

			<InspectorControls>
				<PanelBody
					title={__("SVG Source", "motto-blocks")}
					className="motto-panel-body"
					initialOpen
				>
					<div className="motto-panel-section">
						<SafeToggleGroupControl
							label={__("Source", "motto-blocks")}
							value={svgAsset.source}
							className="motto-toggle-group"
							isBlock
							onChange={(source) => {
								if (source) updateSvgAsset({ source });
							}}
						>
							{SOURCE_OPTIONS.map((option) => (
								<SafeToggleGroupControlOption
									key={option.value}
									value={option.value}
									label={
										option.icon ? (
											<option.icon size={16} aria-hidden="true" />
										) : (
											option.label
										)
									}
									aria-label={option.label}
									title={option.label}
								/>
							))}
						</SafeToggleGroupControl>

						{svgAsset.source === "lucide" ? (
							<LucideGallery
								iconRegistry={LUCIDE_ICON_REGISTRY}
								value={svgAsset.svg.lucideIcon}
								onChange={handleLucideChange}
							/>
						) : null}

						{svgAsset.source === "media" ? (
							<>
								<BaseControl label={__("SVG File", "motto-blocks")}>
									<ImageSourceControl
										value={svgAsset.media}
										onChange={(media) =>
											updateSvgAsset({
												media: {
													...media,
													mime: media.url ? "image/svg+xml" : "",
												},
											})
										}
										i18nDomain="motto-blocks"
										rootClassName="motto-css-actions"
										urlRowClassName="motto-css-actions-row"
										allowedTypes={["image/svg+xml"]}
										accept="image/svg+xml,.svg"
										labels={{
											placeholderTitle: __("SVG file", "motto-blocks"),
											placeholderInstructions: __(
												"Upload, pick from media library, or paste an SVG URL.",
												"motto-blocks"
											),
											urlAriaLabel: __("SVG file URL", "motto-blocks"),
											urlPlaceholder: __("SVG file URL", "motto-blocks"),
											replaceButtonLabel: __("Replace SVG", "motto-blocks"),
											removeButtonLabel: __("Remove SVG", "motto-blocks"),
										}}
										renderAfterUrlRow={({ hasUrl, value: mediaValue }) =>
											hasUrl ? (
												<div className="motto-image-preview motto-svg__media-preview">
													<img
														className="motto-svg__media-preview-image"
														src={mediaValue.url}
														alt=""
													/>
												</div>
											) : null
										}
									/>
								</BaseControl>

								<Button
									variant="secondary"
									onClick={handleConvertToInline}
									disabled={!svgAsset.media.url || isConverting}
								>
									{isConverting ? (
										<>
											<Spinner />
											{__("Converting...", "motto-blocks")}
										</>
									) : (
										__("Convert to inline", "motto-blocks")
									)}
								</Button>
								<p className="motto-section-help">
									{__(
										"Media source stays as external image until you convert it to inline SVG.",
										"motto-blocks"
									)}
								</p>
							</>
						) : null}

						{svgAsset.source === "inline" ? (
							<>
								<PlainTextField
									label={__("Inline SVG Markup", "motto-blocks")}
									multiline
									rows={4}
									value={svgAsset.svg.inline}
									onChange={(inline) => updateSvgAsset({ svg: { inline } })}
								/>
								<p className="motto-section-help">
									{__(
										"Paste full <svg>...</svg> markup. Invalid SVG renders empty on the frontend.",
										"motto-blocks"
									)}
								</p>
							</>
						) : null}

						{convertError ? (
							<Notice status="error" isDismissible={false}>
								<p>{convertError}</p>
							</Notice>
						) : null}
					</div>
				</PanelBody>

				<PanelBody
					title={__("Link", "motto-blocks")}
					className="motto-panel-body"
					initialOpen={false}
				>
					<div className="motto-panel-section">
						<MottoLinkControl
							variant="link-control"
							url={attributes.linkUrl || ""}
							onUrlChange={(linkUrl) => setAttributes({ linkUrl })}
							opensInNewTab={Boolean(attributes.linkNewTab)}
							onOpensInNewTabChange={(linkNewTab) => setAttributes({ linkNewTab })}
							noFollow={Boolean(attributes.linkNoFollow)}
							onNoFollowChange={(linkNoFollow) => setAttributes({ linkNoFollow })}
						/>
					</div>
				</PanelBody>
			</InspectorControls>

			<div {...blockProps}>
				{preview.kind === "img" ? (
					<img className="motto-svg__image" src={preview.src} alt={preview.alt} />
				) : null}
				{preview.kind === "inline" ? (
					<div dangerouslySetInnerHTML={{ __html: preview.markup }} />
				) : null}
				{preview.kind === "empty" ? (
					<div className="motto-svg__empty">
						<EmptySourceIcon size={32} strokeWidth={1.5} aria-hidden="true" />
						<p className="motto-svg__empty-message">
							{preview.message ||
								__("Choose an SVG source to preview it here.", "motto-blocks")}
						</p>
					</div>
				) : null}
				{attributes.linkUrl && (
					<a
						className="motto-svg__link-overlay is-editor-preview"
						href={attributes.linkUrl}
						target={attributes.linkNewTab ? "_blank" : undefined}
						rel={attributes.linkNoFollow ? "noreferrer nofollow" : "noreferrer"}
						aria-label={__("SVG link", "motto-blocks")}
					/>
				)}
			</div>
		</>
	);
}

registerBlockType(metadata.name, {
	...metadata,
	icon: {
		src: <BlockIcon svg={blockIcon} />,
	},
	edit: Edit,
	save: () => null,
});
