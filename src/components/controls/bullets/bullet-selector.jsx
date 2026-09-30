import {
	BaseControl,
	SelectControl,
	TextControl,
	__experimentalToggleGroupControl as ExperimentalToggleGroupControl,
	__experimentalToggleGroupControlOption as ExperimentalToggleGroupControlOption,
	ToggleGroupControl,
	ToggleGroupControlOption,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { Ban, Code, Image, List, ListOrdered, Star } from "lucide-react";
import { LucideGallery } from "@components";
import { ImageSourceControl, PlainTextField } from "../../index.js";
import { LUCIDE_ICON_REGISTRY } from "../../lucide/lucide-registry.js";
import { normalizeBulletOptions } from "./bullet-options";

const SafeToggleGroupControl = ToggleGroupControl || ExperimentalToggleGroupControl;
const SafeToggleGroupControlOption =
	ToggleGroupControlOption || ExperimentalToggleGroupControlOption;

const BULLET_TYPE_OPTIONS = [
	{ label: __("Default", "motto-blocks"), value: "default", icon: List },
	{ label: __("Image", "motto-blocks"), value: "image", icon: Image },
	{ label: __("Icon", "motto-blocks"), value: "icon", icon: Star },
	{ label: __("SVG", "motto-blocks"), value: "svg", icon: Code },
	{ label: __("Counter", "motto-blocks"), value: "counter", icon: ListOrdered },
	{ label: __("None", "motto-blocks"), value: "none", icon: Ban },
];

export function BulletSelector({ value, onChange }) {
	const bulletOptions = normalizeBulletOptions(value);

	const updateBulletOptions = (partial) => {
		const next = normalizeBulletOptions({
			...bulletOptions,
			...partial,
			image: {
				...bulletOptions.image,
				...(partial.image || {}),
			},
			svg: {
				...bulletOptions.svg,
				...(partial.svg || {}),
			},
			counter: {
				...bulletOptions.counter,
				...(partial.counter || {}),
			},
		});

		onChange(next);
	};

	return (
		<>
			<SafeToggleGroupControl
				label={__("Bullet Type", "motto-blocks")}
				value={bulletOptions.type}
				className="motto-toggle-group"
				isBlock
				onChange={(nextType) => {
					if (nextType) updateBulletOptions({ type: nextType });
				}}
			>
				{BULLET_TYPE_OPTIONS.map((option) => (
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

			{bulletOptions.type === "image" && (
				<BaseControl label={__("Image Bullet", "motto-blocks")}>
					<ImageSourceControl
						value={{
							id: bulletOptions.image.id,
							url: bulletOptions.image.url,
						}}
						onChange={(nextImage) => {
							updateBulletOptions({
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
							placeholderTitle: __("Bullet image", "motto-blocks"),
							placeholderInstructions: __(
								"Upload, pick from media library, or paste an image URL.",
								"motto-blocks"
							),
							urlAriaLabel: __("Bullet image URL", "motto-blocks"),
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

			{bulletOptions.type === "icon" && (
				<LucideGallery
					iconRegistry={LUCIDE_ICON_REGISTRY}
					value={bulletOptions.svg.lucideIcon}
					onChange={(valueIcon) =>
						updateBulletOptions({ svg: { lucideIcon: valueIcon } })
					}
				/>
			)}

			{bulletOptions.type === "svg" && (
				<>
					<PlainTextField
						label={__("Inline SVG Markup", "motto-blocks")}
						multiline
						value={bulletOptions.svg.inline}
						onChange={(valueInline) =>
							updateBulletOptions({ svg: { inline: valueInline } })
						}
						rows={6}
					/>
					<p className="motto-section-help">
						{__("Paste full <svg>...</svg> markup.", "motto-blocks")}
					</p>
				</>
			)}

			{bulletOptions.type === "counter" && (
				<>
					<SelectControl
						label={__("Counter Style", "motto-blocks")}
						value={bulletOptions.counter.style}
						className="motto-select"
						options={[
							{ label: __("Decimal (1, 2, 3)", "motto-blocks"), value: "decimal" },
							{
								label: __("Decimal Zero (01, 02, 03)", "motto-blocks"),
								value: "decimal-leading-zero",
							},
							{
								label: __("Lower Alpha (a, b, c)", "motto-blocks"),
								value: "lower-alpha",
							},
							{
								label: __("Upper Alpha (A, B, C)", "motto-blocks"),
								value: "upper-alpha",
							},
							{
								label: __("Lower Roman (i, ii, iii)", "motto-blocks"),
								value: "lower-roman",
							},
							{
								label: __("Upper Roman (I, II, III)", "motto-blocks"),
								value: "upper-roman",
							},
						]}
						onChange={(nextStyle) =>
							updateBulletOptions({ counter: { style: nextStyle } })
						}
					/>

					<TextControl
						label={__("Start At", "motto-blocks")}
						type="number"
						min={1}
						step={1}
						className="motto-input"
						value={String(bulletOptions.counter.start)}
						onChange={(nextValue) =>
							updateBulletOptions({
								counter: { start: Number.parseInt(nextValue, 10) || 1 },
							})
						}
					/>
				</>
			)}
		</>
	);
}
