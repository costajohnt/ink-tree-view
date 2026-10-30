import {
	describe,
	it,
	expect,
	vi,
} from 'vitest';
import React from 'react';
import {render} from 'ink-testing-library';
import {Text} from 'ink';
import {TreeView} from '../src/components/tree-view/tree-view.js';
import {
	buildNodeAriaLabel,
	areTreeViewNodePropsEqual,
} from '../src/components/tree-view/tree-view-node.js';
import theme from '../src/components/tree-view/theme.js';
import {type TreeNode, type TreeNodeRendererProps, type TreeNodeState} from '../src/types.js';

const ARROW_UP = '\u{1B}[A';
const ARROW_DOWN = '\u{1B}[B';
const ARROW_RIGHT = '\u{1B}[C';
const ARROW_LEFT = '\u{1B}[D';
const ENTER = '\r';
const SPACE = ' ';
const ESC = String.fromCodePoint(27);
const HOME = `${ESC}[H`;
const END = `${ESC}[F`;
const PAGE_UP = `${ESC}[5~`;
const PAGE_DOWN = `${ESC}[6~`;

type Stdin = ReturnType<typeof render>['stdin'];
type LastFrame = () => string | undefined;

/**
 Flush a handful of macrotask turns so pending renders, effects, and mocked
 promises settle. Used after a successful wait, and before NEGATIVE
 assertions where there is no positive condition to poll for. All async work
 in these tests is microtask/timer-0 based, so a fixed number of event-loop
 turns is deterministic regardless of machine load.
 */
async function settle(turns = 10): Promise<void> {
	if (turns <= 0) {
		return;
	}

	await new Promise(resolve => {
		setTimeout(resolve, 0);
	});
	await settle(turns - 1);
}

/**
 Poll until `assertion` stops throwing, or fail with its last error after
 `timeoutMs`. Deterministic replacement for fixed sleeps: passes as soon as
 the condition holds, only times out when the condition genuinely never does.
 
 After the condition holds, flush a few macrotask turns: ink's `useInput`
 re-attaches its stdin listener in a passive effect after every render, so a
 keypress written the instant a new frame is visible (commit happens before
 effects) can be dropped. The flush lets effects settle before the caller's
 next `stdin.write`.
 */
async function waitFor(assertion: () => void, timeoutMs = 5000): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	const poll = async (): Promise<void> => {
		try {
			assertion();
		} catch (error) {
			if (Date.now() >= deadline) {
				throw error;
			}

			await new Promise(resolve => {
				setTimeout(resolve, 10);
			});
			await poll();
		}
	};

	await poll();
	await settle();
}

/**
Wait until ink has attached its stdin listener, so the first keypress is not dropped.
*/
async function waitForInput(stdin: Stdin): Promise<void> {
	await waitFor(() => {
		if (stdin.listenerCount('readable') === 0) {
			throw new Error('ink has not attached its stdin listener yet');
		}
	});
}

/**
Write `key` and poll until the frame re-renders.
*/
async function press(lastFrame: LastFrame, stdin: Stdin, key: string): Promise<void> {
	const before = lastFrame();
	stdin.write(key);
	await waitFor(() => {
		if (lastFrame() === before) {
			throw new Error('Frame did not change');
		}
	});
}

/**
Write `key` when no visible change is expected, then let it be processed.
*/
async function pressWithoutChange(stdin: Stdin, key: string): Promise<void> {
	stdin.write(key);
	await settle();
}

