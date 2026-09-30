import { __ } from "@wordpress/i18n";
import {
	ColorControl as SharedColorControl,
	LengthControl,
	MottoNumberControl,
	PercentControl,
} from "@components";
import {
	toPaletteColors,
	toPaletteVisualValue,
	toStoredColorValue,
} from "../utils/color-palette-utils";
import { AspectRatioControl } from "./AspectRatioControl";
import { BackgroundLayersControl } from "./BackgroundLayersControl";
import { BorderRadiusControl } from "./BorderRadiusControl";
import { BorderControl } from "./BorderControl";
import { BoxShadowControl } from "./BoxShadowControl";
import { CssFunctionAutocompleteControl } from "./CssFunctionAutocompleteControl";
import { EnumControl } from "./EnumControl";
import { FilterControl } from "./FilterControl";
import { FontFamilyControl } from "./FontFamilyControl";
import { FontSizeControl } from "./FontSizeControl";
import { GradientControl } from "./GradientControl";
import { GridTemplateTracksControl } from "./GridTemplateTracksControl";
import { ScaleControl } from "./ScaleControl";
import { ShapeRegionControl } from "./ShapeRegionControl";
import { SpacingMultipleControl } from "./SpacingMultipleControl";
import { SpacingSingleControl } from "./SpacingSingleControl";
import { TransformControl } from "./TransformControl";
import {
	TransitionControl,
	TransitionDurationField,
	TransitionEasingField,
	TransitionPropertyField,
} from "@components";
import { normalizeValueType } from "../utils/value-type-capabilities";

const TYPE_SPACING_SINGLE = "spacing-single";
const TYPE_SPACING_MULTIPLE = "spacing-multiple";
const TYPE_BACKGROUND = "background";
const TYPE_BACKGROUND_IMAGE = "background-image";
const TYPE_PERCENT = "percent";

