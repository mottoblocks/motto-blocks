import clsx from "clsx";
import { Button } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { useEffect, useMemo, useRef, useState } from "@wordpress/element";
import { usePropValueConfig } from "../hooks/use-prop-value-config.js";
import { GripVertical, Trash } from "lucide-react";
import { CssRuleRowHeader } from "./CssRuleRowHeader";
import { renderRuleValue } from "../controls/value-control-registry";
import { CompositeFieldsControl } from "../controls/CompositeFieldsControl";
import { CssFunctionAutocompleteControl } from "../controls/CssFunctionAutocompleteControl";
import { RuleValuePopup } from "./RuleValuePopup";
import { getRuleNameSuggestions } from "../utils/autocomplete-utils";
import {
	getDefaultCssRules,
	loadCssRulesData,
	onCssRulesReady,
} from "../data/styler-css-property-registry";
import { stylerCssValueOptions } from "../data/styler-css-value-options";
import { handleSuggestionListKeyDown } from "@lib/suggestion-keyboard.js";
import { isValidCssRuleName } from "../utils/input-guards";
import { toComparableRuleName } from "../utils/css-row-metadata";
import { getCoreFontSizePresetMatch } from "../utils/core-preset-values.js";
import { getStylerRuleWarnings } from "../utils/rule-warnings.js";

const FLEX_AXIS_SENSITIVE_PROPS = new Set([
	"justify-content",
	"justify-items",
	"align-items",
	"align-content",
]);

