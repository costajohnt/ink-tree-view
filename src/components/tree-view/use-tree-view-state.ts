import {useCallback, useEffect, useMemo, useReducer, useRef, useState} from 'react';
import {type TreeNode, type TreeNodeState, type SelectionMode} from '../../types.js';
import {TreeNodeMap} from '../../tree-node-map.js';

// ─── State ──────────────────────────────────────────────────────────────────

export type State<T> = {
	nodeMap: TreeNodeMap<T>;
	expandedIds: Set<string>;
	visibleIds: string[];
	focusedId: string | undefined;
	visibleNodeCount: number;
	viewportFromIndex: number;
	viewportToIndex: number;
	selectionMode: SelectionMode;
	selectedIds: Set<string>;
	previousSelectedIds: Set<string>;
	previousExpandedIds: Set<string>;
	loadingIds: Set<string>;
};

// ─── Actions ────────────────────────────────────────────────────────────────

export type Action<T> =
	| {type: 'focus-next'}
	| {type: 'focus-previous'}
	| {type: 'focus-first'}
	| {type: 'focus-last'}
	| {type: 'expand'}
	| {type: 'expand-node'; nodeId: string}
	| {type: 'collapse'}
	| {type: 'collapse-node'; nodeId: string}
	| {type: 'toggle-expanded'}
	| {type: 'expand-all'}
	| {type: 'collapse-all'}
	| {type: 'select'}
	| {type: 'focus-parent'}
	| {type: 'focus-first-child'}
	| {type: 'set-loading'; nodeId: string; isLoading: boolean}
	| {type: 'insert-children'; parentId: string; children: Array<TreeNode<T>>}
	| {type: 'reset'; state: State<T>};

// ─── Viewport helper ────────────────────────────────────────────────────────

function adjustViewport<T>(
	state: State<T>,
	targetIndex: number,
): {viewportFromIndex: number; viewportToIndex: number} {
	if (state.visibleNodeCount >= state.visibleIds.length) {
		return {viewportFromIndex: 0, viewportToIndex: state.visibleIds.length};
	}

	let from = state.viewportFromIndex;
	let to = state.viewportToIndex;

	// Scroll down: target is at or past the bottom of viewport
	if (targetIndex >= to) {
		to = targetIndex + 1;
		from = to - state.visibleNodeCount;
	}

	// Scroll up: target is before the top of viewport
	if (targetIndex < from) {
		from = targetIndex;
		to = from + state.visibleNodeCount;
	}

	return {
		viewportFromIndex: Math.max(0, from),
		viewportToIndex: Math.min(state.visibleIds.length, to),
	};
}

function adjustViewportForNewVisible<T>(
	state: State<T>,
	newVisible: string[],
): {viewportFromIndex: number; viewportToIndex: number} {
	if (state.visibleNodeCount >= newVisible.length) {
		return {viewportFromIndex: 0, viewportToIndex: newVisible.length};
	}

	// Keep the focused node in the viewport
	const focusedIdx = state.focusedId
		? newVisible.indexOf(state.focusedId)
		: -1;

	if (focusedIdx < 0) {
		return {
			viewportFromIndex: 0,
			viewportToIndex: Math.min(state.visibleNodeCount, newVisible.length),
		};
	}

	let from = state.viewportFromIndex;
	let to = state.viewportToIndex;

	// Clamp to new bounds
	to = Math.min(to, newVisible.length);
	from = Math.max(0, to - state.visibleNodeCount);

	// Ensure focused node is visible
	if (focusedIdx >= to) {
		to = focusedIdx + 1;
		from = to - state.visibleNodeCount;
	}

	if (focusedIdx < from) {
		from = focusedIdx;
		to = from + state.visibleNodeCount;
	}

	return {
		viewportFromIndex: Math.max(0, from),
		viewportToIndex: Math.min(newVisible.length, to),
	};
}

// ─── Reducer ────────────────────────────────────────────────────────────────

