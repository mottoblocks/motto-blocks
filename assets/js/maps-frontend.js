(function () {
  const BLOCK_SELECTOR = '.motto-maps';
  let googleMapsLoaderPromise = null;
  const GOOGLE_MAPS_READY_TIMEOUT_MS = 20000;
  const DEFAULT_PIN_COLOR = '#d93025';
  const DEBUG = Boolean(window.MOTTO_MAPS_DEBUG);

  function log() {
    if (!DEBUG || !window.console || typeof window.console.debug !== 'function') {
      return;
    }
    window.console.debug.apply(window.console, ['[Motto Maps]'].concat(Array.from(arguments)));
  }

  function parseJsonAttribute(element, attributeName, fallbackValue) {
    const raw = element.getAttribute(attributeName);
    if (!raw) {
      return fallbackValue;
    }

    try {
      return JSON.parse(raw);
    } catch (error) {
      return fallbackValue;
    }
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function normalizePinColor(value) {
    const color = typeof value === 'string' ? value.trim() : '';
    if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(color)) {
      return color;
    }
    if (/^rgba?\(/i.test(color) || /^hsla?\(/i.test(color)) {
      return color;
    }
    return DEFAULT_PIN_COLOR;
  }

  function toFiniteNumber(value, fallback) {
    const parsed = typeof value === 'string' ? Number.parseFloat(value) : value;
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function loadGoogleMaps(apiKey) {
    if (!apiKey) {
      return Promise.reject(new Error('Missing Google Maps API key.'));
    }

    const resolveGoogleMapsLibraries = function (googleMaps) {
      if (googleMaps && typeof googleMaps.Map === 'function') {
        return Promise.resolve(googleMaps);
      }

      if (googleMaps && typeof googleMaps.importLibrary === 'function') {
        return Promise.all([
          googleMaps.importLibrary('maps'),
          googleMaps.importLibrary('marker').catch(function () { return null; })
        ]).then(function () {
          if (typeof googleMaps.Map === 'function') {
            return googleMaps;
          }

          throw new Error('Google Maps loaded but Map constructor is missing.');
        });
      }

      return Promise.reject(new Error('Google Maps loaded but Map constructor is missing.'));
    };

    const waitForGoogleMapsLibraries = function () {
      return new Promise(function (resolve, reject) {
        const start = Date.now();
        const poll = function () {
          const googleMaps = window.google && window.google.maps;

          if (
            (googleMaps && typeof googleMaps.Map === 'function') ||
            (googleMaps && typeof googleMaps.importLibrary === 'function')
          ) {
            resolveGoogleMapsLibraries(googleMaps).then(resolve, reject);
            return;
          }

          if (Date.now() - start >= GOOGLE_MAPS_READY_TIMEOUT_MS) {
            reject(new Error('Google Maps loaded but Map constructor is missing.'));
            return;
          }

          window.setTimeout(poll, 50);
        };

        poll();
      });
    };

    if (window.google && window.google.maps) {
      return waitForGoogleMapsLibraries();
    }

    if (googleMapsLoaderPromise) {
      return googleMapsLoaderPromise;
    }

    googleMapsLoaderPromise = new Promise((resolve, reject) => {
      const scriptId = 'motto-blocks-google-maps-api';
      const existingScript = document.getElementById(scriptId);

      const waitForGoogleMapsReady = function () {
        waitForGoogleMapsLibraries().then(resolve, reject);
      };

      const resolveWhenReady = function () {
        const googleMaps = window.google && window.google.maps;
        if (
          (googleMaps && typeof googleMaps.Map === 'function') ||
          (googleMaps && typeof googleMaps.importLibrary === 'function')
        ) {
          resolveGoogleMapsLibraries(googleMaps).then(resolve, reject);
          return true;
        }
        return false;
      };

      if (existingScript) {
        if (resolveWhenReady()) {
          return;
        }

        waitForGoogleMapsReady();
        existingScript.addEventListener('load', function () {
          if (resolveWhenReady()) return;
          waitForGoogleMapsReady();
        }, { once: true });

        existingScript.addEventListener('error', function () {
          reject(new Error('Failed loading Google Maps script.'));
        }, { once: true });

        return;
      }

      const script = document.createElement('script');
      script.id = scriptId;
      script.async = true;
      script.defer = true;
      script.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(apiKey) + '&loading=async&libraries=maps,marker';

      script.addEventListener('load', function () {
        if (resolveWhenReady()) return;
        waitForGoogleMapsReady();
      }, { once: true });

      script.addEventListener('error', function () {
        reject(new Error('Failed loading Google Maps script.'));
      }, { once: true });

      document.head.appendChild(script);
    }).catch(function (error) {
      googleMapsLoaderPromise = null;
      throw error;
    });

    return googleMapsLoaderPromise;
  }

  function encodeInlineSvgDataUri(svgMarkup) {
    if (typeof svgMarkup !== 'string' || svgMarkup.indexOf('<svg') === -1) {
      return '';
    }

    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgMarkup);
  }

  function colorizeSvgMarkup(svgMarkup, color) {
    if (typeof svgMarkup !== 'string' || svgMarkup.indexOf('<svg') === -1) {
      return '';
    }

    const normalizedColor = normalizePinColor(color);
    return svgMarkup.replace(/<svg\b([^>]*)>/i, function (match, attrs) {
      const withoutColor = String(attrs || '').replace(/\scolor=(["']).*?\1/i, '');
      return '<svg' + withoutColor + ' color="' + normalizedColor + '">';
    });
  }

  function getLucideIconUrl(iconName) {
    if (typeof iconName !== 'string' || !iconName.trim()) {
      return '';
    }

    const slug = iconName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!slug) {
      return '';
    }

    // Served from the plugin's own bundled copy (assets/vendor/lucide/icons/) — see
    // motto_blocks_register_maps_assets() in includes/assets-frontend-libs.php, which
    // localizes this base URL. Never point this at a third-party CDN.
    var baseUrl = typeof window.__MOTTO_BLOCKS_LUCIDE_ICON_BASE_URL__ === 'string'
      ? window.__MOTTO_BLOCKS_LUCIDE_ICON_BASE_URL__
      : '';
    if (!baseUrl) {
      return '';
    }

    return baseUrl + slug + '.svg';
  }

  function toMarkerIcon(googleMaps, pin) {
    let iconUrl = '';

    if (pin.iconType === 'svg-inline') {
      iconUrl = encodeInlineSvgDataUri(pin.iconValue);
    } else if (pin.iconType === 'svg-library') {
      iconUrl = (pin.iconSvg && typeof pin.iconSvg === 'string')
        ? encodeInlineSvgDataUri(colorizeSvgMarkup(pin.iconSvg, pin.pinColor))
        : getLucideIconUrl(pin.iconValue);
    } else if (pin.iconType === 'image') {
      iconUrl = pin.iconValue && typeof pin.iconValue === 'object' ? String(pin.iconValue.url || '') : '';
    }

    if (!iconUrl) {
      return undefined;
    }

    return {
      url: iconUrl,
      scaledSize: new googleMaps.Size(36, 36),
      anchor: new googleMaps.Point(18, 36)
    };
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function isSafeUrl(url) {
    return /^(https?:\/\/|\/)/.test(url);
  }

  function buildInfoWindowHtml(pin) {
    const title = typeof pin.title === 'string' ? pin.title.trim() : '';
    const description = typeof pin.description === 'string' ? pin.description.trim() : '';
    const url = typeof pin.url === 'string' ? pin.url.trim() : '';

    if (!title && !description && !url) {
      return '';
    }

    let html = '<div class="motto-maps__marker-content">';

    if (title) {
      html += '<h4 class="motto-maps__marker-title">' + escapeHtml(title) + '</h4>';
    }

    if (description) {
      html += '<p class="motto-maps__marker-description">' + escapeHtml(description) + '</p>';
    }

    if (url && isSafeUrl(url)) {
      html += '<a class="motto-maps__marker-link" href="' + escapeHtml(url) + '">Open</a>';
    }

    html += '</div>';
    return html;
  }

  function initBlock(block) {
    const canvas = block.querySelector('.motto-maps__canvas') || block;
    const apiKey = String(block.getAttribute('data-api-key') || '').trim();
    const config = parseJsonAttribute(block, 'data-map-config', {});
    const pins = parseJsonAttribute(block, 'data-pins', []);

    if (!apiKey || !canvas) {
      log('initBlock aborted', { reason: !apiKey ? 'missing-api-key' : 'missing-canvas' });
      return;
    }

    const mapConfig = {
      center: {
        lat: clamp(toFiniteNumber(config.centerLat, 40.7128), -90, 90),
        lng: clamp(toFiniteNumber(config.centerLng, -74.006), -180, 180)
      },
      zoom: clamp(Math.round(toFiniteNumber(config.zoom, 12)), 1, 21),
      mapTypeId: typeof config.mapType === 'string' ? config.mapType : 'roadmap',
      zoomControl: Boolean(config.controls && config.controls.zoomControl),
      fullscreenControl: Boolean(config.controls && config.controls.fullscreenControl),
      streetViewControl: Boolean(config.controls && config.controls.streetViewControl),
      mapTypeControl: Boolean(config.controls && config.controls.mapTypeControl)
    };

    loadGoogleMaps(apiKey)
      .then(function (googleMaps) {
        log('google maps ready, creating map', mapConfig);
        const map = new googleMaps.Map(canvas, mapConfig);
        const infoWindow = new googleMaps.InfoWindow();

        if (!Array.isArray(pins)) {
          return;
        }

        pins.forEach(function (pin) {
          log('creating marker', pin);
          const marker = new googleMaps.Marker({
            map: map,
            position: {
              lat: clamp(toFiniteNumber(pin && pin.lat, mapConfig.center.lat), -90, 90),
              lng: clamp(toFiniteNumber(pin && pin.lng, mapConfig.center.lng), -180, 180)
            },
            title: typeof pin.title === 'string' ? pin.title : '',
            icon: toMarkerIcon(googleMaps, pin || {})
          });

          const infoHtml = buildInfoWindowHtml(pin || {});
          if (infoHtml) {
            marker.addListener('click', function () {
              infoWindow.setContent(infoHtml);
              infoWindow.open(map, marker);
            });
          }
        });
      })
      .catch(function (error) {
        log('initBlock failed', { message: error && error.message ? error.message : String(error || '') });
        if (String(block.getAttribute('data-user-logged-in') || '') !== '1') {
          return;
        }

        const message = document.createElement('p');
        message.className = 'motto-maps__notice';
        message.textContent = 'Google Maps could not initialize. Check API key and referrer restrictions.';
        if (error && error.message) {
          message.setAttribute('title', String(error.message));
        }

        block.classList.add('motto-maps--load-error');
        block.appendChild(message);
      });
  }

  function boot() {
    log('boot');
    const blocks = document.querySelectorAll(BLOCK_SELECTOR);
    log('blocks found', { count: blocks.length, selector: BLOCK_SELECTOR });
    blocks.forEach(initBlock);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
