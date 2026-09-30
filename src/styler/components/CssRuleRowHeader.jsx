import clsx from "clsx";
import { Tooltip } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { PlainTextField } from "@components";
import { CircleAlert } from "lucide-react";
import { AutocompleteList } from "@components/primitives/AutocompleteList.jsx";

export const CssRuleRowHeader = ({
	itemId,
	nameDraft,
	isVarName = false,
	shouldAutoFocusName = false,
	nameWrapRef,
	onNameKeyDown,
	onNamePaste,
	onNameChange,
	onNameFocus,
	onNameBlur,
	isNameFocused,
	nameSuggestions,
	activeNameIndex,
	onSelectSuggestion,
	onHoverSuggestion,
	duplicateWarning,
	dependencyWarning,
	invalidNameWarning,
	invalidValueWarning,
	blockSpacingConflictWarning,
	actions,
}) => {
	return (
		<>
			<div className="motto-css-name-wrapper" ref={nameWrapRef}>
				<PlainTextField
					id={`motto-css-name-${itemId}`}
					value={nameDraft}
					autoFocus={shouldAutoFocusName}
					autoComplete="off"
					aria-label={__("CSS rule name", "motto-blocks")}
					inputProps={{
						name: `motto-css-name-${itemId}`,
						autoComplete: "off",
						"data-lpignore": "true",
						"data-1p-ignore": "true",
					}}
					onKeyDown={onNameKeyDown}
					onPaste={onNamePaste}
					onChange={onNameChange}
					onFocus={onNameFocus}
					onBlur={onNameBlur}
					placeholder={__("Write a CSS rule", "motto-blocks")}
					className={clsx("motto-css-rule-name", "motto-input", isVarName && "is-var")}
				/>
				{isNameFocused && nameSuggestions.length > 0 ? (
					<AutocompleteList
						items={nameSuggestions}
						activeIndex={activeNameIndex}
						onSelect={onSelectSuggestion}
						onHover={onHoverSuggestion}
						popoverAnchor={nameWrapRef.current}
						popoverClassName="motto-css-name-autocomplete-popup"
					/>
				) : null}
				{duplicateWarning ||
				dependencyWarning ||
				invalidNameWarning ||
				invalidValueWarning ||
				blockSpacingConflictWarning ? (
					<div className="motto-rule-warnings">
						{duplicateWarning ? (
							<Tooltip text={duplicateWarning}>
								<span
									className="motto-tooltip-trigger motto-rule-warning motto-rule-duplicate-warning"
									aria-hidden="true"
								>
									<CircleAlert size={14} />
								</span>
							</Tooltip>
						) : null}
						{dependencyWarning ? (
							<Tooltip text={dependencyWarning}>
								<span
									className="motto-tooltip-trigger motto-rule-warning motto-rule-dependency-warning"
									aria-hidden="true"
								>
									<CircleAlert size={14} />
								</span>
							</Tooltip>
						) : null}
						{invalidNameWarning ? (
							<Tooltip text={invalidNameWarning}>
								<span
									className="motto-tooltip-trigger motto-rule-warning motto-rule-invalid-name-warning"
									aria-hidden="true"
								>
									<CircleAlert size={14} />
								</span>
							</Tooltip>
						) : null}
						{invalidValueWarning ? (
							<Tooltip text={invalidValueWarning}>
								<span
									className="motto-tooltip-trigger motto-rule-warning motto-rule-invalid-value-warning"
									aria-hidden="true"
								>
									<CircleAlert size={14} />
								</span>
							</Tooltip>
						) : null}
						{blockSpacingConflictWarning ? (
							<Tooltip text={blockSpacingConflictWarning}>
								<span
									className="motto-tooltip-trigger motto-rule-warning motto-rule-block-spacing-conflict-warning"
									aria-hidden="true"
								>
									<CircleAlert size={14} />
								</span>
							</Tooltip>
						) : null}
					</div>
				) : null}
			</div>
			<div className="motto-rules-actions">{actions}</div>
		</>
	);
};
