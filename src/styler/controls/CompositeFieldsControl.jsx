import clsx from "clsx";

export const CompositeFieldsControl = ({
	models = [],
	renderPopupInput,
	closePopup,
	suspendAutoClose,
	layout = "column",
}) => {
	const fieldModels = Array.isArray(models) ? models : [];
	if (fieldModels.length === 0) return null;

	const isRow = layout === "row";
	const wrapperClass = clsx(
		"motto-composite-field-group",
		isRow ? "motto-flex gap-sm align-end" : "motto-flex-rows gap-sm"
	);
	// const fieldClass = clsx(isRow ? "motto-flex-col gap-xs" : "motto-flex align-center gap-sm");
	const fieldClass = "motto-flex-col flex-1 gap-sm";

	return (
		<div className={wrapperClass}>
			{fieldModels.map((model) => (
				<div className={fieldClass} key={model.key}>
					<span className="motto-label">{model.fieldLabel || model.placeholder}</span>
					{renderPopupInput(model, closePopup, suspendAutoClose)}
				</div>
			))}
		</div>
	);
};
