import { useCallback, useEffect, useMemo, useRef, useState } from "@wordpress/element";
import { AutocompleteList } from "../primitives/AutocompleteList.jsx";
import { PlainTextField } from "../primitives/PlainTextField.jsx";
import { useVarSuggestions } from "../hooks/use-var-suggestions.js";
import {
	applyCssFunctionSuggestion,
	getCssFunctionSuggestions,
} from "@lib/css-function-autocomplete-utils.js";
import { handleSuggestionListKeyDown } from "@lib/suggestion-keyboard.js";

export const RawControl = ({
	value,
	onChange,
	label,
	placeholder,
	className,
	popoverClassName,
	popoverAnchorSelector,
	onKeyDown,
	onPaste,
	onFocus,
	onBlur,
	autoComplete = "off",
	variableSuggestions: externalVariableSuggestions = null,
	multiline = true,
}) => {
	const wrapRef = useRef(null);
	const [isFocused, setIsFocused] = useState(false);

	// JS fallback for browsers that don't support field-sizing: content.
	const resizeTextarea = useCallback(() => {
		const textarea = wrapRef.current?.querySelector("textarea");
		if (!textarea || typeof textarea.style.fieldSizing !== "undefined") return;
		textarea.style.height = "auto";
		textarea.style.height = `${textarea.scrollHeight}px`;
	}, []);

	useEffect(() => {
		resizeTextarea();
	}, [value, resizeTextarea]);
	const [activeIndex, setActiveIndex] = useState(-1);
	const [caret, setCaret] = useState(String(value || "").length);
	const [suppressSuggestions, setSuppressSuggestions] = useState(false);
	const [hasTypedSinceFocus, setHasTypedSinceFocus] = useState(false);

	const internalSuggestions = useVarSuggestions();
	const mergedVariableSuggestions = useMemo(() => {
		if (Array.isArray(externalVariableSuggestions)) return externalVariableSuggestions;
		return internalSuggestions;
	}, [externalVariableSuggestions, internalSuggestions]);

	const getInputEl = () => wrapRef.current?.querySelector?.("textarea, input") || null;
	const getPopoverAnchor = () => {
		if (popoverAnchorSelector && wrapRef.current?.closest) {
			const anchor = wrapRef.current.closest(popoverAnchorSelector);
			if (anchor) return anchor;
		}
		return wrapRef.current;
	};
	const syncCaret = () => {
		const input = getInputEl();
		if (!input) {
			setCaret(String(value || "").length);
			return;
		}
		setCaret(input.selectionStart ?? String(input.value || "").length);
	};

	const suggestions = useMemo(() => {
		if (!hasTypedSinceFocus || suppressSuggestions) return [];
		return getCssFunctionSuggestions(value, caret, 30, mergedVariableSuggestions).map(
			(item) => ({
				label: item.label,
				value: item.insertText || item.value || item.label,
				meta: item.meta,
			})
		);
	}, [caret, hasTypedSinceFocus, mergedVariableSuggestions, suppressSuggestions, value]);

	useEffect(() => {
		if (suggestions.length === 0) {
			if (activeIndex !== -1) setActiveIndex(-1);
			return;
		}
		if (activeIndex === -1) {
			setActiveIndex(0);
			return;
		}
		if (activeIndex >= suggestions.length) setActiveIndex(suggestions.length - 1);
	}, [activeIndex, suggestions.length]);

	const acceptSuggestion = (item) => {
		const inputEl = getInputEl();
		const currentCursor = inputEl?.selectionStart ?? String(value || "").length;
		const next = applyCssFunctionSuggestion(
			value,
			currentCursor,
			item?.value || item?.label || ""
		);
		onChange(next.value);
		setSuppressSuggestions(true);
		setActiveIndex(-1);
		requestAnimationFrame(() => {
			const nextInput = getInputEl();
			if (!nextInput) return;
			nextInput.focus();
			try {
				nextInput.setSelectionRange(next.cursor, next.cursor);
			} catch {}
		});
	};

	return (
		<div ref={wrapRef} className={`motto-raw-control${className ? ` ${className}` : ""}`}>
			<PlainTextField
				multiline={multiline}
				label={label}
				value={value}
				placeholder={placeholder}
				rows={1}
				name="motto-css-raw-value"
				onChange={(next) => {
					setHasTypedSinceFocus(true);
					setSuppressSuggestions(false);
					onChange(next);
				}}
				onKeyDown={(event) => {
					const wasHandled = handleSuggestionListKeyDown({
						event,
						items: suggestions,
						activeIndex,
						onActiveIndexChange: setActiveIndex,
						onAccept: acceptSuggestion,
						onEscape: () => {
							setActiveIndex(-1);
							setSuppressSuggestions(true);
						},
					});
					if (wasHandled) return;
					if (event.key === " ") {
						const inputEl = getInputEl();
						const currentValue = String(inputEl?.value || value || "");
						const selectionStart = inputEl?.selectionStart ?? currentValue.length;
						const selectionEnd = inputEl?.selectionEnd ?? selectionStart;
						if (
							selectionStart === selectionEnd &&
							selectionStart > 0 &&
							currentValue[selectionStart - 1] === " "
						) {
							event.preventDefault();
							return;
						}
					}
					onKeyDown?.(event);
				}}
				onPaste={onPaste}
				autoComplete={autoComplete}
				onFocus={(e) => {
					setIsFocused(true);
					setHasTypedSinceFocus(false);
					setActiveIndex(-1);
					syncCaret();
					onFocus?.(e);
				}}
				onBlur={(e) => {
					setIsFocused(false);
					setHasTypedSinceFocus(false);
					setActiveIndex(-1);
					onBlur?.(e);
				}}
				onClick={syncCaret}
				onKeyUp={syncCaret}
				onSelect={syncCaret}
			/>
			{isFocused && suggestions.length > 0 ? (
				<AutocompleteList
					items={suggestions}
					activeIndex={activeIndex}
					onSelect={acceptSuggestion}
					onHover={setActiveIndex}
					popoverAnchor={getPopoverAnchor()}
					popoverClassName={["motto-raw-control-popup", popoverClassName]
						.filter(Boolean)
						.join(" ")}
				/>
			) : null}
		</div>
	);
};
