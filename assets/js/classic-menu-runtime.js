(function () {
  const MENU_SELECTOR = '.motto-classic-menu';
  const MENU_LIST_SELECTOR = ':scope > .motto-classic-menu__container';
  const TOGGLE_SELECTOR = '.motto-classic-menu__submenu-toggle';
  const SUBMENU_SELECTOR = ':scope > .motto-classic-menu__submenu-container';
  const ITEM_SELECTOR = '.motto-classic-menu__item';
  const ITEM_LINK_SELECTOR = '.motto-classic-menu__item-content';
  const CLICKED_ITEM_CLASS = 'menu-item-clicked';

  const isElementNode = (value) => Boolean(value && value.nodeType === 1);
  const hasQuerySelectorAll = (value) => Boolean(value && typeof value.querySelectorAll === 'function');

  const collectMenus = (root) => {
    const source = root || document;
    const menus = [];

    if (isElementNode(source) && typeof source.matches === 'function' && source.matches(MENU_SELECTOR)) {
      menus.push(source);
    }

    if (hasQuerySelectorAll(source)) {
      menus.push(...source.querySelectorAll(MENU_SELECTOR));
    }

    return Array.from(new Set(menus));
  };

  const addListener = (target, type, handler, cleanups) => {
    if (!target || typeof target.addEventListener !== 'function') {
      return;
    }

    target.addEventListener(type, handler);
    cleanups.push(() => {
      target.removeEventListener(type, handler);
    });
  };

  const setClickedItem = (menu, clickedItem) => {
    if (!isElementNode(menu) || !isElementNode(clickedItem) || !menu.contains(clickedItem)) {
      return;
    }

    menu.querySelectorAll(`${ITEM_SELECTOR}.${CLICKED_ITEM_CLASS}`).forEach((item) => {
      if (item !== clickedItem) {
        item.classList.remove(CLICKED_ITEM_CLASS);
      }
    });

    clickedItem.classList.add(CLICKED_ITEM_CLASS);
  };

  const applyClickedItemFromHash = (menu, hash) => {
    if (!isElementNode(menu) || typeof hash !== 'string' || hash.length <= 1) {
      return;
    }

    const normalizedHash = hash.toLowerCase();
    const links = menu.querySelectorAll(ITEM_LINK_SELECTOR);

    for (const link of links) {
      if (!isElementNode(link) || typeof link.getAttribute !== 'function') {
        continue;
      }

      const href = link.getAttribute('href') || '';
      if (!href) {
        continue;
      }

      const hashIndex = href.indexOf('#');
      if (hashIndex < 0) {
        continue;
      }

      const hrefHash = href.slice(hashIndex).toLowerCase();
      if (hrefHash !== normalizedHash) {
        continue;
      }

      const item = link.closest(ITEM_SELECTOR);
      if (isElementNode(item)) {
        setClickedItem(menu, item);
      }
      return;
    }
  };

  const initClassicMenu = (menu) => {
    if (!isElementNode(menu)) {
      return () => {};
    }

    if (typeof menu.__mottoClassicMenuCleanup === 'function') {
      menu.__mottoClassicMenuCleanup();
    }

    const cleanups = [];
    const ownerDocument = menu.ownerDocument || document;
    const menuList = menu.querySelector(MENU_LIST_SELECTOR);
    const toggleEvent = menuList?.dataset?.submenuToggleEvent === 'click'
      ? 'click'
      : menu.classList.contains('toggle-event-click')
        ? 'click'
        : 'rollover';

    const closeSubmenuButton = (button) => {
      button.setAttribute('aria-expanded', 'false');
    };

    const closeAllSubmenus = () => {
      menu.querySelectorAll(`${TOGGLE_SELECTOR}[aria-expanded="true"]`).forEach((button) => {
        closeSubmenuButton(button);
      });
    };

    const closeSubmenusInItem = (item) => {
      if (!isElementNode(item)) {
        return;
      }

      item.querySelectorAll(`${TOGGLE_SELECTOR}[aria-expanded="true"]`).forEach((button) => {
        closeSubmenuButton(button);
      });
    };

    const closeSiblingSubmenus = (item) => {
      const parentList = item?.parentElement;

      if (!parentList) {
        return;
      }

      Array.from(parentList.children).forEach((sibling) => {
        if (sibling === item || !isElementNode(sibling)) {
          return;
        }

        closeSubmenusInItem(sibling);
      });
    };

    menu.querySelectorAll(TOGGLE_SELECTOR).forEach((button) => {
      const item = button.closest('li');
      const submenu = item?.querySelector(SUBMENU_SELECTOR);

      if (!isElementNode(item) || !isElementNode(submenu)) {
        return;
      }

      const itemCount = submenu.querySelectorAll(':scope > ul > li').length;
      submenu.style.setProperty('--items-count', String(itemCount || 1));

      const toggleSubmenuByClick = (event) => {
        event.preventDefault();
        event.stopPropagation();

        const nextExpanded = button.getAttribute('aria-expanded') !== 'true';

        if (!nextExpanded) {
          closeSubmenusInItem(item);
          return;
        }

        closeSiblingSubmenus(item);
        button.setAttribute('aria-expanded', 'true');
      };

      if (toggleEvent === 'rollover') {
        addListener(item, 'mouseenter', () => {
          button.setAttribute('aria-expanded', 'true');
        }, cleanups);
        addListener(item, 'mouseleave', () => {
          closeSubmenusInItem(item);
        }, cleanups);
        addListener(item, 'focusin', () => {
          button.setAttribute('aria-expanded', 'true');
        }, cleanups);
        addListener(item, 'focusout', (event) => {
          const nextTarget = event.relatedTarget;

          if (nextTarget && item.contains(nextTarget)) {
            return;
          }

          closeSubmenusInItem(item);
        }, cleanups);
      }

      addListener(button, 'click', toggleSubmenuByClick, cleanups);
    });

    applyClickedItemFromHash(menu, ownerDocument?.defaultView?.location?.hash || '');

    addListener(ownerDocument, 'click', (event) => {
      if (!menu.contains(event.target)) {
        closeAllSubmenus();
      }
    }, cleanups);

    addListener(menu, 'click', (event) => {
      const clickedItem = event.target instanceof Element
        ? event.target.closest(ITEM_SELECTOR)
        : null;

      if (!isElementNode(clickedItem) || !menu.contains(clickedItem)) {
        return;
      }

      setClickedItem(menu, clickedItem);
    }, cleanups);

    const cleanup = () => {
      while (cleanups.length > 0) {
        const release = cleanups.pop();

        if (typeof release === 'function') {
          release();
        }
      }

      delete menu.__mottoClassicMenuCleanup;
    };

    menu.__mottoClassicMenuCleanup = cleanup;

    return cleanup;
  };

  const initClassicMenus = (root) => {
    const cleanups = collectMenus(root).map((menu) => initClassicMenu(menu));

    return () => {
      cleanups.forEach((cleanup) => {
        if (typeof cleanup === 'function') {
          cleanup();
        }
      });
    };
  };

  window.mottoBlocksClassicMenu = {
    ...(window.mottoBlocksClassicMenu || {}),
    initClassicMenu,
    initClassicMenus
  };
})();
