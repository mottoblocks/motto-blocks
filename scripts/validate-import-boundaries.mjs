import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const RULES = [
	{
		name: "blocks-to-styler-runtime",
		sourceRoot: path.join(repoRoot, "src/blocks"),
		forbiddenRoot: path.join(repoRoot, "src/styler/runtime"),
	},
	{
		name: "shared-to-styler-runtime",
		sourceRoot: path.join(repoRoot, "src/shared"),
		forbiddenRoot: path.join(repoRoot, "src/styler/runtime"),
	},
	{
		name: "shared-to-blocks",
		sourceRoot: path.join(repoRoot, "src/shared"),
		forbiddenRoot: path.join(repoRoot, "src/blocks"),
	},
	{
		name: "styler-to-blocks",
		sourceRoot: path.join(repoRoot, "src/styler"),
		forbiddenRoot: path.join(repoRoot, "src/blocks"),
	},
	{
		name: "styler-to-pro-blocks",
		sourceRoot: path.join(repoRoot, "src/styler"),
		forbiddenRoot: path.join(repoRoot, "src/pro/blocks"),
	},
	{
		name: "blocks-to-pro-blocks",
		sourceRoot: path.join(repoRoot, "src/blocks"),
		forbiddenRoot: path.join(repoRoot, "src/pro/blocks"),
	},
	{
		name: "shared-to-pro-blocks",
		sourceRoot: path.join(repoRoot, "src/shared"),
		forbiddenRoot: path.join(repoRoot, "src/pro/blocks"),
	},
	{
		name: "styler-to-pro-styler",
		sourceRoot: path.join(repoRoot, "src/styler"),
		forbiddenRoot: path.join(repoRoot, "src/pro/styler"),
	},
	{
		name: "blocks-to-pro-styler",
		sourceRoot: path.join(repoRoot, "src/blocks"),
		forbiddenRoot: path.join(repoRoot, "src/pro/styler"),
	},
	{
		name: "shared-to-pro-styler",
		sourceRoot: path.join(repoRoot, "src/shared"),
		forbiddenRoot: path.join(repoRoot, "src/pro/styler"),
	},
	{
		name: "components-to-styler",
		sourceRoot: path.join(repoRoot, "src/components"),
		forbiddenRoot: path.join(repoRoot, "src/styler"),
	},
	{
		// Pro should reach Styler through STYLER_HOOKS (src/lib/freepro-ids.js), not
		// deep-import its internals. Not yet true everywhere — the two files below
		// pre-date this rule and are grandfathered until they're migrated onto a real
		// hook surface (see docs/conventions/architecture.md's Free/Pro boundary notes);
		// no NEW pro-to-styler-internals import should be added anywhere else.
		name: "pro-to-styler",
		sourceRoot: path.join(repoRoot, "src/pro"),
		forbiddenRoot: path.join(repoRoot, "src/styler"),
		allowFiles: [
			"src/pro/styler/block-spacing/BlockSpacingSection.jsx",
			"src/pro/styler/register-pro-styler-filters.js",
		],
	},
];

const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"]);
const IMPORT_RE = /\b(?:import|export)\s+(?:[^"']*?\sfrom\s*)?["']([^"']+)["']/g;
const DYNAMIC_IMPORT_RE = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;

const fail = (message) => {
	console.error(`[validate:boundaries] ${message}`);
	process.exit(1);
};

const toPosix = (value) => value.split(path.sep).join("/");

const walk = (dir, out = []) => {
	if (!fs.existsSync(dir)) return out;
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			walk(fullPath, out);
			continue;
		}
		if (!SOURCE_EXTENSIONS.has(path.extname(entry.name))) continue;
		out.push(fullPath);
	}
	return out;
};

const extractSpecifiers = (source) => {
	const list = [];
	let match;
	while ((match = IMPORT_RE.exec(source))) list.push(match[1]);
	while ((match = DYNAMIC_IMPORT_RE.exec(source))) list.push(match[1]);
	return list;
};

const violations = [];
let scannedFiles = 0;

for (const rule of RULES) {
	if (!fs.existsSync(rule.sourceRoot)) {
		fail(`Missing folder: ${toPosix(path.relative(repoRoot, rule.sourceRoot))}`);
	}

	const sourceFiles = walk(rule.sourceRoot);
	scannedFiles += sourceFiles.length;
	const allowFiles = new Set(rule.allowFiles ?? []);

	for (const filePath of sourceFiles) {
		if (allowFiles.has(toPosix(path.relative(repoRoot, filePath)))) continue;

		const source = fs.readFileSync(filePath, "utf8");
		const specifiers = extractSpecifiers(source);
		for (const specifier of specifiers) {
			if (!specifier || typeof specifier !== "string") continue;
			if (!specifier.startsWith(".")) continue;

			const resolved = path.resolve(path.dirname(filePath), specifier);
			const isForbidden =
				resolved === rule.forbiddenRoot ||
				resolved.startsWith(`${rule.forbiddenRoot}${path.sep}`);
			if (!isForbidden) continue;

			violations.push({
				rule: rule.name,
				file: toPosix(path.relative(repoRoot, filePath)),
				specifier,
				resolved: toPosix(path.relative(repoRoot, resolved)),
			});
		}
	}
}

if (violations.length > 0) {
	console.error("[validate:boundaries] Found forbidden cross-layer imports:");
	for (const row of violations) {
		console.error(`- [${row.rule}] ${row.file}: \"${row.specifier}\" -> ${row.resolved}`);
	}
	process.exit(1);
}

console.log(`[validate:boundaries] OK (${scannedFiles} files scanned; ${RULES.length} rules)`);
