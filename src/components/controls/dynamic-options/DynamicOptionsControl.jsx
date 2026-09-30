import { Button } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { Database } from "lucide-react";

const normalizeId = (value) => String(value ?? "").trim();

export const DynamicOptionsTrigger = ({
	isOpen = false,
	onClick,
	disabled = false,
	label = __("Dynamic values", "motto-blocks"),
}) => (
	<Button
		variant="tertiary"
		className="motto-ui-button is-icon-only motto-dynamic-options-trigger"
		aria-pressed={isOpen}
		aria-label={label}
		title={label}
		disabled={disabled}
		onClick={onClick}
	>
		<Database size={14} />
	</Button>
);

export const DynamicOptionsList = ({
	options = [],
	onSelect,
	emptyLabel = __("No dynamic values available.", "motto-blocks"),
}) => {
	const normalizedOptions = (Array.isArray(options) ? options : []).filter((entry) =>
		normalizeId(entry?.id)
	);

	if (!normalizedOptions.length) {
		return <p className="motto-section-help">{emptyLabel}</p>;
	}

	return normalizedOptions.map((entry) => (
		<button
			key={normalizeId(entry?.id)}
			type="button"
			className="motto-dynamic-options-list__option"
			onClick={() => onSelect?.(entry)}
		>
			<span className="motto-dynamic-options-list__option-label">
				{String(entry?.label || entry?.name || entry?.title || entry?.id)}
			</span>
			{entry?.description ? (
				<span className="motto-dynamic-options-list__option-description">
					{String(entry.description)}
				</span>
			) : null}
		</button>
	));
};
