/**
 * Motto Accordion — Frontend
 *
 * Measures each panel height and keeps runtime idempotent.
 */
( function () {
	function getItems( accordionEl ) {
		return Array.from( accordionEl.querySelectorAll( ':scope > .motto-accordion-item' ) );
	}

	function getItemParts( itemEl ) {
		return {
			trigger: itemEl.querySelector( ':scope > .motto-accordion-item__trigger' ),
			panel: itemEl.querySelector( ':scope > .motto-accordion-item__panel' ),
			panelInner: itemEl.querySelector( ':scope > .motto-accordion-item__panel > .motto-accordion-item__panel-inner' ),
		};
	}

	function measureItem( itemEl ) {
		const { panel, panelInner } = getItemParts( itemEl );
		if ( ! panel || ! panelInner ) {
			return;
		}

		panel.style.setProperty( '--motto-accordion-panel-height', `${ panelInner.scrollHeight }px` );
	}

	function setItemState( itemEl, isOpen ) {
		const { trigger, panel } = getItemParts( itemEl );
		itemEl.classList.toggle( 'is-open', isOpen );
		itemEl.dataset.open = isOpen ? 'true' : 'false';
		if ( trigger ) {
			trigger.setAttribute( 'aria-expanded', isOpen ? 'true' : 'false' );
		}
		if ( panel ) {
			panel.setAttribute( 'aria-hidden', isOpen ? 'false' : 'true' );
		}
	}

	function closeSiblings( accordionEl, currentItem ) {
		getItems( accordionEl ).forEach( ( itemEl ) => {
			if ( itemEl !== currentItem ) {
				setItemState( itemEl, false );
			}
		} );
	}

	function initAccordion( accordionEl ) {
		if ( accordionEl.dataset.mottoAccordionInit ) {
			return;
		}
		accordionEl.dataset.mottoAccordionInit = '1';

		const closeOtherItems = accordionEl.dataset.closeOtherItems === 'true';
		const items = getItems( accordionEl );
		if ( ! items.length ) {
			return;
		}

		let firstOpenFound = false;

		items.forEach( ( itemEl ) => {
			const { trigger } = getItemParts( itemEl );
			const isOpen = itemEl.dataset.open === 'true' || itemEl.classList.contains( 'is-open' );

			measureItem( itemEl );

			if ( closeOtherItems && isOpen ) {
				if ( firstOpenFound ) {
					setItemState( itemEl, false );
				} else {
					firstOpenFound = true;
					setItemState( itemEl, true );
				}
			} else {
				setItemState( itemEl, isOpen );
			}

			if ( ! trigger ) {
				return;
			}

			trigger.addEventListener( 'click', () => {
				const nextIsOpen = itemEl.dataset.open !== 'true';

				measureItem( itemEl );
				if ( closeOtherItems && nextIsOpen ) {
					closeSiblings( accordionEl, itemEl );
				}
				setItemState( itemEl, nextIsOpen );
			} );

			if ( typeof ResizeObserver === 'function' ) {
				const { panelInner } = getItemParts( itemEl );
				if ( panelInner ) {
					const resizeObserver = new ResizeObserver( () => measureItem( itemEl ) );
					resizeObserver.observe( panelInner );
				}
			}
		} );

		window.addEventListener( 'resize', () => {
			getItems( accordionEl ).forEach( measureItem );
		} );
	}

	function initAll() {
		document.querySelectorAll( '.motto-accordion' ).forEach( initAccordion );
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', initAll );
	} else {
		initAll();
	}
} )();
