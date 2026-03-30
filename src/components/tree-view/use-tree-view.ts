import {useInput} from 'ink';
import {useRef} from 'react';
import {type SelectionMode, type AsyncChildrenFn} from '../../types.js';
import {type TreeViewState} from './use-tree-view-state.js';

export type UseTreeViewProps<T = Record<string, unknown>> = {
	isDisabled?: boolean;
	selectionMode: SelectionMode;
	state: TreeViewState<T>;
	loadChildren?: AsyncChildrenFn<T>;
};

export function useTreeView<T>({
	isDisabled = false,
	selectionMode,
	state,
	loadChildren,
}: UseTreeViewProps<T>) {
	const loadingRef = useRef(new Set<string>());
	const stateRef = useRef(state);
	stateRef.current = state;

	const loadChildrenRef = useRef(loadChildren);
	loadChildrenRef.current = loadChildren;

	const triggerLoadRef = useRef(async (nodeId: string) => {
		if (loadingRef.current.has(nodeId)) return;

		const currentLoadChildren = loadChildrenRef.current;
		if (!currentLoadChildren) return;

		const flat = stateRef.current.nodeMap.get(nodeId);
		if (!flat || flat.childrenIds.length > 0) return;

		loadingRef.current.add(nodeId);
		stateRef.current.setLoading(nodeId, true);

		try {
			const children = await currentLoadChildren(flat.node);
			stateRef.current.insertChildren(nodeId, children);
			stateRef.current.expandNode(nodeId);
		} catch {
			// Silently fail, user can retry
		} finally {
			stateRef.current.setLoading(nodeId, false);
			loadingRef.current.delete(nodeId);
		}
	});

	const triggerLoad = triggerLoadRef.current;

	useInput(
		(input, key) => {
			if (key.downArrow) {
				state.focusNext();
				return;
			}

			if (key.upArrow) {
				state.focusPrevious();
				return;
			}

			if (key.rightArrow) {
				if (
					state.focusedId &&
					state.expandedIds.has(state.focusedId)
				) {
					// Already expanded: move to first child
					state.focusFirstChild();
				} else if (state.focusedId) {
					// Not expanded: try to expand
					if (loadChildren) {
						const flat = state.nodeMap.get(state.focusedId);
						if (
							flat &&
							flat.hasChildren &&
							flat.childrenIds.length === 0
						) {
							// Async load needed
							void triggerLoad(state.focusedId);
							return;
						}
					}

					state.expand();
				}

				return;
			}

			if (key.leftArrow) {
				if (
					state.focusedId &&
					state.expandedIds.has(state.focusedId)
				) {
					state.collapse();
				} else {
					state.focusParent();
				}

				return;
			}

			if (key.return) {
				if (selectionMode !== 'none') {
					state.select();
				} else {
					state.toggleExpanded();
				}

				return;
			}

			if (input === ' ') {
				if (selectionMode === 'multiple') {
					state.select();
				} else {
					state.toggleExpanded();
				}

				return;
			}

			// Home key: input is the raw escape sequence
			// ESC[H, ESC[1~, or ESCOH
			if (
				input === '\u001B[H' ||
				input === '\u001B[1~' ||
				input === '\u001BOH'
			) {
				state.focusFirst();
				return;
			}

			// End key: ESC[F, ESC[4~, or ESCOF
			if (
				input === '\u001B[F' ||
				input === '\u001B[4~' ||
				input === '\u001BOF'
			) {
				state.focusLast();
				return;
			}
		},
		{isActive: !isDisabled},
	);
}
