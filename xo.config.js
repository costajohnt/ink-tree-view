import base from '@costajohnt/ink-config/xo';

/** @type {import('xo').FlatXoConfig} */
const xoConfig = [
	...base,
	{
		// Rules this codebase does not satisfy yet under the shared config.
		// Burn these down by fixing the code and deleting the line.
		rules: {
			'@eslint-react/naming-convention-ref-name': 'off',
			'@typescript-eslint/no-confusing-void-expression': 'off',
			'@typescript-eslint/strict-boolean-expressions': 'off',
			'@typescript-eslint/switch-exhaustiveness-check': 'off',
			complexity: 'off',
			'jsdoc/require-asterisk-prefix': 'off',
			'jsx-a11y-x/aria-props': 'off',
			'react-hooks/refs': 'off',
			'unicorn/consistent-boolean-name': 'off',
			'unicorn/no-immediate-mutation': 'off',
			'unicorn/no-useless-recursion': 'off',
			'unicorn/prefer-early-return': 'off',
			'unicorn/prefer-export-from': 'off',
			'unicorn/prefer-ternary': 'off',
			'unicorn/prefer-unicode-code-point-escapes': 'off',
			'unicorn/single-line-block-comment-style': 'off',
			'xo/import-specifier-newline': 'off',
		},
	},
	{
		files: ['test/**', 'src/**/__tests__/**'],
		rules: {
			'@eslint-react/use-state': 'off',
			'@stylistic/object-curly-newline': 'off',
			'@typescript-eslint/array-type': 'off',
			'@typescript-eslint/no-empty-function': 'off',
			'@typescript-eslint/promise-function-async': 'off',
			'unicorn/prefer-promise-with-resolvers': 'off',
			'unicorn/prefer-string-repeat': 'off',
		},
	},
	{
		files: ['**/*.md'],
		rules: {
			'markdown/fenced-code-language': 'off',
		},
	},
	{
		files: ['package.json'],
		rules: {
			'package-json/prefer-shorthand': 'off',
			'package-json/prefer-side-effects-field': 'off',
			'package-json/sort-properties': 'off',
		},
	},
];

export default xoConfig;
