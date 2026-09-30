(function () {
  // `.is-parallax` lives on whichever element actually moves: the
  // `.motto-container__bg-media` <div> itself when it self-paints a CSS
  // background (repeat/attachment:fixed fallback — no child), or its
  // <img>/<video> child in the default path (see
  // containerBackgroundNeedsDivFallback in src/blocks/container/index.jsx).
  var CONTAINER_SELECTOR = '.motto-container > .motto-container__bg-media.is-parallax, .motto-container > .motto-container__bg-media > .is-parallax';
  var OFFSET_PROPERTY = '--motto-parallax-offset';
  var DEFAULT_OFFSET = 120;
  var containerInstances = [];
  var editorUnsubscribe = null;

  // Shared registry of active tweens, driven by a single requestAnimationFrame
  // loop that recomputes every layer's position each frame (no caching, so
  // layout/content changes never leave a tween stuck at a stale position).
  var activeTweens = [];
  var tickerFrameId = null;

  function debounce(fn, wait) {
    var timeoutId = null;
    return function () {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(fn, wait);
    };
  }

  function prefersReducedMotion() {
    return Boolean(
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  function isAnimationAvailable() {
    return !prefersReducedMotion();
  }

  // Reads a pixel offset from a CSS custom property on `element`'s computed
  // style (e.g. --motto-parallax-offset). Shared by every block that drives
  // its parallax offset through the same custom-property convention.
  function readOffsetVar(element, propertyName, fallback) {
    if (!element || !window.getComputedStyle) {
      return fallback;
    }

    var raw = window.getComputedStyle(element).getPropertyValue(propertyName);
    var parsed = parseFloat(String(raw || '').trim());
    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    return Math.max(0, Math.abs(parsed));
  }

  function clamp01(value) {
    return Math.min(1, Math.max(0, value));
  }

  function applyTween(tween) {
    var rect = tween.triggerEl.getBoundingClientRect();
    var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    var progress = clamp01((viewportHeight - rect.top) / (viewportHeight + rect.height || 1));
    var y = tween.offsetPx * (-1 + 2 * progress);
    tween.layerEl.style.transform = 'translateY(' + y.toFixed(2) + 'px)';
  }

  function tick() {
    activeTweens.forEach(applyTween);
    tickerFrameId = activeTweens.length ? window.requestAnimationFrame(tick) : null;
  }

  function ensureTicker() {
    if (tickerFrameId === null && activeTweens.length) {
      tickerFrameId = window.requestAnimationFrame(tick);
    }
  }

  // Builds a scroll-scrubbed parallax tween translating `layerEl` on the Y
  // axis from -offset to +offset as `triggerEl` crosses the viewport (trigger
  // top at viewport bottom -> trigger bottom at viewport top). This is the
  // shared parallax mechanic behind Container's background layer and (Pro)
  // Image's <img> layer — same math, different DOM target. Position is
  // recomputed from live layout every frame, so no separate "refresh" call
  // is needed after layout changes.
  function buildTween(layerEl, offsetPx, triggerEl) {
    if (!layerEl || !Number.isFinite(offsetPx) || offsetPx <= 0 || !isAnimationAvailable()) {
      return null;
    }

    layerEl.style.willChange = 'transform';

    var tween = {
      layerEl: layerEl,
      offsetPx: offsetPx,
      triggerEl: triggerEl || layerEl,
      kill: function () {
        var index = activeTweens.indexOf(tween);
        if (index !== -1) {
          activeTweens.splice(index, 1);
        }
      }
    };

    activeTweens.push(tween);
    applyTween(tween);
    ensureTicker();

    return tween;
  }

  function resetTween(instance) {
    if (!instance) {
      return;
    }

    if (instance.tween && typeof instance.tween.kill === 'function') {
      instance.tween.kill();
    }

    if (instance.element) {
      instance.element.style.transform = '';
      instance.element.style.willChange = '';
    }
  }

  function destroyContainerInstances() {
    containerInstances.forEach(resetTween);
    containerInstances = [];
  }

  function buildContainerInstances() {
    if (prefersReducedMotion()) {
      destroyContainerInstances();
      return;
    }

    destroyContainerInstances();

    var layers = document.querySelectorAll(CONTAINER_SELECTOR);
    layers.forEach(function (layer) {
      var offset = readOffsetVar(layer, OFFSET_PROPERTY, DEFAULT_OFFSET);
      var tween = buildTween(layer, offset, layer.parentElement || layer);
      if (!tween) {
        return;
      }

      containerInstances.push({ element: layer, tween: tween });
    });
  }

  var scheduleBuildContainerInstances = debounce(buildContainerInstances, 120);

  function wireEditorUpdates() {
    if (!window.wp || !window.wp.data || typeof window.wp.data.subscribe !== 'function') {
      return;
    }

    if (editorUnsubscribe) {
      editorUnsubscribe();
      editorUnsubscribe = null;
    }

    editorUnsubscribe = window.wp.data.subscribe(function () {
      scheduleBuildContainerInstances();
    });
  }

  function init() {
    buildContainerInstances();
    wireEditorUpdates();

    window.addEventListener('resize', scheduleBuildContainerInstances, { passive: true });
  }

  // Neutral, block-agnostic API. Pro's Image parallax runtime (and any
  // future block that needs the same scroll-tween mechanic) depends on this
  // script's handle and reuses these primitives instead of duplicating the
  // parallax wiring.
  window.MottoBlocksParallax = {
    debounce: debounce,
    prefersReducedMotion: prefersReducedMotion,
    readOffsetVar: readOffsetVar,
    buildTween: buildTween,
    resetTween: resetTween,
    OFFSET_PROPERTY: OFFSET_PROPERTY,
    DEFAULT_OFFSET: DEFAULT_OFFSET
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
