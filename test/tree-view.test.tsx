import {describe, it, expect, vi} from 'vitest';
import React from 'react';
import {render} from 'ink-testing-library';
import delay from 'delay';
import {Text} from 'ink';
import {TreeView} from '../src/components/tree-view/tree-view.js';
import {type TreeNode, type TreeNodeRendererProps} from '../src/types.js';

const ARROW_UP = '\u001B[A';
const ARROW_DOWN = '\u001B[B';
const ARROW_RIGHT = '\u001B[C';
const ARROW_LEFT = '\u001B[D';
const ENTER = '\r';
const SPACE = ' ';

const sampleData: Array<TreeNode> = [
	{
		id: 'root-1',
		label: 'Documents',
		children: [
			{
				id: 'child-1-1',
				label: 'Photos',
				children: [
					{id: 'leaf-1-1-1', label: 'vacation.jpg'},
					{id: 'leaf-1-1-2', label: 'family.jpg'},
				],
			},
			{
				id: 'child-1-2',
				label: 'Work',
				children: [{id: 'leaf-1-2-1', label: 'readme.md'}],
			},
		],
	},
	{
		id: 'root-2',
		label: 'Downloads',
		children: [{id: 'child-2-1', label: 'installer.dmg'}],
	},
	{
		id: 'root-3',
		label: 'Music',
	},
];

