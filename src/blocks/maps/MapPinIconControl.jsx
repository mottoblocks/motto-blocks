import {
	BaseControl,
	Button,
	ToggleGroupControl,
	ToggleGroupControlOption,
	__experimentalToggleGroupControl as ExperimentalToggleGroupControl,
	__experimentalToggleGroupControlOption as ExperimentalToggleGroupControlOption,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { ColorControl, ImageSourceControl, PlainTextField } from "@components";
import { LucideGallery } from "@components";
import { LUCIDE_ICON_REGISTRY } from "@components/lucide/lucide-registry.js";
import { DEFAULT_PIN_COLOR, MAP_PIN_ICON_OPTIONS, PIN_ICON_TYPE_OPTIONS } from "./maps-constants";

const SafeToggleGroupControl = ToggleGroupControl || ExperimentalToggleGroupControl;
const SafeToggleGroupControlOption =
	ToggleGroupControlOption || ExperimentalToggleGroupControlOption;

export function MapPinIconControl({ pin, onChange }) {
	const handleTypeChange = (nextType) => {
		if (!nextType) {
			return;
		}

		let nextValue = "";
		if (nextType === "svg-library") {
			nextValue = "map-pin";
		} else if (nextType === "image") {
			nextValue = { id: 0, url: "" };
		}

		onChange({ iconType: nextType, iconValue: nextValue, iconSvg: "" });
	};

	return (
		<div className="motto-map-pin-icon-control">
			{SafeToggleGroupControl && SafeToggleGroupControlOption ? (
				<SafeToggleGroupControl
					label={__("Pin Icon Type", "motto-blocks")}
					value={pin.iconType}
					isBlock
					className="motto-toggle-group"
					onChange={handleTypeChange}
				>
					{PIN_ICON_TYPE_OPTIONS.map((option) => (
						<SafeToggleGroupControlOption
							key={option.value}
							value={option.value}
							label={<option.icon size={14} aria-hidden="true" />}
							className="motto-ui-button is-icon-only"
							aria-label={option.label}
							title={option.label}
						/>
					))}
				</SafeToggleGroupControl>
			) : (
				<BaseControl label={__("Pin Icon Type", "motto-blocks")}>
					<div className="motto-section-actions">
						{PIN_ICON_TYPE_OPTIONS.map((option) => (
							<Button
								key={option.value}
								variant={pin.iconType === option.value ? "primary" : "secondary"}
								isPressed={pin.iconType === option.value}
								className="motto-ui-button is-icon-only"
								aria-label={option.label}
								title={option.label}
								onClick={() => handleTypeChange(option.value)}
							>
								<option.icon size={14} aria-hidden="true" />
							</Button>
						))}
					</div>
				</BaseControl>
			)}

			{pin.iconType === "svg-library" && (
				<>
					<LucideGallery
						iconRegistry={LUCIDE_ICON_REGISTRY}
						icons={MAP_PIN_ICON_OPTIONS}
						value={typeof pin.iconValue === "string" ? pin.iconValue : "map-pin"}
						onChange={(iconName) => onChange({ iconValue: iconName, iconSvg: "" })}
					/>
					<BaseControl
						label={__("Pin Color", "motto-blocks")}
						className="motto-base-flex"
					>
						<ColorControl
							label={__("Pin Color", "motto-blocks")}
							colorValue={pin.pinColor || DEFAULT_PIN_COLOR}
							onChange={(value) => onChange({ pinColor: value || DEFAULT_PIN_COLOR })}
							enableAlpha
							asDropdown
						/>
					</BaseControl>
				</>
			)}

			{pin.iconType === "svg-inline" && (
				<>
					<PlainTextField
						label={__("Inline SVG Markup", "motto-blocks")}
						multiline
						rows={6}
						value={typeof pin.iconValue === "string" ? pin.iconValue : ""}
						onChange={(value) => onChange({ iconValue: value })}
					/>
					<p className="motto-section-help">
						{__("Paste full <svg>...</svg> markup.", "motto-blocks")}
					</p>
				</>
			)}

			{pin.iconType === "image" && (
				<ImageSourceControl
					value={
						pin.iconValue && typeof pin.iconValue === "object"
							? pin.iconValue
							: { id: 0, url: "" }
					}
					onChange={(nextImage) => onChange({ iconValue: nextImage })}
					i18nDomain="motto-blocks"
					rootClassName="motto-css-actions"
					urlRowClassName="motto-css-actions-row"
					labels={{
						placeholderTitle: __("Pin image", "motto-blocks"),
						placeholderInstructions: __(
							"Upload, pick from media library, or paste an image URL.",
							"motto-blocks"
						),
						urlAriaLabel: __("Pin image URL", "motto-blocks"),
						urlPlaceholder: __("Image URL", "motto-blocks"),
						replaceButtonLabel: __("Replace image", "motto-blocks"),
						removeButtonLabel: __("Remove image", "motto-blocks"),
					}}
					renderAfterUrlRow={({ hasUrl, value }) =>
						hasUrl ? (
							<div className="motto-image-preview">
								<img src={value.url} alt="" style={{ maxWidth: "48px" }} />
							</div>
						) : null
					}
				/>
			)}
		</div>
	);
}
