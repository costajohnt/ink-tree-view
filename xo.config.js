/** @type {import('xo').FlatXoConfig} */
const xoConfig = [
	{
		ignores: ['examples/**', 'tsup.config.ts', 'vitest.config.ts'],
	},
	{
		react: true,
		rules: {
			'@typescript-eslint/no-explicit-any': 'error',
			'react/react-in-jsx-scope': 'off',
			'react/prop-types': 'off',
			'@typescript-eslint/consistent-type-definitions': ['error', 'type'],
			// Disabled: XO's stylistic rules conflict with Ink JSX patterns
			'@stylistic/jsx-quotes': 'off',
			'@stylistic/operator-linebreak': 'off',
			'@stylistic/function-paren-newline': 'off',
			'@stylistic/no-trailing-spaces': 'off',
			'@stylistic/eol-last': 'off',
			'@stylistic/key-spacing': 'off',
			'@stylistic/jsx-tag-spacing': 'off',
			'react/jsx-closing-tag-location': 'off',
			'react/jsx-sort-props': 'off',
			'react/no-array-index-key': 'off',
			'capitalized-comments': 'off',
			'require-unicode-regexp': 'off',
			'unicorn/prefer-at': 'off',
			'@typescript-eslint/no-unnecessary-type-assertion': 'off',
			'@typescript-eslint/strict-void-return': 'off',
			'react/jsx-indent': 'off',
			'react/jsx-indent-props': 'off',
			'react/jsx-tag-spacing': 'off',
			'react/prefer-read-only-props': 'off',
			'react/boolean-prop-naming': 'off',
			'unicorn/no-hex-escape': 'off',
			'new-cap': 'off',
			'no-promise-executor-return': 'off',
			// Disabled: conflict with this package's established structure.
			// The reducer is intentionally one large switch, and the flattened
			// node map declares fields/methods grouped by visibility.
			complexity: 'off',
			'@typescript-eslint/member-ordering': 'off',
			// The reducer keeps a defensive `default` case on an exhaustive union.
			'@typescript-eslint/switch-exhaustiveness-check': 'off',
			// The hooks store latest values in refs during render (a standard
			// React "latest ref" pattern) which this rule flags.
			'react-hooks/refs': 'off',
			// Concise `() => dispatch(...)` action creators return void.
			'@typescript-eslint/no-confusing-void-expression': [
				'error',
				{ignoreArrowShorthand: true},
			],
		},
	},
	{
		files: ['test/**'],
		rules: {
			'@typescript-eslint/no-floating-promises': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			// Upper-case key-sequence constants and noop callbacks in tests.
			'@typescript-eslint/naming-convention': 'off',
			'@typescript-eslint/no-empty-function': 'off',
			// `vi` is the vitest global; do not expand it.
			'unicorn/prevent-abbreviations': 'off',
			// Test fixtures use the `Array<T>` generic form throughout.
			'@typescript-eslint/array-type': 'off',
			// Mock factories legitimately return promises without being async.
			'@typescript-eslint/promise-function-async': 'off',
			// Formatting-only rules that fight the existing test layout.
			'@stylistic/object-curly-newline': 'off',
			'@stylistic/curly-newline': 'off',
		},
	},
];

export default xoConfig;
