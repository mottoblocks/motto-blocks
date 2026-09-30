import { cpSync, existsSync, mkdirSync, rmSync } from "fs";
import { resolve } from "path";

import { PRO_FREE_PRUNE_PATHS } from "./pro-plugin-build.mjs";
import { SYNC_TARGETS } from "./sync-config.mjs";

const ROOT = process.cwd();
const FREE_BUILD = resolve(ROOT, "build/free");

const COPY_PATHS = [
	"motto-blocks.php",
	"index.php",
	"readme.txt",
	"THIRD_PARTY_LICENSES.txt",
	"includes",
	"assets",
	"config",
];

const STALE_ASSET_PRUNE_PATHS = [
	"assets/css/blocks/editor-base.css",
	"assets/css/editor-base.css",
	"assets/css/motto-panels.editor.css",
	"assets/css/styler/motto-panels.editor.css",
	"assets/css/styler/styles/motto-panels.editor.css",
	"assets/css/motto-styler-block-base.css",
	"assets/css/styler/motto-styler-block-base.css",
];

const copyRequired = (source, target) => {
	if (!existsSync(source)) {
		console.error(`[assemble:free] Missing required source: ${source}`);
		process.exit(1);
	}
	cpSync(source, target, { recursive: true, force: true });
};

const copyOptional = (source, target) => {
	if (!existsSync(source)) return;
	cpSync(source, target, { recursive: true, force: true });
};

function assembleToTarget(OUT) {
	mkdirSync(OUT, { recursive: true });

	for (const p of COPY_PATHS) {
		cpSync(resolve(ROOT, p), resolve(OUT, p), { recursive: true, force: true });
	}

	for (const toRel of STALE_ASSET_PRUNE_PATHS) {
		rmSync(resolve(OUT, toRel), { recursive: true, force: true });
	}

	for (const toRel of PRO_FREE_PRUNE_PATHS) {
		rmSync(resolve(OUT, toRel), { recursive: true, force: true });
	}

	rmSync(resolve(OUT, "build"), { recursive: true, force: true });
	mkdirSync(resolve(OUT, "build"), { recursive: true });
	copyRequired(resolve(FREE_BUILD, "motto-blocks.js"), resolve(OUT, "build/motto-blocks.js"));
	copyOptional(resolve(FREE_BUILD, "motto-blocks.js.map"), resolve(OUT, "build/motto-blocks.js.map"));
	copyRequired(resolve(FREE_BUILD, "blocks"), resolve(OUT, "build/blocks"));
}

for (const target of SYNC_TARGETS.free) {
	const OUT = resolve(ROOT, target);
	assembleToTarget(OUT);
	console.log(`[assemble:free] Plugin assembled to ${target}`);
}
