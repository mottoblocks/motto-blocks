import {
	BaseControl,
	__experimentalToggleGroupControl as ExperimentalToggleGroupControl,
	__experimentalToggleGroupControlOption as ExperimentalToggleGroupControlOption,
	ToggleGroupControl,
	ToggleGroupControlOption,
} from "@wordpress/components";
import { useState } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { Code, Image, Star } from "lucide-react";
import { ImageSourceControl, PlainTextField } from "@components";
import { LucideGallery } from "@components/lucide/LucideGallery.jsx";
import {
	normalizeNavigationIconOption,
	normalizeNavigationIconOptions,
} from "./navigation-options";
import { LUCIDE_ICON_REGISTRY } from "@components/lucide/lucide-registry.js";

const SafeToggleGroupControl = ToggleGroupControl || ExperimentalToggleGroupControl;
const SafeToggleGroupControlOption =
	ToggleGroupControlOption || ExperimentalToggleGroupControlOption;

export function NavigationIconSelector({ value, onChange }) {
	const options = normalizeNavigationIconOptions(value);
	const [activeSide, setActiveSide] = useState("prev");
	const activeOption = activeSide === "prev" ? options.prev : options.next;
	const uiActiveOption =
		activeOption.type === "default"
			? {
					...activeOption,
					type: "icon",
					svg: {
						...activeOption.svg,
						source: "lucide",
					},
				}
			: activeOption;

	const updateActiveSide = (partial) => {
		const nextSideValue = normalizeNavigationIconOption(
			{
				...uiActiveOption,
				...partial,
				image: {
					...uiActiveOption.image,
					...(partial.image || {}),
				},
				svg: {
					...uiActiveOption.svg,
					...(partial.svg || {}),
				},
			},
			uiActiveOption.svg.lucideIcon
		);

		onChange(
			activeSide === "prev"
				? { ...options, prev: nextSideValue }
				: { ...options, next: nextSideValue }
		);
	};

	return (
		<div className="motto-navigation-icon-selector">
			<SafeToggleGroupControl
				label={__("Button", "motto-blocks")}
				value={activeSide}
				className="motto-toggle-group"
				onChange={(v) => {
					if (v) setActiveSide(v);
				}}
			>
				<SafeToggleGroupControlOption value="prev" label={__("Prev", "motto-blocks")} />
				<SafeToggleGroupControlOption value="next" label={__("Next", "motto-blocks")} />
			</SafeToggleGroupControl>
			<SafeToggleGroupControl
				isBlock
				label={__("Navigation Type", "motto-blocks")}
				value={uiActiveOption.type}
				className="motto-toggle-group"
				onChange={(nextType) => {
					if (nextType) updateActiveSide({ type: nextType });
				}}
			>
				<SafeToggleGroupControlOption
					value="image"
					label={<Image size={16} aria-hidden="true" />}
					aria-label={__("Image", "motto-blocks")}
					title={__("Image", "motto-blocks")}
				/>
				<SafeToggleGroupControlOption
					value="icon"
					label={<Star size={16} aria-hidden="true" />}
					aria-label={__("Icon", "motto-blocks")}
					title={__("Icon", "motto-blocks")}
				/>
				<SafeToggleGroupControlOption
					value="svg"
					label={<Code size={16} aria-hidden="true" />}
					aria-label={__("SVG", "motto-blocks")}
					title={__("SVG", "motto-blocks")}
				/>
			</SafeToggleGroupControl>

			{uiActiveOption.type === "image" && (
				<BaseControl label={__("Navigation image", "motto-blocks")}>
					<ImageSourceControl
						value={{
							id: uiActiveOption.image.id,
							url: uiActiveOption.image.url,
						}}
						onChange={(nextImage) => {
							updateActiveSide({
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
							placeholderTitle: __("Navigation image", "motto-blocks"),
							placeholderInstructions: __(
								"Upload, pick from media library, or paste an image URL.",
								"motto-blocks"
							),
							urlAriaLabel: __("Navigation image URL", "motto-blocks"),
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

			{uiActiveOption.type === "icon" && (
				<LucideGallery
					iconRegistry={LUCIDE_ICON_REGISTRY}
					value={uiActiveOption.svg.lucideIcon}
					onChange={(lucideIcon) => updateActiveSide({ svg: { lucideIcon } })}
				/>
			)}

			{uiActiveOption.type === "svg" && (
				<>
					<PlainTextField
						className="motto-input"
						multiline
						rows={6}
						label={__("Inline SVG Markup", "motto-blocks")}
						value={uiActiveOption.svg.inline}
						onChange={(inline) => updateActiveSide({ svg: { inline } })}
					/>
					<p className="motto-section-help">
						{__(
							"Inline SVG is sanitized in PHP at render time. Invalid SVG falls back to default.",
							"motto-blocks"
						)}
					</p>
				</>
			)}
		</div>
	);
}
