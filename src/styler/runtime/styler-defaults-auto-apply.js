import { normalizeMottoStyler, isObject } from "../utils/normalize-motto-styler";
import { hasAnyMottoContent } from "../utils/motto-content";
import {
	generateInstanceId,
	hasValidInstanceId,
	resolveValidInstanceId,
} from "../utils/instance-id";
import { hydrateMottoDefaultsToStyler } from "./hydrate-motto-defaults";

const hasPersistedInstanceIdentity = (styler = {}) => hasValidInstanceId(styler);

const withAutoApplyMarker = (styler = {}) => {
	const source = isObject(styler) ? styler : {};
	const ui = isObject(source.ui) ? source.ui : {};
	const defaultsUi = isObject(ui.defaults) ? ui.defaults : {};
	return {
		...source,
		ui: {
			...ui,
			defaults: {
				...defaultsUi,
				appliedOnInsert: true,
			},
		},
	};
};

export const hasAutoAppliedDefaultsMarker = (styler = {}) =>
	Boolean(styler?.ui?.defaults?.appliedOnInsert === true);

export const getAutoApplyDefaultsPayload = (
	currentStyler,
	mottoDefaults,
	{ createInstanceId = generateInstanceId } = {}
) => {
	const current = normalizeMottoStyler(currentStyler || {});
	const defaults = hydrateMottoDefaultsToStyler(mottoDefaults || {});

	if (hasAutoAppliedDefaultsMarker(current)) return null;
	if (hasPersistedInstanceIdentity(current)) return null;
	if (hasAnyMottoContent(current)) return null;
	if (!hasAnyMottoContent(defaults)) return null;

	const instanceId = resolveValidInstanceId(current?.instanceId) || createInstanceId();

	return withAutoApplyMarker({
		...current,
		instanceId,
		cssClasses: Array.isArray(defaults.cssClasses) ? defaults.cssClasses : [],
		css: defaults.css,
		html: defaults.html,
		blockSelectors: defaults.blockSelectors,
		ui: defaults.ui,
	});
};
