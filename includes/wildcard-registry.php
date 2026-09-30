<?php
/**
 * Motto Blocks — Wildcard registry.
 *
 * Provides the shared wildcard infrastructure used by motto-blocks-pro,
 * motto-dynamics, and any other plugin built on motto-blocks Free.
 *
 * Free itself contributes zero tokens. Tokens are registered by consumer
 * plugins via the `motto_blocks_wildcards` filter.
 *
 * Syntax supported:
 *   ${TOKEN}
 *   ${TOKEN:param}
 *   ${TOKEN:param@context}
 *
 * Contexts:
 *   (none)  — current post (get_the_ID())
 *   @parent — parent of current post
 *   @123    — explicit post ID
 */

defined( 'ABSPATH' ) || exit;

/**
 * Default engine options for shared wildcard resolution.
 *
 * @param array $options Raw options.
 * @return array{max_depth:int,depth:int,seen_tokens:array<string,bool>}
 */
function motto_blocks_normalize_wildcard_options( array $options = array() ): array {
	$max_depth = isset( $options['max_depth'] ) ? (int) $options['max_depth'] : 5;
	$depth     = isset( $options['depth'] ) ? (int) $options['depth'] : 0;
	$seen      = isset( $options['seen_tokens'] ) && is_array( $options['seen_tokens'] )
		? $options['seen_tokens']
		: array();

	return array(
		'max_depth'   => max( 1, $max_depth ),
		'depth'       => max( 0, $depth ),
		'seen_tokens' => $seen,
	);
}

/**
 * Build child options for a nested wildcard resolution step.
 *
 * @param array  $options Parent options.
 * @param string $token   Current token being resolved.
 * @return array{max_depth:int,depth:int,seen_tokens:array<string,bool>}
 */
function motto_blocks_get_child_wildcard_options( array $options, string $token ): array {
	$options                  = motto_blocks_normalize_wildcard_options( $options );
	$options['depth']        += 1;
	$options['seen_tokens']   = $options['seen_tokens'];
	$options['seen_tokens'][ $token ] = true;

	return $options;
}

/**
 * Find the next `${...}` token in a string, including nested tokens.
 *
 * @param string $value  Raw string.
 * @param int    $offset Byte offset to start searching.
 * @return array{start:int,end:int,token:string}|null
 */
function motto_blocks_find_next_wildcard_token( string $value, int $offset = 0 ): ?array {
	$length = strlen( $value );
	$start  = strpos( $value, '${', $offset );

	while ( false !== $start ) {
		$depth = 1;
		for ( $index = $start + 2; $index < $length; $index++ ) {
			if ( '$' === $value[ $index ] && ( $index + 1 ) < $length && '{' === $value[ $index + 1 ] ) {
				++$depth;
				++$index;
				continue;
			}

			if ( '}' !== $value[ $index ] ) {
				continue;
			}

			--$depth;
			if ( 0 === $depth ) {
				return array(
					'start' => $start,
					'end'   => $index + 1,
					'token' => substr( $value, $start, ( $index + 1 ) - $start ),
				);
			}
		}

		$start = strpos( $value, '${', $start + 2 );
	}

	return null;
}

/**
 * Check whether a string is exactly one wildcard token.
 *
 * @param string $value Raw string.
 * @return string|null
 */
function motto_blocks_get_exact_wildcard_token( string $value ): ?string {
	$match = motto_blocks_find_next_wildcard_token( $value, 0 );
	if ( null === $match || 0 !== $match['start'] || strlen( $value ) !== $match['end'] ) {
		return null;
	}

	return $match['token'];
}

/**
 * Parse a wildcard token into its structural parts.
 *
 * @param string $token Full token string.
 * @return array{token:string,resolver_key:string,param:string,context:string}|null
 */
