const normalize = (value) =>
	String(value || "")
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "");

const isSubsequence = (needle, haystack) => {
	if (!needle) return true;
	let i = 0;
	for (let j = 0; j < haystack.length && i < needle.length; j += 1) {
		if (needle[i] === haystack[j]) i += 1;
	}
	return i === needle.length;
};

const getScore = (query, candidate) => {
	if (!query) return 1000 + candidate.length;
	const q = normalize(query);
	const c = normalize(candidate);
	if (!q || !c) return Number.POSITIVE_INFINITY;
	if (c === q) return 0;
	if (c.startsWith(q)) return 10 + (c.length - q.length);
	if (candidate.toLowerCase().startsWith(query.toLowerCase())) return 20 + (c.length - q.length);
	if (c.includes(q)) return 40 + c.indexOf(q);
	if (isSubsequence(q, c)) return 80 + (c.length - q.length);
	return Number.POSITIVE_INFINITY;
};

export const getRuleNameSuggestions = (query, ruleNames, limit = 8) => {
	const list = Array.isArray(ruleNames) ? ruleNames : [];
	const seen = new Set();
	return list
		.map((rule) => String(rule || "").trim())
		.filter((rule) => {
			if (!rule) return false;
			const key = rule.toLowerCase();
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		})
		.map((rule) => ({ rule, score: getScore(query, rule) }))
		.filter((item) => Number.isFinite(item.score))
		.sort(
			(a, b) =>
				a.score - b.score || a.rule.length - b.rule.length || a.rule.localeCompare(b.rule)
		)
		.slice(0, limit)
		.map((item) => ({ label: item.rule, value: item.rule }));
};
