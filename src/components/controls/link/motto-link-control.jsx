import { URLInputButton, LinkControl } from "@wordpress/block-editor";
import { FormToggle, ToggleControl } from "@wordpress/components";
import { useEffect, useRef, useState } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { applyFilters } from "@wordpress/hooks";

import { hasDynamicLinkSource } from "./dynamic-link-utils";

const LINK_DYNAMIC_HOOK = "motto.blocks.linkSource.dynamicSection";

function MottoLinkControlNative({
	url,
	onUrlChange,
	opensInNewTab,
	onOpensInNewTabChange,
	noFollow,
	onNoFollowChange,
	autoFocus = false,
	hideUrl = false,
}) {
	const controlRef = useRef(null);
	const [value, setValue] = useState({
		url: url || "",
		opensInNewTab: Boolean(opensInNewTab),
		noFollow: Boolean(noFollow),
	});

	useEffect(() => {
		setValue({
			url: url || "",
			opensInNewTab: Boolean(opensInNewTab),
			noFollow: Boolean(noFollow),
		});
	}, [url, opensInNewTab, noFollow]);

	useEffect(() => {
		if (!autoFocus || hideUrl) return undefined;
		const frame = window.requestAnimationFrame(() => {
			const input =
				controlRef.current?.querySelector?.('input[type="url"]') ||
				controlRef.current?.querySelector?.('input[type="text"]') ||
				controlRef.current?.querySelector?.("input");
			if (input && typeof input.focus === "function") {
				input.focus();
				if (typeof input.select === "function") {
					input.select();
				}
			}
		});
		return () => window.cancelAnimationFrame(frame);
	}, [autoFocus, hideUrl]);

	return (
		<>
			{!hideUrl && (
				<div ref={controlRef}>
					<LinkControl
						value={value}
						onChange={(next) => {
							if (!next) return;
							setValue((previousValue) => ({
								...previousValue,
								...next,
							}));
							if (next.url !== undefined) onUrlChange(next.url);
						}}
						onRemove={() => {
							setValue({ url: "", opensInNewTab: false, noFollow: false });
							onUrlChange("");
							onOpensInNewTabChange(false);
							if (typeof onNoFollowChange === "function") onNoFollowChange(false);
						}}
						settings={[]}
					/>
				</div>
			)}
			<div className="motto-link-control__new-tab">
				<ToggleControl
					className="motto-toggle"
					__nextHasNoMarginBottom
					label={__("Open in new tab", "motto-blocks")}
					checked={Boolean(opensInNewTab)}
					onChange={(nextValue) => onOpensInNewTabChange(Boolean(nextValue))}
				/>
			</div>
			{typeof onNoFollowChange === "function" && (
				<div className="motto-link-control__nofollow">
					<ToggleControl
						className="motto-toggle"
						__nextHasNoMarginBottom
						label={__("No follow (rel)", "motto-blocks")}
						checked={Boolean(noFollow)}
						onChange={(nextValue) => onNoFollowChange(Boolean(nextValue))}
					/>
				</div>
			)}
		</>
	);
}

export function MottoLinkControl({
	url,
	onUrlChange,
	opensInNewTab,
	onOpensInNewTabChange,
	noFollow,
	onNoFollowChange,
	dynamic = {},
	onDynamicChange,
	variant = "button", // 'button' | 'link-control'
	autoFocus = false,
	dynamicOnly = false,
	dynamicLabel = __("Dynamic URL", "motto-blocks"),
}) {
	const hasDynamicSupport = typeof onDynamicChange === "function";
	const isDynamic = hasDynamicLinkSource(dynamic);

	const dynamicSection = hasDynamicSupport
		? applyFilters(LINK_DYNAMIC_HOOK, null, { dynamic, onChange: onDynamicChange })
		: null;

	const dynamicStub =
		hasDynamicSupport && dynamicSection === null ? (
			<div className="motto-panel-section">
				<div className="motto-section-heading">
					<div className="motto-section-title">
						<span className="motto-section-title-text">{dynamicLabel}</span>
					</div>
					<div className="motto-section-actions">
						<FormToggle
							disabled
							checked={false}
							aria-label={`${dynamicLabel} (${__("Pro feature", "motto-blocks")})`}
						/>
					</div>
				</div>
			</div>
		) : null;

	if (dynamicOnly) {
		return (
			<div className={`motto-link-control motto-link-control--${variant}`}>
				{dynamicSection || dynamicStub}
			</div>
		);
	}

	return (
		<div className={`motto-link-control motto-link-control--${variant}`}>
			{variant === "link-control" ? (
				<MottoLinkControlNative
					url={url}
					onUrlChange={onUrlChange}
					opensInNewTab={opensInNewTab}
					onOpensInNewTabChange={onOpensInNewTabChange}
					noFollow={noFollow}
					onNoFollowChange={onNoFollowChange}
					autoFocus={autoFocus}
					hideUrl={isDynamic}
				/>
			) : (
				<>
					{!isDynamic && (
						<div className="motto-link-control__url">
							<URLInputButton
								url={url || ""}
								onChange={(nextUrl = "") => onUrlChange(nextUrl)}
							/>
						</div>
					)}
					<div className="motto-link-control__new-tab">
						<ToggleControl
							className="motto-toggle"
							__nextHasNoMarginBottom
							label={__("Open in new tab", "motto-blocks")}
							checked={Boolean(opensInNewTab)}
							onChange={(nextValue) => onOpensInNewTabChange(Boolean(nextValue))}
						/>
					</div>
					{typeof onNoFollowChange === "function" && (
						<div className="motto-link-control__nofollow">
							<ToggleControl
								className="motto-toggle"
								__nextHasNoMarginBottom
								label={__("No follow (rel)", "motto-blocks")}
								checked={Boolean(noFollow)}
								onChange={(nextValue) => onNoFollowChange(Boolean(nextValue))}
							/>
						</div>
					)}
				</>
			)}
			{dynamicSection || dynamicStub}
		</div>
	);
}