function motto_blocks_parse_wildcard_token( string $token ): ?array {
	if ( $token !== motto_blocks_get_exact_wildcard_token( $token ) ) {
		return null;
	}

	$inner  = substr( $token, 2, -1 );
	$length = strlen( $inner );

	if ( 0 === $length ) {
		return null;
	}

	$resolver_key = '';
	$param        = '';
	$context      = '';
	$separator    = '';
	$depth        = 0;
	$segment      = '';

	for ( $index = 0; $index < $length; $index++ ) {
		$char = $inner[ $index ];

		if ( '$' === $char && ( $index + 1 ) < $length && '{' === $inner[ $index + 1 ] ) {
			++$depth;
			$segment .= '${';
			++$index;
			continue;
		}

		if ( '}' === $char && $depth > 0 ) {
			--$depth;
			$segment .= $char;
			continue;
		}

		if ( 0 === $depth && ( ':' === $char || '@' === $char ) ) {
			if ( '' === $separator ) {
				$resolver_key = $segment;
				$segment      = '';
				$separator    = $char;
				continue;
			}

			if ( ':' === $separator && '@' === $char ) {
				$param     = $segment;
				$segment   = '';
				$separator = '@';
				continue;
			}
		}

		$segment .= $char;
	}

	if ( $depth > 0 ) {
		return null;
	}

	if ( '' === $separator ) {
		$resolver_key = $segment;
	} elseif ( ':' === $separator ) {
		$param = $segment;
	} else {
		if ( '' === $resolver_key ) {
			$resolver_key = $segment;
		} elseif ( '' === $param ) {
			$context = $segment;
		} else {
			$context = $segment;
		}
	}

	if ( '' !== $separator && '@' === $separator && '' === $param && '' !== $resolver_key && false !== strpos( $inner, ':' ) ) {
		$parts = explode( '@', $inner, 2 );
		if ( 2 === count( $parts ) ) {
			$before_context = $parts[0];
			$context        = $parts[1];
			$colon_pos      = strpos( $before_context, ':' );
			if ( false !== $colon_pos ) {
				$resolver_key = substr( $before_context, 0, $colon_pos );
				$param        = substr( $before_context, $colon_pos + 1 );
			}
		}
	}

	if ( '' === $resolver_key || ! preg_match( '/^[A-Z_]+$/', $resolver_key ) ) {
		return null;
	}

	if ( '' !== $separator && '@' === $separator && '' === $context && false !== strpos( $inner, '@' ) ) {
		return null;
	}

	return array(
		'token'        => $token,
		'resolver_key' => $resolver_key,
		'param'        => $param,
		'context'      => $context,
	);
}

/**
 * Find the plugin resolver key registered for a wildcard token key.
 *
 * @param string $resolver_key Token resolver key from syntax, e.g. POST_ID.
 * @return string
 */
function motto_blocks_get_registered_wildcard_resolver( string $resolver_key ): string {
	if ( 'INDEX' === $resolver_key ) {
		return '__engine_index__';
	}
	if ( 'PATH' === $resolver_key ) {
		return '__engine_path__';
	}
	if ( 'FORMAT' === $resolver_key ) {
		return '__engine_format__';
	}

	foreach ( motto_blocks_get_wildcards() as $wildcard ) {
		$wildcard_token = isset( $wildcard['token'] ) ? (string) $wildcard['token'] : '';
		$parsed         = '' !== $wildcard_token ? motto_blocks_parse_wildcard_token( $wildcard_token ) : null;

		if ( is_array( $parsed ) && $parsed['resolver_key'] === $resolver_key ) {
			return (string) ( $wildcard['resolver'] ?? '' );
		}
	}

	return '';
}

/**
 * Split accessor arguments on top-level commas while preserving nested tokens.
 *
 * @param string $value Raw argument list.
 * @return string[]
 */
function motto_blocks_split_wildcard_arguments( string $value ): array {
	if ( '' === $value ) {
		return array();
	}

	$arguments = array();
	$segment   = '';
	$depth     = 0;
	$length    = strlen( $value );

	for ( $index = 0; $index < $length; $index++ ) {
		$char = $value[ $index ];

		if ( '$' === $char && ( $index + 1 ) < $length && '{' === $value[ $index + 1 ] ) {
			++$depth;
			$segment .= '${';
			++$index;
			continue;
		}

		if ( '}' === $char && $depth > 0 ) {
			--$depth;
			$segment .= $char;
			continue;
		}

		if ( 0 === $depth && ',' === $char ) {
			$arguments[] = trim( $segment );
			$segment     = '';
			continue;
		}

		$segment .= $char;
	}

	if ( $depth > 0 ) {
		return array();
	}

	$arguments[] = trim( $segment );

	return $arguments;
}

