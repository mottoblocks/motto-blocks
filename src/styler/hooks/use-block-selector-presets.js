import { __ } from "@wordpress/i18n";
import { useMemo, useState } from "@wordpress/element";
import innerSelectorOptions from "../data/motto-inner-selector-presets.json";
import { migrateEntryToTemplate, SELECTOR_TOKEN } from "../utils/block-selectors-shape";
import {
	applySharedSelectorListToBreakpoints,
	createEmptyInnerSelectorItem,
	normalizeInnerSelectorItem,
	pickSelectorMeta,
} from "../utils/block-selectors-list-helpers";

// Quick-preset picker for BlockSelectorsList (motto-inner-selector-presets.json).
// Extracted out of BlockSelectorsList.jsx.
export const useBlockSelectorPresets = ({
	sharedSelectors,
	syncedByBp,
	persistAllByBp,
	setOpenById,
}) => {
	const [showPresetPicker, setShowPresetPicker] = useState(false);

	const selectorPresetGroups = useMemo(() => {
		const normalizeEntry = (entry) => {
			if (typeof entry === "string") {
				const selector = `${SELECTOR_TOKEN}${entry}`;
				return { label: entry, description: "", selector };
			}
			const selector = migrateEntryToTemplate(entry);
			if (!selector) return null;
			const label = String(entry?.label || selector).trim();
			const description = String(entry?.description || "").trim();
			return { label: label || selector, description, selector };
		};

		if (Array.isArray(innerSelectorOptions)) {
			return [
				{
					key: "presets",
					label: __("Quick presets", "motto-blocks"),
					items: innerSelectorOptions.map(normalizeEntry).filter(Boolean),
				},
			];
		}

		if (!innerSelectorOptions || typeof innerSelectorOptions !== "object") return [];
		return Object.entries(innerSelectorOptions)
			.map(([groupKey, entries]) => {
				const items = (Array.isArray(entries) ? entries : [])
					.map(normalizeEntry)
					.filter(Boolean);
				return {
					key: groupKey,
					label: groupKey
						.replace(/([a-z])([A-Z])/g, "$1 $2")
						.replace(/[-_]/g, " ")
						.replace(/^\w/, (char) => char.toUpperCase()),
					items,
				};
			})
			.filter((group) => group.items.length > 0);
	}, []);

	const addPresetInnerSelector = (preset) => {
		const selector = String(preset?.selector ?? "");
		if (!selector.includes(SELECTOR_TOKEN)) return;

		const newItem = normalizeInnerSelectorItem({
			...createEmptyInnerSelectorItem(),
			selector,
			label: String(preset?.label || "").trim(),
			description: String(preset?.description || "").trim(),
		});

		const nextShared = [...sharedSelectors, pickSelectorMeta(newItem)];
		const nextByBp = applySharedSelectorListToBreakpoints(nextShared, syncedByBp);
		persistAllByBp(nextByBp);
		setOpenById((prev) => ({ ...prev, [newItem.id]: true }));
		setShowPresetPicker(false);
	};

	return { showPresetPicker, setShowPresetPicker, selectorPresetGroups, addPresetInnerSelector };
};
