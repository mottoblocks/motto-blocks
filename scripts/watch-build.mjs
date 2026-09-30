import { spawn } from "child_process";

const children = [];
let assembleTimer = null;
let assembleProcess = null;
let assembleQueued = false;
let assembleProTimer = null;
let assembleProProcess = null;
let assembleProQueued = false;
let proBuildReady = false;

function writeOutput(chunk, target = process.stdout) {
	target.write(chunk);
}

function runAssemble() {
	if (assembleProcess) {
		assembleQueued = true;
		return;
	}

	assembleProcess = spawn("npm", ["run", "assemble:free"], {
		stdio: "inherit",
		shell: false,
	});

	assembleProcess.on("exit", (code) => {
		assembleProcess = null;
		if (code && code !== 0) {
			console.error(`[watch:assemble] assemble failed with exit code ${code}`);
		}
		if (assembleQueued) {
			assembleQueued = false;
			scheduleAssemble();
		} else if (code === 0 && proBuildReady) {
			// Free assemble runs after free Vite. Run pro assemble again after free
			// assemble so shared assets/CSS changes are reflected in motto-blocks-pro.
			scheduleAssemblePro();
		}
	});
}

function runAssemblePro() {
	if (assembleProProcess) {
		assembleProQueued = true;
		return;
	}

	assembleProProcess = spawn("npm", ["run", "assemble:pro"], {
		stdio: "inherit",
		shell: false,
	});

	assembleProProcess.on("exit", (code) => {
		assembleProProcess = null;
		if (code && code !== 0) {
			console.error(`[watch:assemble-pro] assemble failed with exit code ${code}`);
		}
		if (assembleProQueued) {
			assembleProQueued = false;
			scheduleAssemblePro();
		}
	});
}

function scheduleAssemble() {
	if (assembleTimer) {
		clearTimeout(assembleTimer);
	}
	assembleTimer = setTimeout(() => {
		assembleTimer = null;
		runAssemble();
	}, 150);
}

function scheduleAssemblePro() {
	if (assembleProTimer) {
		clearTimeout(assembleProTimer);
	}
	assembleProTimer = setTimeout(() => {
		assembleProTimer = null;
		runAssemblePro();
	}, 150);
}

function startProcess(command, args, { onStdout } = {}) {
	const child = spawn(command, args, {
		stdio: onStdout ? ["inherit", "pipe", "pipe"] : "inherit",
		// Avoid shell parsing: repo paths may contain spaces (e.g. "Local Sites/...").
		shell: false,
	});

	if (onStdout) {
		child.stdout.on("data", (chunk) => {
			writeOutput(chunk);
			onStdout(String(chunk));
		});
		child.stderr.on("data", (chunk) => {
			writeOutput(chunk, process.stderr);
			onStdout(String(chunk));
		});
	}

	children.push(child);
	return child;
}

function shutdown(exitCode = 0) {
	for (const child of children) {
		if (!child.killed) {
			child.kill("SIGTERM");
		}
	}
	if (assembleProcess && !assembleProcess.killed) {
		assembleProcess.kill("SIGTERM");
	}
	if (assembleProProcess && !assembleProProcess.killed) {
		assembleProProcess.kill("SIGTERM");
	}
	process.exit(exitCode);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

const blockWatcher = startProcess("node", ["scripts/watch-block-json.mjs"], {
	onStdout: (output) => {
		if (output.includes("[watch:block-json] Synced block manifests")) {
			scheduleAssemble();
			if (proBuildReady) {
				scheduleAssemblePro();
			}
		}
	},
});
const viteWatcher = startProcess("npm", ["run", "build:free:watch"], {
	onStdout: (output) => {
		if (/built in\s+\d/.test(output)) {
			scheduleAssemble();
		}
	},
});
const viteProWatcher = startProcess("npm", ["run", "build:pro:watch"], {
	onStdout: (output) => {
		if (/built in\s+\d/.test(output)) {
			proBuildReady = true;
			scheduleAssemblePro();
		}
	},
});
startProcess("npm", ["run", "sass:watch"], {
	onStdout: (output) => {
		if (/compiled|compile|built/i.test(output)) {
			scheduleAssemble();
			if (proBuildReady) {
				scheduleAssemblePro();
			}
		}
	},
});

blockWatcher.on("exit", (code) => {
	if (code && code !== 0) {
		shutdown(code);
	}
});

viteWatcher.on("exit", (code) => {
	shutdown(code ?? 0);
});

viteProWatcher.on("exit", (code) => {
	shutdown(code ?? 0);
});
