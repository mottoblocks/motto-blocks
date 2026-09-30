import { dispatch } from "@wordpress/data";

const isValidDevice = (value) => value === "Desktop" || value === "Tablet" || value === "Mobile";

export const setCoreDeviceType = (device) => {
	if (!isValidDevice(device)) return false;

	const editorDispatch = dispatch("core/editor");
	if (typeof editorDispatch?.setDeviceType === "function") {
		editorDispatch.setDeviceType(device);
		return true;
	}

	const editPostDispatch = dispatch("core/edit-post");
	if (typeof editPostDispatch?.__experimentalSetPreviewDeviceType !== "function") {
		return false;
	}
	editPostDispatch.__experimentalSetPreviewDeviceType(device);
	return true;
};
