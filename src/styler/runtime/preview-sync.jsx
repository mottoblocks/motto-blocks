import { dispatch, select, subscribe } from "@wordpress/data";
import { STORE_KEY } from "./preview-store";
import { setPreviewWidthForMode } from "./preview-width";
import { getCoreDeviceType } from "./core-device-select";
import { setCoreDeviceType } from "./core-device";
import { requestEditorStyleRegistryRender } from "./editor-style-registry";

const deriveMottoModeFromCore = (coreDevice, landscapeOverride) => {
	if (coreDevice === "Tablet") return "tablet";
	if (coreDevice === "Mobile") return landscapeOverride ? "landscapePhone" : "phone";
	return "desktop";
};

const deriveCoreFromMottoMode = (mode) => {
	if (mode === "tablet") return "Tablet";
	if (mode === "desktop") return "Desktop";
	return "Mobile";
};

let initialized = false;

export const initPreviewSync = () => {
	if (initialized) return;
	initialized = true;

	let isApplying = false;

	const apply = () => {
		if (isApplying) return;
		isApplying = true;
		try {
			const previewSelect = select(STORE_KEY);
			const previewDispatch = dispatch(STORE_KEY);

			const storeMode = previewSelect.getMode();
			const storeLandscape = !!previewSelect.getLandscapeOverride();
			const lastSource = previewSelect.getLastSource();
			const coreDevice = getCoreDeviceType() || "Desktop";
			const derivedModeFromCore = deriveMottoModeFromCore(coreDevice, storeLandscape);

			if (lastSource !== "motto") {
				if (derivedModeFromCore !== storeMode) {
					previewDispatch.setMode(derivedModeFromCore, "core");
				}
			}

			if (lastSource === "motto") {
				const nextCore = deriveCoreFromMottoMode(storeMode);
				if (nextCore !== coreDevice) {
					setCoreDeviceType(nextCore);
				}
				previewDispatch.clearLastSource();
			}

			setPreviewWidthForMode(storeMode);
			// Device toggles can remount/replace the editor canvas iframe.
			// Trigger a deterministic reinjection attempt without relying on broad DOM observers.
			requestEditorStyleRegistryRender("preview-sync");

			if (lastSource !== "motto") {
				if (coreDevice === "Desktop" || coreDevice === "Tablet") {
					if (storeLandscape) {
						previewDispatch.setLandscapeOverride(false, "core");
					}
				}
			}
		} finally {
			isApplying = false;
		}
	};

	let scheduled = false;
	const schedule = () => {
		if (scheduled) return;
		scheduled = true;
		setTimeout(() => {
			scheduled = false;
			apply();
		}, 50);
	};

	subscribe(schedule);
	apply();
};