export function reducer<T>(state: State<T>, action: Action<T>): State<T> {
	switch (action.type) {
		case 'focus-next': {
			if (!state.focusedId) return state;
			const idx = state.visibleIds.indexOf(state.focusedId);
			if (idx < 0 || idx >= state.visibleIds.length - 1) return state;
			const nextId = state.visibleIds[idx + 1]!;
			return {
				...state,
				focusedId: nextId,
				...adjustViewport(state, idx + 1),
			};
		}

		case 'focus-previous': {
			if (!state.focusedId) return state;
			const idx = state.visibleIds.indexOf(state.focusedId);
			if (idx <= 0) return state;
			const prevId = state.visibleIds[idx - 1]!;
			return {
				...state,
				focusedId: prevId,
				...adjustViewport(state, idx - 1),
			};
		}

		case 'focus-first': {
			if (state.visibleIds.length === 0) return state;
			return {
				...state,
				focusedId: state.visibleIds[0],
				viewportFromIndex: 0,
				viewportToIndex: Math.min(
					state.visibleNodeCount,
					state.visibleIds.length,
				),
			};
		}

		case 'focus-last': {
			if (state.visibleIds.length === 0) return state;
			const lastIdx = state.visibleIds.length - 1;
			return {
				...state,
				focusedId: state.visibleIds[lastIdx],
				...adjustViewport(state, lastIdx),
			};
		}

		case 'expand': {
			if (!state.focusedId) return state;
			return reducer(state, {type: 'expand-node', nodeId: state.focusedId});
		}

		case 'expand-node': {
			const {nodeId} = action;
			const flat = state.nodeMap.get(nodeId);
			if (!flat || !flat.hasChildren) return state;
			if (state.expandedIds.has(nodeId)) return state;
			const newExpanded = new Set(state.expandedIds);
			newExpanded.add(nodeId);
			const newVisible = state.nodeMap.getVisibleIds(newExpanded);
			return {
				...state,
				previousExpandedIds: state.expandedIds,
				expandedIds: newExpanded,
				visibleIds: newVisible,
				...adjustViewportForNewVisible(
					{...state, visibleIds: newVisible},
					newVisible,
				),
			};
		}

		case 'collapse': {
			if (!state.focusedId) return state;
			return reducer(state, {type: 'collapse-node', nodeId: state.focusedId});
		}

		case 'collapse-node': {
			const {nodeId} = action;
			if (!state.expandedIds.has(nodeId)) return state;
			const newExpanded = new Set(state.expandedIds);
			newExpanded.delete(nodeId);
			const newVisible = state.nodeMap.getVisibleIds(newExpanded);

			// Collapse-focus invariant: if the focused node is a descendant
			// of the collapsed node, move focus to the collapsed node.
			let newFocusedId = state.focusedId;
			if (
				newFocusedId !== undefined &&
				newFocusedId !== nodeId &&
				state.nodeMap.isDescendantOf(newFocusedId, nodeId)
			) {
				newFocusedId = nodeId;
			}

			return {
				...state,
				focusedId: newFocusedId,
				previousExpandedIds: state.expandedIds,
				expandedIds: newExpanded,
				visibleIds: newVisible,
				...adjustViewportForNewVisible(
					{...state, focusedId: newFocusedId, visibleIds: newVisible},
					newVisible,
				),
			};
		}

		case 'toggle-expanded': {
			if (!state.focusedId) return state;
			if (state.expandedIds.has(state.focusedId)) {
				return reducer(state, {type: 'collapse'});
			}

			return reducer(state, {type: 'expand'});
		}

		case 'expand-all': {
			const allParentIds = new Set<string>();
			for (const [id, flat] of state.nodeMap.entries()) {
				if (flat.hasChildren) allParentIds.add(id);
			}

			const newVisible = state.nodeMap.getVisibleIds(allParentIds);
			return {
				...state,
				previousExpandedIds: state.expandedIds,
				expandedIds: allParentIds,
				visibleIds: newVisible,
				...adjustViewportForNewVisible(
					{...state, visibleIds: newVisible},
					newVisible,
				),
			};
		}

		case 'collapse-all': {
			const newExpanded = new Set<string>();
			const newVisible = state.nodeMap.getVisibleIds(newExpanded);
			return {
				...state,
				previousExpandedIds: state.expandedIds,
				expandedIds: newExpanded,
				visibleIds: newVisible,
				focusedId: newVisible[0],
				viewportFromIndex: 0,
				viewportToIndex: Math.min(
					state.visibleNodeCount,
					newVisible.length,
				),
			};
		}

		case 'select': {
			if (!state.focusedId) return state;
			if (state.selectionMode === 'none') return state;

			if (state.selectionMode === 'single') {
				const newSelected = new Set<string>([state.focusedId]);
				return {
					...state,
					previousSelectedIds: state.selectedIds,
					selectedIds: newSelected,
				};
			}

			// 'multiple': toggle
			const newSelected = new Set(state.selectedIds);
			if (newSelected.has(state.focusedId)) {
				newSelected.delete(state.focusedId);
			} else {
				newSelected.add(state.focusedId);
			}

			return {
				...state,
				previousSelectedIds: state.selectedIds,
				selectedIds: newSelected,
			};
		}

		case 'focus-parent': {
			if (!state.focusedId) return state;
			const flat = state.nodeMap.get(state.focusedId);
			if (!flat?.parentId) return state;
			const parentIdx = state.visibleIds.indexOf(flat.parentId);
			if (parentIdx < 0) return state;
			return {
				...state,
				focusedId: flat.parentId,
				...adjustViewport(state, parentIdx),
			};
		}

		case 'focus-first-child': {
			if (!state.focusedId) return state;
			const flat = state.nodeMap.get(state.focusedId);
			if (!flat || flat.childrenIds.length === 0) return state;
			if (!state.expandedIds.has(state.focusedId)) return state;
			const firstChildId = flat.childrenIds[0]!;
			const childIdx = state.visibleIds.indexOf(firstChildId);
			if (childIdx < 0) return state;
			return {
				...state,
				focusedId: firstChildId,
				...adjustViewport(state, childIdx),
			};
		}

		case 'set-loading': {
			const newLoading = new Set(state.loadingIds);
			if (action.isLoading) {
				newLoading.add(action.nodeId);
			} else {
				newLoading.delete(action.nodeId);
			}

			return {...state, loadingIds: newLoading};
		}

		case 'insert-children': {
			const parentFlat = state.nodeMap.get(action.parentId);
			if (!parentFlat) return state;
			const newNodeMap = state.nodeMap.withChildren(
				action.parentId,
				action.children,
			);
			const newVisible = newNodeMap.getVisibleIds(state.expandedIds);
			return {
				...state,
				nodeMap: newNodeMap,
				visibleIds: newVisible,
			};
		}

		case 'reset': {
			return action.state;
		}

		default: {
			return state;
		}
	}
}

