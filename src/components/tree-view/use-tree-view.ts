import {useInput} from 'ink';
import {useLayoutEffect, useRef} from 'react';
import {type SelectionMode, type AsyncChildrenFn} from '../../types.js';
import {type TreeViewState} from './use-tree-view-state.js';

export type UseTreeViewProps<T = Record<string, unknown>> = {
	isDisabled?: boolean;
	selectionMode: SelectionMode;
	state: TreeViewState<T>;
	loadChildren?: AsyncChildrenFn<T>;
	onLoadError?: (nodeId: string, error: Error) => void;
};

export function useTreeView<T>({
	isDisabled = false,
	selectionMode,
	state,
	loadChildren,
	onLoadError,
}: UseTreeViewProps<T>) {
	const loadingRef = useRef(new Set<string>());
	const stateRef = useRef(state);
	const loadChildrenRef = useRef(loadChildren);
	const onLoadErrorRef = useRef(onLoadError);
	// Synced at commit, before the input handler below is re-registered.
	useLayoutEffect(() => {
		stateRef.current = state;
		loadChildrenRef.current = loadChildren;
		onLoadErrorRef.current = onLoadError;
	});

	const triggerLoadRef = useRef(async (nodeId: string) => {
		if (loadingRef.current.has(nodeId)) {
			return;
		}

		const currentLoadChildren = loadChildrenRef.current;
		if (!currentLoadChildren) {
			return;
		}

		const flat = stateRef.current.nodeMap.get(nodeId);
		if (!flat || flat.childrenIds.length > 0) {
			return;
		}

		loadingRef.current.add(nodeId);
		stateRef.current.setLoading(nodeId, true);

		try {
			const children = await currentLoadChildren(flat.node);
			// Build the resulting map here, inside the try, so invalid children
			// (e.g. an id that already exists in the tree) take the onLoadError
			// path. The reducer would otherwise throw during render and crash
			// the whole app.
			stateRef.current.nodeMap.withChildren(nodeId, children);
			stateRef.current.insertChildren(nodeId, children);
			stateRef.current.expandNode(nodeId);
		} catch (error: unknown) {
			const loadError =
				error instanceof Error ? error : new Error(String(error));
			stateRef.current.setChildrenError(nodeId);
			onLoadErrorRef.current?.(nodeId, loadError);
		} finally {
			stateRef.current.setLoading(nodeId, false);
			loadingRef.current.delete(nodeId);
		}
	});

	const triggerLoad = triggerLoadRef.current;

	// Focused node is lazy (isParent) with nothing loaded yet: start the load,
	// which expands the node once children arrive. Shared by Right Arrow and
	// the Enter/Space toggle so neither can expand a lazy node without loading.
	const didStartLazyLoad = (): boolean => {
		const {focusedId} = state;
		if (!loadChildren || focusedId === undefined || focusedId === '') {
			return false;
		}

		const flat = state.nodeMap.get(focusedId);
		if (!flat?.hasChildren || flat.childrenIds.length > 0) {
			return false;
		}

		void triggerLoad(focusedId);
		return true;
	};

	const expandOrDescend = () => {
		const {focusedId} = state;
		// The lazy-load check also covers a lazy node already marked expanded
		// (controlled `expanded`) with no children loaded.
		if (focusedId === undefined || focusedId === '' || didStartLazyLoad()) {
			return;
		}

		if (state.expandedIds.has(focusedId)) {
			state.focusFirstChild();
			return;
		}

		state.expand();
	};

	const toggleExpanded = () => {
		const {focusedId} = state;
		const isExpanded =
			focusedId !== undefined && state.expandedIds.has(focusedId);
		if (isExpanded || !didStartLazyLoad()) {
			state.toggleExpanded();
		}
	};

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
				expandOrDescend();
				return;
			}

			if (key.leftArrow) {
				if (
					state.focusedId !== undefined &&
					state.focusedId !== '' &&
					state.expandedIds.has(state.focusedId)
				) {
					state.collapse();
				} else {
					state.focusParent();
				}

				return;
			}

			if (key.return) {
				if (selectionMode === 'none') {
					toggleExpanded();
				} else {
					state.select();
				}

				return;
			}

			if (input === ' ') {
				if (selectionMode === 'multiple') {
					state.select();
				} else {
					toggleExpanded();
				}

				return;
			}

			// Ink 6 delivers Home/End/PageUp/PageDown as key booleans with an
			// empty `input`, not as raw escape sequences.
			if (key.home) {
				state.focusFirst();
				return;
			}

			if (key.end) {
				state.focusLast();
				return;
			}

			if (key.pageDown) {
				state.focusPageDown();
				return;
			}

			if (key.pageUp) {
				state.focusPageUp();
			}
		},
		{isActive: !isDisabled},
	);
}
