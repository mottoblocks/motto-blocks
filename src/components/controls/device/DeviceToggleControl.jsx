import clsx from "clsx";
import {
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
	Button,
	Dropdown,
} from "@wordpress/components";
import { useDispatch, useSelect } from "@wordpress/data";
import { useMemo, useRef } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import { getBreakpointOrder, normalizeBreakpointsConfig } from "@config/styler-breakpoints.js";

const BREAKPOINT_META = {
	desktop: { label: __("Desktop", "motto-blocks"), icon: Monitor },
	tablet: { label: __("Tablet", "motto-blocks"), icon: Tablet },
	landscapePhone: {
		label: __("Landscape / Phone", "motto-blocks"),
		icon: Smartphone,
		landscape: true,
	},
	phone: { label: __("Phone", "motto-blocks"), icon: Smartphone },
};

const DEFAULT_STORE_KEY = "motto-styler/preview";
const DEFAULT_STORE_SOURCE = "motto";
const ICON_SIZE = 14;

// Shared device breakpoint toggle with configurable breakpoints/store wiring.
// variant="default"  — icon-only button that opens a Dropdown popover
// variant="extended" — full ToggleGroupControl bar (sticky)
export const DeviceToggleControl = ({
	breakpoints,
	storeKey = DEFAULT_STORE_KEY,
	storeSource = DEFAULT_STORE_SOURCE,
	className = "",
	variant = "default",
}) => {
	const normalizedBreakpoints = useMemo(
		() => normalizeBreakpointsConfig(breakpoints),
		[breakpoints]
	);
	const toggleItems = useMemo(() => {
		const ids = getBreakpointOrder(normalizedBreakpoints);
		return ids.map((id) => {
			const meta = BREAKPOINT_META[id] || {};
			return {
				id,
				label: meta.label || id,
				icon: meta.icon || Smartphone,
				landscape: Boolean(meta.landscape || id === "landscapePhone"),
			};
		});
	}, [normalizedBreakpoints]);

	const mode = useSelect((select) => select(storeKey)?.getMode?.() || "desktop", [storeKey]);
	const storeDispatch = useDispatch(storeKey) || {};
	const setMode = typeof storeDispatch?.setMode === "function" ? storeDispatch.setMode : null;
	const setLandscapeOverride =
		typeof storeDispatch?.setLandscapeOverride === "function"
			? storeDispatch.setLandscapeOverride
			: null;
	const triggerRef = useRef(null);

	const handleSelect = (nextValue) => {
		if (!nextValue) return;
		if (setMode) setMode(nextValue, storeSource);
		if (setLandscapeOverride) {
			setLandscapeOverride(nextValue === "landscapePhone", storeSource);
		}
	};

	if (variant !== "extended") {
		const activeBp = toggleItems.find((bp) => bp.id === mode) || toggleItems[0];
		const ActiveIcon = activeBp?.icon || Monitor;
		const activeLandscape = activeBp?.landscape || false;

		return (
			<div className="motto-device-toggle">
				<Dropdown
					popoverProps={{
						placement: "bottom-start",
						offset: 4,
						shift: true,
						className: "motto-device-toggle-popup",
					}}
					renderToggle={({ isOpen, onToggle }) => (
						<Button
							ref={triggerRef}
							variant={isOpen ? "primary" : "secondary"}
							className="motto-device-toggle__trigger"
							onClick={onToggle}
							aria-expanded={isOpen}
							aria-label={activeBp?.label || __("Device", "motto-blocks")}
							title={activeBp?.label || __("Device", "motto-blocks")}
						>
							<span
								className={`motto-device-toggle__icon${activeLandscape ? " is-landscape" : ""}`}
								aria-hidden="true"
							>
								<ActiveIcon size={ICON_SIZE} />
							</span>
						</Button>
					)}
					renderContent={({ onClose }) => (
						<div className="motto-device-toggle__menu">
							{toggleItems.map((bp) => {
								const Icon = bp.icon;
								return (
									<Button
										key={bp.id}
										className={`motto-device-toggle__option${bp.id === mode ? " motto-is-active" : ""}`}
										onClick={() => {
											handleSelect(bp.id);
											onClose();
											setTimeout(() => triggerRef.current?.blur(), 0);
										}}
										aria-label={bp.label}
										title={bp.label}
										aria-pressed={bp.id === mode}
									>
										<span
											className={`motto-device-toggle__icon${bp.landscape ? " is-landscape" : ""}`}
											aria-hidden="true"
										>
											<Icon size={ICON_SIZE} />
										</span>
									</Button>
								);
							})}
						</div>
					)}
				/>
			</div>
		);
	}

	return (
		<div className="motto-device-toggle motto-device-toggle--extended">
			<ToggleGroupControl
				value={mode}
				onChange={handleSelect}
				className={clsx("motto-breakpoints", className)}
			>
				{toggleItems.map((bp) => {
					const Icon = bp.icon;
					return (
						<ToggleGroupControlOption
							key={bp.id}
							value={bp.id}
							aria-label={bp.label}
							title={bp.label}
							label={
								<span className="motto-device-toggle__label">
									<span
										className={`motto-device-toggle__icon${bp.landscape ? " is-landscape" : ""}`}
										aria-hidden="true"
									>
										<Icon size={ICON_SIZE} />
									</span>
									<span className="motto-device-toggle__text">{bp.label}</span>
								</span>
							}
						/>
					);
				})}
			</ToggleGroupControl>
		</div>
	);
};
