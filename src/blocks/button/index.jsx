import metadata from "./block.json";
import { BlockIcon } from "@components/primitives/BlockIcon";
import blockIcon from "@block-icons/button.svg?raw";
import { registerBlockType } from "@wordpress/blocks";
import { BlockControls, InspectorControls, RichText, useBlockProps } from "@wordpress/block-editor";
import { useEffect, useState } from "@wordpress/element";
import { PanelBody, Popover, ToggleControl, ToolbarButton } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { Link2 } from "lucide-react";
import { withMottoPopupClass } from "@components/ui/popup-class-name";
import { IconPositionToggle } from "@components";
import { normalizeButtonIconOptions } from "@components/controls/button-icons/button-icon-options";
import { ButtonIconSelector } from "@components/controls/button-icons/button-icon-selector";
import {
	ButtonIconMedia,
	hasConfiguredButtonIcon,
} from "@components/controls/button-icons/button-icon-media";
import { MottoLinkControl } from "@components/controls/link/motto-link-control";
import { getMottoBaseLayoutClassName } from "../../styler/layout/base-layout";

const BASE_LAYOUT_CLASS = getMottoBaseLayoutClassName(metadata.mottoBaseLayout);

function normalizeIconPosition(value) {
	return value === "right" ? "right" : "left";
}

function buildRelValue(relValue, opensInNewTab, noFollow) {
	const relTokens = new Set(
		String(relValue || "")
			.split(/\s+/)
			.map((token) => token.trim())
			.filter(Boolean)
	);

	if (opensInNewTab) {
		relTokens.add("noopener");
		relTokens.add("noreferrer");
	} else {
		relTokens.delete("noopener");
		relTokens.delete("noreferrer");
	}

	if (noFollow) {
		relTokens.add("nofollow");
	} else {
		relTokens.delete("nofollow");
	}

	return Array.from(relTokens).join(" ");
}

function removeLegacyCoreButtonClass(classNameValue) {
	const classTokens = String(classNameValue || "")
		.split(/\s+/)
		.map((token) => token.trim())
		.filter(Boolean)
		.filter((token) => token !== "wp-block-button");

	return classTokens.join(" ");
}

