import { memo } from "@wordpress/element";

const DEFAULT_STROKE_WIDTH = 1;

export const LucideProvider = memo(({ children, strokeWidth = DEFAULT_STROKE_WIDTH }) => {
	const numericStroke = Number(strokeWidth);
	const safeStroke =
		Number.isFinite(numericStroke) && numericStroke > 0 ? numericStroke : DEFAULT_STROKE_WIDTH;

	return (
		<div
			className="motto-lucide-provider"
			style={{ "--motto-lucide-stroke-width": String(safeStroke) }}
		>
			{children}
		</div>
	);
});
