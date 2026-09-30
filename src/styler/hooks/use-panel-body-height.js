import { useEffect } from "@wordpress/element";

export const usePanelBodyHeight = (panelBodyRef, classEditorRef, editingClassId) => {
	useEffect(() => {
		if (!panelBodyRef.current) return;
		if (editingClassId) {
			const resizeObserver = new ResizeObserver(() => {
				const editor = classEditorRef.current?.querySelector?.(".motto-class-editor");
				if (editor) {
					const height = Math.ceil(editor.getBoundingClientRect().height);
					panelBodyRef.current.style.setProperty(
						"--motto-panel-body-min-height",
						`${height}px`
					);
				}
			});
			const measureHeight = () => {
				const editor = classEditorRef.current?.querySelector?.(".motto-class-editor");
				if (editor) {
					resizeObserver.observe(editor);
					const height = Math.ceil(editor.getBoundingClientRect().height);
					panelBodyRef.current.style.setProperty(
						"--motto-panel-body-min-height",
						`${height}px`
					);
				}
			};
			setTimeout(measureHeight, 250);
			return () => resizeObserver.disconnect();
		} else {
			panelBodyRef.current.style.removeProperty("--motto-panel-body-min-height");
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [editingClassId]);
};
