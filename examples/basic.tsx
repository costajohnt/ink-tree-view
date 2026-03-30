import React from 'react';
import {render} from 'ink';
import {TreeView, type TreeNode} from 'ink-tree-view';

const fileTree: Array<TreeNode> = [
	{
		id: 'src',
		label: 'src',
		children: [
			{
				id: 'components',
				label: 'components',
				children: [
					{id: 'button', label: 'button.tsx'},
					{id: 'input', label: 'input.tsx'},
					{id: 'select', label: 'select.tsx'},
				],
			},
			{
				id: 'hooks',
				label: 'hooks',
				children: [
					{id: 'use-state', label: 'use-state.ts'},
					{id: 'use-effect', label: 'use-effect.ts'},
				],
			},
			{id: 'index', label: 'index.ts'},
		],
	},
	{
		id: 'test',
		label: 'test',
		children: [
			{id: 'button-test', label: 'button.test.tsx'},
			{id: 'input-test', label: 'input.test.tsx'},
		],
	},
	{id: 'package-json', label: 'package.json'},
	{id: 'tsconfig', label: 'tsconfig.json'},
	{id: 'readme', label: 'README.md'},
];

function App() {
	return (
		<TreeView
			data={fileTree}
			defaultExpanded={new Set(['src'])}
			onFocusChange={nodeId => {
				// eslint-disable-next-line no-console
				console.log('Focused:', nodeId);
			}}
			onExpandChange={expandedIds => {
				// eslint-disable-next-line no-console
				console.log('Expanded:', [...expandedIds]);
			}}
		/>
	);
}

render(<App />);