const sampleData: TreeNode[] = [
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

		it('applies a custom theme merged over the default', () => {
			// Default: unfocused rows get paddingLeft 2. Override to 6 and the
			// unfocused root rows shift right by four columns.
			const customTheme = {
				styles: {
					node: ({isFocused}: {isFocused?: boolean}) => ({
						gap: 1,
						paddingLeft: isFocused ? 0 : 6,
					}),
				},
			};

			const defaultFrame = render(<TreeView data={sampleData} />).lastFrame();
			const {lastFrame} = render(
				<TreeView data={sampleData} theme={customTheme} />,
			);
			const themedFrame = lastFrame();

			// Downloads is unfocused (focus starts on Documents)
			const defaultLine = defaultFrame!.split('\n').find(line => line.includes('Downloads'));
			const themedLine = themedFrame!.split('\n').find(line => line.includes('Downloads'));
			expect(defaultLine).toMatch(/^ {2}\S/);
			expect(themedLine).toMatch(/^ {6}\S/);

			// Untouched styles still come from the default theme
			expect(themedFrame).toContain('Documents');
			expect(themedFrame).toContain('Music');
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

			await waitForInput(stdin);
			await press(lastFrame, stdin, ARROW_DOWN);

			const frame = lastFrame();
			// Downloads should now be focused (has pointer)
			// Documents should no longer be focused
			expect(frame).toContain('Downloads');
		});

		it('moves focus up with up arrow', async () => {
			const {lastFrame, stdin} = render(
				<TreeView data={sampleData} />,
			);

			await waitForInput(stdin);
			const initialFrame = lastFrame();
			await press(lastFrame, stdin, ARROW_DOWN);
			await press(lastFrame, stdin, ARROW_UP);

			const frame = lastFrame();
			expect(frame).toContain('Documents');
			expect(frame).toBe(initialFrame);
		});
	});

	describe('expand / collapse', () => {
		it('expands with right arrow and shows children', async () => {
			const {lastFrame, stdin} = render(
				<TreeView data={sampleData} />,
			);

			await waitForInput(stdin);
			await press(lastFrame, stdin, ARROW_RIGHT);

			const frame = lastFrame();
			expect(frame).toContain('Photos');
			expect(frame).toContain('Work');
		});

		it('collapses with left arrow and hides children', async () => {
			const {lastFrame, stdin} = render(
				<TreeView data={sampleData} />,
			);

			await waitForInput(stdin);
			await press(lastFrame, stdin, ARROW_RIGHT); // expand
			await press(lastFrame, stdin, ARROW_LEFT); // collapse

			const frame = lastFrame();
			expect(frame).not.toContain('Photos');
			expect(frame).not.toContain('Work');
		});

		it('right arrow on expanded node moves to first child', async () => {
			const onFocusChange = vi.fn();
			const {lastFrame, stdin} = render(
				<TreeView
					data={sampleData}
					onFocusChange={onFocusChange}
				/>,
			);

			await waitForInput(stdin);
			await press(lastFrame, stdin, ARROW_RIGHT); // expand root-1
			stdin.write(ARROW_RIGHT); // move to first child (child-1-1)

			await waitFor(() => {
				expect(onFocusChange).toHaveBeenCalledWith('child-1-1');
			});
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

			await waitForInput(stdin);
			stdin.write(ARROW_DOWN); // move to child-1-1
			await waitFor(() => {
				expect(onFocusChange).toHaveBeenLastCalledWith('child-1-1');
			});
			stdin.write(ARROW_LEFT); // move to parent root-1

			await waitFor(() => {
				expect(onFocusChange).toHaveBeenLastCalledWith('root-1');
			});
		});

		it('enter toggles expand in none selection mode', async () => {
			const {lastFrame, stdin} = render(
				<TreeView data={sampleData} selectionMode="none" />,
			);

			await waitForInput(stdin);
			await press(lastFrame, stdin, ENTER);

			const frame = lastFrame();
			expect(frame).toContain('Photos');
		});

		it('space toggles expand in none selection mode', async () => {
			const {lastFrame, stdin} = render(
				<TreeView data={sampleData} selectionMode="none" />,
			);

			await waitForInput(stdin);
			await press(lastFrame, stdin, SPACE);

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

			await waitForInput(stdin);
			stdin.write(ENTER);

			await waitFor(() => {
				expect(onSelectChange).toHaveBeenCalled();
			});
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

			await waitForInput(stdin);
			stdin.write(SPACE);

			await waitFor(() => {
				expect(onSelectChange).toHaveBeenCalled();
			});
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
					{state.isFocused ? '>> ' : ' '.repeat(3)}
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
			await waitForInput(stdin);
			await press(lastFrame, stdin, ARROW_DOWN);
			await press(lastFrame, stdin, ARROW_DOWN);
			await press(lastFrame, stdin, ARROW_DOWN);

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

			await settle();
			await pressWithoutChange(stdin, ARROW_DOWN);

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

			await waitForInput(stdin);
			stdin.write(ARROW_DOWN);

			await waitFor(() => {
				expect(onFocusChange).toHaveBeenCalledWith('root-2');
			});
		});

		it('fires onExpandChange on expand', async () => {
			const onExpandChange = vi.fn();
			const {stdin} = render(
				<TreeView
					data={sampleData}
					onExpandChange={onExpandChange}
				/>,
			);

			await waitForInput(stdin);
			stdin.write(ARROW_RIGHT);

			await waitFor(() => {
				expect(onExpandChange).toHaveBeenCalled();
			});
		});
	});

	describe('large tree', () => {
		it('renders 100 nodes without error with virtualization', () => {
			const largeData: TreeNode[] = [];
			for (let i = 0; i < 20; i++) {
				const children: TreeNode[] = [];
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
		const asyncData: TreeNode[] = [
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

			await waitForInput(stdin);
			stdin.write(ARROW_RIGHT); // expand lazy-root

			await waitFor(() => {
				expect(loadChildren).toHaveBeenCalledTimes(1);
			});
			expect(loadChildren).toHaveBeenCalledWith(
				expect.objectContaining({id: 'lazy-root'}),
			);
		});

		it('shows loading state during async operation', async () => {
			let resolveFn!: (value: TreeNode[]) => void;
			const loadChildren = vi.fn().mockReturnValue(
				new Promise<TreeNode[]>(resolve => {
					resolveFn = resolve;
				}),
			);

			const {lastFrame, stdin} = render(
				<TreeView data={asyncData} loadChildren={loadChildren} />,
			);

			await waitForInput(stdin);
			stdin.write(ARROW_RIGHT);

			// Loading indicator should be shown (the ⟳ character)
			await waitFor(() => {
				expect(lastFrame()).toContain('\u{27F3}');
			});

			// Resolve to clean up
			resolveFn([{id: 'child-a', label: 'Child A'}]);
			await waitFor(() => {
				expect(lastFrame()).toContain('Child A');
			});
		});

		it('children are inserted after load completes', async () => {
			const loadChildren = vi.fn().mockResolvedValue([
				{id: 'child-a', label: 'Child A'},
				{id: 'child-b', label: 'Child B'},
			]);

			const {lastFrame, stdin} = render(
				<TreeView data={asyncData} loadChildren={loadChildren} />,
			);

			await waitForInput(stdin);
			stdin.write(ARROW_RIGHT);

			await waitFor(() => {
				const frame = lastFrame();
				expect(frame).toContain('Child A');
				expect(frame).toContain('Child B');
			});
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

			await waitForInput(stdin);
			stdin.write(ARROW_RIGHT);

			await waitFor(() => {
				expect(onLoadError).toHaveBeenCalledTimes(1);
			});
			expect(onLoadError).toHaveBeenCalledWith('lazy-root', loadError);
		});

		it('calls onLoadError instead of crashing when loaded children reuse an existing id', async () => {
			const loadChildren = vi.fn().mockResolvedValue([
				{id: 'leaf', label: 'Dup'},
			]);
			const onLoadError = vi.fn();

			const {lastFrame, stdin} = render(
				<TreeView
					data={asyncData}
					loadChildren={loadChildren}
					onLoadError={onLoadError}
				/>,
			);

			await waitForInput(stdin);
			stdin.write(ARROW_RIGHT);

			await waitFor(() => {
				expect(onLoadError).toHaveBeenCalledTimes(1);
			});
			expect(onLoadError).toHaveBeenCalledWith(
				'lazy-root',
				expect.objectContaining({
					message: expect.stringContaining('Duplicate node id \'leaf\'') as unknown,
				}),
			);

			// The tree still renders, the loading indicator clears, and the
			// duplicate child was not inserted.
			await waitFor(() => {
				expect(lastFrame()).not.toContain('\u{27F3}');
			});
			expect(lastFrame()).toContain('Lazy Root');
			expect(lastFrame()).toContain('Leaf Node');
			expect(lastFrame()).not.toContain('Dup');
		});

		it('node can be retried after load error', async () => {
			let callCount = 0;
			const loadChildren = vi.fn().mockImplementation(async () => {
				callCount++;
				if (callCount === 1) {
					throw new Error('First attempt fails');
				}

				return [
					{id: 'child-a', label: 'Child A'},
				];
			});

			const {lastFrame, stdin} = render(
				<TreeView
					data={asyncData}
					loadChildren={loadChildren}
					onLoadError={() => {}}
				/>,
			);

			// First attempt: fails, and the loading indicator clears again.
			await waitForInput(stdin);
			stdin.write(ARROW_RIGHT);
			await waitFor(() => {
				expect(loadChildren).toHaveBeenCalledTimes(1);
				expect(lastFrame()).not.toContain('\u{27F3}');
			});
			expect(lastFrame()).not.toContain('Child A');

			// Second attempt: succeeds
			stdin.write(ARROW_RIGHT);
			await waitFor(() => {
				expect(lastFrame()).toContain('Child A');
			});
			expect(loadChildren).toHaveBeenCalledTimes(2);
		});
	});

	describe('Home / End / PageUp / PageDown keys', () => {
		it('End jumps to last node and Home jumps back to first', async () => {
			const onFocusChange = vi.fn();
			const {stdin} = render(
				<TreeView data={sampleData} onFocusChange={onFocusChange} />,
			);

			await waitForInput(stdin);
			stdin.write(END);
			await waitFor(() => {
				expect(onFocusChange).toHaveBeenLastCalledWith('root-3');
			});

			stdin.write(HOME);
			await waitFor(() => {
				expect(onFocusChange).toHaveBeenLastCalledWith('root-1');
			});
		});

		it('PageDown / PageUp move focus by a viewport page', async () => {
			const onFocusChange = vi.fn();
			const {stdin} = render(
				<TreeView
					data={sampleData}
					defaultExpanded="all"
					visibleNodeCount={3}
					onFocusChange={onFocusChange}
				/>,
			);

			await waitForInput(stdin);
			// Visible order (all expanded): root-1, child-1-1, leaf-1-1-1,
			// leaf-1-1-2, ... A page is 3 rows, so PageDown from index 0 -> 3.
			stdin.write(PAGE_DOWN);
			await waitFor(() => {
				expect(onFocusChange).toHaveBeenLastCalledWith('leaf-1-1-2');
			});

			stdin.write(PAGE_UP);
			await waitFor(() => {
				expect(onFocusChange).toHaveBeenLastCalledWith('root-1');
			});
		});
	});

	describe('scroll indicators', () => {
		it('renders real arrow glyphs, not literal escape text', async () => {
			const {lastFrame, stdin} = render(
				<TreeView
					data={sampleData}
					defaultExpanded="all"
					visibleNodeCount={3}
				/>,
			);

			await waitForInput(stdin);
			// Initially only the "below" indicator is shown.
			let frame = lastFrame();
			expect(frame).toContain('↓'); // actual down-arrow glyph
			expect(frame).not.toContain('u2193'); // not the literal escape text

			// Scroll down far enough to reveal the "above" indicator too.
			await press(lastFrame, stdin, ARROW_DOWN);
			await press(lastFrame, stdin, ARROW_DOWN);
			await press(lastFrame, stdin, ARROW_DOWN);

			frame = lastFrame();
			expect(frame).toContain('↑'); // actual up-arrow glyph
			expect(frame).not.toContain('u2191'); // not the literal escape text
		});
	});

	describe('controlled mode', () => {
		it('controlled expanded reflects the prop when the parent honors intent', async () => {
			const onExpandChange = vi.fn();
			function Wrapper() {
				const [expanded, setExpanded] = React.useState(
					new Set<string>(),
				);
				return (
					<TreeView
						data={sampleData}
						expanded={expanded}
						onExpandChange={ids => {
							onExpandChange(ids);
							setExpanded(new Set(ids));
						}}
					/>
				);
			}

			const {lastFrame, stdin} = render(<Wrapper />);
			await waitForInput(stdin);
			expect(lastFrame()).not.toContain('Photos');

			stdin.write(ARROW_RIGHT);
			await waitFor(() => {
				expect(lastFrame()).toContain('Photos');
			});
			expect(onExpandChange).toHaveBeenCalled();
		});

		it('controlled expanded stays authoritative when the parent ignores intent', async () => {
			const onExpandChange = vi.fn();
			const {lastFrame, stdin} = render(
				<TreeView
					data={sampleData}
					expanded={new Set<string>()}
					onExpandChange={onExpandChange}
				/>,
			);

			await waitForInput(stdin);
			stdin.write(ARROW_RIGHT);
			await waitFor(() => {
				expect(onExpandChange).toHaveBeenCalled();
			});
			// Intent is reported exactly once (no double-fire / reconcile loop)...
			expect(onExpandChange).toHaveBeenCalledTimes(1);
			// ...but the prop remains authoritative, so nothing expands.
			expect(lastFrame()).not.toContain('Photos');
		});

		it('controlled selected stays authoritative and reports intent once when ignored', async () => {
			const onSelectChange = vi.fn();
			const {stdin} = render(
				<TreeView
					data={sampleData}
					selectionMode="multiple"
					selected={new Set<string>()}
					onSelectChange={onSelectChange}
				/>,
			);

			await waitForInput(stdin);
			stdin.write(SPACE);
			await waitFor(() => {
				expect(onSelectChange).toHaveBeenCalled();
			});
			// Exactly one intent report, no reconcile loop.
			expect(onSelectChange).toHaveBeenCalledTimes(1);
			expect(onSelectChange.mock.calls[0]![0].has('root-1')).toBe(true);
		});

		it('controlled selected reports intent and reflects the prop', async () => {
			const onSelectChange = vi.fn();
			function Wrapper() {
				const [selected, setSelected] = React.useState(
					new Set<string>(),
				);
				return (
					<TreeView
						data={sampleData}
						selectionMode="multiple"
						selected={selected}
						onSelectChange={ids => {
							onSelectChange(ids);
							setSelected(new Set(ids));
						}}
					/>
				);
			}

			const {stdin} = render(<Wrapper />);
			await waitForInput(stdin);

			stdin.write(SPACE); // select root-1
			await waitFor(() => {
				expect(onSelectChange).toHaveBeenCalledTimes(1);
			});
			expect(onSelectChange.mock.calls.at(-1)![0].has('root-1')).toBe(
				true,
			);

			stdin.write(SPACE); // toggle root-1 back off (prop fed back in)
			await waitFor(() => {
				expect(onSelectChange).toHaveBeenCalledTimes(2);
			});
			expect(onSelectChange.mock.calls.at(-1)![0].has('root-1')).toBe(
				false,
			);
		});

		it('controlled focusedId stays authoritative and reconciles without a duplicate callback', async () => {
			const onFocusChange = vi.fn();
			const {lastFrame, stdin} = render(
				<TreeView
					data={sampleData}
					focusedId="root-1"
					onFocusChange={onFocusChange}
				/>,
			);

			await waitForInput(stdin);
			stdin.write(ARROW_DOWN); // intent to focus root-2 (ignored)
			await waitFor(() => {
				expect(onFocusChange).toHaveBeenCalled();
			});
			// One intent report; the reconcile revert is suppressed (no dupe).
			expect(onFocusChange).toHaveBeenCalledTimes(1);
			expect(onFocusChange).toHaveBeenCalledWith('root-2');

			// Focus reverted to the controlled root-1, so expanding acts on it.
			stdin.write(ARROW_RIGHT);
			await waitFor(() => {
				expect(lastFrame()).toContain('Photos');
			});
		});

		it('does not stall onFocusChange when focusedId targets a hidden node', async () => {
			// Regression: a controlled focusedId that is not visible (inside a
			// collapsed parent) used to leave the focus-suppress flag stuck
			// true, permanently swallowing every onFocusChange.
			const warnSpy = vi
				.spyOn(console, 'warn')
				.mockImplementation(() => {});
			const onFocusChange = vi.fn();
			const {stdin} = render(
				<TreeView
					data={sampleData}
					focusedId="child-1-1" // hidden: root-1 is collapsed
					onFocusChange={onFocusChange}
				/>,
			);

			await waitForInput(stdin);
			stdin.write(ARROW_DOWN);
			// The navigation intent is still reported (not swallowed).
			await waitFor(() => {
				expect(onFocusChange).toHaveBeenCalledWith('root-2');
			});
			// And a dev warning was emitted for the un-focusable node.
			expect(warnSpy).toHaveBeenCalled();

			// A second navigation still fires, proving the flag is not stuck.
			onFocusChange.mockClear();
			stdin.write(ARROW_DOWN);
			await waitFor(() => {
				expect(onFocusChange).toHaveBeenCalledWith('root-3');
			});

			warnSpy.mockRestore();
		});
	});
});

