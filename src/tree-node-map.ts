import {type TreeNode} from './types.js';

/**
 * A flattened representation of a tree node with navigation links.
 */
export type FlatNode<T = Record<string, unknown>> = {
	/** The original tree node. */
	node: TreeNode<T>;
	/** Depth in the tree (0 for roots). */
	depth: number;
	/** Index in the flattened DFS order (across ALL nodes, not just visible). */
	flatIndex: number;
	/** Parent's id, or undefined if root. */
	parentId: string | undefined;
	/** Whether this node has children. */
	hasChildren: boolean;
	/** Ordered list of direct children IDs. */
	childrenIds: string[];
	/** Previous sibling's ID, or undefined. */
	previousSiblingId: string | undefined;
	/** Next sibling's ID, or undefined. */
	nextSiblingId: string | undefined;
};

/**
 * A flattened map of all tree nodes built via DFS traversal.
 * Stores parent/child/sibling links for O(1) navigation.
 */
export class TreeNodeMap<T = Record<string, unknown>> {
	/** Map from node ID to FlatNode. */
	private readonly map: Map<string, FlatNode<T>>;
	/** All node IDs in DFS order. */
	readonly orderedIds: string[];
	/** Root-level node IDs. */
	readonly rootIds: string[];

	constructor(data: Array<TreeNode<T>>) {
		this.map = new Map();
		this.orderedIds = [];
		this.rootIds = [];

		this.buildFromData(data);
	}

	private buildFromData(data: Array<TreeNode<T>>): void {
		// Iterative DFS using a stack
		type StackEntry = {
			node: TreeNode<T>;
			depth: number;
			parentId: string | undefined;
			siblings: Array<TreeNode<T>>;
			siblingIndex: number;
		};

		const stack: StackEntry[] = [];

		// Push root nodes in reverse order so first root is processed first
		for (let i = data.length - 1; i >= 0; i--) {
			stack.push({
				node: data[i]!,
				depth: 0,
				parentId: undefined,
				siblings: data,
				siblingIndex: i,
			});
		}

		// Collect root IDs
		for (const node of data) {
			this.rootIds.push(node.id);
		}

		let flatIndex = 0;

		while (stack.length > 0) {
			const entry = stack.pop()!;
			const {node, depth, parentId, siblings, siblingIndex} = entry;

			// Check for duplicate IDs
			if (this.map.has(node.id)) {
				throw new Error(
					`TreeView: Duplicate node id '${node.id}' found. All node ids must be unique.`,
				);
			}

			const children = node.children ?? [];
			const hasChildren = children.length > 0 || (node.isParent === true);
			const childrenIds = children.map(c => c.id);

			const previousSiblingId =
				siblingIndex > 0 ? siblings[siblingIndex - 1]!.id : undefined;
			const nextSiblingId =
				siblingIndex < siblings.length - 1
					? siblings[siblingIndex + 1]!.id
					: undefined;

			const flatNode: FlatNode<T> = {
				node,
				depth,
				flatIndex,
				parentId,
				hasChildren,
				childrenIds,
				previousSiblingId,
				nextSiblingId,
			};

			this.map.set(node.id, flatNode);
			this.orderedIds.push(node.id);
			flatIndex++;

			// Push children in reverse order for correct DFS ordering
			if (hasChildren) {
				for (let i = children.length - 1; i >= 0; i--) {
					stack.push({
						node: children[i]!,
						depth: depth + 1,
						parentId: node.id,
						siblings: children,
						siblingIndex: i,
					});
				}
			}
		}
	}

	/**
	 * Get a flat node by ID.
	 */
	get(id: string): FlatNode<T> | undefined {
		return this.map.get(id);
	}

	/**
	 * Total number of nodes in the tree.
	 */
	get size(): number {
		return this.map.size;
	}

	/**
	 * Iterate over all entries.
	 */
	entries(): IterableIterator<[string, FlatNode<T>]> {
		return this.map.entries();
	}

	/**
	 * Check if a node is a descendant of another node.
	 */
	isDescendantOf(nodeId: string, ancestorId: string): boolean {
		let currentId: string | undefined = nodeId;
		while (currentId !== undefined) {
			const flat = this.map.get(currentId);
			if (!flat) return false;
			if (flat.parentId === ancestorId) return true;
			currentId = flat.parentId;
		}

		return false;
	}

	/**
	 * Given a set of expanded node IDs, return the ordered list of
	 * VISIBLE node IDs (i.e., a node is visible if all its ancestors
	 * are expanded).
	 *
	 * Uses iterative DFS, skipping collapsed subtrees.
	 */
	getVisibleIds(expandedIds: ReadonlySet<string>): string[] {
		const result: string[] = [];
		const stack: string[] = [];

		// Push root IDs in reverse so first root is processed first
		for (let i = this.rootIds.length - 1; i >= 0; i--) {
			stack.push(this.rootIds[i]!);
		}

		while (stack.length > 0) {
			const id = stack.pop()!;
			result.push(id);

			const flatNode = this.map.get(id);
			if (flatNode && expandedIds.has(id) && flatNode.childrenIds.length > 0) {
				// Push children in reverse so first child is processed first
				for (let i = flatNode.childrenIds.length - 1; i >= 0; i--) {
					stack.push(flatNode.childrenIds[i]!);
				}
			}
		}

		return result;
	}

	/**
	 * Insert dynamically-loaded children under a parent node.
	 * Returns a new TreeNodeMap (immutable operation).
	 */
	withChildren(
		parentId: string,
		children: Array<TreeNode<T>>,
	): TreeNodeMap<T> {
		const parentFlat = this.map.get(parentId);
		if (!parentFlat) return this;

		// Reconstruct the tree data with the new children inserted
		const rebuildNode = (node: TreeNode<T>): TreeNode<T> => {
			if (node.id === parentId) {
				return {...node, children};
			}

			if (node.children) {
				return {...node, children: node.children.map(rebuildNode)};
			}

			return node;
		};

		// Find the root data by walking rootIds
		const rootData: Array<TreeNode<T>> = [];
		for (const rootId of this.rootIds) {
			const rootFlat = this.map.get(rootId);
			if (rootFlat) {
				rootData.push(rebuildNode(rootFlat.node));
			}
		}

		return new TreeNodeMap(rootData);
	}
}
