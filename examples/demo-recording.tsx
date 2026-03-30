import React from 'react';
import {render, Box, Text} from 'ink';
import {TreeView, type TreeNode} from 'ink-tree-view';

const projectTree: Array<TreeNode> = [
	{
		id: 'src',
		label: 'src/',
		children: [
			{
				id: 'components',
				label: 'components/',
				children: [
					{id: 'tree-view', label: 'tree-view.tsx'},
					{id: 'tree-node', label: 'tree-view-node.tsx'},
					{id: 'theme', label: 'theme.ts'},
				],
			},
			{
				id: 'hooks',
				label: 'hooks/',
				children: [
					{id: 'use-tree-state', label: 'use-tree-view-state.ts'},
					{id: 'use-tree-view', label: 'use-tree-view.ts'},
				],
			},
			{id: 'types', label: 'types.ts'},
			{id: 'index', label: 'index.ts'},
		],
	},
	{
		id: 'test',
		label: 'test/',
		children: [
			{id: 'tree-view-test', label: 'tree-view.test.tsx'},
			{id: 'state-test', label: 'use-tree-view-state.test.tsx'},
			{id: 'node-map-test', label: 'tree-node-map.test.ts'},
		],
	},
	{
		id: 'examples',
		label: 'examples/',
		children: [
			{id: 'basic-example', label: 'basic.tsx'},
			{id: 'demo-example', label: 'demo-recording.tsx'},
		],
	},
	{id: 'package-json', label: 'package.json'},
	{id: 'tsconfig', label: 'tsconfig.json'},
	{id: 'readme', label: 'README.md'},
	{id: 'license', label: 'LICENSE'},
];

function App() {
	return (
		<Box flexDirection="column" paddingTop={1}>
			<Box marginBottom={1}>
				<Text bold color="blue">
					ink-tree-view
				</Text>
				<Text dimColor> -- interactive tree for the terminal</Text>
			</Box>
			<TreeView
				data={projectTree}
				defaultExpanded={new Set(['src', 'components', 'test'])}
				selectionMode="single"
			/>
		</Box>
	);
}

render(<App />);
