import {describe, it, expect} from 'vitest';
import {
	reducer,
	createDefaultState,
	type State,
} from '../src/components/tree-view/use-tree-view-state.js';
import {type TreeNode} from '../src/types.js';

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

function makeState(
	overrides?: Partial<{
		data: Array<TreeNode>;
		selectionMode: 'none' | 'single' | 'multiple';
		defaultExpanded: ReadonlySet<string> | 'all';
		defaultSelected: ReadonlySet<string>;
		visibleNodeCount: number;
	}>,
): State<Record<string, unknown>> {
	return createDefaultState({
		data: overrides?.data ?? sampleData,
		selectionMode: overrides?.selectionMode ?? 'none',
		defaultExpanded: overrides?.defaultExpanded,
		defaultSelected: overrides?.defaultSelected,
		visibleNodeCount: overrides?.visibleNodeCount ?? Infinity,
	});
}

describe('reducer + createDefaultState', () => {
	describe('initial state', () => {
		it('focuses the first visible node', () => {
			const state = makeState();
			expect(state.focusedId).toBe('root-1');
		});

		it('starts with all nodes collapsed', () => {
			const state = makeState();
			expect(state.expandedIds.size).toBe(0);
		});

		it('shows only root nodes initially', () => {
			const state = makeState();
			expect(state.visibleIds).toEqual(['root-1', 'root-2', 'root-3']);
		});

		it('has empty selection initially', () => {
			const state = makeState();
			expect(state.selectedIds.size).toBe(0);
		});

		it('handles empty data', () => {
			const state = makeState({data: []});
			expect(state.focusedId).toBeUndefined();
			expect(state.visibleIds).toEqual([]);
		});
	});

	describe('focus-next / focus-previous', () => {
		it('moves focus to next visible node', () => {
			const state = makeState();
			const next = reducer(state, {type: 'focus-next'});
			expect(next.focusedId).toBe('root-2');
		});

		it('moves focus to previous visible node', () => {
			let state = makeState();
			state = reducer(state, {type: 'focus-next'});
			state = reducer(state, {type: 'focus-previous'});
			expect(state.focusedId).toBe('root-1');
		});

		it('does not move past last node', () => {
			let state = makeState();
			state = reducer(state, {type: 'focus-next'}); // root-2
			state = reducer(state, {type: 'focus-next'}); // root-3
			state = reducer(state, {type: 'focus-next'}); // still root-3
			expect(state.focusedId).toBe('root-3');
		});

		it('does not move before first node', () => {
			const state = makeState();
			const next = reducer(state, {type: 'focus-previous'});
			expect(next.focusedId).toBe('root-1');
		});
	});

	describe('expand / collapse', () => {
		it('expands the focused node', () => {
			const state = makeState();
			const expanded = reducer(state, {type: 'expand'});
			expect(expanded.expandedIds.has('root-1')).toBe(true);
			expect(expanded.visibleIds).toEqual([
				'root-1',
				'child-1-1',
				'child-1-2',
				'root-2',
				'root-3',
			]);
		});

		it('collapses the focused node', () => {
			let state = makeState();
			state = reducer(state, {type: 'expand'});
			state = reducer(state, {type: 'collapse'});
			expect(state.expandedIds.has('root-1')).toBe(false);
			expect(state.visibleIds).toEqual(['root-1', 'root-2', 'root-3']);
		});

		it('expand is no-op on leaf node', () => {
			let state = makeState();
			// Navigate to root-3 (leaf)
			state = reducer(state, {type: 'focus-next'});
			state = reducer(state, {type: 'focus-next'});
			expect(state.focusedId).toBe('root-3');
			const afterExpand = reducer(state, {type: 'expand'});
			expect(afterExpand.expandedIds.size).toBe(0);
		});

		it('collapse is no-op when not expanded', () => {
			const state = makeState();
			const after = reducer(state, {type: 'collapse'});
			expect(after).toBe(state);
		});

		it('expand is no-op when already expanded', () => {
			let state = makeState();
			state = reducer(state, {type: 'expand'});
			const before = state;
			const after = reducer(state, {type: 'expand'});
			expect(after).toBe(before);
		});
	});

	describe('toggle-expanded', () => {
		it('expands when collapsed', () => {
			const state = makeState();
			const toggled = reducer(state, {type: 'toggle-expanded'});
			expect(toggled.expandedIds.has('root-1')).toBe(true);
		});

		it('collapses when expanded', () => {
			let state = makeState();
			state = reducer(state, {type: 'expand'});
			state = reducer(state, {type: 'toggle-expanded'});
			expect(state.expandedIds.has('root-1')).toBe(false);
		});
	});

	describe('collapse-focus invariant', () => {
		it('keeps focus on collapsed node when it was already focused', () => {
			let state = makeState();
			state = reducer(state, {type: 'expand'}); // expand root-1
			expect(state.focusedId).toBe('root-1');
			state = reducer(state, {type: 'collapse'});
			expect(state.focusedId).toBe('root-1');
		});

		it('the focused node remains visible after collapse (focus was on descendant elsewhere)', () => {
			// Expand root-1 and child-1-1
			let state = makeState({
				defaultExpanded: new Set(['root-1', 'child-1-1']),
			});

			// Navigate down to leaf-1-1-1
			state = reducer(state, {type: 'focus-next'}); // child-1-1
			state = reducer(state, {type: 'focus-next'}); // leaf-1-1-1
			expect(state.focusedId).toBe('leaf-1-1-1');

			// Navigate back to child-1-1 and collapse it
			state = reducer(state, {type: 'focus-previous'}); // child-1-1
			expect(state.focusedId).toBe('child-1-1');
			state = reducer(state, {type: 'collapse'});

			// Focus should stay on child-1-1
			expect(state.focusedId).toBe('child-1-1');
			// leaf-1-1-1 should not be visible
			expect(state.visibleIds).not.toContain('leaf-1-1-1');
		});
	});

	describe('collapse-node', () => {
		it('collapses a specific node by ID', () => {
			let state = makeState({
				defaultExpanded: new Set(['root-1']),
			});
			expect(state.expandedIds.has('root-1')).toBe(true);
			state = reducer(state, {type: 'collapse-node', nodeId: 'root-1'});
			expect(state.expandedIds.has('root-1')).toBe(false);
			expect(state.visibleIds).toEqual(['root-1', 'root-2', 'root-3']);
		});

		it('moves focus to collapsed node when focused node is a descendant', () => {
			let state = makeState({
				defaultExpanded: new Set(['root-1', 'child-1-1']),
			});
			// Focus on leaf-1-1-1
			state = reducer(state, {type: 'focus-next'}); // child-1-1
			state = reducer(state, {type: 'focus-next'}); // leaf-1-1-1
			expect(state.focusedId).toBe('leaf-1-1-1');

			// Programmatically collapse root-1 (ancestor of focused node)
			state = reducer(state, {type: 'collapse-node', nodeId: 'root-1'});
			expect(state.focusedId).toBe('root-1');
			expect(state.visibleIds).not.toContain('leaf-1-1-1');
		});

		it('is no-op when node is not expanded', () => {
			const state = makeState();
			const after = reducer(state, {type: 'collapse-node', nodeId: 'root-1'});
			expect(after).toBe(state);
		});
	});

	describe('expand-node', () => {
		it('expands a specific node by ID', () => {
			const state = makeState();
			const after = reducer(state, {type: 'expand-node', nodeId: 'root-1'});
			expect(after.expandedIds.has('root-1')).toBe(true);
			expect(after.visibleIds).toEqual([
				'root-1',
				'child-1-1',
				'child-1-2',
				'root-2',
				'root-3',
			]);
		});

		it('expands a node that is not the focused node', () => {
			const state = makeState();
			expect(state.focusedId).toBe('root-1');
			const after = reducer(state, {type: 'expand-node', nodeId: 'root-2'});
			expect(after.expandedIds.has('root-2')).toBe(true);
			expect(after.focusedId).toBe('root-1');
		});

		it('is no-op on leaf node', () => {
			const state = makeState();
			const after = reducer(state, {type: 'expand-node', nodeId: 'root-3'});
			expect(after).toBe(state);
		});

		it('is no-op when already expanded', () => {
			let state = makeState();
			state = reducer(state, {type: 'expand-node', nodeId: 'root-1'});
			const before = state;
			const after = reducer(state, {type: 'expand-node', nodeId: 'root-1'});
			expect(after).toBe(before);
		});
	});

	describe('expand-all / collapse-all', () => {
		it('expand-all makes all nodes visible', () => {
			const state = makeState();
			const expanded = reducer(state, {type: 'expand-all'});
			// All 9 nodes
			expect(expanded.visibleIds.length).toBe(9);
		});

		it('collapse-all returns to only root nodes', () => {
			let state = makeState();
			state = reducer(state, {type: 'expand-all'});
			state = reducer(state, {type: 'collapse-all'});
			expect(state.visibleIds).toEqual(['root-1', 'root-2', 'root-3']);
			expect(state.focusedId).toBe('root-1');
		});
	});

	describe('selection', () => {
		it('select in single mode replaces selection', () => {
			let state = makeState({selectionMode: 'single'});
			state = reducer(state, {type: 'select'});
			expect(state.selectedIds.has('root-1')).toBe(true);

			state = reducer(state, {type: 'focus-next'});
			state = reducer(state, {type: 'select'});
			expect(state.selectedIds.has('root-1')).toBe(false);
			expect(state.selectedIds.has('root-2')).toBe(true);
			expect(state.selectedIds.size).toBe(1);
		});

		it('select in multiple mode toggles selection', () => {
			let state = makeState({selectionMode: 'multiple'});
			state = reducer(state, {type: 'select'}); // select root-1
			expect(state.selectedIds.has('root-1')).toBe(true);

			state = reducer(state, {type: 'focus-next'});
			state = reducer(state, {type: 'select'}); // select root-2
			expect(state.selectedIds.has('root-1')).toBe(true);
			expect(state.selectedIds.has('root-2')).toBe(true);
			expect(state.selectedIds.size).toBe(2);

			// Toggle off root-2
			state = reducer(state, {type: 'select'});
			expect(state.selectedIds.has('root-2')).toBe(false);
			expect(state.selectedIds.size).toBe(1);
		});

		it('select in none mode is no-op', () => {
			const state = makeState({selectionMode: 'none'});
			const after = reducer(state, {type: 'select'});
			expect(after).toBe(state);
		});
	});

	describe('focus-first / focus-last', () => {
		it('focus-first jumps to first node', () => {
			let state = makeState();
			state = reducer(state, {type: 'focus-next'});
			state = reducer(state, {type: 'focus-next'});
			expect(state.focusedId).toBe('root-3');
			state = reducer(state, {type: 'focus-first'});
			expect(state.focusedId).toBe('root-1');
		});

		it('focus-last jumps to last node', () => {
			const state = makeState();
			const last = reducer(state, {type: 'focus-last'});
			expect(last.focusedId).toBe('root-3');
		});
	});

	describe('focus-parent / focus-first-child', () => {
		it('focus-parent moves to parent', () => {
			let state = makeState({
				defaultExpanded: new Set(['root-1']),
			});
			state = reducer(state, {type: 'focus-next'}); // child-1-1
			expect(state.focusedId).toBe('child-1-1');
			state = reducer(state, {type: 'focus-parent'});
			expect(state.focusedId).toBe('root-1');
		});

		it('focus-parent is no-op at root', () => {
			const state = makeState();
			const after = reducer(state, {type: 'focus-parent'});
			expect(after.focusedId).toBe('root-1');
		});

		it('focus-first-child moves to first child when expanded', () => {
			const state = makeState({
				defaultExpanded: new Set(['root-1']),
			});
			const after = reducer(state, {type: 'focus-first-child'});
			expect(after.focusedId).toBe('child-1-1');
		});

		it('focus-first-child is no-op when collapsed', () => {
			const state = makeState();
			const after = reducer(state, {type: 'focus-first-child'});
			expect(after.focusedId).toBe('root-1');
		});

		it('focus-first-child is no-op on leaf', () => {
			let state = makeState();
			state = reducer(state, {type: 'focus-next'}); // root-2
			state = reducer(state, {type: 'focus-next'}); // root-3
			const after = reducer(state, {type: 'focus-first-child'});
			expect(after.focusedId).toBe('root-3');
		});
	});

	describe('viewport scrolling', () => {
		it('adjusts viewport when focus moves past bottom', () => {
			let state = makeState({
				defaultExpanded: 'all',
				visibleNodeCount: 3,
			});
			expect(state.viewportFromIndex).toBe(0);
			expect(state.viewportToIndex).toBe(3);

			// Move down 3 times to trigger scroll
			state = reducer(state, {type: 'focus-next'}); // child-1-1
			state = reducer(state, {type: 'focus-next'}); // leaf-1-1-1
			// Still in viewport (indices 0,1,2)
			expect(state.viewportFromIndex).toBe(0);

			state = reducer(state, {type: 'focus-next'}); // leaf-1-1-2, should scroll
			expect(state.viewportFromIndex).toBe(1);
			expect(state.viewportToIndex).toBe(4);
		});

		it('adjusts viewport when focus moves past top', () => {
			let state = makeState({
				defaultExpanded: 'all',
				visibleNodeCount: 3,
			});

			// Move to last
			state = reducer(state, {type: 'focus-last'});
			expect(state.viewportToIndex).toBe(9);
			expect(state.viewportFromIndex).toBe(6);

			// Move back to first
			state = reducer(state, {type: 'focus-first'});
			expect(state.viewportFromIndex).toBe(0);
			expect(state.viewportToIndex).toBe(3);
		});

		it('no scrolling when all nodes fit', () => {
			const state = makeState({visibleNodeCount: 10});
			expect(state.viewportFromIndex).toBe(0);
			expect(state.viewportToIndex).toBe(3);
		});
	});

	describe('defaultExpanded', () => {
		it('respects defaultExpanded set', () => {
			const state = makeState({
				defaultExpanded: new Set(['root-1']),
			});
			expect(state.expandedIds.has('root-1')).toBe(true);
			expect(state.visibleIds).toEqual([
				'root-1',
				'child-1-1',
				'child-1-2',
				'root-2',
				'root-3',
			]);
		});

		it('respects defaultExpanded="all"', () => {
			const state = makeState({defaultExpanded: 'all'});
			expect(state.visibleIds.length).toBe(9);
		});
	});

	describe('defaultSelected', () => {
		it('respects defaultSelected in single mode', () => {
			const state = makeState({
				selectionMode: 'single',
				defaultSelected: new Set(['root-2']),
			});
			expect(state.selectedIds.has('root-2')).toBe(true);
		});

		it('ignores defaultSelected in none mode', () => {
			const state = makeState({
				selectionMode: 'none',
				defaultSelected: new Set(['root-2']),
			});
			expect(state.selectedIds.size).toBe(0);
		});
	});

	describe('set-loading', () => {
		it('adds node to loadingIds', () => {
			const state = makeState();
			const after = reducer(state, {
				type: 'set-loading',
				nodeId: 'root-1',
				isLoading: true,
			});
			expect(after.loadingIds.has('root-1')).toBe(true);
		});

		it('removes node from loadingIds', () => {
			let state = makeState();
			state = reducer(state, {
				type: 'set-loading',
				nodeId: 'root-1',
				isLoading: true,
			});
			state = reducer(state, {
				type: 'set-loading',
				nodeId: 'root-1',
				isLoading: false,
			});
			expect(state.loadingIds.has('root-1')).toBe(false);
		});
	});

	describe('insert-children', () => {
		it('inserts children and updates nodeMap', () => {
			let state = makeState({
				data: [{id: 'root', label: 'Root'}],
			});
			expect(state.nodeMap.get('root')?.hasChildren).toBe(false);

			state = reducer(state, {
				type: 'insert-children',
				parentId: 'root',
				children: [
					{id: 'c1', label: 'Child 1'},
					{id: 'c2', label: 'Child 2'},
				],
			});

			expect(state.nodeMap.get('root')?.hasChildren).toBe(true);
			expect(state.nodeMap.get('root')?.childrenIds).toEqual([
				'c1',
				'c2',
			]);
			// Not expanded, so still 1 visible
			expect(state.visibleIds).toEqual(['root']);
		});

		it('handles insert-children for nonexistent parent gracefully', () => {
			const state = makeState();
			const after = reducer(state, {
				type: 'insert-children',
				parentId: 'nonexistent',
				children: [{id: 'c1', label: 'Child 1'}],
			});
			expect(after).toBe(state);
		});
	});

	describe('reset', () => {
		it('replaces state entirely', () => {
			let state = makeState();
			state = reducer(state, {type: 'expand'});
			state = reducer(state, {type: 'focus-next'});

			const freshState = makeState();
			state = reducer(state, {type: 'reset', state: freshState});

			expect(state.focusedId).toBe('root-1');
			expect(state.expandedIds.size).toBe(0);
		});
	});
});