/**
 * Resolve a top-level accessor argument list through the shared engine.
 *
 * Returns null when any child argument remains unresolved.
 *
 * @param string $resolver Resolver key.
 * @param string $param    Raw accessor param string.
 * @param array  $options  Engine options.
 * @return array<int,mixed>|null
 */
function motto_blocks_resolve_wildcard_arguments( string $resolver, string $param, array $options = array() ): ?array {
	$arguments = motto_blocks_split_wildcard_arguments( $param );
	if ( empty( $arguments ) ) {
		return null;
	}

	$child_options = motto_blocks_get_child_wildcard_options( $options, '${' . $resolver . ':' . $param . '}' );
	foreach ( $arguments as $index => $argument ) {
		$arguments[ $index ] = motto_blocks_resolve_dynamic_value( $argument, $child_options );
		if ( is_string( $arguments[ $index ] ) && null !== motto_blocks_find_next_wildcard_token( $arguments[ $index ] ) ) {
			return null;
		}
	}

	return $arguments;
}

/**
 * Safely read a value from an array/object path.
 *
 * @param mixed              $value    Root value.
 * @param array<int,string>  $segments Path segments.
 * @return mixed|string
 */
function motto_blocks_get_value_at_path( $value, array $segments ) {
	foreach ( $segments as $segment ) {
		if ( is_array( $value ) ) {
			$numeric_key = is_numeric( $segment ) ? (int) $segment : null;
			if ( null !== $numeric_key && array_key_exists( $numeric_key, $value ) ) {
				$value = $value[ $numeric_key ];
				continue;
			}

			if ( array_key_exists( $segment, $value ) ) {
				$value = $value[ $segment ];
				continue;
			}

			return '';
		}

		if ( is_object( $value ) ) {
			if ( isset( $value->$segment ) || property_exists( $value, $segment ) ) {
				$value = $value->$segment;
				continue;
			}

			return '';
		}

		return '';
	}

	return $value;
}

/**
 * Resolve a neutral engine wildcard.
 *
 * @param string $resolver Resolver key.
 * @param string $param    Token param after nested resolution.
 * @param array  $options  Engine options.
 * @return mixed|null
 */
function motto_blocks_resolve_engine_wildcard( string $resolver, string $param, array $options = array() ) {
	$known_resolvers = array( '__engine_index__', '__engine_path__', '__engine_format__' );
	if ( ! in_array( $resolver, $known_resolvers, true ) ) {
		return null;
	}

	$accessors = array(
		'__engine_index__'  => 'INDEX',
		'__engine_path__'   => 'PATH',
		'__engine_format__' => 'FORMAT',
	);
	$arguments = motto_blocks_resolve_wildcard_arguments( $accessors[ $resolver ], $param, $options );
	if ( ! is_array( $arguments ) ) {
		return null;
	}

	if ( '__engine_index__' === $resolver ) {
		if ( 2 !== count( $arguments ) ) {
			return null;
		}

		$value = $arguments[0];
		$index = $arguments[1];

		if ( ! is_array( $value ) || ( ! is_numeric( $index ) && ! is_int( $index ) ) ) {
			return '';
		}

		$index = (int) $index;

		return array_key_exists( $index, $value ) ? $value[ $index ] : '';
	}

	if ( '__engine_format__' === $resolver ) {
		if ( 2 !== count( $arguments ) ) {
			return null;
		}

		return motto_blocks_format_wildcard_value( $arguments[0], (string) $arguments[1] );
	}

	if ( count( $arguments ) < 2 ) {
		return null;
	}

	$value    = array_shift( $arguments );
	$segments = array_map( 'strval', $arguments );

	return motto_blocks_get_value_at_path( $value, $segments );
}

/**
 * Apply a text-formatting mode to a resolved wildcard value (used by FORMAT).
 *
 * @param mixed  $value Value to format.
 * @param string $mode  Format mode: title, sentence, upper, or lower.
 * @return string
 */
function motto_blocks_format_wildcard_value( $value, string $mode ): string {
	$string = is_string( $value ) ? $value : (string) $value;
	$mode   = strtolower( trim( $mode ) );

	switch ( $mode ) {
		case 'title':
		case 'titlecase':
			return ucwords( str_replace( array( '_', '-' ), ' ', $string ) );

		case 'sentence':
			return ucfirst( strtolower( str_replace( array( '_', '-' ), ' ', $string ) ) );

		case 'upper':
		case 'uppercase':
			return strtoupper( $string );

		case 'lower':
		case 'lowercase':
			return strtolower( $string );
	}

	return $string;
}

