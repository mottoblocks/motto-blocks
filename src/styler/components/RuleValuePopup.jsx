import { Button, Popover } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { useCallback, useEffect, useMemo, useRef, useState } from "@wordpress/element";
import { CodeXml, Eye, X } from "lucide-react";
import { withMottoPopupClass } from "@components/ui/popup-class-name";
import { RuleValueToggleButton } from "./RuleValueToggleButton";
import { popupManager } from "../utils/popup-manager";

const DEFAULT_GROUP_ID = "css-rule-row";
const DEFAULT_CLOSE_LOCK_MS = 1500;
const MEDIA_MODAL_SELECTOR = ".media-modal, .media-modal-backdrop, .media-frame";

const hasActiveMediaModal = () => {
	if (typeof document === "undefined") return false;
	return Boolean(document.querySelector(MEDIA_MODAL_SELECTOR));
};

export const RuleValuePopup = ({
	ownerId,
	groupId = DEFAULT_GROUP_ID,
	anchorRef,
	title,
	canOpenValuePopup = false,
	hasVisualValueEditor = false,
	shouldForceCodeView = false,
	renderContent,
	onOpenChange,
	onValueViewChange,
	toggleButtonProps = {},
}) => {
	const safeOwnerId = String(ownerId || "").trim();
	const safeGroupId = String(groupId || "").trim() || DEFAULT_GROUP_ID;
	const [isOpen, setIsOpen] = useState(false);
	const [isCodeView, setIsCodeView] = useState(false);
	const toggleButtonRef = useRef(null);
	const initializedOpenRef = useRef(false);
	const wasOpenRef = useRef(false);
	const closeLockUntilRef = useRef(0);
	const popupContentRef = useRef(null);
	const normalizeIncomingValueView = (raw) => {
		const next = String(raw || "")
			.trim()
			.toLowerCase();
		if (next === "code") return "code";
		if (next === "visual") return "visual";
		return "visual";
	};
	const propagateValueView = useCallback(
		(next) => {
			if (typeof onValueViewChange !== "function") return;
			onValueViewChange(normalizeIncomingValueView(next));
		},
		[onValueViewChange]
	);

	const close = useCallback(() => {
		if (!safeOwnerId) return;
		popupManager.close({ ownerId: safeOwnerId, groupId: safeGroupId });
	}, [safeGroupId, safeOwnerId]);

	const open = useCallback(() => {
		if (!safeOwnerId) return;
		popupManager.open({ ownerId: safeOwnerId, groupId: safeGroupId });
	}, [safeGroupId, safeOwnerId]);

	const toggle = useCallback(() => {
		if (isOpen) {
			close();
			return;
		}
		open();
	}, [close, isOpen, open]);

	useEffect(() => {
		if (!safeOwnerId) return undefined;
		const unsubscribe = popupManager.subscribe((event) => {
			if (!event || event.groupId !== safeGroupId) return;
			if (event.ownerId !== safeOwnerId) {
				if (event.type === "open" || event.type === "close") {
					setIsOpen(false);
					setIsCodeView(false);
				}
				return;
			}
			if (event.type === "open") {
				setIsOpen(true);
				initializedOpenRef.current = false;
				return;
			}
			if (event.type === "close") {
				setIsOpen(false);
				setIsCodeView(false);
			}
		});
		setIsOpen(popupManager.isOpen({ ownerId: safeOwnerId, groupId: safeGroupId }));
		return unsubscribe;
	}, [safeGroupId, safeOwnerId]);

	useEffect(() => {
		if (canOpenValuePopup) return;
		close();
	}, [close, canOpenValuePopup]);

	useEffect(
		() => () => {
			popupManager.close({ ownerId: safeOwnerId, groupId: safeGroupId });
		},
		[safeGroupId, safeOwnerId]
	);

	useEffect(() => {
		if (typeof onOpenChange === "function") onOpenChange(isOpen);
	}, [isOpen, onOpenChange]);

	useEffect(() => {
		if (!isOpen) {
			initializedOpenRef.current = false;
			closeLockUntilRef.current = 0;
			setIsCodeView(false);
			return;
		}
		if (initializedOpenRef.current) return;
		setIsCodeView(Boolean(shouldForceCodeView));
		initializedOpenRef.current = true;
	}, [isOpen, shouldForceCodeView]);

	useEffect(() => {
		if (wasOpenRef.current && !isOpen) {
			const toggleEl = toggleButtonRef.current;
			if (toggleEl && typeof toggleEl.blur === "function") {
				toggleEl.blur();
			}
		}
		wasOpenRef.current = isOpen;
	}, [isOpen]);

	const showCodeView = isOpen && isCodeView;

	useEffect(() => {
		if (!isOpen || !showCodeView) return undefined;
		const frame = window.requestAnimationFrame(() => {
			const popupNode = popupContentRef.current;
			const focusTarget =
				popupNode?.querySelector?.("textarea") ||
				popupNode?.querySelector?.('input[type="text"], input:not([type])');
			if (focusTarget && typeof focusTarget.focus === "function") {
				focusTarget.focus();
				if (typeof focusTarget.select === "function") {
					focusTarget.select();
				}
			}
		});
		return () => window.cancelAnimationFrame(frame);
	}, [isOpen, showCodeView]);

	useEffect(() => {
		if (!isOpen) return undefined;
		const anchor = anchorRef?.current;
		if (!anchor) return undefined;
		const handleKeyDown = (e) => {
			if (e.key !== "Escape") return;
			e.preventDefault();
			e.stopPropagation();
			close();
		};
		anchor.addEventListener("keydown", handleKeyDown);
		return () => anchor.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, anchorRef, close]);

	const suspendAutoClose = useCallback((duration = DEFAULT_CLOSE_LOCK_MS) => {
		const parsedDuration = Number(duration);
		const nextDuration =
			Number.isFinite(parsedDuration) && parsedDuration > 0
				? parsedDuration
				: DEFAULT_CLOSE_LOCK_MS;
		closeLockUntilRef.current = Date.now() + nextDuration;
	}, []);

	const shouldIgnoreDismiss = useCallback((event) => {
		if (Date.now() < closeLockUntilRef.current) {
			return true;
		}
		if (hasActiveMediaModal()) {
			return true;
		}
		const dismissTarget = event?.target || event?.relatedTarget;
		return Boolean(dismissTarget?.closest?.(MEDIA_MODAL_SELECTOR));
	}, []);

	const handlePopoverClose = useCallback(
		(event) => {
			if (shouldIgnoreDismiss(event)) {
				return;
			}
			close();
		},
		[close, shouldIgnoreDismiss]
	);
	const hasRenderContent = typeof renderContent === "function";
	const panelLabel = title || __("Value controls", "motto-blocks");
	const toggleButtonTitle =
		toggleButtonProps.title || __("Toggle value controls", "motto-blocks");
	const content = useMemo(() => {
		if (!hasRenderContent) return null;
		return renderContent({
			isCodeView: showCodeView,
			closePopup: close,
			suspendAutoClose,
		});
	}, [close, hasRenderContent, renderContent, showCodeView, suspendAutoClose]);

	if (!canOpenValuePopup) {
		return null;
	}

	return (
		<>
			<RuleValueToggleButton
				{...toggleButtonProps}
				ref={toggleButtonRef}
				isOpen={isOpen}
				onClick={toggle}
				title={toggleButtonTitle}
			/>
			{isOpen ? (
				<Popover
					anchor={anchorRef?.current ?? undefined}
					placement="bottom-end"
					flip={true}
					shift={true}
					resize={false}
					offset={2}
					focusOnMount={false}
					className={withMottoPopupClass("motto-rule-popup")}
					onFocusOutside={handlePopoverClose}
					onClose={handlePopoverClose}
				>
					<div
						role="dialog"
						aria-label={panelLabel}
						onMouseDown={() => suspendAutoClose(300)}
					>
						<div className="motto-rule-popup-actions">
							{hasVisualValueEditor ? (
								<Button
									variant="tertiary"
									onClick={() => {
										setIsCodeView((prev) => {
											const next = !prev;
											propagateValueView(next ? "code" : "visual");
											return next;
										});
									}}
									className="motto-ui-button is-icon-only motto-no-focus-ring"
									aria-label={__("Toggle code view", "motto-blocks")}
									title={__("Toggle code view", "motto-blocks")}
								>
									{showCodeView ? <Eye size={14} /> : <CodeXml size={14} />}
								</Button>
							) : null}
							<Button
								variant="tertiary"
								onClick={close}
								isDestructive={true}
								className="motto-ui-button is-icon-only"
								aria-label={__("Close options", "motto-blocks")}
								title={__("Close options", "motto-blocks")}
							>
								<X size={14} />
							</Button>
						</div>
						<div ref={popupContentRef}>{content}</div>
					</div>
				</Popover>
			) : null}
		</>
	);
};
