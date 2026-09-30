import { resolve } from "node:path";
import { existsSync } from "node:fs";
import {
	BLOCK_SOURCE_DIR_REL,
	FREE_BLOCK_SOURCE_DIR_REL,
	PRO_BLOCK_SOURCE_DIR_REL,
	getBlockManifestSignature,
	syncBlockJsonToBuild,
} from "./block-json-sync.mjs";

const ROOT = process.cwd();
const POLL_INTERVAL_MS = 1000;

const hasAnyBlockRoot = BLOCK_SOURCE_DIR_REL.some((rel) => existsSync(resolve(ROOT, rel)));
if (!hasAnyBlockRoot) {
	console.warn("[watch:block-json] No block source dirs found, sync disabled.");
	process.exit(0);
}

function syncAllBlockJson() {
	syncBlockJsonToBuild(ROOT, resolve(ROOT, "build/free/blocks"), FREE_BLOCK_SOURCE_DIR_REL);
	syncBlockJsonToBuild(ROOT, resolve(ROOT, "build/pro/blocks"), PRO_BLOCK_SOURCE_DIR_REL);
}

syncAllBlockJson();
console.log(`[watch:block-json] Polling ${BLOCK_SOURCE_DIR_REL.join(", ")}/**/block.json`);

let lastSignature = getBlockManifestSignature(ROOT);
setInterval(() => {
	const currentSignature = getBlockManifestSignature(ROOT);
	if (currentSignature === lastSignature) {
		return;
	}

	lastSignature = currentSignature;
	syncAllBlockJson();
	console.log("[watch:block-json] Synced block manifests");
}, POLL_INTERVAL_MS);
