import { __ } from "@wordpress/i18n";
import { createClipboardPayload, readClipboard, writeClipboard } from "../utils/clipboard";
import {
	cssRowsOverlap,
	fromClipboardCssRows,
	mergeCssRows,
	toClipboardCssRows,
} from "../utils/css-row-list-helpers";

// Copy/paste/sort for a StylerCssList's row list. Extracted out of StylerCssList.jsx —
// only touches rowsRef/persistRows/notices, no other component state.
export const useCssListClipboard = ({
	rowsRef,
	persistRows,
	setDraftRow,
	createSuccessNotice,
	createWarningNotice,
}) => {
	const handleCopy = async () => {
		const rowsToCopy = toClipboardCssRows(rowsRef.current || []);
		if (rowsToCopy.length === 0) {
			createWarningNotice(__("No CSS rules to copy in this list.", "motto-blocks"), {
				type: "snackbar",
			});
			return;
		}
		await writeClipboard(createClipboardPayload("css-rules-list", { rows: rowsToCopy }));
		createSuccessNotice(__("List rules copied.", "motto-blocks"), { type: "snackbar" });
	};

	const handlePaste = async () => {
		const clip = await readClipboard();
		const rowsFromClipboard = fromClipboardCssRows(clip?.data?.rows || []);
		if (!clip || clip.type !== "css-rules-list" || rowsFromClipboard.length === 0) {
			createWarningNotice(__("No list rules in clipboard.", "motto-blocks"), {
				type: "snackbar",
			});
			return;
		}
		const currentRows = rowsRef.current || [];
		if (cssRowsOverlap(currentRows, rowsFromClipboard)) {
			const ok = window.confirm(
				__("This list already has rules. Merge with clipboard rules?", "motto-blocks")
			);
			if (!ok) return;
		}
		setDraftRow(null);
		persistRows(mergeCssRows(currentRows, rowsFromClipboard));
		createSuccessNotice(__("List rules pasted.", "motto-blocks"), { type: "snackbar" });
	};

	const handleSort = () => {
		const source = [...(rowsRef.current || [])];
		if (source.length < 2) return;
		const next = source
			.map((item, index) => ({ item, index }))
			.sort((a, b) => {
				const aName = String(a.item?.name || "")
					.trim()
					.toLowerCase();
				const bName = String(b.item?.name || "")
					.trim()
					.toLowerCase();
				if (!aName && bName) return 1;
				if (aName && !bName) return -1;
				if (aName < bName) return -1;
				if (aName > bName) return 1;
				return a.index - b.index;
			})
			.map((entry) => entry.item);
		persistRows(next);
	};

	return { handleCopy, handlePaste, handleSort };
};
