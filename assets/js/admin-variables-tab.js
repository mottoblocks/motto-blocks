(function () {
	const form = document.getElementById('motto-styler-variables-form');
	if (!form) return;

	const targetField = document.getElementById('motto-variable-row-target');
	if (!targetField) return;

	const addButton = document.getElementById('motto-styler-add-variable-row');
	const noticesRoot = document.getElementById('motto-styler-variable-notices');
	const tbody = form.querySelector('.motto-styler-variables-table tbody');
	if (!tbody) return;
	const ajaxUrl = form.getAttribute('data-ajax-url') || '';
	const rowSaveAction = form.getAttribute('data-row-save-action') || '';
	const deleteConfirmMessage = form.getAttribute('data-delete-confirm') || '';
	const deleteLabel = form.getAttribute('data-delete-label') || 'Delete variable';
	const defaultSaveSuccessMessage = form.getAttribute('data-save-success-message') || '';
	const defaultSaveErrorMessage = form.getAttribute('data-save-error-message') || '';
	const nonceField = form.querySelector('input[name="_wpnonce"]');
	const ajaxNonce = nonceField ? String(nonceField.value || '') : '';

	let newRowCounter = 0;
	let draggingRow = null;

	const updateRowOrderInputs = () => {
		const rows = Array.from(form.querySelectorAll('.motto-styler-variable-row'));
		rows.forEach((row, index) => {
			const input = row.querySelector('.motto-styler-variable-order-input');
			if (input) input.value = String(index);
		});
	};

	const submitRowFallback = (rowKey) => {
		targetField.value = String(rowKey || '');
		if (typeof form.requestSubmit === 'function') {
			form.requestSubmit();
			return;
		}
		HTMLFormElement.prototype.submit.call(form);
	};

	const escapeHtml = (value) => String(value || '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');

	const renderNotice = (type, message) => {
		if (!noticesRoot) return;
		const noticeMessage = String(message || '').trim();
		if (!noticeMessage) {
			noticesRoot.innerHTML = '';
			return;
		}
		noticesRoot.innerHTML = `
			<div class="motto-admin-notice notice notice-${type} is-dismissible">
				<p>${escapeHtml(noticeMessage)}</p>
				<button type="button" class="notice-dismiss">
					<span class="screen-reader-text">Dismiss this notice.</span>
				</button>
			</div>
		`;
		const dismissButton = noticesRoot.querySelector('.notice-dismiss');
		if (dismissButton) {
			dismissButton.addEventListener('click', () => {
				noticesRoot.innerHTML = '';
			});
		}
	};

	const appendAjaxPayloadEntries = (params, payload, prefix = '') => {
		if (!prefix) return;
		if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
			Object.entries(payload).forEach(([key, value]) => {
				appendAjaxPayloadEntries(params, value, `${prefix}[${key}]`);
			});
			return;
		}
		params.append(prefix, payload == null ? '' : String(payload));
	};

	const createAdminAjaxRequest = async ({
		action,
		nonce,
		payload
	}) => {
		const params = new URLSearchParams();
		params.set('action', action);
		params.set('_ajax_nonce', nonce);

		Object.entries(payload || {}).forEach(([key, value]) => {
			if (value && typeof value === 'object' && !Array.isArray(value)) {
				appendAjaxPayloadEntries(params, value, key);
				return;
			}
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
			const message = result && result.data && result.data.message ?
				result.data.message :
				defaultSaveErrorMessage;
			throw new Error(message || defaultSaveErrorMessage);
		}

		return result.data || {};
	};

	const syncReorderState = () => {
		targetField.value = '';
	};

	const getRowInput = (row, fieldName) => row.querySelector(`input[name$="[${fieldName}]"]`);

	const snapshotRowValues = (row) => {
		const current = {};
		row.querySelectorAll('.motto-styler-variable-input').forEach((input) => {
			current[input.name] = input.value;
		});
		return current;
	};

	const collectOrderRows = () => {
		const entries = {};
		form.querySelectorAll('.motto-styler-variable-order-input').forEach((input) => {
			const name = input.getAttribute('name') || '';
			const match = name.match(/^motto_variable_order\[(.+)\]$/);
			if (!match) return;
			entries[match[1]] = input.value;
		});
		return entries;
	};

	const setRowSavingState = (row, isSaving) => {
		row.dataset.isSaving = isSaving ? '1' : '0';
		row.querySelectorAll('button, input').forEach((element) => {
			if (element.classList.contains('motto-styler-variable-order-input')) return;
			element.disabled = isSaving;
		});
		row.draggable = !isSaving;
	};

	const enableRowEditing = (row) => {
		row.querySelectorAll('.motto-styler-variable-input').forEach((input) => {
			input.disabled = false;
		});
		row.dataset.initialValues = JSON.stringify(snapshotRowValues(row));
		row.classList.add('is-editing');
		const editButton = row.querySelector('.motto-styler-variable-edit-toggle');
		const editActions = row.querySelector('.motto-styler-variable-edit-actions');
		if (editButton) editButton.hidden = true;
		if (editActions) editActions.hidden = false;
	};

	const disableRowEditing = (row, restoreValues = false) => {
		if (restoreValues) {
			try {
				const snapshot = JSON.parse(row.dataset.initialValues || '{}');
				row.querySelectorAll('.motto-styler-variable-input').forEach((input) => {
					if (Object.prototype.hasOwnProperty.call(snapshot, input.name)) {
						input.value = snapshot[input.name];
					}
				});
			} catch (e) {}
		}
		row.classList.remove('is-editing');
		row.querySelectorAll('.motto-styler-variable-input').forEach((input) => {
			input.disabled = true;
		});
		const editButton = row.querySelector('.motto-styler-variable-edit-toggle');
		const editActions = row.querySelector('.motto-styler-variable-edit-actions');
		if (editButton) editButton.hidden = false;
		if (editActions) editActions.hidden = true;
	};

	const syncRowKey = (row, nextRowKey) => {
		const previousKey = row.getAttribute('data-post-id') || '';
		const normalizedNextRowKey = String(nextRowKey || '');
		if (!previousKey || !normalizedNextRowKey || previousKey === normalizedNextRowKey) return;

		row.setAttribute('data-post-id', normalizedNextRowKey);
		row.querySelectorAll('[data-post-id]').forEach((element) => {
			element.setAttribute('data-post-id', normalizedNextRowKey);
		});
		row.querySelectorAll('[name]').forEach((element) => {
			const currentName = element.getAttribute('name') || '';
			if (!currentName.includes(`[${previousKey}]`)) return;
			element.setAttribute('name', currentName.replace(`[${previousKey}]`, `[${normalizedNextRowKey}]`));
		});
	};

	const ensureDeleteLink = (row, deleteUrl) => {
		const actions = row.querySelector('.motto-styler-variable-actions');
		if (!actions) return;

		let deleteLink = actions.querySelector('.motto-styler-delete-variable-link');
		const normalizedDeleteUrl = String(deleteUrl || '').trim();

		if (normalizedDeleteUrl === '') {
			if (deleteLink) deleteLink.remove();
			return;
		}

		if (!deleteLink) {
			deleteLink = document.createElement('a');
			deleteLink.className = 'button motto-styler-icon-action is-destructive motto-styler-delete-variable-link';
			deleteLink.setAttribute('aria-label', deleteLabel);
			deleteLink.setAttribute('title', deleteLabel);

			const icon = document.createElement('span');
			icon.className = 'dashicons dashicons-trash';
			icon.setAttribute('aria-hidden', 'true');
			deleteLink.appendChild(icon);

			const srText = document.createElement('span');
			srText.className = 'screen-reader-text';
			srText.textContent = deleteLabel;
			deleteLink.appendChild(srText);

			actions.appendChild(deleteLink);
		}

		deleteLink.href = normalizedDeleteUrl;
		deleteLink.setAttribute('data-confirm', deleteConfirmMessage);
	};

	const applySavedRowPayload = (row, payload) => {
		if (!payload || typeof payload !== 'object') return;
		if (payload.postId) syncRowKey(row, String(payload.postId));

		const labelInput = getRowInput(row, 'label');
		const slugInput = getRowInput(row, 'slug');
		const valueInput = getRowInput(row, 'value');
		const orderInput = row.querySelector('.motto-styler-variable-order-input');

		if (labelInput) labelInput.value = String(payload.label || '');
		if (slugInput) slugInput.value = String(payload.slug || '');
		if (valueInput) valueInput.value = String(payload.value || '');
		if (orderInput && typeof payload.menuOrder !== 'undefined') {
			orderInput.value = String(payload.menuOrder);
		}

		ensureDeleteLink(row, payload.deleteUrl || '');
		row.dataset.initialValues = JSON.stringify(snapshotRowValues(row));
		disableRowEditing(row, false);
	};

	const normalizeSlugFromLabel = (labelValue) => {
		let value = String(labelValue || '').trim();
		if (!value) return '';
		value = value.replace(/\s+/g, '-');
		value = value.replace(/[^a-zA-Z0-9_-]/g, '');
		value = value.toLowerCase();
		if (!value) return '';
		return value.startsWith('--') ? value : `--${value}`;
	};

	const attachAutoSlugForNewRow = (row) => {
		const labelInput = row.querySelector('input[name^="motto_variable_rows"][name$="[label]"]');
		const slugInput = row.querySelector('input[name^="motto_variable_rows"][name$="[slug]"]');
		if (!labelInput || !slugInput) return;

		let slugWasEditedManually = false;
		let lastAutoSlug = '';
		const maybeFillSlug = () => {
			const currentSlug = String(slugInput.value || '').trim();
			if (slugWasEditedManually) return;
			const generated = normalizeSlugFromLabel(labelInput.value);
			if (currentSlug === '' || currentSlug === lastAutoSlug) {
				slugInput.value = generated;
				lastAutoSlug = generated;
			}
		};

		labelInput.addEventListener('input', maybeFillSlug);
		labelInput.addEventListener('blur', maybeFillSlug);
		slugInput.addEventListener('focus', maybeFillSlug);
		slugInput.addEventListener('input', () => {
			const nextSlug = String(slugInput.value || '').trim();
			if (nextSlug !== '' && nextSlug !== lastAutoSlug) {
				slugWasEditedManually = true;
			}
		});
	};

	const attachRowDragHandlers = (row) => {
		row.addEventListener('dragstart', (event) => {
			const handle = document.activeElement;
			if (!handle || !handle.classList.contains('motto-styler-variable-drag-handle')) {
				event.preventDefault();
				return;
			}
			draggingRow = row;
			row.classList.add('is-dragging');
			if (event.dataTransfer) {
				event.dataTransfer.effectAllowed = 'move';
			}
		});
		row.addEventListener('dragend', () => {
			row.classList.remove('is-dragging');
			draggingRow = null;
		});
	};

	const saveRow = async (row) => {
		const rowKey = row.getAttribute('data-post-id') || '';
		if (!rowKey) return;

		if (!window.fetch || !ajaxUrl || !rowSaveAction || !ajaxNonce) {
			submitRowFallback(rowKey);
			return;
		}

		const labelInput = getRowInput(row, 'label');
		const slugInput = getRowInput(row, 'slug');
		const valueInput = getRowInput(row, 'value');

		setRowSavingState(row, true);
		targetField.value = '';

		try {
			const response = await createAdminAjaxRequest({
				action: rowSaveAction,
				nonce: ajaxNonce,
				payload: {
					row_key: rowKey,
					order_rows: collectOrderRows(),
					row: {
						label: labelInput ? labelInput.value : '',
						slug: slugInput ? slugInput.value : '',
						value: valueInput ? valueInput.value : '',
					},
				},
			});

			setRowSavingState(row, false);
			applySavedRowPayload(row, response.row || {});
			renderNotice('success', response.message || defaultSaveSuccessMessage);
		} catch (error) {
			setRowSavingState(row, false);
			renderNotice('error', error && error.message ? error.message : defaultSaveErrorMessage);
		}
	};

	const createNewRow = () => {
		const key = `new-${Date.now()}-${newRowCounter++}`;
		const emptyRow = tbody.querySelector('.motto-styler-variable-empty-row');
		if (emptyRow) emptyRow.remove();
		const row = document.createElement('tr');
		row.className = 'motto-styler-variable-row is-editing';
		row.setAttribute('data-post-id', key);
		row.setAttribute('draggable', 'true');
		row.innerHTML = `
					<td class="motto-styler-variable-drag-cell">
						<button type="button" class="button motto-styler-icon-action motto-styler-variable-drag-handle" aria-label="Reorder variable" title="Reorder variable">
							<span class="dashicons dashicons-move" aria-hidden="true"></span>
							<span class="screen-reader-text">Reorder variable</span>
						</button>
						<input type="hidden" class="motto-styler-variable-order-input" name="motto_variable_order[${key}]" value="" />
					</td>
					<td><input type="text" name="motto_variable_rows[${key}][label]" value="" class="widefat motto-styler-variable-input" /></td>
					<td><input type="text" name="motto_variable_rows[${key}][slug]" value="" class="widefat motto-styler-variable-input" placeholder="--my-variable" /></td>
					<td><input type="text" name="motto_variable_rows[${key}][value]" value="" class="widefat motto-styler-variable-input" /></td>
					<td>
						<div class="motto-styler-variable-actions" role="group" aria-label="Variable actions">
							<button type="button" class="button motto-styler-icon-action motto-styler-variable-edit-toggle" data-post-id="${key}" aria-label="Edit variable" title="Edit variable" hidden>
								<span class="dashicons dashicons-edit" aria-hidden="true"></span>
								<span class="screen-reader-text">Edit variable</span>
							</button>
							<div class="motto-styler-variable-edit-actions">
								<button type="button" class="button motto-styler-icon-action motto-styler-variable-save-toggle" data-post-id="${key}" aria-label="Save variable" title="Save variable">
									<span class="dashicons dashicons-yes" aria-hidden="true"></span>
									<span class="screen-reader-text">Save variable</span>
								</button>
								<button type="button" class="button motto-styler-icon-action motto-styler-variable-cancel-toggle" data-post-id="${key}" aria-label="Cancel edit" title="Cancel edit">
									<span class="dashicons dashicons-no-alt" aria-hidden="true"></span>
									<span class="screen-reader-text">Cancel edit</span>
								</button>
							</div>
						</div>
					</td>
				`;
		tbody.prepend(row);
		row.dataset.initialValues = JSON.stringify({});
		attachRowDragHandlers(row);
		attachAutoSlugForNewRow(row);
		updateRowOrderInputs();
		const firstInput = row.querySelector('.motto-styler-variable-input');
		if (firstInput) firstInput.focus();
	};

	tbody.querySelectorAll('.motto-styler-variable-row').forEach((row) => {
		attachRowDragHandlers(row);
	});

	tbody.addEventListener('dragover', (event) => {
		if (!draggingRow) return;
		event.preventDefault();
		const target = event.target.closest('.motto-styler-variable-row');
		if (!target || target === draggingRow) return;
		const targetRect = target.getBoundingClientRect();
		const shouldInsertAfter = event.clientY > targetRect.top + targetRect.height / 2;
		if (shouldInsertAfter) target.after(draggingRow);
		else target.before(draggingRow);
	});

	tbody.addEventListener('drop', (event) => {
		if (!draggingRow) return;
		event.preventDefault();
		updateRowOrderInputs();
		syncReorderState();
	});

	form.addEventListener('click', (event) => {
		const editButton = event.target.closest('.motto-styler-variable-edit-toggle');
		if (editButton) {
			const rowKey = editButton.getAttribute('data-post-id') || '';
			const row = form.querySelector(`.motto-styler-variable-row[data-post-id="${rowKey}"]`);
			if (row && !row.classList.contains('is-editing')) enableRowEditing(row);
			return;
		}

		const saveButton = event.target.closest('.motto-styler-variable-save-toggle');
		if (saveButton) {
			const rowKey = saveButton.getAttribute('data-post-id') || '';
			const row = form.querySelector(`.motto-styler-variable-row[data-post-id="${rowKey}"]`);
			if (row && row.classList.contains('is-editing')) void saveRow(row);
			return;
		}

		const cancelButton = event.target.closest('.motto-styler-variable-cancel-toggle');
		if (cancelButton) {
			const rowKey = cancelButton.getAttribute('data-post-id') || '';
			const row = form.querySelector(`.motto-styler-variable-row[data-post-id="${rowKey}"]`);
			if (!row || !row.classList.contains('is-editing')) return;
			if (String(rowKey).startsWith('new-')) {
				row.remove();
				updateRowOrderInputs();
				return;
			}
			disableRowEditing(row, true);
			return;
		}

		const deleteLink = event.target.closest('.motto-styler-delete-variable-link');
		if (deleteLink) {
			const message = deleteLink.getAttribute('data-confirm') || '';
			if (message && !window.confirm(message)) {
				event.preventDefault();
			}
		}
	});

	form.addEventListener('keydown', (event) => {
		if (event.key !== 'Enter') return;
		const input = event.target.closest('.motto-styler-variable-input');
		if (!input) return;
		const row = input.closest('.motto-styler-variable-row');
		if (!row || !row.classList.contains('is-editing')) return;
		const rowKey = row.getAttribute('data-post-id') || '';
		if (!rowKey) return;
		event.preventDefault();
		void saveRow(row);
	});

	if (addButton) {
		addButton.addEventListener('click', () => {
			createNewRow();
		});
	}

	updateRowOrderInputs();
})();
