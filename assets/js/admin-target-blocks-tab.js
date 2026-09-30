(function () {
	const allToggle = document.getElementById('motto-styler-apply-all');
	const groupsWrap = document.getElementById('motto-styler-target-groups');
	if (!allToggle || !groupsWrap) return;

	const namespaceToggles = Array.from(document.querySelectorAll('.motto-styler-namespace-toggle'));
	const blockToggles = Array.from(document.querySelectorAll('.motto-styler-block-toggle'));

	const syncNamespaceFromChildren = (namespace) => {
		const nsToggle = namespaceToggles.find((el) => el.dataset.namespace === namespace);
		if (!nsToggle) return;
		const children = blockToggles.filter((el) => el.dataset.namespace === namespace);
		if (children.length === 0) return;
		nsToggle.checked = children.every((el) => el.checked);
	};

	const toggleGroupState = () => {
		if (allToggle.checked) {
			groupsWrap.classList.add('is-disabled');
		} else {
			groupsWrap.classList.remove('is-disabled');
		}
	};

	namespaceToggles.forEach((toggle) => {
		toggle.addEventListener('change', () => {
			const namespace = toggle.dataset.namespace;
			blockToggles
				.filter((el) => el.dataset.namespace === namespace)
				.forEach((el) => {
					el.checked = toggle.checked;
				});
		});
	});

	blockToggles.forEach((toggle) => {
		toggle.addEventListener('change', () => {
			syncNamespaceFromChildren(toggle.dataset.namespace || '');
		});
	});

	allToggle.addEventListener('change', toggleGroupState);
	toggleGroupState();
})();
