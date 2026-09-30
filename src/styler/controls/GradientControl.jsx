import { GradientControl as SharedGradientControl } from "@components";

export const GradientControl = ({ value, onChange, kind = "gradient", placeholder = "" }) => {
	return (
		<div className="motto-gradient-control">
			<SharedGradientControl
				label=""
				value={value}
				onChange={(nextValue) => onChange(String(nextValue || ""))}
				kind={kind}
				placeholder={placeholder}
			/>
		</div>
	);
};
