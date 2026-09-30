/**
 * Single source of truth for which folders contain Gutenberg block.json roots
 * and how they sync into build/free/blocks or build/pro/blocks.
 */
import { basename, dirname, resolve } from "node:path";
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";

/** Relative paths from repo root; each directory holds one subfolder per block slug. */
export const FREE_BLOCK_SOURCE_DIR_REL = ["src/blocks"];
export const PRO_BLOCK_SOURCE_DIR_REL = ["src/pro/blocks"];
export const BLOCK_SOURCE_DIR_REL = [...FREE_BLOCK_SOURCE_DIR_REL, ...PRO_BLOCK_SOURCE_DIR_REL];

export function getBlockSourceDirs(repoRoot = process.cwd(), sourceDirRel = BLOCK_SOURCE_DIR_REL) {
	return sourceDirRel.map((rel) => resolve(repoRoot, rel));
}

/**
 * Absolute paths to every block.json under BLOCK_SOURCE_DIR_REL.
 * Sorted for stable signatures / diffs.
 */
export function collectBlockJsonPaths(
	repoRoot = process.cwd(),
	sourceDirRel = BLOCK_SOURCE_DIR_REL
) {
	const paths = [];
	for (const sourceBlocksDir of getBlockSourceDirs(repoRoot, sourceDirRel)) {
		if (!existsSync(sourceBlocksDir)) continue;
		for (const entry of readdirSync(sourceBlocksDir)) {
			const blockDir = resolve(sourceBlocksDir, entry);
			if (!statSync(blockDir).isDirectory()) continue;
			const jsonPath = resolve(blockDir, "block.json");
			if (existsSync(jsonPath)) paths.push(jsonPath);
		}
	}
	return paths.sort((a, b) => a.localeCompare(b));
}

export function syncBlockJsonToBuild(
	repoRoot = process.cwd(),
	outputBlocksDir = resolve(repoRoot, "build/blocks"),
	sourceDirRel = BLOCK_SOURCE_DIR_REL
) {
	mkdirSync(outputBlocksDir, { recursive: true });
	for (const sourceBlockJson of collectBlockJsonPaths(repoRoot, sourceDirRel)) {
		const blockSlug = basename(dirname(sourceBlockJson));
		const targetBlockDir = resolve(outputBlocksDir, blockSlug);
		mkdirSync(targetBlockDir, { recursive: true });
		copyFileSync(sourceBlockJson, resolve(targetBlockDir, "block.json"));
	}
}

export function getBlockManifestSignature(
	repoRoot = process.cwd(),
	sourceDirRel = BLOCK_SOURCE_DIR_REL
) {
	return collectBlockJsonPaths(repoRoot, sourceDirRel)
		.map((filePath) => {
			const fileStat = statSync(filePath);
			return `${filePath}:${fileStat.mtimeMs}:${fileStat.size}`;
		})
		.join("|");
}
