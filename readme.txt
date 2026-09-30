=== Motto Blocks ===
Contributors: sebastianpothe
Tags: blocks, gutenberg, styling, responsive, design-system
Requires at least: 6.5
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 0.1.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Advanced blocks and a reusable styling system for modern WordPress sites.

== Description ==

Tagline: Advanced blocks. Reusable styling.

Motto Blocks gives you advanced blocks and a reusable, responsive styling system for modern WordPress sites, making it easier to build consistent layouts, manage shared styles, and keep design decisions scalable.

== Installation ==

1. Upload the plugin files to the `/wp-content/plugins/motto-blocks` directory, or install the plugin through the WordPress plugins screen directly.
2. Activate the plugin through the "Plugins" screen in WordPress.
3. Use the block inserter to add blocks, or open block settings where the Styler integrates with supported blocks.

== Frequently Asked Questions ==

= What WordPress version do I need? =

Motto Blocks requires WordPress 6.5 or higher and PHP 7.4 or higher.

= Where can I get help or documentation? =

Visit [mottoblocks.com](https://mottoblocks.com/) for product information and support channels.

= Is there a Pro version? =

Yes. Motto Blocks Pro is an optional add-on distributed separately; the free plugin is fully usable on its own. Details and licensing are on [mottoblocks.com](https://mottoblocks.com/).

== Screenshots ==

1. Motto blocks in the block inserter.
2. Motto Container and layout-focused blocks in the editor.
3. Styler controls attached to a supported block.

== Third-Party Libraries ==

Motto Blocks bundles [Swiper](https://swiperjs.com/) (MIT license) for the Motto Slider block, distributed as a minified build; the unminified source is available from the [Swiper GitHub repository](https://github.com/nolimits4web/swiper). It also bundles the [Lucide](https://lucide.dev/) icon set (ISC license) as local SVG files for the Motto Maps block's pin icon picker, from the [lucide-static](https://github.com/lucide-icons/lucide) package. See `THIRD_PARTY_LICENSES.txt` in the plugin package for full license texts.

== External services ==

This plugin connects to the Google Maps Platform to display maps in the Motto Maps block.

It only loads when a page contains a Motto Maps block, and only after you configure a Google Maps API key in Settings → Motto Blocks → API. The plugin sends the site administrator's own API key to Google to load the Maps JavaScript API in the visitor's browser; no visitor-provided personal data is sent by the plugin itself, though loading any third-party script exposes the visitor's IP address and browser details to that service, as is standard for any embedded map.

This service is provided by Google: [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms), [Google Privacy Policy](https://policies.google.com/privacy).

== Changelog ==

= 0.1.1 =
* **Styler:** responsive styling workflow in the block editor for supported surfaces (classes, design tokens, and related controls).
* **Layout:** Motto Container.
* **Actions:** Motto Button, Motto Buttons.
* **Media:** Motto Image, Motto SVG.
* **Lists:** Motto List and Motto List Item.
* **Carousel:** Motto Slider and Motto Slide.
* **Tabs:** Motto Tabs, Tab Container, Tab Panels, Tab Panel, and Tab Button.
* **Accordion:** Motto Accordion and Motto Accordion Item.
* **Navigation:** Motto Classic Menu.
* **Maps:** Motto Maps.
* **Utility:** Motto Counter.
* First release packaged for the WordPress.org plugin directory.
