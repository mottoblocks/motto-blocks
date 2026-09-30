import { useMemo, useRef, useState } from "@wordpress/element";
import { Popover } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { withMottoPopupClass } from "@components/ui/popup-class-name";
import { PlainTextField } from "./PlainTextField.jsx";

const ANIMATABLE_PROPERTIES = [
	"all",
	"opacity",
	"transform",
	"color",
	"background-color",
	"background",
	"border-color",
	"border",
	"border-radius",
	"border-width",
	"width",
	"height",
	"max-width",
	"max-height",
	"min-width",
	"min-height",
	"top",
	"right",
	"bottom",
	"left",
	"margin",
	"margin-top",
	"margin-right",
	"margin-bottom",
	"margin-left",
	"padding",
	"padding-top",
	"padding-right",
	"padding-bottom",
	"padding-left",
	"font-size",
	"letter-spacing",
	"line-height",
	"word-spacing",
	"box-shadow",
	"filter",
	"backdrop-filter",
	"clip-path",
	"outline",
	"outline-color",
	"outline-width",
	"outline-offset",
	"visibility",
	"z-index",
	"gap",
	"column-gap",
	"row-gap",
	"flex-grow",
	"flex-shrink",
	"flex-basis",
	"rotate",
	"scale",
	"translate",
	"grid-template-columns",
	"grid-template-rows",
];

const getSuggestions = (query, limit = 8) => {
	const q = String(query || "")
		.toLowerCase()
		.trim();
	const list = q
		? ANIMATABLE_PROPERTIES.filter((p) => p.startsWith(q) || p.includes(q))
		: ANIMATABLE_PROPERTIES;
	return list.slice(0, limit).map((p) => ({ label: p, value: p }));
};

export const TransitionPropertyField = ({ value, onChange, label }) => {
	const wrapRef = useRef(null);
	const [isFocused, setIsFocused] = useState(false);
	const [activeIndex, setActiveIndex] = useState(0);

	const suggestions = useMemo(() => getSuggestions(value), [value]);
	const showList = isFocused && suggestions.length > 0;

	const accept = (item) => {
		onChange(item.value);
		setIsFocused(false);
	};

	const handleKeyDown = (e) => {
		if (!showList) return;
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setActiveIndex((i) => Math.min(suggestions.length - 1, i + 1));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setActiveIndex((i) => Math.max(0, i - 1));
		} else if (e.key === "Enter") {
			e.preventDefault();
			if (suggestions[activeIndex]) accept(suggestions[activeIndex]);
		} else if (e.key === "Escape") {
			e.preventDefault();
			setIsFocused(false);
		}
	};

	const resolvedLabel = label ?? __("Property", "motto-blocks");

	return (
		<div className="motto-transition-field-row">
			<span className="motto-label">{resolvedLabel}</span>
			<div ref={wrapRef} className="flex-1">
				<PlainTextField
					label={resolvedLabel}
					hideLabelFromVision
					value={value}
					onChange={onChange}
					onFocus={() => {
						setIsFocused(true);
						setActiveIndex(0);
					}}
					onBlur={() => setIsFocused(false)}
					onKeyDown={handleKeyDown}
					className="motto-input"
				/>
				{showList && wrapRef.current ? (
					<Popover
						anchor={wrapRef.current}
						placement="bottom-start"
						flip
						offset={4}
						focusOnMount={false}
						className={withMottoPopupClass("motto-transition-property-popup")}
					>
						<div className="motto-autocomplete-list" role="listbox">
							{suggestions.map((item, index) => (
								<button
									key={item.value}
									type="button"
									role="option"
									className={`motto-autocomplete-item${index === activeIndex ? " motto-is-active" : ""}`}
									aria-selected={index === activeIndex}
									onMouseDown={(e) => {
										e.preventDefault();
										accept(item);
									}}
									onMouseEnter={() => setActiveIndex(index)}
								>
									{item.label}
								</button>
							))}
						</div>
					</Popover>
				) : null}
			</div>
		</div>
	);
};
