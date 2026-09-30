(function () {
	const allToggle = document.getElementById('motto-blocks-enable-all');
	if (!allToggle) return;

	const blockToggles = Array.from(document.querySelectorAll('.motto-blocks-toggle'));

	const syncAllToggle = () => {
		allToggle.checked = blockToggles.length > 0 && blockToggles.every((toggle) => toggle.checked);
	};

	blockToggles.forEach((toggle) => {
		toggle.addEventListener('change', syncAllToggle);
	});

	allToggle.addEventListener('change', () => {
		blockToggles.forEach((toggle) => {
			toggle.checked = allToggle.checked;
		});
		syncAllToggle();
	});

	syncAllToggle();
})();
