import { Button } from "@wordpress/components";
import { memo, useCallback, useMemo } from "@wordpress/element";
import { useLucideIconMap } from "../utils/icon-utils.jsx";

const EnumOptionButton = memo(({ label, isActive, Icon, onSelect }) => {
	return (
		<Button
			variant="secondary"
			className={`motto-ui-button motto-enum-option${isActive ? " motto-is-active" : ""}`}
			onClick={onSelect}
		>
			{Icon ? <Icon size={14} className="motto-enum-option-icon" /> : null}
			{label}
		</Button>
	);
});

export const EnumControl = memo(
	({ value, onChange, enumOptions = [], onSelect, onClosePanel, wrapperClass = "" }) => {
		const current = String(value || "")
			.trim()
			.toLowerCase();
		const options = useMemo(
			() => (Array.isArray(enumOptions) ? enumOptions : []),
			[enumOptions]
		);

		const getOptionValue = (option) => {
			if (option && typeof option === "object") {
				return String(option.value || option.name || "");
			}
			return String(option || "");
		};

		const getOptionLabel = (option) => {
			if (option && typeof option === "object") {
				return String(option.label || option.name || option.value || "");
			}
			return String(option || "");
		};
		const getOptionIcon = (option) => {
			if (option && typeof option === "object" && typeof option.icon === "string") {
				return option.icon;
			}
			return "";
		};

		const uniqueOptions = useMemo(() => {
			const seen = new Set();
			const deduped = [];
			options.forEach((option) => {
				const optionValue = getOptionValue(option).trim();
				if (!optionValue) return;
				const key = optionValue.toLowerCase();
				if (seen.has(key)) return;
				seen.add(key);
				deduped.push(option);
			});
			return deduped;
		}, [options]);
		const iconNames = useMemo(
			() => uniqueOptions.map((option) => getOptionIcon(option)).filter(Boolean),
			[uniqueOptions]
		);
		const iconMap = useLucideIconMap(iconNames);

		const handleSelect = useCallback(
			(optionValue) => {
				if (onSelect) onSelect(optionValue);
				else onChange(optionValue);
				if (onClosePanel) onClosePanel();
			},
			[onChange, onClosePanel, onSelect]
		);

		return (
			<div className={`motto-enum-options${wrapperClass ? ` ${wrapperClass}` : ""}`}>
				{uniqueOptions.map((option) => {
					const optionValue = getOptionValue(option).trim();
					const optionLabel = getOptionLabel(option).trim() || optionValue;
					const iconName = getOptionIcon(option);
					const Icon = iconMap[iconName] || null;
					const isActive = optionValue.toLowerCase() === current;
					return (
						<EnumOptionButton
							key={optionValue}
							label={optionLabel}
							isActive={isActive}
							Icon={Icon}
							onSelect={() => handleSelect(optionValue)}
						/>
					);
				})}
			</div>
		);
	}
);