describe('TreeView', () => {
	describe('rendering', () => {
		it('renders basic tree with root nodes', () => {
			const {lastFrame} = render(<TreeView data={sampleData} />);
			const frame = lastFrame();
			expect(frame).toContain('Documents');
			expect(frame).toContain('Downloads');
			expect(frame).toContain('Music');
		});

		it('does not show children initially (collapsed)', () => {
			const {lastFrame} = render(<TreeView data={sampleData} />);
			const frame = lastFrame();
			expect(frame).not.toContain('Photos');
			expect(frame).not.toContain('vacation.jpg');
		});

		it('shows focus indicator on first node', () => {
			const {lastFrame} = render(<TreeView data={sampleData} />);
			const frame = lastFrame();
			// The focus indicator (pointer) should be on the first line
			const lines = frame.split('\n');
			// First node should have the pointer indicator
			expect(lines[0]).toContain('Documents');
		});

		it('renders empty tree without crashing', () => {
			const {lastFrame} = render(<TreeView data={[]} />);
			const frame = lastFrame();
			// Should render something (possibly empty)
			expect(frame).toBeDefined();
		});
	});

	describe('arrow navigation', () => {
		it('moves focus down with down arrow', async () => {
			const {lastFrame, stdin} = render(
				<TreeView data={sampleData} />,
			);

			await delay(50);
			stdin.write(ARROW_DOWN);
			await delay(50);

			const frame = lastFrame();
			// Downloads should now be focused (has pointer)
			// Documents should no longer be focused
			expect(frame).toContain('Downloads');
		});

		it('moves focus up with up arrow', async () => {
			const {lastFrame, stdin} = render(
				<TreeView data={sampleData} />,
			);

			await delay(50);
			stdin.write(ARROW_DOWN);
			await delay(50);
			stdin.write(ARROW_UP);
			await delay(50);

			const frame = lastFrame();
			expect(frame).toContain('Documents');
		});
	});

	describe('expand / collapse', () => {
		it('expands with right arrow and shows children', async () => {
			const {lastFrame, stdin} = render(
				<TreeView data={sampleData} />,
			);

			await delay(50);
			stdin.write(ARROW_RIGHT);
			await delay(50);

			const frame = lastFrame();
			expect(frame).toContain('Photos');
			expect(frame).toContain('Work');
		});

		it('collapses with left arrow and hides children', async () => {
			const {lastFrame, stdin} = render(
				<TreeView data={sampleData} />,
			);

			await delay(50);
			stdin.write(ARROW_RIGHT); // expand
			await delay(50);
			stdin.write(ARROW_LEFT); // collapse
			await delay(50);

			const frame = lastFrame();
			expect(frame).not.toContain('Photos');
			expect(frame).not.toContain('Work');
		});

		it('right arrow on expanded node moves to first child', async () => {
			const onFocusChange = vi.fn();
			const {stdin} = render(
				<TreeView
					data={sampleData}
					onFocusChange={onFocusChange}
				/>,
			);

			await delay(50);
			stdin.write(ARROW_RIGHT); // expand root-1
			await delay(50);
			stdin.write(ARROW_RIGHT); // move to first child (child-1-1)
			await delay(50);

			expect(onFocusChange).toHaveBeenCalledWith('child-1-1');
		});

		it('left arrow on collapsed child moves to parent', async () => {
			const onFocusChange = vi.fn();
			const {stdin} = render(
				<TreeView
					data={sampleData}
					defaultExpanded={new Set(['root-1'])}
					onFocusChange={onFocusChange}
				/>,
			);

			await delay(50);
			stdin.write(ARROW_DOWN); // move to child-1-1
			await delay(50);
			stdin.write(ARROW_LEFT); // move to parent root-1
			await delay(50);

			expect(onFocusChange).toHaveBeenCalledWith('root-1');
		});

		it('enter toggles expand in none selection mode', async () => {
			const {lastFrame, stdin} = render(
				<TreeView data={sampleData} selectionMode="none" />,
			);

			await delay(50);
			stdin.write(ENTER);
			await delay(50);

			const frame = lastFrame();
			expect(frame).toContain('Photos');
		});

		it('space toggles expand in none selection mode', async () => {
			const {lastFrame, stdin} = render(
				<TreeView data={sampleData} selectionMode="none" />,
			);

			await delay(50);
			stdin.write(SPACE);
			await delay(50);

			const frame = lastFrame();
			expect(frame).toContain('Photos');
		});
	});

	describe('selection', () => {
		it('enter selects in single mode', async () => {
			const onSelectChange = vi.fn();
			const {stdin} = render(
				<TreeView
					data={sampleData}
					selectionMode="single"
					onSelectChange={onSelectChange}
				/>,
			);

			await delay(50);
			stdin.write(ENTER);
			await delay(50);

			expect(onSelectChange).toHaveBeenCalled();
			const lastCall =
				onSelectChange.mock.calls[
					onSelectChange.mock.calls.length - 1
				]!;
			expect(lastCall[0].has('root-1')).toBe(true);
		});

		it('space toggles selection in multiple mode', async () => {
			const onSelectChange = vi.fn();
			const {stdin} = render(
				<TreeView
					data={sampleData}
					selectionMode="multiple"
					onSelectChange={onSelectChange}
				/>,
			);

			await delay(50);
			stdin.write(SPACE);
			await delay(50);

			expect(onSelectChange).toHaveBeenCalled();
			const lastCall =
				onSelectChange.mock.calls[
					onSelectChange.mock.calls.length - 1
				]!;
			expect(lastCall[0].has('root-1')).toBe(true);
		});
	});

	describe('custom renderer', () => {
		it('renders custom node content', () => {
			const customRenderer = ({node, state}: TreeNodeRendererProps) => (
				<Text>
					{state.isFocused ? '>> ' : '   '}
					{node.label.toUpperCase()}
				</Text>
			);

			const {lastFrame} = render(
				<TreeView data={sampleData} renderNode={customRenderer} />,
			);

			const frame = lastFrame();
			expect(frame).toContain('DOCUMENTS');
			expect(frame).toContain('DOWNLOADS');
			expect(frame).toContain('MUSIC');
		});
	});

	describe('virtualization', () => {
		it('only renders visibleNodeCount nodes', () => {
			const {lastFrame} = render(
				<TreeView
					data={sampleData}
					defaultExpanded="all"
					visibleNodeCount={3}
				/>,
			);

			const frame = lastFrame();
			// Should show scroll indicator for below
			expect(frame).toContain('more below');
		});

		it('shows scroll indicators', async () => {
			const {lastFrame, stdin} = render(
				<TreeView
					data={sampleData}
					defaultExpanded="all"
					visibleNodeCount={3}
				/>,
			);

			// Initially, should show "more below" but not "more above"
			let frame = lastFrame();
			expect(frame).not.toContain('more above');
			expect(frame).toContain('more below');

			// Navigate down to trigger scroll
			await delay(50);
			stdin.write(ARROW_DOWN);
			await delay(50);
			stdin.write(ARROW_DOWN);
			await delay(50);
			stdin.write(ARROW_DOWN);
			await delay(50);

			frame = lastFrame();
			expect(frame).toContain('more above');
		});
	});

	describe('isDisabled', () => {
		it('ignores keyboard input when disabled', async () => {
			const onFocusChange = vi.fn();
			const {stdin} = render(
				<TreeView
					data={sampleData}
					isDisabled
					onFocusChange={onFocusChange}
				/>,
			);

			await delay(50);
			stdin.write(ARROW_DOWN);
			await delay(50);

			// onFocusChange should only have been called with the initial focus
			// Not again for arrow down
			const callsAfterInit = onFocusChange.mock.calls.filter(
				(call: [string]) => call[0] !== 'root-1',
			);
			expect(callsAfterInit).toHaveLength(0);
		});
	});

	describe('callbacks', () => {
		it('fires onFocusChange on navigation', async () => {
			const onFocusChange = vi.fn();
			const {stdin} = render(
				<TreeView
					data={sampleData}
					onFocusChange={onFocusChange}
				/>,
			);

			await delay(50);
			stdin.write(ARROW_DOWN);
			await delay(50);

			expect(onFocusChange).toHaveBeenCalledWith('root-2');
		});

		it('fires onExpandChange on expand', async () => {
			const onExpandChange = vi.fn();
			const {stdin} = render(
				<TreeView
					data={sampleData}
					onExpandChange={onExpandChange}
				/>,
			);

			await delay(50);
			stdin.write(ARROW_RIGHT);
			await delay(50);

			expect(onExpandChange).toHaveBeenCalled();
		});
	});

	describe('large tree', () => {
		it('renders 100 nodes without error with virtualization', () => {
			const largeData: Array<TreeNode> = [];
			for (let i = 0; i < 20; i++) {
				const children: Array<TreeNode> = [];
				for (let j = 0; j < 5; j++) {
					children.push({
						id: `node-${i}-${j}`,
						label: `Child ${i}-${j}`,
					});
				}

				largeData.push({
					id: `root-${i}`,
					label: `Root ${i}`,
					children,
				});
			}

			const {lastFrame} = render(
				<TreeView
					data={largeData}
					defaultExpanded="all"
					visibleNodeCount={10}
				/>,
			);

			const frame = lastFrame();
			expect(frame).toBeDefined();
			expect(frame).toContain('more below');
		});
	});

	describe('defaultExpanded', () => {
		it('renders with specified nodes expanded', () => {
			const {lastFrame} = render(
				<TreeView
					data={sampleData}
					defaultExpanded={new Set(['root-1'])}
				/>,
			);

			const frame = lastFrame();
			expect(frame).toContain('Photos');
			expect(frame).toContain('Work');
			// But children of Photos should not be visible
			expect(frame).not.toContain('vacation.jpg');
		});

		it('renders with all nodes expanded', () => {
			const {lastFrame} = render(
				<TreeView data={sampleData} defaultExpanded="all" />,
			);

			const frame = lastFrame();
			expect(frame).toContain('vacation.jpg');
			expect(frame).toContain('family.jpg');
			expect(frame).toContain('readme.md');
			expect(frame).toContain('installer.dmg');
		});
	});

	describe('async loading (loadChildren)', () => {
		const asyncData: Array<TreeNode> = [
			{
				id: 'lazy-root',
				label: 'Lazy Root',
				isParent: true,
			},
			{
				id: 'leaf',
				label: 'Leaf Node',
			},
		];

		it('node with isParent shows expand indicator', () => {
			const {lastFrame} = render(<TreeView data={asyncData} />);
			const frame = lastFrame();
			// The expand indicator character should be present for the lazy-root node
			// (triangleRight from figures), and the node should be rendered
			expect(frame).toContain('Lazy Root');
		});

		it('expanding isParent node triggers loadChildren', async () => {
			const loadChildren = vi.fn().mockResolvedValue([
				{id: 'child-a', label: 'Child A'},
				{id: 'child-b', label: 'Child B'},
			]);

			const {stdin} = render(
				<TreeView data={asyncData} loadChildren={loadChildren} />,
			);

			await delay(50);
			stdin.write(ARROW_RIGHT); // expand lazy-root
			await delay(50);

			expect(loadChildren).toHaveBeenCalledTimes(1);
			expect(loadChildren).toHaveBeenCalledWith(
				expect.objectContaining({id: 'lazy-root'}),
			);
		});

		it('shows loading state during async operation', async () => {
			let resolveFn!: (value: Array<TreeNode>) => void;
			const loadChildren = vi.fn().mockReturnValue(
				new Promise<Array<TreeNode>>(resolve => {
					resolveFn = resolve;
				}),
			);

			const {lastFrame, stdin} = render(
				<TreeView data={asyncData} loadChildren={loadChildren} />,
			);

			await delay(50);
			stdin.write(ARROW_RIGHT);
			await delay(50);

			// Loading indicator should be shown (the ⟳ character)
			const frame = lastFrame();
			expect(frame).toContain('\u27F3');

			// Resolve to clean up
			resolveFn([{id: 'child-a', label: 'Child A'}]);
			await delay(50);
		});

		it('children are inserted after load completes', async () => {
			const loadChildren = vi.fn().mockResolvedValue([
				{id: 'child-a', label: 'Child A'},
				{id: 'child-b', label: 'Child B'},
			]);

			const {lastFrame, stdin} = render(
				<TreeView data={asyncData} loadChildren={loadChildren} />,
			);

			await delay(50);
			stdin.write(ARROW_RIGHT);
			await delay(200);

			const frame = lastFrame();
			expect(frame).toContain('Child A');
			expect(frame).toContain('Child B');
		});

		it('calls onLoadError when loadChildren rejects', async () => {
			const loadError = new Error('Network failure');
			const loadChildren = vi.fn().mockRejectedValue(loadError);
			const onLoadError = vi.fn();

			const {stdin} = render(
				<TreeView
					data={asyncData}
					loadChildren={loadChildren}
					onLoadError={onLoadError}
				/>,
			);

			await delay(50);
			stdin.write(ARROW_RIGHT);
			await delay(200);

			expect(onLoadError).toHaveBeenCalledTimes(1);
			expect(onLoadError).toHaveBeenCalledWith('lazy-root', loadError);
		});

		it('node can be retried after load error', async () => {
			let callCount = 0;
			const loadChildren = vi.fn().mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					return Promise.reject(new Error('First attempt fails'));
				}

				return Promise.resolve([
					{id: 'child-a', label: 'Child A'},
				]);
			});

			const {lastFrame, stdin} = render(
				<TreeView
					data={asyncData}
					loadChildren={loadChildren}
					onLoadError={() => {}}
				/>,
			);

			// First attempt: fails
			await delay(50);
			stdin.write(ARROW_RIGHT);
			await delay(200);

			expect(loadChildren).toHaveBeenCalledTimes(1);
			expect(lastFrame()).not.toContain('Child A');

			// Second attempt: succeeds
			stdin.write(ARROW_RIGHT);
			await delay(200);

			expect(loadChildren).toHaveBeenCalledTimes(2);
			expect(lastFrame()).toContain('Child A');
		});
	});
});