/**
 * Resolve a nested wildcard-bearing string segment used inside param/context.
 *
 * Returns null when the segment still contains unresolved wildcard syntax.
 *
 * @param string $segment Raw param/context segment.
 * @param array  $options Engine options.
 * @return string|null
 */
function motto_blocks_resolve_wildcard_segment( string $segment, array $options ): ?string {
	if ( '' === $segment ) {
		return '';
	}

	if ( null === motto_blocks_find_next_wildcard_token( $segment ) ) {
		return $segment;
	}

	$resolved = motto_blocks_resolve_dynamic_value( $segment, $options );
	if ( is_array( $resolved ) || is_object( $resolved ) ) {
		return null;
	}

	$resolved_string = (string) $resolved;

	return null === motto_blocks_find_next_wildcard_token( $resolved_string ) ? $resolved_string : null;
}

/**
 * Normalize a wildcard context modifier into a target post ID.
 *
 * @param string $context Final context string after nested resolution.
 * @return int|null
 */
function motto_blocks_resolve_wildcard_context_post_id( string $context ): ?int {
	if ( '' === $context ) {
		return (int) get_the_ID();
	}

	if ( 'parent' === $context ) {
		$current_id = (int) get_the_ID();
		$post_id    = (int) wp_get_post_parent_id( $current_id );

		return $post_id > 0 ? $post_id : null;
	}

	if ( is_numeric( $context ) ) {
		return (int) $context;
	}

	return null;
}

/**
 * Return the merged wildcard catalog from all registered plugins.
 *
 * @return array<int, array{token: string, label: string, description: string, category: string, resolver: string}>
 */
function motto_blocks_get_wildcards(): array {
	static $wildcards = null;
	if ( null !== $wildcards ) {
		return $wildcards;
	}

	/**
	 * Filter: register wildcard token definitions.
	 *
	 * Each entry must have: token, label, description, category (string), resolver.
	 *
	 * @param array $wildcards The current wildcard list.
	 */
	$wildcards = (array) apply_filters( 'motto_blocks_wildcards', [] );

	return $wildcards;
}

/**
 * Return the merged wildcard category registry from all registered plugins.
 *
 * Free contributes no categories of its own — each catalog owner (Pro,
 * Dynamics, ...) registers labels for the categories it uses. This is the
 * single source of truth for category display labels, so editor UIs never
 * need a hardcoded, easily-stale category list of their own.
 *
 * @return array<int, array{id: string, label: string}>
 */
function motto_blocks_get_wildcard_categories(): array {
	static $categories = null;
	if ( null !== $categories ) {
		return $categories;
	}

	/**
	 * Filter: register wildcard category labels.
	 *
	 * Each entry must have: id, label. First registrant for a given id wins.
	 *
	 * @param array $categories The current category registry.
	 */
	$categories = (array) apply_filters( 'motto_blocks_wildcard_categories', [] );

	return $categories;
}

/**
 * Resolve a single wildcard token string to its runtime value.
 *
 * Returns null if the token is unrecognized or cannot be resolved.
 *
 * @param string $token Full token string, e.g. "${POST_ID}" or "${POST_META:my_key@parent}".
 * @return mixed|null
 */
