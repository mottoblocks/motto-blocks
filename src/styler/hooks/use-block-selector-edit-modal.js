import { __ } from "@wordpress/i18n";
import { useCallback, useEffect, useRef, useState } from "@wordpress/element";
import { useModalAutofocus } from "../utils/use-modal-autofocus";
import {
	migrateEntryToTemplate,
	SELECTOR_TOKEN,
	validateInnerSelectorTemplate,
} from "../utils/block-selectors-shape";

// Edit-selector modal state + handlers for BlockSelectorsList. Extracted out of
// BlockSelectorsList.jsx — depends on removeInnerSelector (cancel/empty-selector path)
// and updateInnerSelectorMeta (confirm path), which stay owned by the list itself since
// they also apply outside the modal (e.g. row-level actions).
export const useBlockSelectorEditModal = ({ removeInnerSelector, updateInnerSelectorMeta }) => {
	const [editState, setEditState] = useState(null);
	const [editError, setEditError] = useState("");
	const selectorInputWrapRef = useRef(null);
	const editModalContentRef = useRef(null);

	useModalAutofocus({
		enabled: Boolean(editState),
		containerRef: editModalContentRef,
	});

	useEffect(() => {
		if (!editState?.id) return;
		const rafId = window.requestAnimationFrame(() => {
			const input = selectorInputWrapRef.current?.querySelector?.("input");
			if (input?.focus) input.focus();
		});
		return () => window.cancelAnimationFrame(rafId);
	}, [editState?.id]);

	const openEditInnerSelector = (sub) => {
		const selector = migrateEntryToTemplate(sub) || SELECTOR_TOKEN;
		setEditError("");
		setEditState({
			id: sub.id,
			isNew: false,
			label: String(sub?.label || ""),
			description: String(sub?.description || ""),
			selector,
		});
	};

	const confirmEditInnerSelector = () => {
		if (!editState?.id) return;
		const selector = String(editState.selector ?? "");
		const validation = validateInnerSelectorTemplate(selector);
		if (!validation.isValid) {
			if (validation.reason === "missing-token") {
				setEditError(__("A Block class placeholder is required.", "motto-blocks"));
				return;
			}
			setEditError(__("This selector is not valid CSS.", "motto-blocks"));
			return;
		}
		if (selector === SELECTOR_TOKEN && editState?.isNew) {
			removeInnerSelector(editState.id);
			setEditError("");
			setEditState(null);
			return;
		}
		updateInnerSelectorMeta(editState.id, {
			label: String(editState.label || "").trim(),
			description: String(editState.description || "").trim(),
			selector,
		});
		setEditError("");
		setEditState(null);
	};

	const cancelEditInnerSelector = () => {
		if (editState?.isNew && editState?.id) removeInnerSelector(editState.id);
		setEditError("");
		setEditState(null);
	};

	const insertToken = useCallback(() => {
		const input = selectorInputWrapRef.current?.querySelector?.("input");
		const current = String(editState?.selector ?? "");
		if (!input) {
			setEditError("");
			setEditState((prev) => (prev ? { ...prev, selector: current + SELECTOR_TOKEN } : prev));
			return;
		}
		const start = input.selectionStart ?? current.length;
		const end = input.selectionEnd ?? start;
		const next = current.slice(0, start) + SELECTOR_TOKEN + current.slice(end);
		setEditError("");
		setEditState((prev) => (prev ? { ...prev, selector: next } : prev));
		window.requestAnimationFrame(() => {
			input.focus();
			const newPos = start + SELECTOR_TOKEN.length;
			input.setSelectionRange(newPos, newPos);
		});
	}, [editState?.selector]);

	return {
		editState,
		setEditState,
		editError,
		setEditError,
		selectorInputWrapRef,
		editModalContentRef,
		openEditInnerSelector,
		confirmEditInnerSelector,
		cancelEditInnerSelector,
		insertToken,
	};
};