describe('buildNodeAriaLabel', () => {
	const baseState: TreeNodeState = {
		isFocused: false,
		isExpanded: false,
		isSelected: false,
		depth: 0,
		hasChildren: false,
		isLoading: false,
	};

	it('includes label and sibling position', () => {
		const result = buildNodeAriaLabel('Documents', baseState, 1, 3);
		expect(result).toBe('Documents, item 1 of 3');
	});

	it('includes depth when > 0', () => {
		const result = buildNodeAriaLabel('Photos', {...baseState, depth: 2}, 1, 5);
		expect(result).toContain('depth 2');
	});

	it('omits depth when 0', () => {
		const result = buildNodeAriaLabel('Root', baseState, 1, 1);
		expect(result).not.toContain('depth');
	});

	it('includes expanded state for parent nodes', () => {
		const expanded = buildNodeAriaLabel(
			'Folder',
			{...baseState, hasChildren: true, isExpanded: true},
			1,
			3,
		);
		expect(expanded).toContain('expanded');

		const collapsed = buildNodeAriaLabel(
			'Folder',
			{...baseState, hasChildren: true, isExpanded: false},
			1,
			3,
		);
		expect(collapsed).toContain('collapsed');
	});

	it('omits expanded/collapsed for leaf nodes', () => {
		const result = buildNodeAriaLabel('file.txt', baseState, 1, 1);
		expect(result).not.toContain('expanded');
		expect(result).not.toContain('collapsed');
	});

	it('includes loading state', () => {
		const result = buildNodeAriaLabel(
			'Lazy',
			{...baseState, hasChildren: true, isLoading: true},
			1,
			1,
		);
		expect(result).toContain('loading');
	});

	it('includes selected state', () => {
		const result = buildNodeAriaLabel(
			'Item',
			{...baseState, isSelected: true},
			2,
			5,
		);
		expect(result).toContain('selected');
	});

	it('combines all parts correctly', () => {
		const result = buildNodeAriaLabel(
			'Projects',
			{
				isFocused: true,
				isExpanded: true,
				isSelected: true,
				depth: 1,
				hasChildren: true,
				isLoading: false,
			},
			3,
			4,
		);
		expect(result).toBe('Projects, item 3 of 4, depth 1, expanded, selected');
	});
});

