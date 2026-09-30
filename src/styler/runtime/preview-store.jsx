import { createReduxStore, register } from "@wordpress/data";

export const STORE_KEY = "motto-styler/preview";

const DEFAULT_STATE = {
	mode: "desktop",
	landscapeOverride: false,
	lastSource: null,
};

const actions = {
	setMode(mode, source = null) {
		return {
			type: "SET_MODE",
			mode,
			source,
		};
	},

	setLandscapeOverride(enabled, source = null) {
		return {
			type: "SET_LANDSCAPE_OVERRIDE",
			enabled,
			source,
		};
	},

	clearLastSource() {
		return {
			type: "CLEAR_LAST_SOURCE",
		};
	},
};

const reducer = (state = DEFAULT_STATE, action) => {
	switch (action.type) {
		case "SET_MODE":
			return {
				...state,
				mode: action.mode,
				lastSource: action.source,
			};
		case "SET_LANDSCAPE_OVERRIDE":
			return {
				...state,
				landscapeOverride: !!action.enabled,
				lastSource: action.source,
			};
		case "CLEAR_LAST_SOURCE":
			if (state.lastSource === null) return state;
			return {
				...state,
				lastSource: null,
			};
		default:
			return state;
	}
};

const selectors = {
	getMode(state) {
		return state.mode;
	},
	getLandscapeOverride(state) {
		return state.landscapeOverride;
	},
	getLastSource(state) {
		return state.lastSource;
	},
};

export const store = createReduxStore(STORE_KEY, {
	reducer,
	actions,
	selectors,
});

register(store);

export const previewActions = actions;
