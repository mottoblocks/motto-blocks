(function () {
	const form = document.getElementById('motto-styler-cache-rebuild-form');
	const statusRoot = document.getElementById('motto-styler-cache-rebuild-status');
	const progressEl = document.getElementById('motto-styler-cache-rebuild-progress');
	const progressText = document.getElementById('motto-styler-cache-rebuild-text');
	const noticesRoot = document.getElementById('motto-styler-cache-rebuild-notices');
	const submitButton = document.getElementById('motto-styler-cache-rebuild-submit');
	if (!form || !statusRoot || !progressEl || !progressText || !submitButton || !window.fetch) return;

	const ajaxUrl = statusRoot.getAttribute('data-ajax-url') || '';
	const ajaxNonce = statusRoot.getAttribute('data-ajax-nonce') || '';
	const startAction = statusRoot.getAttribute('data-start-action') || '';
	const processAction = statusRoot.getAttribute('data-process-action') || '';
	const runningLabel = statusRoot.getAttribute('data-running-label') || '';
	const progressTemplate = statusRoot.getAttribute('data-progress-template') || '';
	const emptyMessage = statusRoot.getAttribute('data-empty-message') || '';
	const defaultErrorMessage = statusRoot.getAttribute('data-error-message') || '';
	const hasCachedPosts = statusRoot.getAttribute('data-has-cached-posts') === '1';

	const escapeHtml = (value) => String(value || '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');

	const renderNotice = (type, message) => {
		const text = String(message || '').trim();
		if (!text) {
			noticesRoot.innerHTML = '';
			return;
		}
		noticesRoot.innerHTML = `
			<div class="motto-admin-notice notice notice-${type} is-dismissible">
				<p>${escapeHtml(text)}</p>
				<button type="button" class="notice-dismiss">
					<span class="screen-reader-text">Dismiss this notice.</span>
				</button>
			</div>
		`;
		const dismiss = noticesRoot.querySelector('.notice-dismiss');
		if (dismiss) dismiss.addEventListener('click', () => {
			noticesRoot.innerHTML = '';
		});
	};

	const renderProgress = (processed, total) => {
		const safeTotal = Math.max(0, Number(total) || 0);
		const safeProcessed = Math.max(0, Math.min(safeTotal || 0, Number(processed) || 0));
		progressEl.hidden = safeTotal <= 0;
		progressEl.max = Math.max(1, safeTotal);
		progressEl.value = safeProcessed;
		progressText.textContent = progressTemplate
			.replace('%1$d', String(safeProcessed))
			.replace('%2$d', String(safeTotal));
	};

	const createRequest = async (action, payload = {}) => {
		const params = new URLSearchParams();
		params.set('action', action);
		params.set('_ajax_nonce', ajaxNonce);
		Object.entries(payload).forEach(([key, value]) => {
			params.set(key, value == null ? '' : String(value));
		});

		const response = await window.fetch(ajaxUrl, {
			method: 'POST',
			credentials: 'same-origin',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
			},
			body: params.toString(),
		});

		let result = null;
		try {
			result = await response.json();
		} catch (error) {}

		if (!response.ok || !result || !result.success) {
			const message = result && result.data && result.data.message ? result.data.message : '';
			throw new Error(message || defaultErrorMessage);
		}

		return result.data || {};
	};

	const runRebuild = async () => {
		submitButton.disabled = true;
		renderNotice('', '');
		progressText.textContent = runningLabel;

		try {
			const start = await createRequest(startAction);
			const total = Math.max(0, Number(start.total) || 0);
			if (total <= 0) {
				progressEl.hidden = true;
				progressText.textContent = '';
				renderNotice('success', emptyMessage);
				return;
			}

			let processed = Math.max(0, Number(start.offset) || 0);
			let current = start;
			renderProgress(processed, total);

			while (!current.done) {
				current = await createRequest(processAction, {
					job_id: current.id
				});
				processed = Math.max(0, Number(current.offset) || 0);
				renderProgress(processed, total);
			}

			renderNotice('success', current.message || '');
		} catch (error) {
			progressEl.hidden = true;
			progressText.textContent = '';
			renderNotice('error', (error && error.message) || defaultErrorMessage);
		} finally {
			submitButton.disabled = !hasCachedPosts;
		}
	};

	form.addEventListener('submit', (event) => {
		event.preventDefault();
		void runRebuild();
	});
})();
