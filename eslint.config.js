import js from "@eslint/js";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
	// Global ignores
	{
		ignores: [
			"node_modules/**",
			"build/**",
			"assets/**",
			"scripts/**",
			"src/components/lucide/lucide-registry.js",
		],
	},

	// Base JS rules
	{
		...js.configs.recommended,
		files: ["src/**/*.{js,jsx}"],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: "module",
			parserOptions: {
				ecmaFeatures: { jsx: true },
			},
			globals: {
				...globals.browser,
				wp: "readonly",
				process: "readonly",
			},
		},
		rules: {
			"no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
			"no-undef": "error",
			"no-console": ["warn", { allow: ["error", "warn"] }],
		},
	},

	// Test files — Node/Vitest environment (adds `global`, `process`, etc.)
	{
		files: ["src/**/*.test.{js,jsx}"],
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
	},

	// React rules
	{
		files: ["src/**/*.{js,jsx}"],
		plugins: {
			react: reactPlugin,
			"react-hooks": reactHooks,
		},
		settings: {
			react: { version: "detect" },
		},
		rules: {
			...reactPlugin.configs.recommended.rules,
			...reactHooks.configs.recommended.rules,
			// WordPress/Gutenberg uses React in scope globally
			"react/react-in-jsx-scope": "off",
			// Prop-types not used in this codebase
			"react/prop-types": "off",
			// Display name is impractical with addFilter HOC patterns
			"react/display-name": "off",
			// Gutenberg uses lowercase `edit` functions as React components.
			// ESLint doesn't detect these as components, so rules-of-hooks
			// would fire false positives. Warn instead of error.
			"react-hooks/rules-of-hooks": "warn",
			// exhaustive-deps as warn (many hooks predate this rule)
			"react-hooks/exhaustive-deps": "warn",
		},
	},

	// Gutenberg block entrypoints use lowercase `edit` by convention.
	// The hook rule treats those callbacks as non-components and reports
	// false positives. Keep the rule active elsewhere.
	{
		files: ["src/blocks/**/index.jsx", "src/pro/blocks/**/index.jsx"],
		rules: {
			"react-hooks/rules-of-hooks": "off",
		},
	},
];
