import { defineConfig } from "vite";
import { existsSync } from "fs";
import { resolve } from "path";
import {
	collectBlockJsonPaths,
	FREE_BLOCK_SOURCE_DIR_REL,
	getBlockSourceDirs,
	syncBlockJsonToBuild,
} from "./scripts/block-json-sync.mjs";
import {
	esbuildJsxWordpress,
	viteResolveAliases,
	wordpressExternalServerSideRender,
	wordpressExternalsCommon,
	wordpressGlobalsCommon,
	wordpressGlobalsFreeExtra,
} from "./scripts/vite-shared.mjs";

const wordpressExternals = [...wordpressExternalsCommon, wordpressExternalServerSideRender];
const wordpressGlobals = { ...wordpressGlobalsCommon, ...wordpressGlobalsFreeExtra };

function copyBlockJsonPlugin() {
	const repoRoot = __dirname;

	return {
		name: "copy-block-json",
		buildStart() {
			for (const sourceBlocksDir of getBlockSourceDirs(repoRoot, FREE_BLOCK_SOURCE_DIR_REL)) {
				if (existsSync(sourceBlocksDir)) {
					this.addWatchFile(sourceBlocksDir);
				}
			}
			for (const blockJsonPath of collectBlockJsonPaths(
				repoRoot,
				FREE_BLOCK_SOURCE_DIR_REL
			)) {
				this.addWatchFile(blockJsonPath);
			}
		},
		generateBundle() {
			syncBlockJsonToBuild(
				repoRoot,
				resolve(repoRoot, "build/free/blocks"),
				FREE_BLOCK_SOURCE_DIR_REL
			);
		},
	};
}

export default defineConfig({
	test: {
		exclude: ["tests/e2e/**", "node_modules/**"],
	},
	plugins: [copyBlockJsonPlugin()],
	define: {
		"process.env.NODE_ENV": JSON.stringify("production"),
		process: JSON.stringify({
			env: {
				NODE_ENV: "production",
			},
		}),
	},
	resolve: {
		alias: [
			...viteResolveAliases(__dirname),
			// @wordpress/i18n is externalized to the wp.i18n global for the real build
			// (see wordpressExternals below) and isn't an installed package — Vitest has
			// no such global, so tests need a real module to resolve it to instead.
			...(process.env.VITEST
				? [{ find: /^@wordpress\/i18n$/, replacement: resolve(__dirname, "tests/mocks/wordpress-i18n.js") }]
				: []),
		],
	},
	esbuild: esbuildJsxWordpress,
	build: {
		outDir: "build/free",
		emptyOutDir: true,
		sourcemap: true,
		lib: {
			entry: resolve(__dirname, "src/index.jsx"),
			name: "MottoBlocks",
			formats: ["iife"],
			fileName: () => "motto-blocks.js",
		},
		rollupOptions: {
			external: wordpressExternals,
			output: {
				globals: wordpressGlobals,
			},
		},
	},
});