function motto_blocks_resolve_wildcard_token( string $token, array $options = array() ) {
	$options = motto_blocks_normalize_wildcard_options( $options );
	if ( $options['depth'] >= $options['max_depth'] || isset( $options['seen_tokens'][ $token ] ) ) {
		return null;
	}

	$parsed = motto_blocks_parse_wildcard_token( $token );
	if ( ! is_array( $parsed ) ) {
		return null;
	}

	$resolver = motto_blocks_get_registered_wildcard_resolver( $parsed['resolver_key'] );
	if ( '' === $resolver ) {
		return null;
	}

	if ( 0 === strpos( $resolver, '__engine_' ) ) {
		return motto_blocks_resolve_engine_wildcard( $resolver, $parsed['param'], $options );
	}

	$child_options = motto_blocks_get_child_wildcard_options( $options, $token );
	$param         = motto_blocks_resolve_wildcard_segment( $parsed['param'], $child_options );
	$context       = motto_blocks_resolve_wildcard_segment( $parsed['context'], $child_options );

	if ( null === $param || null === $context ) {
		return null;
	}

	$post_id = motto_blocks_resolve_wildcard_context_post_id( $context );
	if ( null === $post_id ) {
		return null;
	}

	/**
	 * Filter: intercept resolution before the standard dispatch.
	 *
	 * Return a non-null value to short-circuit.
	 *
	 * @param mixed|null $value    Resolved value, or null to continue.
	 * @param string     $resolver Resolver key.
	 * @param string     $param    Token param after nested resolution.
	 * @param string     $context  Context modifier after nested resolution.
	 * @param int        $post_id  Resolved post ID.
	 */
	$pre = apply_filters( 'motto_blocks_pre_resolve_wildcard', null, $resolver, $param, $context, $post_id );
	if ( null !== $pre ) {
		return $pre;
	}

	/**
	 * Filter: resolve a wildcard token.
	 *
	 * Plugins handle their own resolver keys. Return non-null to short-circuit.
	 *
	 * @param mixed|null $value    Current value (null = not yet resolved).
	 * @param string     $resolver Resolver key.
	 * @param string     $param    Token param after nested resolution.
	 * @param string     $context  Context modifier after nested resolution.
	 * @param int        $post_id  Resolved post ID.
	 */
	return apply_filters( 'motto_blocks_resolve_wildcard', null, $resolver, $param, $context, $post_id );
}

/**
 * Resolve a dynamic value recursively using the shared wildcard engine.
 *
 * Exact wildcard strings preserve native resolver return types. Embedded
 * wildcard fragments inside longer strings resolve to strings.
 *
 * @param mixed $value Raw value.
 * @param array $options Engine options.
 * @return mixed
 */
function motto_blocks_resolve_dynamic_value( $value, array $options = array() ) {
	if ( is_array( $value ) ) {
		foreach ( $value as $key => $item ) {
			$value[ $key ] = motto_blocks_resolve_dynamic_value( $item, $options );
		}

		return $value;
	}

	if ( ! is_string( $value ) || '' === $value ) {
		return $value;
	}

	$exact_token = motto_blocks_get_exact_wildcard_token( $value );
	if ( null !== $exact_token ) {
		$resolved = motto_blocks_resolve_wildcard_token( $exact_token, $options );
		if ( null !== $resolved ) {
			return $resolved;
		}
	}

	return motto_blocks_resolve_wildcards_in_string( $value, $options );
}

/**
 * Resolve all wildcard tokens found in a string.
 *
 * Non-wildcard text is preserved as-is. Unresolvable tokens are left unchanged.
 *
 * @param string $value Raw string value.
 * @param array  $options Engine options.
 * @return string
 */
function motto_blocks_resolve_wildcards_in_string( string $value, array $options = array() ): string {
	$result = '';
	$offset = 0;

	while ( null !== ( $match = motto_blocks_find_next_wildcard_token( $value, $offset ) ) ) {
		$result .= substr( $value, $offset, $match['start'] - $offset );

		$resolved = motto_blocks_resolve_wildcard_token( $match['token'], $options );
		if ( null === $resolved || is_array( $resolved ) || is_object( $resolved ) ) {
			$result .= $match['token'];
		} else {
			$result .= (string) $resolved;
		}

		$offset = $match['end'];
	}

	if ( $offset < strlen( $value ) ) {
		$result .= substr( $value, $offset );
	}

	return $result;
}

// REST endpoints — return merged wildcard catalog + category registry for editor popups.
add_action(
	'rest_api_init',
	function () {
		register_rest_route(
			'motto-blocks/v1',
			'/wildcards',
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => function () {
					return rest_ensure_response( array_values( motto_blocks_get_wildcards() ) );
				},
				'permission_callback' => function () {
					return current_user_can( 'edit_posts' );
				},
			]
		);

		register_rest_route(
			'motto-blocks/v1',
			'/wildcard-categories',
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => function () {
					return rest_ensure_response( array_values( motto_blocks_get_wildcard_categories() ) );
				},
				'permission_callback' => function () {
					return current_user_can( 'edit_posts' );
				},
			]
		);
	}
);