registerBlockType(metadata.name, {
	...metadata,
	icon: {
		src: <BlockIcon svg={blockIcon} />,
	},
	edit: ({ attributes, setAttributes }) => {
		const iconOptions = normalizeButtonIconOptions(attributes.iconOptions);
		const iconPosition = normalizeIconPosition(attributes.iconPosition);
		const opensInNewTab = attributes.linkTarget === "_blank";
		const noFollow = Boolean(attributes.noFollow);
		const relValue = buildRelValue(attributes.rel, opensInNewTab, noFollow);
		const hasIcon = hasConfiguredButtonIcon(iconOptions);
		const iconEnabled = iconOptions.type !== "none";
		const sanitizedClassName = removeLegacyCoreButtonClass(attributes.className);
		const blockProps = useBlockProps({
			className: `motto-button ${BASE_LAYOUT_CLASS} wp-block-button__link wp-element-button motto-button--icon-${iconPosition}`,
		});
		const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);

		useEffect(() => {
			const currentClassName = String(attributes.className || "");
			if (currentClassName !== sanitizedClassName) {
				setAttributes({ className: sanitizedClassName || undefined });
			}
		}, [attributes.className, sanitizedClassName, setAttributes]);

		return (
			<>
				<BlockControls>
					<ToolbarButton
						label={__("Link", "motto-blocks")}
						isActive={Boolean(attributes.url)}
						onClick={() => setIsLinkPopoverOpen((prev) => !prev)}
					>
						<Link2 size={18} aria-hidden="true" />
					</ToolbarButton>
					{isLinkPopoverOpen && (
						<Popover
							placement="bottom"
							onClose={() => setIsLinkPopoverOpen(false)}
							focusOnMount
							className={withMottoPopupClass("motto-button-link-popup")}
						>
							<div style={{ padding: "16px", minWidth: "300px" }}>
								<MottoLinkControl
									variant="link-control"
									autoFocus
									url={attributes.url || ""}
									onUrlChange={(nextUrl) => setAttributes({ url: nextUrl })}
									opensInNewTab={opensInNewTab}
									onOpensInNewTabChange={(nextValue) =>
										setAttributes({
											linkTarget: nextValue ? "_blank" : "",
											rel: buildRelValue(attributes.rel, nextValue, noFollow),
										})
									}
									noFollow={noFollow}
									onNoFollowChange={(nextValue) =>
										setAttributes({
											noFollow: nextValue,
											rel: buildRelValue(
												attributes.rel,
												opensInNewTab,
												nextValue
											),
										})
									}
									dynamic={attributes.linkDynamic || {}}
									onDynamicChange={(linkDynamic) =>
										setAttributes({ linkDynamic })
									}
								/>
							</div>
						</Popover>
					)}
				</BlockControls>
				<InspectorControls>
					<PanelBody
						title={__("Button Settings", "motto-blocks")}
						className="motto-panel-body"
						initialOpen
					>
						<div className="motto-panel-section">
							<MottoLinkControl
								variant="link-control"
								url={attributes.url || ""}
								onUrlChange={(nextUrl) => setAttributes({ url: nextUrl })}
								opensInNewTab={opensInNewTab}
								onOpensInNewTabChange={(nextValue) =>
									setAttributes({
										linkTarget: nextValue ? "_blank" : "",
										rel: buildRelValue(attributes.rel, nextValue, noFollow),
									})
								}
								noFollow={noFollow}
								onNoFollowChange={(nextValue) =>
									setAttributes({
										noFollow: nextValue,
										rel: buildRelValue(
											attributes.rel,
											opensInNewTab,
											nextValue
										),
									})
								}
								dynamic={attributes.linkDynamic || {}}
								onDynamicChange={(linkDynamic) => setAttributes({ linkDynamic })}
							/>
						</div>
					</PanelBody>
					<PanelBody
						title={__("Icon", "motto-blocks")}
						className="motto-panel-body"
						initialOpen={false}
					>
						<div className="motto-panel-section">
							<ToggleControl
								label={__("Show icon", "motto-blocks")}
								className="motto-toggle"
								__nextHasNoMarginBottom
								checked={iconEnabled}
								onChange={(nextValue) =>
									setAttributes({
										iconOptions: normalizeButtonIconOptions({
											...iconOptions,
											type: nextValue
												? iconOptions.type !== "none"
													? iconOptions.type
													: "svg"
												: "none",
										}),
									})
								}
							/>
						</div>
						{iconEnabled && (
							<div className="motto-panel-section">
								<IconPositionToggle
									value={iconPosition}
									onChange={(nextValue) =>
										setAttributes({
											iconPosition: normalizeIconPosition(nextValue),
										})
									}
								/>
								<ButtonIconSelector
									value={iconOptions}
									onChange={(nextIconOptions) =>
										setAttributes({
											iconOptions:
												normalizeButtonIconOptions(nextIconOptions),
										})
									}
								/>
							</div>
						)}
					</PanelBody>
				</InspectorControls>

				<a
					{...blockProps}
					href={attributes.url || undefined}
					target={attributes.linkTarget || undefined}
					rel={relValue || undefined}
					onClick={(event) => event.preventDefault()}
				>
					{hasIcon && iconPosition === "left" && (
						<span className="motto-button__icon" aria-hidden="true">
							<ButtonIconMedia value={iconOptions} />
						</span>
					)}
					<RichText
						tagName="span"
						className="motto-button__text"
						value={attributes.text}
						onChange={(text) => setAttributes({ text })}
						placeholder={__("Add text...", "motto-blocks")}
						withoutInteractiveFormatting
					/>
					{hasIcon && iconPosition === "right" && (
						<span className="motto-button__icon" aria-hidden="true">
							<ButtonIconMedia value={iconOptions} />
						</span>
					)}
				</a>
			</>
		);
	},
	save: ({ attributes }) => {
		const iconOptions = normalizeButtonIconOptions(attributes.iconOptions);
		const iconPosition = normalizeIconPosition(attributes.iconPosition);
		const opensInNewTab = attributes.linkTarget === "_blank";
		const noFollow = Boolean(attributes.noFollow);
		const relValue = buildRelValue(attributes.rel, opensInNewTab, noFollow);
		const hasIcon = hasConfiguredButtonIcon(iconOptions);
		const blockProps = useBlockProps.save({
			className: `motto-button ${BASE_LAYOUT_CLASS} wp-block-button__link wp-element-button motto-button--icon-${iconPosition}`,
		});

		return (
			<a
				{...blockProps}
				href={attributes.url || undefined}
				target={attributes.linkTarget || undefined}
				rel={relValue || undefined}
			>
				{hasIcon && iconPosition === "left" && (
					<span className="motto-button__icon" aria-hidden="true">
						<ButtonIconMedia value={iconOptions} />
					</span>
				)}
				<RichText.Content
					tagName="span"
					className="motto-button__text"
					value={attributes.text}
				/>
				{hasIcon && iconPosition === "right" && (
					<span className="motto-button__icon" aria-hidden="true">
						<ButtonIconMedia value={iconOptions} />
					</span>
				)}
			</a>
		);
	},
});
