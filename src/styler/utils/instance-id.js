export const generateInstanceId = () =>
	`mp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const sanitizeInstanceId = (instanceId) => {
	if (typeof instanceId !== "string") return "";
	return instanceId.toLowerCase().replace(/[^a-z0-9\-_]/g, "");
};

export const hasValidInstanceId = (styler = {}) => sanitizeInstanceId(styler?.instanceId) !== "";

export const resolveValidInstanceId = (value) => sanitizeInstanceId(value);
