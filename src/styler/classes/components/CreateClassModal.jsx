import { __ } from "@wordpress/i18n";
import { Button, Modal } from "@wordpress/components";
import { useMemo, useRef, useState } from "@wordpress/element";
import { PlainTextField } from "@components";

import { useModalAutofocus } from "../../utils/use-modal-autofocus";
import {
	isCssClassSlugCompatible,
	normalizeCssClassSlug,
	sanitizeCssClassSlugInput,
} from "../css-class-slug";
import { createCssClassSlugGuards } from "../../utils/input-guards";

const saveClassInputPrefix = ".";

export const CreateClassModal = ({ isOpen, onCancel, onSave, existingClassIdMap }) => {
	const [newClassName, setNewClassName] = useState("");
	const createClassModalContentRef = useRef(null);

	useModalAutofocus({
		enabled: isOpen,
		containerRef: createClassModalContentRef,
	});

	const classCreateSlugGuards = useMemo(
		() =>
			createCssClassSlugGuards({
				getValue: () => newClassName,
				setValue: (nextValue) => setNewClassName(sanitizeCssClassSlugInput(nextValue)),
			}),
		[newClassName]
	);
	const normalizedNewClassSlug = useMemo(
		() => normalizeCssClassSlug(newClassName),
		[newClassName]
	);
	const slugAlreadyUsed = useMemo(
		() => Boolean(normalizedNewClassSlug && existingClassIdMap?.has?.(normalizedNewClassSlug)),
		[existingClassIdMap, normalizedNewClassSlug]
	);
	const canSaveNewClass = isCssClassSlugCompatible(newClassName) && !slugAlreadyUsed;

	const handleCancel = () => {
		setNewClassName("");
		onCancel?.();
	};

	const handleSave = async () => {
		if (!canSaveNewClass) return;
		const className = sanitizeCssClassSlugInput(newClassName);
		if (!className) return;
		await onSave?.(className);
		setNewClassName("");
	};

	if (!isOpen) return null;

	return (
		<Modal
			title={__("Save styles as a global class", "motto-blocks")}
			onRequestClose={handleCancel}
			className="motto-popup motto-class-create-popup"
			overlayClassName="motto-popup-overlay"
		>
			<div
				className="motto-popup-content motto-class-create-popup-content"
				ref={createClassModalContentRef}
			>
				<div className="motto-class-input-with-prefix">
					{saveClassInputPrefix ? (
						<span className="motto-class-input-prefix" aria-hidden="true">
							{saveClassInputPrefix}
						</span>
					) : null}
					<PlainTextField
						className={`motto-class-input motto-class-slug${saveClassInputPrefix ? " has-prefix" : ""}`}
						value={newClassName}
						aria-label={__("Class slug", "motto-blocks")}
						onChange={(next) => setNewClassName(sanitizeCssClassSlugInput(next))}
						onKeyDown={classCreateSlugGuards.onKeyDown}
						onPaste={classCreateSlugGuards.onPaste}
						placeholder={__("this-format, with no dot", "motto-blocks")}
						autoComplete="off"
						__next40pxDefaultSize
					/>
				</div>
				{slugAlreadyUsed ? (
					<p className="motto-section-help motto-class-create-error">
						{__("This class already exists.", "motto-blocks")}
					</p>
				) : null}
				<div className="motto-popup-actions">
					<Button variant="tertiary" onClick={handleCancel} className="motto-ui-button">
						{__("Cancel", "motto-blocks")}
					</Button>
					<Button
						variant="primary"
						onClick={handleSave}
						className="motto-ui-button"
						disabled={!canSaveNewClass}
					>
						{__("Save", "motto-blocks")}
					</Button>
				</div>
			</div>
		</Modal>
	);
};
