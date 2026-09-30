export const CSS_CLASS_INDEX_CHANGE_EVENT = "motto:css-class-index-change";

export const dispatchCssClassIndexChange = () => {
	if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") {
		return;
	}

	window.dispatchEvent(new CustomEvent(CSS_CLASS_INDEX_CHANGE_EVENT));
};
