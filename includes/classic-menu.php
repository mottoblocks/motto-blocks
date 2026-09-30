<?php
/**
 * Classic menu walker and render callback.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Motto_Blocks_Classic_Menu_Walker extends Walker_Nav_Menu {
	/**
	 * Open submenu level.
	 *
	 * @param string   $output Walker output.
	 * @param int      $depth  Depth.
	 * @param stdClass $args   Arguments.
	 * @return void
	 */
	public function start_lvl( &$output, $depth = 0, $args = null ) {
		$indent = str_repeat( "\t", (int) $depth );
		$output .= "\n{$indent}<div class=\"motto-classic-menu__submenu-container\"><ul class=\"motto-classic-menu__submenu\">\n";
	}

	/**
	 * Close submenu level.
	 *
	 * @param string   $output Walker output.
	 * @param int      $depth  Depth.
	 * @param stdClass $args   Arguments.
	 * @return void
	 */
	public function end_lvl( &$output, $depth = 0, $args = null ) {
		$indent = str_repeat( "\t", (int) $depth );
		$output .= "{$indent}</ul></div>\n";
	}

	/**
	 * Open menu item.
	 *
	 * @param string   $output Walker output.
	 * @param WP_Post  $item   Menu item.
	 * @param int      $depth  Depth.
	 * @param stdClass $args   Arguments.
	 * @param int      $id     Item ID.
	 * @return void
	 */
	public function start_el( &$output, $item, $depth = 0, $args = null, $id = 0 ) {
		$classes      = empty( $item->classes ) ? array() : (array) $item->classes;
		$has_children = in_array( 'menu-item-has-children', $classes, true );

		$classes[] = 'motto-classic-menu__item';
		if ( $has_children ) {
			$classes[] = 'has-child';
		}

		$class_names = implode(
			' ',
			array_map(
				'sanitize_html_class',
				array_filter( $classes )
			)
		);
		$output     .= '<li class="' . esc_attr( $class_names ) . '">';

		$atts           = array();
		$atts['href']   = ! empty( $item->url ) ? $item->url : '';
		$atts['class']  = 'motto-classic-menu__item-content';
		$atts['target'] = ! empty( $item->target ) ? $item->target : '';
		$atts['rel']    = ! empty( $item->xfn ) ? $item->xfn : '';

		if ( '_blank' === $atts['target'] && '' === $atts['rel'] ) {
			$atts['rel'] = 'noopener noreferrer';
		}

		$attributes = '';
		foreach ( $atts as $attr => $value ) {
			if ( '' === $value ) {
				continue;
			}

			$value       = ( 'href' === $attr ) ? esc_url( $value ) : esc_attr( $value );
			$attributes .= ' ' . $attr . '="' . $value . '"';
		}

		$title   = apply_filters( 'the_title', $item->title, $item->ID );
		$output .= '<a' . $attributes . '>' . esc_html( $title ) . '</a>';

		if ( $has_children ) {
			$output .= '<button class="motto-classic-menu__submenu-icon motto-classic-menu__submenu-toggle" type="button" aria-label="' . esc_attr__( 'Toggle submenu', 'motto-blocks' ) . '" aria-expanded="false">';
			$output .= '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" focusable="false">';
			$output .= '<path d="M1.5 4L6 8L10.5 4" stroke-width="1.5"></path>';
			$output .= '</svg>';
			$output .= '</button>';
		}
	}

	/**
	 * Close menu item.
	 *
	 * @param string   $output Walker output.
	 * @param WP_Post  $item   Menu item.
	 * @param int      $depth  Depth.
	 * @param stdClass $args   Arguments.
	 * @return void
	 */
	public function end_el( &$output, $item, $depth = 0, $args = null ) {
		$output .= "</li>\n";
	}
}

/**
 * Render callback for motto/classic-menu.
 *
 * @param array $attributes Block attributes.
 * @return string
 */
function motto_blocks_render_classic_menu( $attributes ) {
	$attributes      = is_array( $attributes ) ? $attributes : array();
	$use_location    = ! empty( $attributes['useLocation'] );
	$menu_location   = isset( $attributes['menuLocation'] ) ? sanitize_key( $attributes['menuLocation'] ) : '';
	$menu_slug       = isset( $attributes['menuSlug'] ) ? sanitize_title( $attributes['menuSlug'] ) : '';
	$orientation     = isset( $attributes['orientation'] ) ? sanitize_key( $attributes['orientation'] ) : 'horizontal';
	$submenu_mode    = isset( $attributes['submenuPosition'] ) ? sanitize_key( $attributes['submenuPosition'] ) : 'floating';
	$toggle_event    = isset( $attributes['toggleEvent'] ) ? strtolower( trim( (string) $attributes['toggleEvent'] ) ) : 'rollover';
	$container_extra = isset( $attributes['className'] ) ? sanitize_text_field( $attributes['className'] ) : '';
	$align           = isset( $attributes['align'] ) ? sanitize_key( $attributes['align'] ) : '';
	$anchor          = isset( $attributes['anchor'] ) ? sanitize_html_class( $attributes['anchor'] ) : '';

	if ( ( ! $use_location && '' === $menu_slug ) || ( $use_location && '' === $menu_location ) ) {
		return is_admin() ? '<p>' . esc_html__( 'No menu selected.', 'motto-blocks' ) . '</p>' : '';
	}

	if ( 'click' !== $toggle_event ) {
		$toggle_event = 'rollover';
	}

	$container_classes = array(
		'wp-block-motto-classic-menu',
		'motto-classic-menu',
		( 'click' === $toggle_event ) ? 'toggle-event-click' : 'toggle-event-rollover',
	);
	$base_layout_class = function_exists( 'motto_styler_get_base_layout_class_for_block' )
		? motto_styler_get_base_layout_class_for_block( 'motto/classic-menu' )
		: '';
	if ( '' !== $base_layout_class ) {
		$container_classes[] = $base_layout_class;
	}

	if ( '' !== $container_extra ) {
		$container_classes[] = $container_extra;
	}
	if ( '' !== $align ) {
		$container_classes[] = 'align' . $align;
	}

	$menu_classes = array(
		'motto-classic-menu__container',
		( 'accordion' === $submenu_mode ) ? 'accordion-submenu' : 'floating-submenu',
	);

	$menu_markup = wp_nav_menu(
		array(
			'theme_location'  => $use_location ? $menu_location : '',
			'menu'            => $use_location ? '' : $menu_slug,
			'echo'            => false,
			'container'       => 'nav',
			'container_id'    => $anchor,
			'container_class' => implode( ' ', array_filter( $container_classes ) ),
			'menu_class'      => implode( ' ', array_filter( $menu_classes ) ),
			'items_wrap'      => '<ul class="%2$s" data-submenu-toggle-event="' . esc_attr( $toggle_event ) . '">%3$s</ul>',
			'fallback_cb'     => false,
			'walker'          => new Motto_Blocks_Classic_Menu_Walker(),
		)
	);

	if ( empty( $menu_markup ) ) {
		return is_admin() ? '<p>' . esc_html__( 'Menu not found.', 'motto-blocks' ) . '</p>' : '';
	}

	return $menu_markup;
}
