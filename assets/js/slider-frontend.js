(function () {
  function ensureMottoGlobal() {
    var root = window.motto && typeof window.motto === 'object' ? window.motto : {};
    if (!window.motto) {
      window.motto = root;
    }
    if (!root.sliders) {
      // Prefer Map for stable lookups and iteration order independence.
      root.sliders = typeof window.Map === 'function' ? new window.Map() : {};
    }
    return root;
  }

  function hasRegistryMap(registry) {
    return registry && typeof registry.get === 'function' && typeof registry.set === 'function';
  }

  function registrySet(registry, id, entry) {
    if (hasRegistryMap(registry)) {
      registry.set(id, entry);
      return;
    }
    registry[id] = entry;
  }

  function registryDelete(registry, id) {
    if (hasRegistryMap(registry)) {
      registry.delete(id);
      return;
    }
    if (registry && Object.prototype.hasOwnProperty.call(registry, id)) {
      delete registry[id];
    }
  }

  function dispatchMottoEvent(name, detail) {
    if (typeof window.CustomEvent !== 'function') {
      return;
    }
    window.dispatchEvent(new window.CustomEvent(name, { detail: detail }));
  }

  var sliderIdCounter = 0;
  function getOrCreateSliderId(swiperEl) {
    if (!swiperEl) {
      sliderIdCounter += 1;
      return "motto-slider-" + sliderIdCounter;
    }

    var existing = swiperEl.getAttribute('data-motto-slider-id') || '';
    if (existing) {
      return existing;
    }

    sliderIdCounter += 1;
    var nextId = "motto-slider-" + sliderIdCounter;
    swiperEl.setAttribute('data-motto-slider-id', nextId);
    return nextId;
  }

  function getSliderRootElement(swiperEl) {
    if (!swiperEl || typeof swiperEl.closest !== 'function') {
      return swiperEl ? swiperEl.parentElement : null;
    }
    return (
      swiperEl.closest('.wp-block-motto-slider') ||
      swiperEl.closest('.wp-block-motto-query-layout') ||
      swiperEl.parentElement
    );
  }

  function toNumber(value, fallback) {
    var parsed = parseInt(String(value), 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function toDecimalNumber(value, fallback) {
    var parsed = parseFloat(String(value));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function readBooleanData(value) {
    return value === 'true';
  }

  function readBreakpointsData(value) {
    if (!value) {
      return undefined;
    }

    try {
      var parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : undefined;
    } catch (error) {
      return undefined;
    }
  }

  var TRANSITION_EFFECT_VALUES = new Set([
    'translate',
    'fade',
    'cube',
    'coverflow',
    'flip',
    'cards',
    'creative'
  ]);

  function normalizeTransitionEffect(value) {
    return TRANSITION_EFFECT_VALUES.has(value) ? value : 'translate';
  }

  function getSwiperEffectConfig(transitionEffect) {
    var normalizedEffect = normalizeTransitionEffect(transitionEffect);

    if (normalizedEffect === 'fade') {
      return {
        effect: 'fade',
        fadeEffect: {
          crossFade: true
        }
      };
    }

    if (normalizedEffect === 'cube') {
      return {
        effect: 'cube',
        cubeEffect: {
          shadow: true,
          slideShadows: true,
          shadowOffset: 20,
          shadowScale: 0.94
        }
      };
    }

    if (normalizedEffect === 'coverflow') {
      return {
        effect: 'coverflow',
        coverflowEffect: {
          rotate: 50,
          stretch: 0,
          depth: 100,
          modifier: 1,
          slideShadows: true
        }
      };
    }

    if (normalizedEffect === 'flip') {
      return {
        effect: 'flip',
        flipEffect: {
          slideShadows: true,
          limitRotation: true
        }
      };
    }

    if (normalizedEffect === 'cards') {
      return {
        effect: 'cards',
        cardsEffect: {
          perSlideOffset: 8,
          perSlideRotate: 2,
          rotate: true,
          slideShadows: true
        }
      };
    }

    if (normalizedEffect === 'creative') {
      return {
        effect: 'creative',
        creativeEffect: {
          prev: {
            shadow: true,
            translate: ['-20%', 0, -1]
          },
          next: {
            translate: ['100%', 0, 0]
          }
        }
      };
    }

    return {
      effect: 'slide'
    };
  }

  function readSwiperConfigFromElement(element) {
    var slidesPerViewValue = element.dataset.slidesPerView;
    var slidesPerView = slidesPerViewValue === 'auto'
      ? 'auto'
      : Math.max(0.1, toDecimalNumber(slidesPerViewValue, 1));
    var spaceBetween = Math.max(0, toNumber(element.dataset.spaceBetween, 16));
    var speed = Math.max(0, toNumber(element.dataset.speed, 300));
    var autoplayEnabled = readBooleanData(element.dataset.autoplay);
    var autoplayDelay = Math.max(300, toNumber(element.dataset.autoplayDelay, 3000));
    var transitionEffect = normalizeTransitionEffect(element.dataset.transitionEffect);
    var effectConfig = getSwiperEffectConfig(transitionEffect);
    var freeModeEnabled = readBooleanData(element.dataset.freeMode);
    var freeModeSticky = readBooleanData(element.dataset.freeModeSticky);
    var mousewheelEnabled = readBooleanData(element.dataset.mousewheel);
    var mousewheelSensitivity = Math.max(0.1, toDecimalNumber(element.dataset.mousewheelSensitivity, 1));
    var navigationEnabled = readBooleanData(element.dataset.navigation);
    var paginationEnabled = readBooleanData(element.dataset.pagination);
    var scrollbarEnabled = readBooleanData(element.dataset.scrollbar);
    var breakpoints = readBreakpointsData(element.dataset.breakpoints);
    var parentElement = element.parentElement;
    var nextEl = parentElement ? parentElement.querySelector('.swiper-button-next') : null;
    var prevEl = parentElement ? parentElement.querySelector('.swiper-button-prev') : null;
    var paginationEl = parentElement ? parentElement.querySelector('.swiper-pagination') : null;
    var scrollbarEl = parentElement ? parentElement.querySelector('.swiper-scrollbar') : null;
    var canUseNavigation = navigationEnabled && !!nextEl && !!prevEl;
    var canUsePagination = paginationEnabled && !!paginationEl;
    var canUseScrollbar = scrollbarEnabled && !!scrollbarEl;
    var navigationDefaults = {
      hideOnClick: false,
      disabledClass: 'swiper-button-disabled',
      hiddenClass: 'swiper-button-hidden',
      lockClass: 'swiper-button-lock',
      navigationDisabledClass: 'swiper-navigation-disabled'
    };

    if (breakpoints && typeof breakpoints === 'object') {
      Object.keys(breakpoints).forEach(function (key) {
        var bp = breakpoints[key];
        if (!bp || typeof bp !== 'object') {
          return;
        }

        if (bp.navigation && typeof bp.navigation === 'object') {
          bp.navigation = Object.assign({}, navigationDefaults, bp.navigation, {
            enabled: canUseNavigation ? !!bp.navigation.enabled : false,
            nextEl: nextEl,
            prevEl: prevEl
          });
        }

        if (bp.pagination && typeof bp.pagination === 'object') {
          if (!canUsePagination) {
            delete bp.pagination;
          } else {
            bp.pagination = Object.assign({}, bp.pagination, {
              el: paginationEl
            });
          }
        }

        if (bp.scrollbar && typeof bp.scrollbar === 'object') {
          if (!canUseScrollbar) {
            delete bp.scrollbar;
          } else {
            bp.scrollbar = Object.assign({}, bp.scrollbar, {
              el: scrollbarEl,
              draggable: true
            });
          }
        }
      });
    }

    var baseConfig = {
      slidesPerView: slidesPerView,
      spaceBetween: spaceBetween,
      breakpoints: breakpoints,
      speed: speed,
      // Prefer deterministic config when free mode is enabled.
      loop: freeModeEnabled ? false : readBooleanData(element.dataset.loop),
      centeredSlides: readBooleanData(element.dataset.centeredSlides),
      freeMode: freeModeEnabled ? {
        enabled: true,
        sticky: freeModeSticky
      } : false,
      mousewheel: mousewheelEnabled
        ? {
          forceToAxis: element.dataset.mousewheelForceToAxis !== 'false',
          releaseOnEdges: element.dataset.mousewheelReleaseOnEdges !== 'false',
          sensitivity: mousewheelSensitivity
        }
        : false,
      navigation: canUseNavigation
        ? {
          nextEl: nextEl,
          prevEl: prevEl
        }
        : false,
      pagination: canUsePagination
        ? {
          el: paginationEl,
          clickable: readBooleanData(element.dataset.paginationClickable)
        }
        : false,
      scrollbar: canUseScrollbar
        ? {
          el: scrollbarEl,
          draggable: true
        }
        : false,
      autoplay: autoplayEnabled
        ? {
          delay: autoplayDelay,
          disableOnInteraction: false
        }
        : false
    };

    return Object.assign(baseConfig, effectConfig);
  }

  function initMottoSwiper() {
    if (typeof window.Swiper !== 'function') {
      return;
    }

    var motto = ensureMottoGlobal();
    var registry = motto.sliders;

    var sliders = document.querySelectorAll('.motto-swiper');
    sliders.forEach(function (slider) {
      var rootEl = getSliderRootElement(slider);
      var id = getOrCreateSliderId(slider);
      var source = rootEl && rootEl.classList && rootEl.classList.contains('wp-block-motto-query-layout')
        ? 'motto/query-layout'
        : 'motto/slider';

      if (slider.swiper) {
        var prevEntry = {
          id: id,
          rootEl: rootEl,
          swiperEl: slider,
          swiper: slider.swiper,
          source: source
        };
        dispatchMottoEvent('motto:slider:destroy', prevEntry);
        dispatchMottoEvent('motto:slider:registry', { action: 'delete', id: id, entry: prevEntry, source: source });
        registryDelete(registry, id);
        slider.swiper.destroy(true, true);
      }

      var config = readSwiperConfigFromElement(slider);
      dispatchMottoEvent('motto:slider:before-init', {
        id: id,
        rootEl: rootEl,
        swiperEl: slider,
        config: config,
        source: source
      });
      // eslint-disable-next-line no-new
      var instance = new window.Swiper(slider, config);

      var entry = {
        id: id,
        rootEl: rootEl,
        swiperEl: slider,
        swiper: instance,
        config: config,
        source: source
      };
      registrySet(registry, id, entry);
      dispatchMottoEvent('motto:slider:registry', { action: 'set', id: id, entry: entry, source: source });
      dispatchMottoEvent('motto:slider:init', entry);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMottoSwiper);
  } else {
    initMottoSwiper();
  }
})();
