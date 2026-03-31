import {Box, Text, useIsScreenReaderEnabled} from 'ink';
import {type TreeViewProps} from '../../types.js';
import {useTreeViewState} from './use-tree-view-state.js';
import {useTreeView} from './use-tree-view.js';
import {TreeViewNode} from './tree-view-node.js';
import theme from './theme.js';

export function TreeView<T = Record<string, unknown>>({
	data,
	selectionMode = 'none',
	defaultExpanded,
	defaultSelected,
	visibleNodeCount,
	renderNode,
	loadChildren,
	onLoadError,
	onFocusChange,
	onExpandChange,
	onSelectChange,
	isDisabled = false,
}: TreeViewProps<T>) {
	const state = useTreeViewState<T>({
		data,
		selectionMode,
		defaultExpanded,
		defaultSelected,
		visibleNodeCount,
		onFocusChange,
		onExpandChange,
		onSelectChange,
	});

	useTreeView<T>({
		isDisabled,
		selectionMode,
		state,
		loadChildren,
		onLoadError,
	});

	const styles = theme.styles;
	const isScreenReaderEnabled = useIsScreenReaderEnabled();

	return (
		<Box
			{...styles.container()}
			aria-role="list"
			aria-label="Tree view"
		>
			{state.hasScrollUp && (
				<Text dimColor aria-hidden>
					{'  '}\u2191 {state.viewportFromIndex} more above
				</Text>
			)}
			{state.viewportNodes.map(({node, state: nodeState}) => {
				if (renderNode) {
					return (
						<Box key={node.id} aria-role="listitem">
							{renderNode({node, state: nodeState})}
						</Box>
					);
				}

				// Compute sibling position for this node
				const flatNode = state.nodeMap.get(node.id);
				let siblingPosition = 1;
				let siblingCount = 1;
				if (flatNode) {
					if (flatNode.parentId) {
						const parentFlat = state.nodeMap.get(flatNode.parentId);
						if (parentFlat) {
							siblingCount = parentFlat.childrenIds.length;
							siblingPosition = parentFlat.childrenIds.indexOf(node.id) + 1;
						}
					} else {
						siblingCount = state.nodeMap.rootIds.length;
						siblingPosition = state.nodeMap.rootIds.indexOf(node.id) + 1;
					}
				}

				return (
					<TreeViewNode
						key={node.id}
						node={node}
						nodeState={nodeState}
						selectionMode={selectionMode}
						styles={styles}
						isScreenReaderEnabled={isScreenReaderEnabled}
						siblingPosition={siblingPosition}
						siblingCount={siblingCount}
					/>
				);
			})}
			{state.hasScrollDown && (
				<Text dimColor aria-hidden>
					{'  '}\u2193 {state.visibleCount - state.viewportToIndex}{' '}
					more below
				</Text>
			)}
		</Box>
	);
}
