import { cpSync, existsSync, mkdtempSync, mkdirSync, readdirSync, rmSync, statSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { spawnSync } from "child_process";

const ROOT = process.cwd();
const PLUGIN_OUT = path.resolve(ROOT, "../../motto-blocks");
const PLUGIN_DIR_NAME = "motto-blocks";
const OUTPUT_ZIP = path.join(ROOT, `${PLUGIN_DIR_NAME}.zip`);
const SHOULD_RUN_GIT = process.argv.includes("--git");
const COMMIT_MESSAGE = process.env.ZIP_COMMIT_MESSAGE || "chore: build production zip";

const REQUIRED_PATHS = [
  "motto-blocks.php",
  "index.php",
  "readme.txt",
  "THIRD_PARTY_LICENSES.txt",
  "includes",
  "assets",
  "config",
  "build/motto-blocks.js",
  "build/blocks",
];

const REQUIRED_ZIP_ENTRIES = [
  `${PLUGIN_DIR_NAME}/motto-blocks.php`,
  `${PLUGIN_DIR_NAME}/index.php`,
  `${PLUGIN_DIR_NAME}/readme.txt`,
  `${PLUGIN_DIR_NAME}/THIRD_PARTY_LICENSES.txt`,
  `${PLUGIN_DIR_NAME}/includes/styler-frontend-render.php`,
  `${PLUGIN_DIR_NAME}/assets/css/styler/styles/motto-styler-block-base.css`,
  `${PLUGIN_DIR_NAME}/assets/css/styler/styles/editor-ui.css`,
  `${PLUGIN_DIR_NAME}/config/features.json`,
  `${PLUGIN_DIR_NAME}/config/styler-css-valid-properties.json`,
  `${PLUGIN_DIR_NAME}/config/motto-conditional-classes.json`,
  `${PLUGIN_DIR_NAME}/build/motto-blocks.js`,
];

const FORBIDDEN_ZIP_PREFIXES = [
  `${PLUGIN_DIR_NAME}/src/`,
  `${PLUGIN_DIR_NAME}/docs/`,
  `${PLUGIN_DIR_NAME}/node_modules/`,
  `${PLUGIN_DIR_NAME}/scripts/`,
  `${PLUGIN_DIR_NAME}/.git/`,
];

const FORBIDDEN_ZIP_ENTRIES = [
  `${PLUGIN_DIR_NAME}/package.json`,
  `${PLUGIN_DIR_NAME}/package-lock.json`,
  `${PLUGIN_DIR_NAME}/vite.config.mjs`,
  `${PLUGIN_DIR_NAME}/assets/.DS_Store`,
  `${PLUGIN_DIR_NAME}/assets/js/marquee-frontend.js`,
  `${PLUGIN_DIR_NAME}/assets/js/panel-trigger-frontend.js`,
  `${PLUGIN_DIR_NAME}/assets/css/blocks/marquee.css`,
  `${PLUGIN_DIR_NAME}/assets/css/blocks/marquee.editor.css`,
  `${PLUGIN_DIR_NAME}/assets/css/blocks/panel-trigger.css`,
  `${PLUGIN_DIR_NAME}/assets/css/blocks/panel-trigger.editor.css`,
  `${PLUGIN_DIR_NAME}/assets/css/panel-trigger.css`,
  `${PLUGIN_DIR_NAME}/assets/css/panel-trigger.css.map`,
  `${PLUGIN_DIR_NAME}/assets/css/panel-trigger.editor.css`,
  `${PLUGIN_DIR_NAME}/assets/css/panel-trigger.editor.css.map`,
  `${PLUGIN_DIR_NAME}/build/motto-blocks-pro.js`,
  `${PLUGIN_DIR_NAME}/build/blocks/marquee/block.json`,
  `${PLUGIN_DIR_NAME}/build/blocks/marquee-track/block.json`,
  `${PLUGIN_DIR_NAME}/build/blocks/panel-trigger/block.json`,
  `${PLUGIN_DIR_NAME}/build/blocks/panel-trigger-trigger/block.json`,
  `${PLUGIN_DIR_NAME}/build/blocks/panel-trigger-panel/block.json`,
  `${PLUGIN_DIR_NAME}/build/blocks/panel-trigger-close/block.json`,
];

function assertRequiredPaths() {
  const missing = REQUIRED_PATHS.filter((relativePath) => !existsSync(path.join(PLUGIN_OUT, relativePath)));
  if (missing.length > 0) {
    throw new Error(`Missing required production files: ${missing.join(", ")}.`);
  }
}

function copyPath(relativePath, targetPluginDir) {
  const sourcePath = path.join(PLUGIN_OUT, relativePath);
  const destinationPath = path.join(targetPluginDir, relativePath);
  mkdirSync(path.dirname(destinationPath), { recursive: true });
  cpSync(sourcePath, destinationPath, { recursive: true });
}

function ensureZipBinary() {
  const probe = spawnSync("zip", ["-v"], { stdio: "ignore" });
  if (probe.error || probe.status !== 0) {
    throw new Error("`zip` binary is not available. Install zip and retry.");
  }
}

function ensureUnzipBinary() {
  const probe = spawnSync("unzip", ["-v"], { stdio: "ignore" });
  if (probe.error || probe.status !== 0) {
    throw new Error("`unzip` binary is not available. Install unzip and retry.");
  }
}

function pruneMaps(directoryPath) {
  if (!existsSync(directoryPath) || !statSync(directoryPath).isDirectory()) {
    return;
  }

  for (const entry of readdirSync(directoryPath)) {
    const entryPath = path.join(directoryPath, entry);
    const entryStat = statSync(entryPath);

    if (entryStat.isDirectory()) {
      pruneMaps(entryPath);
      continue;
    }

    if (entryPath.endsWith(".map")) {
      rmSync(entryPath, { force: true });
    }
  }
}

function pruneJunkFiles(directoryPath) {
  if (!existsSync(directoryPath) || !statSync(directoryPath).isDirectory()) {
    return;
  }

  for (const entry of readdirSync(directoryPath)) {
    const entryPath = path.join(directoryPath, entry);
    const entryStat = statSync(entryPath);

    if (entryStat.isDirectory()) {
      pruneJunkFiles(entryPath);
      continue;
    }

    if (entry === ".DS_Store" || entry === "Thumbs.db") {
      rmSync(entryPath, { force: true });
    }
  }
}

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: ROOT,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed.`);
  }
}

function runGitAllowFail(args) {
  return spawnSync("git", args, {
    cwd: ROOT,
    stdio: "inherit",
  });
}

function collectBlockSlugs(blocksDir) {
  if (!existsSync(blocksDir) || !statSync(blocksDir).isDirectory()) return [];
  return readdirSync(blocksDir).filter((entry) => {
    const entryPath = path.join(blocksDir, entry);
    return statSync(entryPath).isDirectory();
  });
}

function assertStagedContent(stagedPluginDir) {
  const missing = [];
  for (const relativePath of REQUIRED_ZIP_ENTRIES.map((entry) => entry.replace(`${PLUGIN_DIR_NAME}/`, ""))) {
    if (!existsSync(path.join(stagedPluginDir, relativePath))) {
      missing.push(relativePath);
    }
  }

  const buildBlocksDir = path.join(stagedPluginDir, "build/blocks");
  const blockSlugs = collectBlockSlugs(buildBlocksDir);
  if (blockSlugs.length === 0) {
    missing.push("build/blocks/*/block.json");
  } else {
    blockSlugs.forEach((slug) => {
      const blockJson = path.join(buildBlocksDir, slug, "block.json");
      if (!existsSync(blockJson)) {
        missing.push(`build/blocks/${slug}/block.json`);
      }
    });
  }

  if (missing.length > 0) {
    throw new Error(`[zip:prod] Missing required staged files: ${missing.join(", ")}`);
  }
}

function listZipEntries(zipFilePath) {
  const result = spawnSync("unzip", ["-Z", "-1", zipFilePath], {
    cwd: ROOT,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error("[zip:prod] Failed to read zip content listing.");
  }

  return String(result.stdout || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function assertZipEntries(zipEntries) {
  const missingRequired = REQUIRED_ZIP_ENTRIES.filter((entry) => !zipEntries.includes(entry));
  if (missingRequired.length > 0) {
    throw new Error(`[zip:prod] ZIP is missing required entries: ${missingRequired.join(", ")}`);
  }

  const hasForbiddenPrefix = zipEntries.filter((entry) =>
    FORBIDDEN_ZIP_PREFIXES.some((prefix) => entry.startsWith(prefix))
  );
  if (hasForbiddenPrefix.length > 0) {
    throw new Error(`[zip:prod] ZIP contains forbidden directories: ${hasForbiddenPrefix.slice(0, 20).join(", ")}`);
  }

  const hasForbiddenEntries = FORBIDDEN_ZIP_ENTRIES.filter((entry) => zipEntries.includes(entry));
  if (hasForbiddenEntries.length > 0) {
    throw new Error(`[zip:prod] ZIP contains forbidden files: ${hasForbiddenEntries.join(", ")}`);
  }

  const mapFiles = zipEntries.filter((entry) => entry.endsWith(".map"));
  if (mapFiles.length > 0) {
    throw new Error(`[zip:prod] ZIP contains sourcemaps: ${mapFiles.slice(0, 20).join(", ")}`);
  }

  const zipBlockJsonEntries = zipEntries.filter(
    (entry) => entry.startsWith(`${PLUGIN_DIR_NAME}/build/blocks/`) && entry.endsWith("/block.json")
  );
  if (zipBlockJsonEntries.length === 0) {
    throw new Error("[zip:prod] ZIP contains no build/blocks/*/block.json entries.");
  }
}

function maybeRunGit() {
  if (!SHOULD_RUN_GIT) {
    return;
  }

  runGit(["add", "-A"]);
  const statusCheck = spawnSync("git", ["diff", "--cached", "--quiet"], {
    cwd: ROOT,
    stdio: "inherit",
  });

  if (statusCheck.status === 0) {
    console.log("[zip:prod] No staged changes to commit.");
    return;
  }

  runGit(["commit", "-m", COMMIT_MESSAGE]);
  const pushResult = runGitAllowFail(["push"]);
  if (pushResult.status !== 0) {
    console.log("[zip:prod] Push rejected. Attempting git pull --ff-only and retry.");
    runGit(["pull", "--ff-only"]);
    runGit(["push"]);
  }
}

function buildZip() {
  assertRequiredPaths();
  ensureZipBinary();
  ensureUnzipBinary();

  const tempRoot = mkdtempSync(path.join(tmpdir(), "motto-blocks-prod-"));
  const stagedPluginDir = path.join(tempRoot, PLUGIN_DIR_NAME);

  try {
    mkdirSync(stagedPluginDir, { recursive: true });

    for (const relativePath of REQUIRED_PATHS) {
      copyPath(relativePath, stagedPluginDir);
    }

    pruneMaps(path.join(stagedPluginDir, "assets"));
    pruneMaps(path.join(stagedPluginDir, "build"));
    pruneJunkFiles(stagedPluginDir);
    assertStagedContent(stagedPluginDir);

    rmSync(OUTPUT_ZIP, { force: true });

    const zipResult = spawnSync(
      "zip",
      ["-r", "-q", OUTPUT_ZIP, PLUGIN_DIR_NAME],
      { cwd: tempRoot, stdio: "inherit" }
    );

    if (zipResult.status !== 0) {
      throw new Error("zip command failed while building production package.");
    }

    const zipEntries = listZipEntries(OUTPUT_ZIP);
    assertZipEntries(zipEntries);

    console.log(`[zip:prod] Created ${OUTPUT_ZIP}`);
    console.log(`[zip:prod] Verified ${zipEntries.length} ZIP entries (clean + required checks passed).`);
    maybeRunGit();
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

buildZip();
