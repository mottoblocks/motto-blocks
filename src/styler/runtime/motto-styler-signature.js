import { normalizeBlockSelectorsSelectorList } from "../utils/block-selectors-shape";

const hashString = (str) => {
	let hash = 5381;
	for (let i = 0; i < str.length; i += 1) {
		hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
	}
	return (hash >>> 0).toString(36);
};

export const buildMottoStylerCssSignature = (mottoStyler) => {
	const payload = {
		css: mottoStyler?.css || {},
		blockSelectors: normalizeBlockSelectorsSelectorList(
			mottoStyler?.blockSelectors !== undefined
				? mottoStyler.blockSelectors
				: mottoStyler?.innerSelectors
		),
		blockSpacing: {
			enabled: mottoStyler?.blockSpacing?.enabled === true,
			values: mottoStyler?.blockSpacing?.values || {},
		},
	};
	return hashString(JSON.stringify(payload));
};