const slugToTitleCase = (slug) => {
	return String(slug || "")
		.replace(/[-_]+/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.replace(/\b\w/g, (char) => char.toUpperCase());
};

export const StylerRuleRow = ({
	row,
	cssNameCounts = new Map(),
	cssValuesByProp = new Map(),
	editorSettings = {},
	onNameChange,
	onNameBlur,
	onValueChange,
	onRemove,
	shouldAutoFocusName = false,
	isReorderMode = false,
	canReorder = true,
	dragItemProps = null,
	popupScope = "",
	blockSpacingEnabled = false,
}) => {
	const { isDragging, isDropTarget, rowProps, handleProps } = dragItemProps || {};
	const {
		themeColors = [],
		disableCustomColors = false,
		fontSizes = [],
		fontFamilies = [],
		disableCustomFontSizes = false,
		disableCustomFontFamilies = false,
	} = editorSettings;
	const value = String(row?.value || "");
	const rowRef = useRef(null);
	const nameWrapRef = useRef(null);
	const valueWrapRef = useRef(null);
	const nameBlurTimerRef = useRef(null);
	const [isNameFocused, setIsNameFocused] = useState(false);
	const [hasTypedNameSinceFocus, setHasTypedNameSinceFocus] = useState(false);
	const [activeNameIndex, setActiveNameIndex] = useState(-1);
	const [nameDraft, setNameDraft] = useState(row?.name || "");
	const [defaultRuleNames, setDefaultRuleNames] = useState(() => getDefaultCssRules());
	const ruleNameRaw = String(nameDraft || "").trim();
	const isVarName = ruleNameRaw.startsWith("--");
	// Gates whether the value popup can open at all. Deliberately independent of
	// whether the property has a configured visual control (hasVisualValueEditor
	// below) — an empty/invalid name should hide the toggle button, but a VALID
	// property with no configured control must still open the popup and show its
	// raw value (renderRuleValue already falls back to a plain text editor for
	// that case).
	const isValidPropertyName = Boolean(ruleNameRaw) && isValidCssRuleName(ruleNameRaw);
	const ruleDisplayLabel = useMemo(() => slugToTitleCase(ruleNameRaw), [ruleNameRaw]);
	const ruleKey = ruleNameRaw.toLowerCase();
	const ruleCompareKey = useMemo(() => toComparableRuleName(ruleNameRaw), [ruleNameRaw]);
	const knownProps = useMemo(() => {
		const list = Array.isArray(defaultRuleNames) ? defaultRuleNames : [];
		return new Set(list.map((prop) => String(prop || "").toLowerCase()));
	}, [defaultRuleNames]);
	const {
		singlePopupType,
		shouldForceValueCodeView,
		singlePropConfig,
		hasVisualValueEditor,
		colorToPresetVar,
		fontSizeToPresetVar,
		fontFamilyToPresetVar,
		spacingSizesMemo,
		valuePlaceholders,
		fieldMeta,
		valueParts,
		updateValuePart,
		getFieldPopupType,
	} = usePropValueConfig({
		valueOptions: stylerCssValueOptions,
		propKey: ruleKey,
		isKnownProp: ruleKey !== "" && knownProps.has(ruleKey),
		isVarProp: ruleKey.startsWith("--"),
		itemValue: value,
		editorConfig: editorSettings,
		onValueChange,
	});

	const visualPreview = useMemo(() => {
		if (singlePopupType === "color") {
			// Use the raw rule value so toggle previews respect var(--x, fallback)
			// and resolve via the list-scoped inline custom properties.
			return { type: "color", value: String(value || "").trim() };
		}

		if (singlePopupType === "font-size") {
			const preset = getCoreFontSizePresetMatch(value, fontSizes);
			return preset?.slug ? { type: "font-size", label: preset.slug } : null;
		}

		return null;
	}, [fontSizes, singlePopupType, value]);

	useEffect(() => {
		setNameDraft(row?.name || "");
	}, [row?.name]);

	useEffect(() => {
		return () => {
			if (nameBlurTimerRef.current) {
				window.clearTimeout(nameBlurTimerRef.current);
			}
		};
	}, []);

	useEffect(() => {
		let mounted = true;
		const applyData = (nextData) => {
			if (!mounted) return;
			const list = Array.isArray(nextData?.list) ? nextData.list : [];
			if (list.length === 0) return;
			setDefaultRuleNames(list);
		};
		const unsubscribe = onCssRulesReady(applyData);
		loadCssRulesData({ defer: true })
			.then((nextData) => applyData(nextData))
			.catch(() => {});
		return () => {
			mounted = false;
			unsubscribe();
		};
	}, []);

	const flexAxisClass = useMemo(() => {
		if (!FLEX_AXIS_SENSITIVE_PROPS.has(ruleKey)) return "";
		const propClass = `is-prop-${ruleKey}`;
		const flexDir = (cssValuesByProp.get("flex-direction") || [])[0] || "";
		const dirClass =
			flexDir === "column"
				? "is-flex-column"
				: flexDir === "column-reverse"
					? "is-flex-column-reverse"
					: flexDir === "row-reverse"
						? "is-flex-row-reverse"
						: "";
		return clsx(propClass, dirClass);
	}, [ruleKey, cssValuesByProp]);

	const nameSuggestions = useMemo(() => {
		if (!isNameFocused) return [];
		if (!hasTypedNameSinceFocus) return [];
		if (!ruleNameRaw || ruleNameRaw.startsWith("--")) return [];
		return getRuleNameSuggestions(ruleNameRaw.toLowerCase(), defaultRuleNames, 8);
	}, [defaultRuleNames, hasTypedNameSinceFocus, isNameFocused, ruleNameRaw]);

	useEffect(() => {
		if (nameSuggestions.length === 0) {
			if (activeNameIndex !== -1) setActiveNameIndex(-1);
			return;
		}
		if (activeNameIndex === -1) {
			setActiveNameIndex(0);
			return;
		}
		if (activeNameIndex >= nameSuggestions.length) {
			setActiveNameIndex(nameSuggestions.length - 1);
		}
	}, [activeNameIndex, nameSuggestions.length]);

	const warnings = useMemo(() => {
		return getStylerRuleWarnings({
			ruleName: ruleNameRaw,
			ruleCompareKey,
			ruleKey,
			value,
			cssNameCounts,
			cssValuesByProp,
			requires: singlePropConfig?.requires,
			blockSpacingEnabled,
			messages: {
				duplicate: __("This rule appears more than once.", "motto-blocks"),
				dependency: __("This rule depends on another rule.", "motto-blocks"),
				invalidName: __("Invalid CSS rule name.", "motto-blocks"),
				invalidValue: __("Invalid CSS value.", "motto-blocks"),
				mixedCssWideKeyword: __(
					"CSS-wide keywords like inherit should usually be used as the whole value. Browsers may ignore this declaration.",
					"motto-blocks"
				),
				blockSpacingConflict: __(
					"This rule may conflict with Block Spacing.",
					"motto-blocks"
				),
			},
		});
	}, [
		blockSpacingEnabled,
		cssNameCounts,
		cssValuesByProp,
		ruleCompareKey,
		ruleKey,
		ruleNameRaw,
		singlePropConfig?.requires,
		value,
	]);

	const acceptNameSuggestion = (item) => {
		const nextValue = item?.value || item?.label || "";
		if (!nextValue) return;
		setNameDraft(nextValue);
		onNameChange(nextValue);
		setHasTypedNameSinceFocus(false);
		setIsNameFocused(false);
		setActiveNameIndex(-1);
	};

	const handleNameKeyDown = (event) => {
		return handleSuggestionListKeyDown({
			event,
			items: nameSuggestions,
			activeIndex: activeNameIndex,
			onActiveIndexChange: setActiveNameIndex,
			onAccept: acceptNameSuggestion,
			onEscape: () => {
				setIsNameFocused(false);
				setActiveNameIndex(-1);
			},
		});
	};

	const handleNameChange = (nextValue) => {
		const next = String(nextValue || "");
		setIsNameFocused(true);
		setNameDraft(next);
		setHasTypedNameSinceFocus(true);
		onNameChange(next);
	};

	const handleNamePaste = () => {
		setHasTypedNameSinceFocus(true);
	};

	const handleNameFocus = () => {
		if (nameBlurTimerRef.current) {
			window.clearTimeout(nameBlurTimerRef.current);
			nameBlurTimerRef.current = null;
		}
		setIsNameFocused(true);
		setHasTypedNameSinceFocus(false);
		setActiveNameIndex(-1);
	};

	const handleNameBlur = (event) => {
		const relatedTarget = event?.relatedTarget;
		const focusStaysInRow = Boolean(relatedTarget && rowRef.current?.contains(relatedTarget));
		if (nameBlurTimerRef.current) {
			window.clearTimeout(nameBlurTimerRef.current);
		}
		nameBlurTimerRef.current = window.setTimeout(() => {
			setIsNameFocused(false);
			setActiveNameIndex(-1);
			nameBlurTimerRef.current = null;
			if (!focusStaysInRow) {
				onNameBlur?.();
			}
		}, 120);
	};

	const handleRemoveClick = () => {
		const currentValue = String(row?.value || "").trim();
		if (currentValue === "" || window.confirm(__("Delete this rule?", "motto-blocks"))) {
			onRemove();
		}
	};

	const singlePopupModel = {
		key: `${row?.id || "css"}-value-single`,
		type: singlePopupType,
		value,
		placeholder: __("Value", "motto-blocks"),
		config: singlePropConfig || null,
		enumOptions: Array.isArray(singlePropConfig?.options) ? singlePropConfig.options : [],
		onChange: onValueChange,
	};

	const compositeFieldModels = useMemo(() => {
		if (valuePlaceholders.length === 0) return [];
		return valuePlaceholders.map((placeholder, index) => {
			const meta = fieldMeta[index];
			const fieldConfig = meta?.config || null;
			return {
				key: `${row?.id || "css"}-field-${placeholder}`,
				type: getFieldPopupType(meta),
				value: valueParts[index] || "",
				placeholder: String(fieldConfig?.default || ""),
				fieldLabel: slugToTitleCase(String(placeholder || "")),
				config: fieldConfig,
				enumOptions: Array.isArray(fieldConfig?.options) ? fieldConfig.options : [],
				onChange: (nextValue) => updateValuePart(index, nextValue),
			};
		});
	}, [valuePlaceholders, fieldMeta, valueParts, updateValuePart, getFieldPopupType, row?.id]);

	const popupGroupId = useMemo(() => {
		const scope = String(popupScope || "").trim();
		return scope ? `${scope}:css-rule-row` : "css-rule-row";
	}, [popupScope]);

	return (
		<div
			className={clsx("motto-css-rule", {
				"is-dragging": isDragging,
				"is-drop-target": isDropTarget,
			})}
			ref={rowRef}
			{...rowProps}
			{...(isReorderMode && canReorder ? handleProps : {})}
		>
			{isReorderMode && canReorder ? (
				<span className="motto-css-rule-drag" aria-hidden="true">
					<GripVertical size={14} />
				</span>
			) : null}
			<div className="motto-css-rule-content">
				<CssRuleRowHeader
					itemId={row?.id || ""}
					nameDraft={nameDraft}
					isVarName={isVarName}
					shouldAutoFocusName={shouldAutoFocusName}
					nameWrapRef={nameWrapRef}
					onNameKeyDown={handleNameKeyDown}
					onNamePaste={handleNamePaste}
					onNameChange={handleNameChange}
					onNameFocus={handleNameFocus}
					onNameBlur={handleNameBlur}
					isNameFocused={isNameFocused}
					nameSuggestions={nameSuggestions}
					activeNameIndex={activeNameIndex}
					onSelectSuggestion={acceptNameSuggestion}
					onHoverSuggestion={setActiveNameIndex}
					{...warnings}
					actions={
						<>
							<RuleValuePopup
								ownerId={`rule:${String(row?.id || "")}`}
								groupId={popupGroupId}
								anchorRef={rowRef}
								title={__("Value controls", "motto-blocks")}
								canOpenValuePopup={isValidPropertyName}
								hasVisualValueEditor={hasVisualValueEditor}
								shouldForceCodeView={shouldForceValueCodeView}
								toggleButtonProps={{
									title: __("Toggle value controls", "motto-blocks"),
									popupType: singlePopupType,
									value,
									previewType: visualPreview?.type || "",
									previewValue: visualPreview?.value || "",
									previewLabel: visualPreview?.label || "",
									enumOptions: singlePopupModel?.enumOptions || [],
									flexAxisClass,
								}}
								renderContent={({ isCodeView, closePopup, suspendAutoClose }) => (
									<div
										className="motto-css-rule-value-wrapper"
										ref={valueWrapRef}
									>
										{isCodeView ? (
											<>
												{shouldForceValueCodeView ? (
													<p className="motto-section-help">
														{__(
															"This value can't be shown in the visual editor. Switching views will replace it.",
															"motto-blocks"
														)}
													</p>
												) : null}
												<CssFunctionAutocompleteControl
													value={value}
													onChange={onValueChange}
													placeholder={__("Value", "motto-blocks")}
													className="motto-css-rule-value motto-input"
													autoComplete="off"
												/>
											</>
										) : compositeFieldModels.length > 0 ? (
											<CompositeFieldsControl
												models={compositeFieldModels}
												closePopup={closePopup}
												suspendAutoClose={suspendAutoClose}
												layout={singlePropConfig?.layout || "column"}
												renderPopupInput={(fieldModel, cp, sac) =>
													renderRuleValue({
														model: fieldModel,
														itemId: row?.id || "css",
														onValueChange: fieldModel.onChange,
														themeColors,
														spacingSizes: spacingSizesMemo,
														disableCustomColors,
														fontSizes,
														fontFamilies,
														disableCustomFontSizes,
														disableCustomFontFamilies,
														colorToPresetVar,
														fontSizeToPresetVar,
														fontFamilyToPresetVar,
														ruleDisplayLabel: fieldModel.fieldLabel,
														flexAxisClass,
														closePopup: cp,
														suspendAutoClose: sac,
													})
												}
											/>
										) : (
											renderRuleValue({
												model: singlePopupModel,
												itemId: row?.id || "css",
												onValueChange,
												themeColors,
												spacingSizes: spacingSizesMemo,
												disableCustomColors,
												fontSizes,
												fontFamilies,
												disableCustomFontSizes,
												disableCustomFontFamilies,
												colorToPresetVar,
												fontSizeToPresetVar,
												fontFamilyToPresetVar,
												ruleDisplayLabel: ruleDisplayLabel,
												flexAxisClass,
												closePopup,
												suspendAutoClose,
											})
										)}
									</div>
								)}
							/>
							<Button
								variant="tertiary"
								onClick={handleRemoveClick}
								className="motto-ui-button is-icon-only is-tertiary is-destructive"
								aria-label={__("Delete rule", "motto-blocks")}
								title={__("Delete rule", "motto-blocks")}
							>
								<Trash size={14} aria-hidden="true" />
							</Button>
						</>
					}
				/>
			</div>
		</div>
	);
};
