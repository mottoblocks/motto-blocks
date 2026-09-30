import { isStandaloneStylerActive } from "./runtime-flags";
import { initCssClassStyleCollector } from "./css-class-style-runtime";
import { initCssVariableStyleCollector } from "./css-variable-style-runtime";
import { initEditorStyleCollector } from "./editor-style-runtime";
import { initInstanceIdCollisionRuntime } from "./instance-id-runtime";
import { initPostClassCanvasRuntime } from "./post-class-canvas-runtime";
import { initPostClassStyleCollector } from "./post-class-style-runtime";
import "./preview-store.jsx";
import "./register-post-class-panel.jsx";
import "./register-editor-wrapper-class.jsx";
import { initPreviewSync } from "./preview-sync";
import { initEditorPreviewModeHook } from "./preview-mode-hook";
import { initPostClassSidebarRuntime } from "./post-class-sidebar-runtime";

if (!isStandaloneStylerActive()) {
	initPreviewSync();
	initEditorPreviewModeHook();
	initInstanceIdCollisionRuntime();
	initEditorStyleCollector();
	initCssClassStyleCollector();
	initCssVariableStyleCollector();
	initPostClassStyleCollector();
	initPostClassCanvasRuntime();
	initPostClassSidebarRuntime();
}