describe('areTreeViewNodePropsEqual (memo comparator)', () => {
	const node: TreeNode = {id: 'n1', label: 'Node 1'};
	const nodeState: TreeNodeState = {
		isFocused: false,
		isExpanded: false,
		isSelected: false,
		depth: 0,
		hasChildren: false,
		isLoading: false,
	};
	const {styles} = theme;
	const baseProps = {
		node,
		nodeState,
		selectionMode: 'none' as const,
		styles,
		isScreenReaderEnabled: false,
		siblingPosition: 1,
		siblingCount: 1,
	};

	it('treats a fresh nodeState object with identical values as equal', () => {
		const next = {...baseProps, nodeState: {...nodeState}};
		expect(areTreeViewNodePropsEqual(baseProps, next)).toBe(true);
	});

	// One entry per compared prop; each mutates exactly one and expects false.
	const mutations: Array<{name: string; next: typeof baseProps}> = [
		{name: 'node', next: {...baseProps, node: {id: 'n1', label: 'Node 1'}}},
		{name: 'selectionMode', next: {...baseProps, selectionMode: 'single'}},
		{name: 'styles', next: {...baseProps, styles: {...styles}}},
		{
			name: 'isScreenReaderEnabled',
			next: {...baseProps, isScreenReaderEnabled: true},
		},
		{name: 'siblingPosition', next: {...baseProps, siblingPosition: 2}},
		{name: 'siblingCount', next: {...baseProps, siblingCount: 2}},
		{
			name: 'nodeState.isFocused',
			next: {...baseProps, nodeState: {...nodeState, isFocused: true}},
		},
		{
			name: 'nodeState.isExpanded',
			next: {...baseProps, nodeState: {...nodeState, isExpanded: true}},
		},
		{
			name: 'nodeState.isSelected',
			next: {...baseProps, nodeState: {...nodeState, isSelected: true}},
		},
		{
			name: 'nodeState.depth',
			next: {...baseProps, nodeState: {...nodeState, depth: 1}},
		},
		{
			name: 'nodeState.hasChildren',
			next: {...baseProps, nodeState: {...nodeState, hasChildren: true}},
		},
		{
			name: 'nodeState.isLoading',
			next: {...baseProps, nodeState: {...nodeState, isLoading: true}},
		},
	];

	for (const {name, next} of mutations) {
		it(`returns false when ${name} changes`, () => {
			expect(areTreeViewNodePropsEqual(baseProps, next)).toBe(false);
		});
	}
});
