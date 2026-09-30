import { setEditorBlockStyles } from "./editor-style-registry";
import {
	CSS_VARIABLE_PUBLISHED_QUERY_BASE,
	selectAllCssVariableRecords,
} from "@lib/css-variable-records.js";
import {
	buildRootCss,
	getVariableNameFromRecord,
	getVariableValueFromRecord,
	normalizeVariableName,
	sanitizeCssVariableValue,
} from "../variables/css-variable-runtime-utils";
import { scheduleEditorFrameTask } from "./editor-frame-scheduler";

export const initCssVariableStyleCollector = () => {
	if (!window.wp?.data) return;

	const { select, subscribe } = window.wp.data;
	let lastSignature = "";

	const run = () => {
		const records = selectAllCssVariableRecords(
			select("core"),
			CSS_VARIABLE_PUBLISHED_QUERY_BASE
		);
		const variableDefinitions = Array.isArray(records)
			? records
					.filter(Boolean)
					.map((record) => ({
						id: Number(record?.id || 0),
						name: normalizeVariableName(getVariableNameFromRecord(record)),
						value: sanitizeCssVariableValue(getVariableValueFromRecord(record)),
					}))
					.filter((entry) => entry.id > 0 && entry.name !== "" && entry.value !== "")
			: [];

		const css = buildRootCss(variableDefinitions);
		const signature = variableDefinitions
			.map((entry) => `${entry.id}:${entry.name}:${entry.value}`)
			.join("|");

		if (signature !== lastSignature) {
			setEditorBlockStyles("global:css-variables", css);
			lastSignature = signature;
		}
	};

	const schedule = () => {
		scheduleEditorFrameTask("css-variable-style-runtime", run);
	};

	subscribe(schedule);
	run();
};
