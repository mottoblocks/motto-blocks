import { Button } from "@wordpress/components";
import { forwardRef, memo, useMemo } from "@wordpress/element";
import { SquarePen } from "lucide-react";
import { resolveVisualPreview } from "../utils/background-preview-utils";
import { useLucideIconMap } from "../utils/icon-utils.jsx";

const normalizeOptionValue = (option) => {
	if (option && typeof option === "object") {
		return String(option.value || option.name || "").trim();
	}
	return String(option || "").trim();
};

const getOptionIcon = (option) => {
	if (option && typeof option === "object" && typeof option.icon === "string") {
		return option.icon.trim();
	}
	return "";
};

const pickEnumIconName = (enumOptions = [], value = "") => {
	const options = Array.isArray(enumOptions) ? enumOptions : [];
	if (options.length === 0) return "";
	const current = String(value || "")
		.trim()
		.toLowerCase();
	if (!current) return "";
	const selected = options.find(
		(option) => normalizeOptionValue(option).toLowerCase() === current
	);
	return getOptionIcon(selected);
};

export const RuleValueToggleButton = memo(
	forwardRef(
		(
			{
				isOpen = false,
				onClick,
				title = "",
				popupType = "",
				value = "",
				previewType = "",
				previewValue = "",
				previewLabel = "",
				enumOptions = [],
				flexAxisClass = "",
			},
			ref
		) => {
			const normalizedType = String(popupType || "")
				.trim()
				.toLowerCase();
			const normalizedPreviewType = String(previewType || "")
				.trim()
				.toLowerCase();
			const normalizedPreviewLabel = String(previewLabel || "").trim();
			const visualPreview = useMemo(() => {
				const explicit = String(previewValue || "").trim();
				if (explicit) return explicit;
				return resolveVisualPreview(normalizedType, value);
			}, [normalizedType, previewValue, value]);
			const enumIconName = useMemo(() => {
				if (normalizedType !== "enum") return "";
				return pickEnumIconName(enumOptions, value);
			}, [enumOptions, normalizedType, value]);
			const iconMap = useLucideIconMap(enumIconName ? [enumIconName] : []);
			const EnumIcon = enumIconName ? iconMap[enumIconName] || null : null;

			return (
				<Button
					ref={ref}
					variant="tertiary"
					onClick={onClick}
					className={`motto-ui-button motto-row-value-toggle is-icon-only${isOpen ? " motto-is-active motto-no-focus-ring" : ""}${flexAxisClass ? ` ${flexAxisClass}` : ""}`}
					aria-label={title}
					title={title}
				>
					{normalizedPreviewType === "font-size" && normalizedPreviewLabel ? (
						<span className="motto-row-value-toggle-font-size" aria-hidden="true">
							{normalizedPreviewLabel}
						</span>
					) : visualPreview ? (
						<span
							className="motto-row-value-toggle-color"
							style={{ "--motto-toggle-preview-color": visualPreview }}
							aria-hidden="true"
						/>
					) : EnumIcon ? (
						<EnumIcon size={14} className="motto-row-value-toggle-enum-icon" />
					) : (
						<SquarePen size={14} />
					)}
				</Button>
			);
		}
	)
);
