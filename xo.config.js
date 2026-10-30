import base from '@costajohnt/ink-config/xo';

/**
@type {import('xo').FlatXoConfig}
*/
const xoConfig = [
	...base,
	{
		files: ['src/components/tree-view/use-tree-view-state.ts'],
		rules: {
			// `reducer` is intentionally one switch over every action type; splitting it scatters the state machine.
			complexity: 'off',
			// The reducer's `default` returns state unchanged as a guard against unknown actions at runtime.
			'@typescript-eslint/switch-exhaustiveness-check': 'off',
		},
	},
];

export default xoConfig;
