import {
	BaseControl,
	__experimentalToggleGroupControl as ExperimentalToggleGroupControl,
	__experimentalToggleGroupControlOption as ExperimentalToggleGroupControlOption,
	ToggleGroupControl,
	ToggleGroupControlOption,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { Ban, Code, Image, Star } from "lucide-react";
import { LucideGallery } from "@components";
import { ImageSourceControl, PlainTextField } from "../../index.js";
import { LUCIDE_ICON_REGISTRY } from "../../lucide/lucide-registry.js";
import { normalizeTriggerIconOptions } from "./trigger-icon-options";

const SafeToggleGroupControl = ToggleGroupControl || ExperimentalToggleGroupControl;
const SafeToggleGroupControlOption =
	ToggleGroupControlOption || ExperimentalToggleGroupControlOption;

const ICON_TYPE_OPTIONS = [
	{ label: __("None", "motto-blocks"), value: "none", icon: Ban },
	{ label: __("Image", "motto-blocks"), value: "image", icon: Image },
	{ label: __("Icon", "motto-blocks"), value: "icon", icon: Star },
	{ label: __("SVG", "motto-blocks"), value: "svg", icon: Code },
];

export function TriggerIconSelector({ value, onChange }) {
	const iconOptions = normalizeTriggerIconOptions(value);

	const updateIconOptions = (partial) => {
		const next = normalizeTriggerIconOptions({
			...iconOptions,
			...partial,
			image: {
				...iconOptions.image,
				...(partial.image || {}),
			},
		});

		onChange(next);
	};

	return (
		<>
			<SafeToggleGroupControl
				label={__("Icon Type", "motto-blocks")}
				value={iconOptions.type}
				className="motto-toggle-group"
				isBlock
				onChange={(nextType) => {
					if (nextType) updateIconOptions({ type: nextType });
				}}
			>
				{ICON_TYPE_OPTIONS.map((option) => (
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

			{iconOptions.type === "image" && (
				<BaseControl label={__("Image Icon", "motto-blocks")}>
					<ImageSourceControl
						value={{
							id: iconOptions.image.id,
							url: iconOptions.image.url,
						}}
						onChange={(nextImage) => {
							updateIconOptions({
								image: {
									id: nextImage.id,
									url: nextImage.url,
								},
							});
						}}
						i18nDomain="motto-blocks"
						rootClassName="motto-css-actions"
						urlRowClassName="motto-css-actions-row"
						labels={{
							placeholderTitle: __("Icon image", "motto-blocks"),
							placeholderInstructions: __(
								"Upload, pick from media library, or paste an image URL.",
								"motto-blocks"
							),
							urlAriaLabel: __("Icon image URL", "motto-blocks"),
							urlPlaceholder: __("Image URL", "motto-blocks"),
							replaceButtonLabel: __("Replace image", "motto-blocks"),
							removeButtonLabel: __("Remove image", "motto-blocks"),
						}}
						renderAfterUrlRow={({ hasUrl, value: imageValue }) =>
							hasUrl ? (
								<div className="motto-image-preview">
									<img src={imageValue.url} alt="" style={{ maxWidth: "48px" }} />
								</div>
							) : null
						}
					/>
				</BaseControl>
			)}

			{iconOptions.type === "icon" && (
				<LucideGallery
					iconRegistry={LUCIDE_ICON_REGISTRY}
					value={iconOptions.lucideIcon}
					onChange={(lucideIcon) => updateIconOptions({ lucideIcon })}
				/>
			)}

			{iconOptions.type === "svg" && (
				<>
					<PlainTextField
						label={__("Inline SVG Markup", "motto-blocks")}
						multiline
						value={iconOptions.inlineSvg}
						onChange={(inlineSvg) => updateIconOptions({ inlineSvg })}
						rows={6}
					/>
					<p className="motto-section-help">
						{__("Paste full <svg>...</svg> markup.", "motto-blocks")}
					</p>
				</>
			)}
		</>
	);
}
