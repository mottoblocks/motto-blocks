import { RichText } from "@wordpress/block-editor";
import {
	ButtonIconMedia,
	hasConfiguredButtonIcon,
} from "@components/controls/button-icons/button-icon-media";
import { normalizeButtonIconOptions } from "@components/controls/button-icons/button-icon-options";

const TAB_LABEL_FORMATS = [
	"core/bold",
	"core/italic",
	"core/strikethrough",
	"core/underline",
	"core/text-color",
];

export function normalizeTabIconPosition(value) {
	return value === "right" ? "right" : "left";
}

function TabTriggerInner({ iconOptions, iconPosition, renderLabel }) {
	const normalizedIconOptions = normalizeButtonIconOptions(iconOptions);
	const normalizedIconPosition = normalizeTabIconPosition(iconPosition);
	const hasIcon = hasConfiguredButtonIcon(normalizedIconOptions);

	return (
		<span
			className={`motto-tab-trigger__content motto-tab-trigger__content--icon-${normalizedIconPosition}`}
		>
			{hasIcon && normalizedIconPosition === "left" && (
				<span className="motto-tab-trigger__icon" aria-hidden="true">
					<ButtonIconMedia value={normalizedIconOptions} />
				</span>
			)}
			{renderLabel()}
			{hasIcon && normalizedIconPosition === "right" && (
				<span className="motto-tab-trigger__icon" aria-hidden="true">
					<ButtonIconMedia value={normalizedIconOptions} />
				</span>
			)}
		</span>
	);
}

export function TabTriggerEditor({
	label,
	iconOptions,
	iconPosition,
	onChange,
	placeholder = "Tab label…",
}) {
	return (
		<TabTriggerInner
			iconOptions={iconOptions}
			iconPosition={iconPosition}
			renderLabel={() => (
				<RichText
					tagName="span"
					className="motto-tab-trigger__label"
					value={label}
					onChange={onChange}
					placeholder={placeholder}
					allowedFormats={TAB_LABEL_FORMATS}
				/>
			)}
		/>
	);
}

export function TabTriggerContent({ label, iconOptions, iconPosition }) {
	return (
		<TabTriggerInner
			iconOptions={iconOptions}
			iconPosition={iconPosition}
			renderLabel={() => (
				<RichText.Content
					tagName="span"
					className="motto-tab-trigger__label"
					value={label}
				/>
			)}
		/>
	);
}
