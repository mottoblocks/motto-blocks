import { select } from "@wordpress/data";

const isValidDevice = (value) => value === "Desktop" || value === "Tablet" || value === "Mobile";

export const getCoreDeviceType = () => {
	const editorSelect = select("core/editor");
	if (typeof editorSelect?.getDeviceType === "function") {
		const value = editorSelect.getDeviceType();
		if (isValidDevice(value)) return value;
	}

	const editPostSelect = select("core/edit-post");
	if (typeof editPostSelect?.__experimentalGetPreviewDeviceType !== "function") {
		return null;
	}
	const value = editPostSelect.__experimentalGetPreviewDeviceType();
	return isValidDevice(value) ? value : null;
};
