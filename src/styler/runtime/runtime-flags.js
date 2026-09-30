const STANDALONE_STYLER_ACTIVE_FLAG = "__MOTTO_STANDALONE_STYLER_ACTIVE__";

export const isStandaloneStylerActive = () =>
	typeof window !== "undefined" && window[STANDALONE_STYLER_ACTIVE_FLAG] === true;

export const markStandaloneStylerActive = () => {
	if (typeof window === "undefined") return;
	window[STANDALONE_STYLER_ACTIVE_FLAG] = true;
};
