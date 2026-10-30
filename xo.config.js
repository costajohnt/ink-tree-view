import base from '@costajohnt/ink-config/xo';

/**
@type {import('xo').FlatXoConfig}
*/
const xoConfig = [
	...base,
	{
		// Rules this codebase does not satisfy yet under the shared config.
		// Burn these down by fixing the code and deleting the line.
		rules: {
			'@eslint-react/naming-convention-ref-name': 'off',
			'@stylistic/brace-style': 'off',
			'@stylistic/curly-newline': 'off',
			'@stylistic/max-statements-per-line': 'off',
			'@typescript-eslint/strict-boolean-expressions': 'off',
			'@typescript-eslint/switch-exhaustiveness-check': 'off',
			complexity: 'off',
			'jsx-a11y-x/aria-props': 'off',
			'react-hooks/refs': 'off',
			'unicorn/consistent-boolean-name': 'off',
			'unicorn/no-immediate-mutation': 'off',
			'unicorn/prefer-early-return': 'off',
			'unicorn/prefer-minimal-ternary': 'off',
		},
	},
	{
		files: ['test/**', 'src/**/__tests__/**'],
		rules: {
			'@eslint-react/use-state': 'off',
			'@typescript-eslint/no-empty-function': 'off',
			'unicorn/prefer-promise-with-resolvers': 'off',
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
			'package-json/prefer-side-effects-field': 'off',
		},
	},
];

export default xoConfig;
