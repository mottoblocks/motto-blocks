import { Button, Modal, TextareaControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { PlainTextField } from "@components";

export const EditSelectorModal = ({
	editState,
	editError,
	contentRef,
	selectorInputWrapRef,
	onLabelChange,
	onSelectorChange,
	onDescriptionChange,
	onInsertToken,
	onCancel,
	onConfirm,
}) => (
	<Modal
		title={__("Edit Block Selector", "motto-blocks")}
		onRequestClose={onCancel}
		className="motto-popup"
		overlayClassName="motto-popup-overlay"
	>
		<div className="motto-popup-content motto-inner-selector-edit-form" ref={contentRef}>
			<div className="motto-grid gap-md">
				<PlainTextField
					label={__("Label", "motto-blocks")}
					value={editState.label}
					onChange={onLabelChange}
				/>
				<div className="motto-grid gap-sm">
					<div className="motto-flex align-end gap-md" ref={selectorInputWrapRef}>
						<div style={{ flexGrow: "1" }}>
							<PlainTextField
								label={__("Selector", "motto-blocks")}
								value={editState.selector}
								style={{ flexBasis: "30em" }}
								onChange={onSelectorChange}
							/>
						</div>
						<div style={{ flexGrow: "0" }}>
							<Button
								variant="secondary"
								className="motto-ui-button motto-insert-token-button"
								onClick={onInsertToken}
								aria-label={__("Add placeholder", "motto-blocks")}
								title={__("Add placeholder", "motto-blocks")}
							>
								{__("Add placeholder", "motto-blocks")}
							</Button>
						</div>
					</div>
					{editError ? (
						<div className="motto-selector-edit-error">{editError}</div>
					) : null}
				</div>
			</div>
			<TextareaControl
				label={__("Description", "motto-blocks")}
				value={editState.description}
				onChange={onDescriptionChange}
			/>
			<div className="motto-popup-actions">
				<Button variant="tertiary" onClick={onCancel} className="motto-ui-button">
					{__("Cancel", "motto-blocks")}
				</Button>
				<Button variant="primary" onClick={onConfirm} className="motto-ui-button">
					{__("OK", "motto-blocks")}
				</Button>
			</div>
		</div>
	</Modal>
);
