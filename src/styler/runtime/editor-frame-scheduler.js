import {
	beginEditorStyleRegistryBatch,
	endEditorStyleRegistryBatch,
} from "./editor-style-registry";

const queuedTasks = new Map();
let isScheduled = false;

const flushQueuedTasks = () => {
	isScheduled = false;
	if (queuedTasks.size === 0) return;

	const tasks = Array.from(queuedTasks.values());
	queuedTasks.clear();

	beginEditorStyleRegistryBatch();
	try {
		tasks.forEach((task) => {
			if (typeof task === "function") task();
		});
	} finally {
		endEditorStyleRegistryBatch();
	}
};

export const scheduleEditorFrameTask = (taskId, task) => {
	const normalizedId = String(taskId || "").trim();
	if (!normalizedId || typeof task !== "function") return;

	queuedTasks.set(normalizedId, task);
	if (isScheduled) return;
	isScheduled = true;
	requestAnimationFrame(flushQueuedTasks);
};
