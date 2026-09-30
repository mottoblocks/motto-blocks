(function () {
	const libraryBox = document.querySelector('.motto-styler-classes-library .inside');
	if (!libraryBox) return;

	const escapeHtml = (value) => String(value || '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');

	const renderNotice = (root, type, message) => {
		if (!root) return;
		const text = String(message || '').trim();
		if (!text) {
			root.innerHTML = '';
			return;
		}
		root.innerHTML = `
			<div class="motto-admin-notice notice notice-${type} is-dismissible">
				<p>${escapeHtml(text)}</p>
				<button type="button" class="notice-dismiss">
					<span class="screen-reader-text">Dismiss this notice.</span>
				</button>
			</div>
		`;
		const dismiss = root.querySelector('.notice-dismiss');
		if (dismiss) dismiss.addEventListener('click', () => {
			root.innerHTML = '';
		});
	};

	const getBody = () => libraryBox.querySelector('.motto-styler-classes-library__body');

	const createRequest = async (body, payload) => {
		const ajaxUrl = body?.getAttribute('data-ajax-url') || '';
		const nonce = body?.getAttribute('data-ajax-nonce') || '';
		if (!window.fetch || !ajaxUrl || !nonce) {
			throw new Error('');
		}

		const params = new URLSearchParams();
		params.set('_ajax_nonce', nonce);
		Object.entries(payload || {}).forEach(([key, value]) => {
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
			throw new Error(message);
		}

		return result.data || {};
	};

	const replaceLibraryHtml = (html) => {
		if (typeof html !== 'string' || html.trim() === '') return null;
		libraryBox.innerHTML = html;
		return getBody();
	};

	libraryBox.addEventListener('submit', async (event) => {
		const form = event.target.closest('.motto-styler-classes-toolbar');
		if (!form) return;
		event.preventDefault();

		const body = getBody();
		if (!body) return;

		const noticeRoot = body.querySelector('#motto-styler-classes-notices');
		const fetchAction = body.getAttribute('data-fetch-action') || '';
		const fetchError = body.getAttribute('data-fetch-error-message') || '';
		const select = form.querySelector('select[name="classes_order"]');
		const classesOrder = select ? String(select.value || '') : 'created';

		try {
			const response = await createRequest(body, {
				action: fetchAction,
				classes_order: classesOrder,
			});
			replaceLibraryHtml(response.html || '');
		} catch (error) {
			renderNotice(noticeRoot, 'error', (error && error.message) || fetchError);
		}
	});

	libraryBox.addEventListener('click', async (event) => {
		const deleteButton = event.target.closest('.motto-styler-delete-class-link');
		if (!deleteButton) return;
		event.preventDefault();

		const body = getBody();
		if (!body) return;

		const message = body.getAttribute('data-delete-confirm') || '';
		if (message && !window.confirm(message)) return;

		const noticeRoot = body.querySelector('#motto-styler-classes-notices');
		const deleteAction = body.getAttribute('data-delete-action') || '';
		const deleteError = body.getAttribute('data-delete-error-message') || '';
		const deleteSuccess = body.getAttribute('data-delete-success-message') || '';
		const postId = deleteButton.getAttribute('data-post-id') || '';
		const select = body.querySelector('select[name="classes_order"]');
		const classesOrder = select ? String(select.value || '') : 'created';

		try {
			const response = await createRequest(body, {
				action: deleteAction,
				post_id: postId,
				classes_order: classesOrder,
			});
			const nextBody = replaceLibraryHtml(response.html || '');
			const nextNoticeRoot = nextBody ? nextBody.querySelector('#motto-styler-classes-notices') : noticeRoot;
			renderNotice(nextNoticeRoot, 'success', response.message || deleteSuccess);
		} catch (error) {
			renderNotice(noticeRoot, 'error', (error && error.message) || deleteError);
		}
	});
})();