export const renderRuleValue = ({
	model,
	itemId,
	onValueChange,
	closePopup,
	suspendAutoClose,
	themeColors = [],
	spacingSizes = [],
	disableCustomColors = false,
	fontSizes = [],
	fontFamilies = [],
	disableCustomFontSizes = false,
	disableCustomFontFamilies = false,
	colorToPresetVar = (next) => next,
	fontSizeToPresetVar = (next) => next,
	fontFamilyToPresetVar = (next) => next,
	ruleDisplayLabel = "",
	flexAxisClass = "",
}) => {
	if (!model || !model.type) {
		return (
			<CssFunctionAutocompleteControl
				key={model?.key || `${itemId}-value-plain`}
				value={model?.value || ""}
				onChange={(val) => (model?.onChange ? model.onChange(val) : onValueChange(val))}
				placeholder={model?.placeholder || __("Value", "motto-blocks")}
				className="motto-input motto-css-rule-value"
			/>
		);
	}

	const normalizedType = normalizeValueType(model.type);

	if (normalizedType === "color") {
		const paletteColors = toPaletteColors(themeColors);
		return (
			<div className="motto-color-control" key={model.key}>
				<SharedColorControl
					label=""
					colorValue={model.value}
					onChange={(val) => model.onChange(val)}
					colors={paletteColors}
					disableCustomColors={disableCustomColors}
					mapColorValueForInput={(next) => toPaletteVisualValue(next, paletteColors)}
					mapColorValueForOutput={(next) => toStoredColorValue(next, colorToPresetVar)}
					enableAlpha
				/>
			</div>
		);
	}

	if (normalizedType === "gradient") {
		return (
			<GradientControl
				key={model.key}
				value={model.value}
				onChange={(val) => model.onChange(val)}
				kind={String(model?.config?.kind || "").trim() || "gradient"}
				placeholder={model?.placeholder || ""}
			/>
		);
	}

	if (normalizedType === TYPE_BACKGROUND || normalizedType === TYPE_BACKGROUND_IMAGE) {
		return (
			<div
				className={
					normalizedType === TYPE_BACKGROUND
						? "motto-background-control"
						: "motto-background-image-control"
				}
				key={model.key}
			>
				<BackgroundLayersControl
					value={model.value}
					onChange={(val) => model.onChange(val)}
					mode={normalizedType}
					layerTypes={["image", "gradient"]}
					onBeforeOpenMediaModal={suspendAutoClose}
					themeColors={themeColors}
					disableCustomColors={disableCustomColors}
					colorToPresetVar={colorToPresetVar}
				/>
			</div>
		);
	}

	if (normalizedType === "filter") {
		return (
			<FilterControl
				key={model.key}
				value={model.value}
				onChange={(val) => model.onChange(val)}
				themeColors={themeColors}
				disableCustomColors={disableCustomColors}
				colorToPresetVar={colorToPresetVar}
			/>
		);
	}

	if (normalizedType === "aspect-ratio") {
		return (
			<AspectRatioControl
				key={model.key}
				value={model.value}
				onChange={(val) => model.onChange(val)}
			/>
		);
	}

	if (normalizedType === "transform") {
		return (
			<TransformControl
				key={model.key}
				value={model.value}
				onChange={(val) => model.onChange(val)}
			/>
		);
	}

	if (normalizedType === "transition") {
		return (
			<TransitionControl
				key={model.key}
				value={model.value}
				onChange={(val) => model.onChange(val)}
			/>
		);
	}

	if (normalizedType === "transition-duration") {
		return (
			<TransitionDurationField
				key={model.key}
				value={model.value}
				onChange={(val) => model.onChange(val)}
				label={ruleDisplayLabel}
			/>
		);
	}

	if (normalizedType === "transition-easing") {
		return (
			<TransitionEasingField
				key={model.key}
				value={model.value}
				onChange={(val) => model.onChange(val)}
				label={ruleDisplayLabel}
			/>
		);
	}

	if (normalizedType === "transition-property") {
		return (
			<TransitionPropertyField
				key={model.key}
				value={model.value}
				onChange={(val) => model.onChange(val)}
				label={ruleDisplayLabel}
			/>
		);
	}

	if (normalizedType === "shape-region") {
		return (
			<ShapeRegionControl
				key={model.key}
				value={model.value}
				onChange={(val) => model.onChange(val)}
				spacingSizes={spacingSizes}
			/>
		);
	}

	if (normalizedType === "enum") {
		return (
			<EnumControl
				key={model.key}
				value={model.value}
				onChange={(val) => model.onChange(val)}
				enumOptions={model?.enumOptions || model?.config?.options || []}
				onSelect={model.onChange}
				onClosePanel={closePopup}
				wrapperClass={flexAxisClass}
			/>
		);
	}

	if (normalizedType === "border") {
		return (
			<BorderControl
				key={model.key}
				value={model.value}
				onChange={(val) => model.onChange(val)}
				themeColors={themeColors}
				disableCustomColors={disableCustomColors}
				colorToPresetVar={colorToPresetVar}
			/>
		);
	}

	if (normalizedType === "border-radius") {
		return (
			<BorderRadiusControl
				key={model.key}
				value={model.value}
				onChange={(val) => model.onChange(val)}
				spacingSizes={spacingSizes}
				defaultMode={model?.config?.defaultMode === "custom" ? "custom" : "preset"}
			/>
		);
	}

	if (normalizedType === "scale") {
		return (
			<ScaleControl
				key={model.key}
				value={model.value}
				onChange={(val) => model.onChange(val)}
				min={Number.isFinite(Number(model?.config?.min)) ? Number(model.config.min) : -10}
				max={Number.isFinite(Number(model?.config?.max)) ? Number(model.config.max) : 10}
				step={
					Number.isFinite(Number(model?.config?.step)) ? Number(model.config.step) : 0.01
				}
				label={ruleDisplayLabel}
			/>
		);
	}

	if (normalizedType === "box-shadow") {
		return (
			<BoxShadowControl
				key={model.key}
				value={model.value}
				onChange={(val) => model.onChange(val)}
				themeColors={themeColors}
				disableCustomColors={disableCustomColors}
				colorToPresetVar={colorToPresetVar}
				defaultValue={model?.config?.default || ""}
			/>
		);
	}

	if (
		normalizedType === "grid-template-columns" ||
		normalizedType === "grid-template-rows" ||
		normalizedType === "grid-template-tracks"
	) {
		return (
			<GridTemplateTracksControl
				key={model.key}
				value={model.value}
				onChange={(val) => model.onChange(val)}
			/>
		);
	}

	if (normalizedType === "font-size") {
		return (
			<FontSizeControl
				key={model.key}
				value={model.value}
				onChange={(val) => model.onChange(val)}
				fontSizes={fontSizes}
				disableCustomFontSizes={disableCustomFontSizes}
				fontSizeToPresetVar={fontSizeToPresetVar}
			/>
		);
	}

	if (normalizedType === "font-family") {
		return (
			<FontFamilyControl
				key={model.key}
				value={model.value}
				onChange={(val) => model.onChange(val)}
				fontFamilies={fontFamilies}
				disableCustomFontFamilies={disableCustomFontFamilies}
				fontFamilyToPresetVar={fontFamilyToPresetVar}
			/>
		);
	}

	if (normalizedType === TYPE_PERCENT) {
		return (
			<PercentControl
				key={model.key}
				value={model.value}
				onChange={model.onChange}
				min={Number.isFinite(Number(model?.config?.min)) ? Number(model.config.min) : 0}
				max={Number.isFinite(Number(model?.config?.max)) ? Number(model.config.max) : 100}
				step={Number.isFinite(Number(model?.config?.step)) ? Number(model.config.step) : 1}
				scale={
					Number.isFinite(Number(model?.config?.scale))
						? Number(model.config.scale)
						: 0.01
				}
			/>
		);
	}

	if (normalizedType === "number") {
		return (
			<MottoNumberControl
				key={model.key}
				value={model.value}
				onChange={(val) => model.onChange(val)}
				label={ruleDisplayLabel}
				step={model?.config?.step}
				min={model?.config?.min}
				max={model?.config?.max}
				showSlider={model?.config?.showSlider !== false}
				hasAutoValue={Boolean(model?.config?.hasAutoValue)}
				autoValueLabel={model?.config?.autoValueLabel}
			/>
		);
	}

	if (normalizedType === "length" || normalizedType === TYPE_SPACING_SINGLE) {
		if (normalizedType === TYPE_SPACING_SINGLE) {
			return (
				<SpacingSingleControl
					key={model.key}
					value={model.value}
					onChange={(val) => model.onChange(val)}
					hasAutoValue={Boolean(model?.config?.hasAutoValue)}
					allowNegativeValue={Boolean(model?.config?.allowNegativeValue)}
					label={ruleDisplayLabel}
					side={model?.config?.side}
					spacingSizes={spacingSizes}
					initialUnit={model?.config?.initialUnit}
					defaultMode={model?.config?.defaultMode === "custom" ? "custom" : "preset"}
				/>
			);
		}

		return (
			<LengthControl
				key={model.key}
				value={model.value}
				onChange={(val) => model.onChange(val)}
				min={model?.config?.min}
				max={model?.config?.max}
				step={model?.config?.step}
				unit={model?.config?.unit}
				initialUnit={model?.config?.initialUnit}
				units={model?.config?.units}
				hasAutoValue={Boolean(model?.config?.hasAutoValue)}
				showSlider={model?.config?.showSlider !== false}
			/>
		);
	}

	if (normalizedType === TYPE_SPACING_MULTIPLE) {
		return (
			<SpacingMultipleControl
				key={model.key}
				value={model.value}
				onChange={(val) => model.onChange(val)}
				config={model?.config}
				spacingSizes={spacingSizes}
				label={ruleDisplayLabel}
			/>
		);
	}

	return (
		<CssFunctionAutocompleteControl
			key={model.key}
			value={model.value || ""}
			onChange={(val) => model.onChange(val)}
			placeholder={model?.placeholder || __("Value", "motto-blocks")}
			className="motto-input motto-css-rule-value"
		/>
	);
};
