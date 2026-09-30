#!/usr/bin/env node
// Copies the Motto Maps block's curated Lucide icon list (src/blocks/maps/map-pin-lucide-icons.json)
// from lucide-static's bundled SVG files into assets/vendor/lucide/icons/, as plain local
// assets. Used by the Maps block's marker-icon feature (previously fetched the same files
// live from unpkg.com/lucide-static — disallowed for WordPress.org distribution). Scoped to
// icons that make sense as a map pin, not the full ~1864-icon set used by List/Bullets.

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const curatedIconsFile = path.join(ROOT, "src/blocks/maps/map-pin-lucide-icons.json");
const sourceDir = path.join(ROOT, "node_modules/lucide-static/icons");
const outputDir = path.join(ROOT, "assets/vendor/lucide/icons");

const { icons } = JSON.parse(fs.readFileSync(curatedIconsFile, "utf8"));

fs.mkdirSync(outputDir, { recursive: true });

// Remove any icons no longer in the allowlist so the vendor dir doesn't accumulate stale files.
const wanted = new Set(icons.map((name) => `${name}.svg`));
for (const entry of fs.readdirSync(outputDir)) {
  if (!wanted.has(entry)) {
    fs.rmSync(path.join(outputDir, entry));
  }
}

const missing = [];
let copied = 0;
for (const name of icons) {
  const sourceFile = path.join(sourceDir, `${name}.svg`);
  if (!fs.existsSync(sourceFile)) {
    missing.push(name);
    continue;
  }
  fs.copyFileSync(sourceFile, path.join(outputDir, `${name}.svg`));
  copied += 1;
}

if (missing.length > 0) {
  console.warn(`Missing lucide-static icons (${missing.length}):`);
  for (const name of missing) {
    console.warn(`- ${name}`);
  }
}

console.log(`Copied ${copied} Lucide icon SVGs -> ${path.relative(ROOT, outputDir)}`);
