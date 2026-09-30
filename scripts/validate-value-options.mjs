import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const targetPath = path.resolve(__dirname, "../src/styler/data/styler-css-value-options.json");

const fail = (message) => {
	console.error(`[validate:value-options] ${message}`);
	process.exit(1);
};

if (!fs.existsSync(targetPath)) {
	fail(`Missing file: ${targetPath}`);
}

let raw = "";
try {
	raw = fs.readFileSync(targetPath, "utf8");
} catch (error) {
	fail(`Cannot read file: ${error?.message || String(error)}`);
}

let data;
try {
	data = JSON.parse(raw);
} catch (error) {
	fail(`Invalid JSON: ${error?.message || String(error)}`);
}

if (!data || typeof data !== "object" || Array.isArray(data)) {
	fail("Root value must be a JSON object.");
}

if (!Array.isArray(data.__patterns)) {
	fail('Root object must include "__patterns" as an array.');
}

data.__patterns.forEach((entry, index) => {
	if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
		fail(`__patterns[${index}] must be an object.`);
	}
	if (typeof entry.match !== "string" || entry.match.trim() === "") {
		fail(`__patterns[${index}].match must be a non-empty string.`);
	}
	if (typeof entry.type !== "string" || entry.type.trim() === "") {
		fail(`__patterns[${index}].type must be a non-empty string.`);
	}

	try {
		new RegExp(entry.match);
	} catch (error) {
		fail(`__patterns[${index}].match is not a valid RegExp: ${error?.message || String(error)}`);
	}
});

console.log(
	`[validate:value-options] OK (${path.relative(process.cwd(), targetPath)}; ${Object.keys(data).length} keys)`
);
