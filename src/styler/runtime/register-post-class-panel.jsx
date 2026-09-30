import { isStandaloneStylerActive } from "./runtime-flags";
import { PostClassStylerPanel } from "../classes/components/PostClassStylerPanel";

const register = window?.wp?.plugins?.registerPlugin;

if (!isStandaloneStylerActive() && typeof register === "function") {
	register("motto-blocks-post-class-styler-panel", {
		render: () => <PostClassStylerPanel />,
	});
}
