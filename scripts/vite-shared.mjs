/**
 * Shared Rollup/Vite pieces for free + Pro IIFE bundles (avoid drift between configs).
 */
import { resolve } from "node:path";

export const wordpressExternalsCommon = [
	"@wordpress/api-fetch",
	"@wordpress/blocks",
	"@wordpress/block-editor",
	"@wordpress/components",
	"@wordpress/data",
	"@wordpress/element",
	"@wordpress/editor",
	"@wordpress/hooks",
	"@wordpress/i18n",
	"react",
	"react/jsx-runtime",
	"react/jsx-dev-runtime",
];

/** Only the free editor bundle may import this; keep external so it maps to wp global. */
export const wordpressExternalServerSideRender = "@wordpress/server-side-render";

export const wordpressGlobalsCommon = {
	"@wordpress/api-fetch": "wp.apiFetch",
	"@wordpress/blocks": "wp.blocks",
	"@wordpress/block-editor": "wp.blockEditor",
	"@wordpress/components": "wp.components",
	"@wordpress/data": "wp.data",
	"@wordpress/element": "wp.element",
	"@wordpress/editor": "wp.editor",
	"@wordpress/hooks": "wp.hooks",
	"@wordpress/i18n": "wp.i18n",
	react: "wp.element",
	"react/jsx-runtime": "wp.element",
	"react/jsx-dev-runtime": "wp.element",
};

export const wordpressGlobalsFreeExtra = {
	[wordpressExternalServerSideRender]: "wp.serverSideRender",
};

export function viteResolveAliases(projectRoot) {
	return [
		{ find: /^@shared$/, replacement: resolve(projectRoot, "src/shared/index.js") },
		{ find: /^@shared\/(.*)$/, replacement: resolve(projectRoot, "src/shared/$1") },
		{ find: /^@lib\/(.*)$/, replacement: resolve(projectRoot, "src/lib/$1") },
		{ find: /^@config\/(.*)$/, replacement: resolve(projectRoot, "config/$1") },
		{ find: /^@block-icons\/(.*)$/, replacement: resolve(projectRoot, "assets/icons/blocks/$1") },
		{ find: /^@components$/, replacement: resolve(projectRoot, "src/components/index.js") },
		{ find: /^@components\/(.*)$/, replacement: resolve(projectRoot, "src/components/$1") },
		{ find: "react", replacement: "@wordpress/element" },
		{ find: "react/jsx-runtime", replacement: "@wordpress/element" },
		{ find: "react/jsx-dev-runtime", replacement: "@wordpress/element" },
	];
}

export const esbuildJsxWordpress = {
	jsxFactory: "wp.element.createElement",
	jsxFragment: "wp.element.Fragment",
};
