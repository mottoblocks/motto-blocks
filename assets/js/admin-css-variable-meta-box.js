(function () {
	const nameInput = document.getElementById("motto-variable-name");
	const feedback = document.getElementById("motto-variable-name-feedback");

	if (!nameInput || !feedback) return;

	let existingNames = new Set();
	try {
		existingNames = new Set(JSON.parse(feedback.getAttribute("data-existing-names") || "[]"));
	} catch (error) {}
	const duplicateMessage = feedback.getAttribute("data-duplicate-message") || "";

	const normalize = (value) => {
		const base = String(value || "").trim();
		if (!base) return "";
		const normalized = base
			.replace(/\s+/g, "-")
			.replace(/[^a-zA-Z0-9_-]/g, "")
			.toLowerCase();
		if (!normalized) return "";
		return normalized.startsWith("--") ? normalized : `--${normalized}`;
	};

	const update = () => {
		const normalizedName = normalize(nameInput.value);
		if (!normalizedName) {
			feedback.textContent = "";
			feedback.style.color = "";
			return;
		}
		if (existingNames.has(normalizedName)) {
			feedback.style.color = "#b32d2e";
			feedback.textContent = duplicateMessage;
			return;
		}
		feedback.textContent = "";
		feedback.style.color = "";
	};

	nameInput.addEventListener("input", update);
	update();
})();
