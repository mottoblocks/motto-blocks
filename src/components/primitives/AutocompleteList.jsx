import { memo } from "@wordpress/element";
import { Popover } from "@wordpress/components";
import { withMottoPopupClass } from "@components/ui/popup-class-name";

const isGradientValue = (value) =>
	/^(?:repeating-)?(?:linear|radial|conic)-gradient\s*\(/i.test(String(value || "").trim());
const isColorKeywordValue = (value) => {
	const token = String(value || "")
		.trim()
		.toLowerCase();
	return ["transparent", "currentcolor", "inherit", "initial", "unset"].includes(token);
};
const isPlainColorValue = (value) => {
	const token = String(value || "").trim();
	if (!token) return false;
	if (isGradientValue(token)) return false;
	if (/^var\(/i.test(token)) return false;
	if (isColorKeywordValue(token)) return true;
	if (/^(#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8}))$/i.test(token)) return true;
	if (/^(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i.test(token)) return true;
	return false;
};

export const AutocompleteList = memo(
	({
		items,
		activeIndex,
		onSelect,
		onHover,
		className = "",
		popoverAnchor = null,
		popoverClassName = "",
	}) => {
		if (!Array.isArray(items) || items.length === 0) return null;

		const renderMeta = (metaValue) => {
			const value = String(metaValue || "").trim();
			if (!value) return null;
			if (isGradientValue(value)) {
				return (
					<span
						className="motto-autocomplete-meta motto-autocomplete-preview is-gradient"
						style={{ backgroundImage: value }}
						aria-label={value}
						role="img"
						title={value}
					/>
				);
			}
			if (isPlainColorValue(value)) {
				return (
					<span
						className="motto-autocomplete-meta motto-autocomplete-preview is-color"
						style={{ backgroundColor: value }}
						aria-label={value}
						role="img"
						title={value}
					/>
				);
			}

			return <span className="motto-autocomplete-meta">{value}</span>;
		};

		const list = (
			<div className={`motto-autocomplete-list ${className}`} role="listbox">
				{items.map((item, index) => (
					<button
						key={`${item.value}-${index}`}
						type="button"
						className={`motto-autocomplete-item${index === activeIndex ? " motto-is-active" : ""}`}
						role="option"
						aria-selected={index === activeIndex}
						onMouseDown={(event) => {
							event.preventDefault();
							if (onSelect) onSelect(item);
						}}
						onMouseEnter={() => {
							if (onHover) onHover(index);
						}}
					>
						<span className="motto-autocomplete-label">{item.label}</span>
						{item.meta && renderMeta(item.meta)}
					</button>
				))}
			</div>
		);

		if (popoverAnchor) {
			return (
				<Popover
					anchor={popoverAnchor}
					placement="bottom-start"
					flip={true}
					offset={4}
					focusOnMount={false}
					className={withMottoPopupClass("motto-autocomplete-popup", popoverClassName)}
				>
					{list}
				</Popover>
			);
		}

		return list;
	}
);