// ─── Default state factory ──────────────────────────────────────────────────

export type CreateDefaultStateProps<T> = {
	data: Array<TreeNode<T>>;
	selectionMode: SelectionMode;
	defaultExpanded?: ReadonlySet<string> | 'all';
	defaultSelected?: ReadonlySet<string>;
	visibleNodeCount: number;
};

export function createDefaultState<T>({
	data,
	selectionMode,
	defaultExpanded,
	defaultSelected,
	visibleNodeCount,
}: CreateDefaultStateProps<T>): State<T> {
	const nodeMap = new TreeNodeMap(data);

	let expandedIds: Set<string>;
	if (defaultExpanded === 'all') {
		expandedIds = new Set<string>();
		for (const [id, flat] of nodeMap.entries()) {
			if (flat.hasChildren) expandedIds.add(id);
		}
	} else if (defaultExpanded) {
		expandedIds = new Set(defaultExpanded);
	} else {
		expandedIds = new Set();
	}

	const visibleIds = nodeMap.getVisibleIds(expandedIds);
	const selectedIds =
		selectionMode !== 'none' && defaultSelected
			? new Set(defaultSelected)
			: new Set<string>();

	const nodeCount = Math.min(visibleNodeCount, visibleIds.length);

	return {
		nodeMap,
		expandedIds,
		visibleIds,
		focusedId: visibleIds[0],
		visibleNodeCount,
		viewportFromIndex: 0,
		viewportToIndex: nodeCount,
		selectionMode,
		selectedIds,
		previousSelectedIds: selectedIds,
		previousExpandedIds: expandedIds,
		loadingIds: new Set(),
	};
}

// ─── Public hook types ──────────────────────────────────────────────────────

export type UseTreeViewStateProps<T = Record<string, unknown>> = {
	data: Array<TreeNode<T>>;
	selectionMode?: SelectionMode;
	defaultExpanded?: ReadonlySet<string> | 'all';
	defaultSelected?: ReadonlySet<string>;
	visibleNodeCount?: number;
	onFocusChange?: (nodeId: string) => void;
	onExpandChange?: (expandedIds: ReadonlySet<string>) => void;
	onSelectChange?: (selectedIds: ReadonlySet<string>) => void;
};

