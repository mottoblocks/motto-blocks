// Sitios donde sincronizar automáticamente al hacer assemble.
//
// Este archivo solo define el sandbox relativo (seguro para cualquier máquina/CI).
// Para sincronizar a tus sitios WordPress locales, copiá sync-config.local.mjs.example
// a sync-config.local.mjs (gitignorado) y agregá tus rutas absolutas ahí.

import { existsSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCAL_CONFIG_PATH = resolve(__dirname, "sync-config.local.mjs");

const BASE_TARGETS = {
	free: ["../../motto-blocks"],
	pro: ["../../motto-blocks-pro"],
};

let localTargets = { free: [], pro: [] };
if (existsSync(LOCAL_CONFIG_PATH)) {
	({ SYNC_TARGETS: localTargets } = await import("./sync-config.local.mjs"));
}

export const SYNC_TARGETS = {
	free: [...BASE_TARGETS.free, ...(localTargets.free || [])],
	pro: [...BASE_TARGETS.pro, ...(localTargets.pro || [])],
};
