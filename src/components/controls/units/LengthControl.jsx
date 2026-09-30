import { MottoNumberControl } from "./NumericControl.jsx";

const DEFAULT_LENGTH_UNITS = [
	{ value: "px", label: "px" },
	{ value: "em", label: "em" },
	{ value: "rem", label: "rem" },
	{ value: "%", label: "%" },
	{ value: "vw", label: "vw" },
	{ value: "vh", label: "vh" },
	{ value: "dvw", label: "dvw" },
	{ value: "dvh", label: "dvh" },
];

export const LengthControl = ({ unit = "", units, ...props }) => (
	<div className="motto-length-control">
		<MottoNumberControl
			{...props}
			unit={unit}
			units={
				Array.isArray(units)
					? units
					: !String(unit || "").trim()
						? DEFAULT_LENGTH_UNITS
						: undefined
			}
		/>
	</div>
);
