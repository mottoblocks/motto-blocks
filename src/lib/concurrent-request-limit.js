/**
 * Concurrency limiter for async tasks.
 *
 * Wraps a task function so that no more than `maxConcurrent` tasks run at the
 * same time. Extra calls queue and start when a slot frees up. Used to soften
 * editor REST bursts (e.g. Pro dynamic-image previews on Query Loops) so
 * managed hosts with REST throttling (WP Engine, etc.) don't return 429.
 */

export const createConcurrentRequestLimit = (maxConcurrent = 4) => {
	const safeMax =
		Number.isFinite(maxConcurrent) && maxConcurrent > 0 ? Math.floor(maxConcurrent) : 1;
	let active = 0;
	const queue = [];

	const processNext = () => {
		if (active >= safeMax || queue.length === 0) return;
		const next = queue.shift();
		active += 1;
		Promise.resolve()
			.then(next.task)
			.then(next.resolve, next.reject)
			.finally(() => {
				active -= 1;
				processNext();
			});
	};

	return (task) =>
		new Promise((resolve, reject) => {
			if (typeof task !== "function") {
				reject(new TypeError("Limiter task must be a function."));
				return;
			}
			queue.push({ task, resolve, reject });
			processNext();
		});
};
