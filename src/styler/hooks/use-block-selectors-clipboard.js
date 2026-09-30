import { __ } from "@wordpress/i18n";
import { useCallback } from "@wordpress/element";
import { createClipboardPayload, readClipboard, writeClipboard } from "../utils/clipboard";
import {
	blockSelectorsSelectorListOverlap,
	mergeBlockSelectorsSelectorList,
} from "../utils/block-selectors-list-helpers";
import { normalizeBlockSelectorsByBreakpoint } from "../utils/block-selectors-shape";

// Copy/paste for a BlockSelectorsList's selector set (list-level and single-selector).
// Extracted out of BlockSelectorsList.jsx — only touches sharedSelectors/syncedByBp/
// persistAllByBp/notices, no other component state.
export const useBlockSelectorsClipboard = ({
	sharedSelectors,
	syncedByBp,
	persistAllByBp,
	setOpenById,
	createSuccessNotice,
	createWarningNotice,
}) => {
	const canCopySelectors = sharedSelectors.length > 0;

	const handleCopySelectors = async () => {
		if (!canCopySelectors) {
			createWarningNotice(__("No block selectors to copy.", "motto-blocks"), {
				type: "snackbar",
			});
			return;
		}
		await writeClipboard(
			createClipboardPayload("block-selectors-list", { selectors: syncedByBp })
		);
		createSuccessNotice(__("Selectors copied.", "motto-blocks"), { type: "snackbar" });
	};

	const handleCopySelector = useCallback(
		async (id) => {
			const selectorByBp = Object.fromEntries(
				Object.entries(syncedByBp).map(([bp, list]) => [
					bp,
					(list || []).filter((item) => item?.id === id),
				])
			);
			const hasSelector = Object.values(selectorByBp).some((list) => list.length > 0);
			if (!hasSelector) return;
			await writeClipboard(
				createClipboardPayload("block-selector-item", { selectors: selectorByBp })
			);
			createSuccessNotice(__("Selector copied.", "motto-blocks"), { type: "snackbar" });
		},
		[syncedByBp, createSuccessNotice]
	);

	// Merges by logical selector (matched once on the flat selector-list shape, not
	// independently per breakpoint) so a matched selector's id stays identical across
	// all four breakpoints. See mergeBlockSelectorsSelectorList (SDD-019 §4).
	const handlePasteSelectors = async () => {
		const clip = await readClipboard();
		const incomingSelectors = clip?.data?.selectors;
		const incoming = normalizeBlockSelectorsByBreakpoint(incomingSelectors);
		const hasIncoming = Object.values(incoming).some((list) => list.length > 0);
		const isSupportedClip =
			clip?.type === "block-selectors-list" || clip?.type === "block-selector-item";
		if (!clip || !isSupportedClip || !hasIncoming) {
			createWarningNotice(__("No block selectors in clipboard.", "motto-blocks"), {
				type: "snackbar",
			});
			return;
		}
		if (blockSelectorsSelectorListOverlap(syncedByBp, incomingSelectors)) {
			const ok = window.confirm(
				__("Some selectors already exist and will be merged. Continue?", "motto-blocks")
			);
			if (!ok) return;
		}
		const merged = mergeBlockSelectorsSelectorList(syncedByBp, incomingSelectors);
		setOpenById({});
		persistAllByBp(merged);
		createSuccessNotice(__("Selectors pasted.", "motto-blocks"), { type: "snackbar" });
	};

	return { canCopySelectors, handleCopySelectors, handleCopySelector, handlePasteSelectors };
};
