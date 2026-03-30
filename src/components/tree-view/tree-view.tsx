import {Box, Text} from 'ink';
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

	return (
		<Box {...styles.container()}>
			{state.hasScrollUp && (
				<Text dimColor>
					{'  '}\u2191 {state.viewportFromIndex} more above
				</Text>
			)}
			{state.viewportNodes.map(({node, state: nodeState}) => {
				if (renderNode) {
					return (
						<Box key={node.id}>
							{renderNode({node, state: nodeState})}
						</Box>
					);
				}

				return (
					<TreeViewNode
						key={node.id}
						node={node}
						nodeState={nodeState}
						selectionMode={selectionMode}
						styles={styles}
					/>
				);
			})}
			{state.hasScrollDown && (
				<Text dimColor>
					{'  '}\u2193 {state.visibleCount - state.viewportToIndex}{' '}
					more below
				</Text>
			)}
		</Box>
	);
}
