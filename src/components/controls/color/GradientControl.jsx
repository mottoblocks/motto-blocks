import {
	TextControl,
	GradientPicker as ComponentsStableGradientPicker,
	__experimentalGradientPicker as ComponentsGradientPicker,
} from "@wordpress/components";
import {
	__experimentalGradientPicker as BlockEditorGradientPicker,
	__experimentalUseMultipleOriginColorsAndGradients as useMultipleOriginColorsAndGradients,
} from "@wordpress/block-editor";
import { useSelect } from "@wordpress/data";
import { __ } from "@wordpress/i18n";

const toGradientValue = (rawValue, kind, placeholder) => {
	const value = String(rawValue || "").trim();
	if (!value) return placeholder;
	if (/^(linear-gradient|radial-gradient|conic-gradient)\(/i.test(value)) return value;
	if (kind === "radial-gradient" || kind === "conic-gradient" || kind === "linear-gradient") {
		return `${kind}(${value})`;
	}
	return `linear-gradient(${value})`;
};

export const GradientControl = ({
	label,
	value,
	onChange,
	kind = "gradient",
	placeholder = "",
	gradients,
	disableCustomGradients,
}) => {
	const usePaletteSources =
		typeof useMultipleOriginColorsAndGradients === "function"
			? useMultipleOriginColorsAndGradients
			: () => null;
	const paletteSources = usePaletteSources();
	const gradientsFromPaletteSources = Array.isArray(paletteSources?.gradients)
		? paletteSources.gradients
		: null;
	const disableCustomGradientsFromPaletteSources = paletteSources?.disableCustomGradients;

	const gradientsFromEditorSettings = useSelect((select) => {
		try {
			return select("core/block-editor")?.getSettings?.()?.gradients || [];
		} catch {
			return [];
		}
	}, []);
	const resolvedGradients = Array.isArray(gradients)
		? gradients
		: gradientsFromPaletteSources || gradientsFromEditorSettings;
	const resolvedDisableCustomGradients =
		typeof disableCustomGradients === "boolean"
			? disableCustomGradients
			: typeof disableCustomGradientsFromPaletteSources === "boolean"
				? disableCustomGradientsFromPaletteSources
				: false;

	const normalizedValue = toGradientValue(value, kind, placeholder);
	const GradientPicker =
		typeof ComponentsStableGradientPicker === "function"
			? ComponentsStableGradientPicker
			: typeof ComponentsGradientPicker === "function"
				? ComponentsGradientPicker
				: typeof BlockEditorGradientPicker === "function"
					? BlockEditorGradientPicker
					: null;
	const hasGradientPicker = typeof GradientPicker === "function";

	if (hasGradientPicker) {
		return (
			<div className="motto-gradient-control">
				<GradientPicker
					label={label}
					value={normalizedValue}
					onChange={(nextValue) => onChange?.(String(nextValue || ""))}
					gradients={Array.isArray(resolvedGradients) ? resolvedGradients : []}
					disableCustomGradients={resolvedDisableCustomGradients}
				/>
			</div>
		);
	}

	return (
		<div className="motto-gradient-control">
			<TextControl
				label={label || __("Gradient", "motto-blocks")}
				className="motto-input"
				value={String(value || "")}
				onChange={(nextValue) => onChange?.(nextValue)}
				placeholder={placeholder}
			/>
		</div>
	);
};
