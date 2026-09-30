import { addFilter } from "@wordpress/hooks";
import {
	defaultMottoStyler,
	isPlainObject,
	normalizeMottoDefaultsValue,
	resolveBlockTypeMottoDefaultsSource,
} from "../data/default-motto-styler";
import { isStylerCoreMvpBlock } from "./supported-blocks";

addFilter(
	"blocks.registerBlockType",
	"motto-blocks/styler-core-register-attributes",
	(settings, name) => {
		if (!isStylerCoreMvpBlock(name)) {
			return settings;
		}

		const next = { ...settings };
		const attrs = isPlainObject(next.attributes) ? { ...next.attributes } : {};
		const mottoDefaultsRaw = resolveBlockTypeMottoDefaultsSource(settings, attrs, name);
		const normalizedMottoDefaults = normalizeMottoDefaultsValue(mottoDefaultsRaw);

		attrs.mottoStyler = {
			...(isPlainObject(attrs.mottoStyler) ? attrs.mottoStyler : {}),
			type: "object",
			default: defaultMottoStyler,
		};
		attrs.mottoDefaults = {
			...(isPlainObject(attrs.mottoDefaults) ? attrs.mottoDefaults : {}),
			type: "object",
			default: normalizedMottoDefaults,
		};

		next.attributes = attrs;
		return next;
	}
);
