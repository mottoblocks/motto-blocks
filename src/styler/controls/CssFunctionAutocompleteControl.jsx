import { RawControl } from "@components/controls/RawControl.jsx";

export const CssFunctionAutocompleteControl = ({
	label,
	value,
	onChange,
	placeholder,
	className,
	onKeyDown,
	onPaste,
	autoComplete = "off",
	variableSuggestions = null,
}) => (
	<RawControl
		label={label}
		value={value}
		onChange={onChange}
		placeholder={placeholder}
		className={`motto-css-value-autocomplete${className ? ` ${className}` : ""}`}
		popoverClassName="motto-css-rule-raw-popup"
		onKeyDown={onKeyDown}
		onPaste={onPaste}
		autoComplete={autoComplete}
		variableSuggestions={variableSuggestions}
	/>
);
