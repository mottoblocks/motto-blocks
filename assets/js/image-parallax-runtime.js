(function () {
  var SELECTOR = '.motto-image__media.is-parallax';
  var instances = [];

  function reset() {
    var api = window.MottoBlocksParallax;
    instances.forEach(function (instance) {
      if (api) {
        api.resetTween(instance);
      }
    });
    instances = [];
  }

  function build() {
    var api = window.MottoBlocksParallax;
    if (!api) {
      return;
    }

    reset();

    var layers = document.querySelectorAll(SELECTOR);
    layers.forEach(function (layer) {
      var offset = api.readOffsetVar(layer, api.OFFSET_PROPERTY, api.DEFAULT_OFFSET);
      var tween = api.buildTween(layer, offset, layer.parentElement || layer);
      if (tween) {
        instances.push({ element: layer, tween: tween });
      }
    });
  }

  function init() {
    build();

    var api = window.MottoBlocksParallax;
    var scheduleBuild = api && typeof api.debounce === 'function' ? api.debounce(build, 120) : build;
    window.addEventListener('resize', scheduleBuild, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
