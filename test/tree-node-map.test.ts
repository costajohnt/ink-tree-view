import {describe, it, expect} from 'vitest';
import {TreeNodeMap} from '../src/tree-node-map.js';
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

describe('TreeNodeMap', () => {
	describe('construction', () => {
		it('builds map from nested data with correct size', () => {
			const map = new TreeNodeMap(sampleData);
			expect(map.size).toBe(9);
		});

		it('assigns correct flatIndex in DFS order', () => {
			const map = new TreeNodeMap(sampleData);
			expect(map.get('root-1')?.flatIndex).toBe(0);
			expect(map.get('child-1-1')?.flatIndex).toBe(1);
			expect(map.get('leaf-1-1-1')?.flatIndex).toBe(2);
			expect(map.get('leaf-1-1-2')?.flatIndex).toBe(3);
			expect(map.get('child-1-2')?.flatIndex).toBe(4);
			expect(map.get('leaf-1-2-1')?.flatIndex).toBe(5);
			expect(map.get('root-2')?.flatIndex).toBe(6);
			expect(map.get('child-2-1')?.flatIndex).toBe(7);
		});

		it('assigns correct depth', () => {
			const map = new TreeNodeMap(sampleData);
			expect(map.get('root-1')?.depth).toBe(0);
			expect(map.get('child-1-1')?.depth).toBe(1);
			expect(map.get('leaf-1-1-1')?.depth).toBe(2);
			expect(map.get('root-2')?.depth).toBe(0);
			expect(map.get('root-3')?.depth).toBe(0);
		});

		it('assigns correct parentId', () => {
			const map = new TreeNodeMap(sampleData);
			expect(map.get('root-1')?.parentId).toBeUndefined();
			expect(map.get('child-1-1')?.parentId).toBe('root-1');
			expect(map.get('leaf-1-1-1')?.parentId).toBe('child-1-1');
			expect(map.get('leaf-1-2-1')?.parentId).toBe('child-1-2');
			expect(map.get('child-2-1')?.parentId).toBe('root-2');
		});

		it('assigns correct childrenIds', () => {
			const map = new TreeNodeMap(sampleData);
			expect(map.get('root-1')?.childrenIds).toEqual([
				'child-1-1',
				'child-1-2',
			]);
			expect(map.get('child-1-1')?.childrenIds).toEqual([
				'leaf-1-1-1',
				'leaf-1-1-2',
			]);
			expect(map.get('leaf-1-1-1')?.childrenIds).toEqual([]);
		});

		it('assigns correct hasChildren', () => {
			const map = new TreeNodeMap(sampleData);
			expect(map.get('root-1')?.hasChildren).toBe(true);
			expect(map.get('child-1-1')?.hasChildren).toBe(true);
			expect(map.get('leaf-1-1-1')?.hasChildren).toBe(false);
			expect(map.get('root-3')?.hasChildren).toBe(false);
		});

		it('stores rootIds in order', () => {
			const map = new TreeNodeMap(sampleData);
			expect(map.rootIds).toEqual(['root-1', 'root-2', 'root-3']);
		});

		it('stores orderedIds in DFS order', () => {
			const map = new TreeNodeMap(sampleData);
			expect(map.orderedIds).toEqual([
				'root-1',
				'child-1-1',
				'leaf-1-1-1',
				'leaf-1-1-2',
				'child-1-2',
				'leaf-1-2-1',
				'root-2',
				'child-2-1',
				'root-3',
			]);
		});
	});

	describe('sibling links', () => {
		it('assigns correct previousSiblingId', () => {
			const map = new TreeNodeMap(sampleData);
			expect(map.get('root-1')?.previousSiblingId).toBeUndefined();
			expect(map.get('root-2')?.previousSiblingId).toBe('root-1');
			expect(map.get('root-3')?.previousSiblingId).toBe('root-2');
			expect(map.get('child-1-1')?.previousSiblingId).toBeUndefined();
			expect(map.get('child-1-2')?.previousSiblingId).toBe('child-1-1');
			expect(map.get('leaf-1-1-1')?.previousSiblingId).toBeUndefined();
			expect(map.get('leaf-1-1-2')?.previousSiblingId).toBe(
				'leaf-1-1-1',
			);
		});

		it('assigns correct nextSiblingId', () => {
			const map = new TreeNodeMap(sampleData);
			expect(map.get('root-1')?.nextSiblingId).toBe('root-2');
			expect(map.get('root-2')?.nextSiblingId).toBe('root-3');
			expect(map.get('root-3')?.nextSiblingId).toBeUndefined();
			expect(map.get('child-1-1')?.nextSiblingId).toBe('child-1-2');
			expect(map.get('child-1-2')?.nextSiblingId).toBeUndefined();
			expect(map.get('leaf-1-1-1')?.nextSiblingId).toBe('leaf-1-1-2');
			expect(map.get('leaf-1-1-2')?.nextSiblingId).toBeUndefined();
		});
	});

	describe('getVisibleIds', () => {
		it('returns only root nodes when nothing is expanded', () => {
			const map = new TreeNodeMap(sampleData);
			const visible = map.getVisibleIds(new Set());
			expect(visible).toEqual(['root-1', 'root-2', 'root-3']);
		});

		it('returns correct DFS order with partial expansion', () => {
			const map = new TreeNodeMap(sampleData);
			const visible = map.getVisibleIds(new Set(['root-1']));
			expect(visible).toEqual([
				'root-1',
				'child-1-1',
				'child-1-2',
				'root-2',
				'root-3',
			]);
		});

		it('returns correct DFS order with nested expansion', () => {
			const map = new TreeNodeMap(sampleData);
			const visible = map.getVisibleIds(
				new Set(['root-1', 'child-1-1']),
			);
			expect(visible).toEqual([
				'root-1',
				'child-1-1',
				'leaf-1-1-1',
				'leaf-1-1-2',
				'child-1-2',
				'root-2',
				'root-3',
			]);
		});

		it('returns all nodes when everything is expanded', () => {
			const map = new TreeNodeMap(sampleData);
			const allParents = new Set<string>();
			for (const [id, flat] of map.entries()) {
				if (flat.hasChildren) allParents.add(id);
			}

			const visible = map.getVisibleIds(allParents);
			expect(visible).toEqual(map.orderedIds);
		});

		it('skips children of expanded leaf node IDs in expanded set', () => {
			const map = new TreeNodeMap(sampleData);
			// Having a leaf ID in expandedIds should not cause issues
			const visible = map.getVisibleIds(
				new Set(['leaf-1-1-1', 'root-2']),
			);
			expect(visible).toEqual([
				'root-1',
				'root-2',
				'child-2-1',
				'root-3',
			]);
		});
	});

	describe('duplicate ID detection', () => {
		it('throws error on duplicate IDs', () => {
			const data: Array<TreeNode> = [
				{
					id: 'dup',
					label: 'First',
					children: [{id: 'dup', label: 'Second'}],
				},
			];
			expect(() => new TreeNodeMap(data)).toThrow(
				"TreeView: Duplicate node id 'dup' found",
			);
		});
	});

	describe('empty data', () => {
		it('produces empty map', () => {
			const map = new TreeNodeMap([]);
			expect(map.size).toBe(0);
			expect(map.rootIds).toEqual([]);
			expect(map.orderedIds).toEqual([]);
			expect(map.getVisibleIds(new Set())).toEqual([]);
		});
	});

	describe('isDescendantOf', () => {
		it('returns true for direct child', () => {
			const map = new TreeNodeMap(sampleData);
			expect(map.isDescendantOf('child-1-1', 'root-1')).toBe(true);
		});

		it('returns true for deep descendant', () => {
			const map = new TreeNodeMap(sampleData);
			expect(map.isDescendantOf('leaf-1-1-1', 'root-1')).toBe(true);
		});

		it('returns false for unrelated nodes', () => {
			const map = new TreeNodeMap(sampleData);
			expect(map.isDescendantOf('child-2-1', 'root-1')).toBe(false);
		});

		it('returns false for self', () => {
			const map = new TreeNodeMap(sampleData);
			expect(map.isDescendantOf('root-1', 'root-1')).toBe(false);
		});
	});

	describe('withChildren', () => {
		it('inserts children under a parent node', () => {
			const data: Array<TreeNode> = [
				{id: 'root', label: 'Root'},
			];
			const map = new TreeNodeMap(data);
			expect(map.get('root')?.hasChildren).toBe(false);

			const newMap = map.withChildren('root', [
				{id: 'new-child-1', label: 'Child 1'},
				{id: 'new-child-2', label: 'Child 2'},
			]);

			expect(newMap.get('root')?.hasChildren).toBe(true);
			expect(newMap.get('root')?.childrenIds).toEqual([
				'new-child-1',
				'new-child-2',
			]);
			expect(newMap.get('new-child-1')?.parentId).toBe('root');
			expect(newMap.get('new-child-2')?.parentId).toBe('root');
			expect(newMap.size).toBe(3);
		});

		it('returns same map if parentId not found', () => {
			const data: Array<TreeNode> = [{id: 'root', label: 'Root'}];
			const map = new TreeNodeMap(data);
			const result = map.withChildren('nonexistent', [
				{id: 'child', label: 'Child'},
			]);
			expect(result).toBe(map);
		});
	});

	describe('sibling position', () => {
		it('assigns correct siblingIndex and siblingCount for root nodes', () => {
			const map = new TreeNodeMap(sampleData);
			expect(map.get('root-1')?.siblingIndex).toBe(0);
			expect(map.get('root-1')?.siblingCount).toBe(3);
			expect(map.get('root-2')?.siblingIndex).toBe(1);
			expect(map.get('root-2')?.siblingCount).toBe(3);
			expect(map.get('root-3')?.siblingIndex).toBe(2);
			expect(map.get('root-3')?.siblingCount).toBe(3);
		});

		it('assigns correct siblingIndex and siblingCount for child nodes', () => {
			const map = new TreeNodeMap(sampleData);
			expect(map.get('child-1-1')?.siblingIndex).toBe(0);
			expect(map.get('child-1-1')?.siblingCount).toBe(2);
			expect(map.get('child-1-2')?.siblingIndex).toBe(1);
			expect(map.get('child-1-2')?.siblingCount).toBe(2);
		});

		it('assigns correct siblingIndex and siblingCount for leaf nodes', () => {
			const map = new TreeNodeMap(sampleData);
			expect(map.get('leaf-1-1-1')?.siblingIndex).toBe(0);
			expect(map.get('leaf-1-1-1')?.siblingCount).toBe(2);
			expect(map.get('leaf-1-1-2')?.siblingIndex).toBe(1);
			expect(map.get('leaf-1-1-2')?.siblingCount).toBe(2);
		});

		it('handles single child correctly', () => {
			const map = new TreeNodeMap(sampleData);
			expect(map.get('child-2-1')?.siblingIndex).toBe(0);
			expect(map.get('child-2-1')?.siblingCount).toBe(1);
			expect(map.get('leaf-1-2-1')?.siblingIndex).toBe(0);
			expect(map.get('leaf-1-2-1')?.siblingCount).toBe(1);
		});

		it('preserves siblingIndex and siblingCount after withChildren', () => {
			const data: Array<TreeNode> = [
				{id: 'root', label: 'Root', isParent: true},
			];
			const map = new TreeNodeMap(data);
			const newMap = map.withChildren('root', [
				{id: 'a', label: 'A'},
				{id: 'b', label: 'B'},
				{id: 'c', label: 'C'},
			]);
			expect(newMap.get('a')?.siblingIndex).toBe(0);
			expect(newMap.get('a')?.siblingCount).toBe(3);
			expect(newMap.get('b')?.siblingIndex).toBe(1);
			expect(newMap.get('b')?.siblingCount).toBe(3);
			expect(newMap.get('c')?.siblingIndex).toBe(2);
			expect(newMap.get('c')?.siblingCount).toBe(3);
		});
	});

	describe('deep nesting', () => {
		it('handles 10+ levels correctly', () => {
			// Build a chain: depth-0 > depth-1 > ... > depth-10
			let current: TreeNode = {id: 'depth-10', label: 'Level 10'};
			for (let i = 9; i >= 0; i--) {
				current = {
					id: `depth-${i}`,
					label: `Level ${i}`,
					children: [current],
				};
			}

			const map = new TreeNodeMap([current]);
			expect(map.size).toBe(11);
			expect(map.get('depth-0')?.depth).toBe(0);
			expect(map.get('depth-5')?.depth).toBe(5);
			expect(map.get('depth-10')?.depth).toBe(10);
			expect(map.get('depth-10')?.hasChildren).toBe(false);
			expect(map.get('depth-9')?.childrenIds).toEqual(['depth-10']);
		});
	});
});
