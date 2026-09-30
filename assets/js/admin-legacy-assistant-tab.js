(function () {
	const root = document.getElementById('motto-styler-legacy-assistant');
	if (!root || !window.fetch) return;

	const analyzeButton = document.getElementById('motto-styler-legacy-analyze');
	const migrateButton = document.getElementById('motto-styler-legacy-migrate');
	const intro = document.getElementById('motto-styler-legacy-assistant-intro');
	const summaryRoot = document.getElementById('motto-styler-legacy-assistant-summary');
	const progressEl = document.getElementById('motto-styler-legacy-progress');
	const progressText = document.getElementById('motto-styler-legacy-progress-text');
	const noticesRoot = document.getElementById('motto-styler-legacy-notices');
	if (!analyzeButton || !migrateButton || !intro || !summaryRoot || !progressEl || !progressText || !noticesRoot) return;

	const ajaxUrl = root.getAttribute('data-ajax-url') || '';
	const ajaxNonce = root.getAttribute('data-ajax-nonce') || '';
	const startAction = root.getAttribute('data-start-action') || '';
	const processAction = root.getAttribute('data-process-action') || '';
	const analyzeLabel = root.getAttribute('data-analyze-label') || '';
	const analyzeAgainLabel = root.getAttribute('data-analyze-again-label') || '';
	const migrateLabel = root.getAttribute('data-migrate-label') || '';
	const runningAnalyzeLabel = root.getAttribute('data-running-analyze-label') || '';
	const runningMigrateLabel = root.getAttribute('data-running-migrate-label') || '';
	const progressTemplate = root.getAttribute('data-progress-template') || '';
	const emptyAnalyzeMessage = root.getAttribute('data-empty-analyze-message') || '';
	const defaultIntro = root.getAttribute('data-default-intro') || '';
	const actionableIntro = root.getAttribute('data-actionable-intro') || '';
	const defaultErrorMessage = root.getAttribute('data-default-error-message') || '';

	const summaryKeys = Array.from(root.querySelectorAll('[data-summary-key]'));

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
		if (dismiss) {
			dismiss.addEventListener('click', () => {
				noticesRoot.innerHTML = '';
			});
		}
	};

	const updateSummary = (summary = {}) => {
		let hasValues = false;
		summaryKeys.forEach((node) => {
			const key = node.getAttribute('data-summary-key') || '';
			const value = Math.max(0, Number(summary[key]) || 0);
			node.textContent = String(value);
			hasValues = hasValues || value > 0;
		});
		summaryRoot.hidden = !hasValues;
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

	const setActionState = (status, hasActionable) => {
		root.setAttribute('data-status', status);
		root.setAttribute('data-has-actionable', hasActionable ? '1' : '0');

		if (status === 'clean') {
			analyzeButton.hidden = true;
			migrateButton.hidden = true;
			intro.textContent = emptyAnalyzeMessage;
			progressEl.hidden = true;
			progressText.textContent = '';
			return;
		}

		analyzeButton.hidden = false;
		analyzeButton.textContent = status === 'actionable' ? analyzeAgainLabel : analyzeLabel;
		migrateButton.hidden = !(status === 'actionable' && hasActionable);
		migrateButton.textContent = migrateLabel;
		intro.textContent = status === 'actionable' ? actionableIntro : defaultIntro;
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

	const runJob = async (mode) => {
		analyzeButton.disabled = true;
		migrateButton.disabled = true;
		renderNotice('', '');
		progressText.textContent = mode === 'migrate' ? runningMigrateLabel : runningAnalyzeLabel;

		try {
			let current = await createRequest(startAction, { mode });
			const total = Math.max(0, Number(current.total) || 0);

			if (total <= 0 || current.done) {
				updateSummary(current.summary || {});
				setActionState(current.assistantStatus || 'clean', !!current.hasActionable);
				renderNotice('success', current.message || emptyAnalyzeMessage);
				return;
			}

			renderProgress(current.offset || 0, total);

			while (!current.done) {
				current = await createRequest(processAction, {
					job_id: current.id,
				});
				renderProgress(current.offset || 0, total);
			}

			updateSummary(current.summary || {});
			setActionState(current.assistantStatus || 'unknown', !!current.hasActionable);
			renderNotice('success', current.message || '');
		} catch (error) {
			progressEl.hidden = true;
			progressText.textContent = '';
			renderNotice('error', (error && error.message) || defaultErrorMessage);
		} finally {
			analyzeButton.disabled = false;
			migrateButton.disabled = false;
		}
	};

	setActionState(root.getAttribute('data-status') || 'unknown', root.getAttribute('data-has-actionable') === '1');

	analyzeButton.addEventListener('click', () => {
		void runJob('analyze');
	});

	migrateButton.addEventListener('click', () => {
		void runJob('migrate');
	});
})();