export type TreeViewState<T = Record<string, unknown>> = {
	focusedId: string | undefined;
	expandedIds: ReadonlySet<string>;
	selectedIds: ReadonlySet<string>;
	viewportNodes: Array<{node: TreeNode<T>; state: TreeNodeState}>;
	visibleCount: number;
	hasScrollUp: boolean;
	hasScrollDown: boolean;
	viewportFromIndex: number;
	viewportToIndex: number;
	loadingIds: ReadonlySet<string>;
	nodeMap: TreeNodeMap<T>;
	focusNext: () => void;
	focusPrevious: () => void;
	focusFirst: () => void;
	focusLast: () => void;
	expand: () => void;
	expandNode: (nodeId: string) => void;
	collapse: () => void;
	collapseNode: (nodeId: string) => void;
	toggleExpanded: () => void;
	expandAll: () => void;
	collapseAll: () => void;
	select: () => void;
	focusParent: () => void;
	focusFirstChild: () => void;
	setLoading: (nodeId: string, isLoading: boolean) => void;
	insertChildren: (
		parentId: string,
		children: Array<TreeNode<T>>,
	) => void;
};

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useTreeViewState<T = Record<string, unknown>>({
	data,
	selectionMode = 'none',
	defaultExpanded,
	defaultSelected,
	visibleNodeCount = Infinity,
	onFocusChange,
	onExpandChange,
	onSelectChange,
}: UseTreeViewStateProps<T>): TreeViewState<T> {
	const [state, dispatch] = useReducer(
		reducer<T>,
		{data, selectionMode, defaultExpanded, defaultSelected, visibleNodeCount},
		createDefaultState<T>,
	);

	// Detect data changes and reset
	const [lastData, setLastData] = useState(data);
	if (data !== lastData) {
		dispatch({
			type: 'reset',
			state: createDefaultState({
				data,
				selectionMode,
				defaultExpanded,
				defaultSelected,
				visibleNodeCount,
			}),
		});
		setLastData(data);
	}

	// Fire callbacks on state changes (skip initial mount for onFocusChange)
	const isInitialMount = useRef(true);
	useEffect(() => {
		if (isInitialMount.current) {
			isInitialMount.current = false;
			return;
		}

		if (state.focusedId) onFocusChange?.(state.focusedId);
	}, [state.focusedId, onFocusChange]);

	useEffect(() => {
		if (state.expandedIds !== state.previousExpandedIds) {
			onExpandChange?.(state.expandedIds);
		}
	}, [state.expandedIds, state.previousExpandedIds, onExpandChange]);

	useEffect(() => {
		if (state.selectedIds !== state.previousSelectedIds) {
			onSelectChange?.(state.selectedIds);
		}
	}, [state.selectedIds, state.previousSelectedIds, onSelectChange]);

	// Compute viewportNodes from state
	const viewportNodes = useMemo(() => {
		return state.visibleIds
			.slice(state.viewportFromIndex, state.viewportToIndex)
			.map(id => {
				const flat = state.nodeMap.get(id)!;
				return {
					node: flat.node,
					state: {
						isFocused: id === state.focusedId,
						isExpanded: state.expandedIds.has(id),
						isSelected: state.selectedIds.has(id),
						depth: flat.depth,
						hasChildren: flat.hasChildren,
						isLoading: state.loadingIds.has(id),
					} satisfies TreeNodeState,
				};
			});
	}, [
		state.visibleIds,
		state.viewportFromIndex,
		state.viewportToIndex,
		state.focusedId,
		state.expandedIds,
		state.selectedIds,
		state.nodeMap,
		state.loadingIds,
	]);

	const focusNext = useCallback(
		() => dispatch({type: 'focus-next'}),
		[],
	);
	const focusPrevious = useCallback(
		() => dispatch({type: 'focus-previous'}),
		[],
	);
	const focusFirst = useCallback(
		() => dispatch({type: 'focus-first'}),
		[],
	);
	const focusLast = useCallback(
		() => dispatch({type: 'focus-last'}),
		[],
	);
	const expand = useCallback(() => dispatch({type: 'expand'}), []);
	const expandNode = useCallback(
		(nodeId: string) => dispatch({type: 'expand-node', nodeId}),
		[],
	);
	const collapse = useCallback(
		() => dispatch({type: 'collapse'}),
		[],
	);
	const collapseNode = useCallback(
		(nodeId: string) => dispatch({type: 'collapse-node', nodeId}),
		[],
	);
	const toggleExpanded = useCallback(
		() => dispatch({type: 'toggle-expanded'}),
		[],
	);
	const expandAll = useCallback(
		() => dispatch({type: 'expand-all'}),
		[],
	);
	const collapseAll = useCallback(
		() => dispatch({type: 'collapse-all'}),
		[],
	);
	const select = useCallback(() => dispatch({type: 'select'}), []);
	const focusParent = useCallback(
		() => dispatch({type: 'focus-parent'}),
		[],
	);
	const focusFirstChild = useCallback(
		() => dispatch({type: 'focus-first-child'}),
		[],
	);
	const setLoading = useCallback(
		(nodeId: string, isLoading: boolean) =>
			dispatch({type: 'set-loading', nodeId, isLoading}),
		[],
	);
	const insertChildren = useCallback(
		(parentId: string, children: Array<TreeNode<T>>) =>
			dispatch({type: 'insert-children', parentId, children}),
		[],
	);

	return {
		focusedId: state.focusedId,
		expandedIds: state.expandedIds,
		selectedIds: state.selectedIds,
		viewportNodes,
		visibleCount: state.visibleIds.length,
		hasScrollUp: state.viewportFromIndex > 0,
		hasScrollDown: state.viewportToIndex < state.visibleIds.length,
		viewportFromIndex: state.viewportFromIndex,
		viewportToIndex: state.viewportToIndex,
		loadingIds: state.loadingIds,
		nodeMap: state.nodeMap,
		focusNext,
		focusPrevious,
		focusFirst,
		focusLast,
		expand,
		expandNode,
		collapse,
		collapseNode,
		toggleExpanded,
		expandAll,
		collapseAll,
		select,
		focusParent,
		focusFirstChild,
		setLoading,
		insertChildren,
	};
}
