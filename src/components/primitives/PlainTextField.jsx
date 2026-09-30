import { TextControl, TextareaControl } from "@wordpress/components";

const DEFAULT_AUTOCOMPLETE = "off";

export const PlainTextField = ({
	multiline = false,
	className = "",
	autoComplete = DEFAULT_AUTOCOMPLETE,
	inputProps = {},
	rows = 1,
	...props
}) => {
	if (multiline) {
		return (
			<TextareaControl
				className={className}
				autoComplete={autoComplete}
				autoCorrect="off"
				autoCapitalize="off"
				spellCheck={false}
				name={props?.name || "motto-raw-field"}
				data-lpignore="true"
				data-1p-ignore="true"
				rows={rows}
				{...props}
			/>
		);
	}

	return (
		<TextControl
			className={className}
			autoComplete={autoComplete}
			inputProps={{
				autoComplete,
				autoCorrect: "off",
				autoCapitalize: "off",
				spellCheck: false,
				"data-lpignore": "true",
				"data-1p-ignore": "true",
				...inputProps,
			}}
			{...props}
		/>
	);
};
