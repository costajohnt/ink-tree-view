import {Box, Text, useIsScreenReaderEnabled} from 'ink';
import {type TreeViewProps} from '../../types.js';
import {useTreeViewState} from './use-tree-view-state.js';
import {useTreeView} from './use-tree-view.js';
import {TreeViewNode, buildNodeAriaLabel} from './tree-view-node.js';
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
	ariaLabel = 'Tree view',
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
		// Ink's aria-role enum does not include "tree"/"treeitem"/"group",
		// so we use "list"/"listitem" as the closest available semantic match.
		<Box
			{...styles.container()}
			aria-role="list"
			aria-label={ariaLabel}
		>
			{state.hasScrollUp && (
				<Text dimColor aria-hidden>
					{'  '}\u2191 {state.viewportFromIndex} more above
				</Text>
			)}
			{state.viewportNodes.map(({node, state: nodeState}) => {
				const flatNode = state.nodeMap.get(node.id);
				const siblingPosition = flatNode ? flatNode.siblingIndex + 1 : 1;
				const siblingCount = flatNode ? flatNode.siblingCount : 1;

				if (renderNode) {
					const nodeAriaLabel = isScreenReaderEnabled
						? buildNodeAriaLabel(node.label, nodeState, siblingPosition, siblingCount)
						: undefined;

					const ariaState: {expanded?: boolean; selected?: boolean} = {};
					if (nodeState.hasChildren) {
						ariaState.expanded = nodeState.isExpanded;
					}

					if (selectionMode !== 'none') {
						ariaState.selected = nodeState.isSelected;
					}

					return (
						<Box
							key={node.id}
							aria-role="listitem"
							aria-label={nodeAriaLabel}
							aria-state={Object.keys(ariaState).length > 0 ? ariaState : undefined}
						>
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
