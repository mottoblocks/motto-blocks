/**
 * Motto Tabs — Frontend
 *
 * Wires existing tab buttons to panels by shared data-tab-id.
 * Runs after DOMContentLoaded; safe to call multiple times (idempotent).
 */
( function () {
	function initTabs( tabsEl ) {
		if ( tabsEl.dataset.mottoTabsInit ) return;
		tabsEl.dataset.mottoTabsInit = '1';

		const buttons = Array.from( tabsEl.querySelectorAll( ':scope > .motto-tabs__nav > .motto-tab-button' ) );
		const panels = Array.from( tabsEl.querySelectorAll( ':scope > .motto-tabs__panels > .motto-tab' ) );
		if ( ! buttons.length || ! panels.length ) return;

		const syncUrlHash = tabsEl.dataset.syncUrlHash === 'true';
		const firstTabId = buttons[ 0 ]?.dataset?.tabId || panels[ 0 ]?.dataset?.tabId || '';

		function tabIdForSlug( slug ) {
			const match = buttons.find( ( btn ) => btn.dataset.tabSlug === slug );
			return match ? match.dataset.tabId || '' : '';
		}

		function activate( tabId ) {
			panels.forEach( ( panel ) => {
				const isActive = panel.dataset.tabId === tabId;
				panel.classList.toggle( 'is-active', isActive );
				panel.hidden = ! isActive;
			} );
			buttons.forEach( ( btn ) => {
				const isActive = btn.dataset.tabId === tabId;
				btn.classList.toggle( 'is-active', isActive );
				btn.setAttribute( 'aria-selected', isActive ? 'true' : 'false' );
			} );
		}

		buttons.forEach( ( btn ) => {
			btn.addEventListener( 'click', () => {
				const tabId = btn.dataset.tabId || '';
				activate( tabId );
				if ( syncUrlHash && btn.dataset.tabSlug ) {
					history.replaceState( null, '', '#' + btn.dataset.tabSlug );
				}
			} );
		} );

		const hashSlug = syncUrlHash ? decodeURIComponent( location.hash.slice( 1 ) ) : '';
		const hashTabId = hashSlug ? tabIdForSlug( hashSlug ) : '';

		activate( hashTabId || firstTabId );
	}

	function initAll() {
		document.querySelectorAll( '.motto-tabs' ).forEach( initTabs );
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', initAll );
	} else {
		initAll();
	}
} )();
