import {
	BaseControl,
	__experimentalToggleGroupControl as ExperimentalToggleGroupControl,
	__experimentalToggleGroupControlOption as ExperimentalToggleGroupControlOption,
	ToggleGroupControl,
	ToggleGroupControlOption,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { Code, Image, Star } from "lucide-react";
import { LucideGallery } from "@components";
import { ImageSourceControl, PlainTextField } from "../../index.js";
import { LUCIDE_ICON_REGISTRY } from "../../lucide/lucide-registry.js";
import { normalizeButtonIconOptions } from "./button-icon-options";

const SafeToggleGroupControl = ToggleGroupControl || ExperimentalToggleGroupControl;
const SafeToggleGroupControlOption =
	ToggleGroupControlOption || ExperimentalToggleGroupControlOption;

const ICON_TYPE_OPTIONS = [
	{ label: __("Image", "motto-blocks"), value: "image", icon: Image },
	{ label: __("Icon", "motto-blocks"), value: "icon", icon: Star },
	{ label: __("SVG", "motto-blocks"), value: "svg", icon: Code },
];

function getFlatType(iconOptions) {
	if (iconOptions.type === "image") return "image";
	if (iconOptions.type === "svg" && iconOptions.svg.source === "lucide") return "icon";
	return "svg";
}

export function ButtonIconSelector({ value, onChange }) {
	const iconOptions = normalizeButtonIconOptions(value);
	const flatType = getFlatType(iconOptions);

	const updateIconOptions = (partial) => {
		onChange(
			normalizeButtonIconOptions({
				...iconOptions,
				...partial,
				image: { ...iconOptions.image, ...(partial.image || {}) },
				svg: { ...iconOptions.svg, ...(partial.svg || {}) },
			})
		);
	};

	const handleTypeChange = (nextFlatType) => {
		if (nextFlatType === "image") {
			updateIconOptions({ type: "image" });
		} else if (nextFlatType === "icon") {
			updateIconOptions({ type: "svg", svg: { source: "lucide" } });
		} else {
			updateIconOptions({ type: "svg", svg: { source: "inline" } });
		}
	};

	return (
		<>
			<SafeToggleGroupControl
				label={__("Icon Type", "motto-blocks")}
				value={flatType}
				className="motto-toggle-group"
				isBlock
				onChange={(nextType) => {
					if (nextType) handleTypeChange(nextType);
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

			{flatType === "image" && (
				<BaseControl label={__("Image Icon", "motto-blocks")}>
					<ImageSourceControl
						value={{ id: iconOptions.image.id, url: iconOptions.image.url }}
						onChange={(nextImage) =>
							updateIconOptions({ image: { id: nextImage.id, url: nextImage.url } })
						}
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

			{flatType === "icon" && (
				<LucideGallery
					iconRegistry={LUCIDE_ICON_REGISTRY}
					value={iconOptions.svg.lucideIcon}
					onChange={(valueIcon) => updateIconOptions({ svg: { lucideIcon: valueIcon } })}
				/>
			)}

			{flatType === "svg" && (
				<>
					<PlainTextField
						label={__("Inline SVG Markup", "motto-blocks")}
						multiline
						value={iconOptions.svg.inline}
						onChange={(valueInline) =>
							updateIconOptions({ svg: { inline: valueInline } })
						}
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
