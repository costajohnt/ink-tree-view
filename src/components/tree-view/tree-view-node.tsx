import {Box, Text} from 'ink';
import figures from 'figures';
import {
	type TreeNode,
	type TreeNodeState,
	type SelectionMode,
} from '../../types.js';
import {type Theme} from './theme.js';

type TreeViewNodeProps<T> = {
	node: TreeNode<T>;
	nodeState: TreeNodeState;
	selectionMode: SelectionMode;
	styles: Theme['styles'];
};

export function TreeViewNode<T>({
	node,
	nodeState,
	selectionMode,
	styles,
}: TreeViewNodeProps<T>) {
	const {isFocused, isExpanded, isSelected, depth, hasChildren, isLoading} =
		nodeState;

	// Determine expand/collapse indicator
	let expandChar = ' ';
	if (isLoading) {
		expandChar = '\u27F3'; // ⟳
	} else if (hasChildren) {
		expandChar = isExpanded ? figures.triangleDown : figures.triangleRight;
	}

	return (
		<Box {...styles.node({isFocused})}>
			{/* Focus indicator */}
			{isFocused && (
				<Text {...styles.focusIndicator()}>{figures.pointer}</Text>
			)}

			{/* Indentation based on depth */}
			{depth > 0 && <Text>{' '.repeat(depth * 2)}</Text>}

			{/* Multi-select checkbox */}
			{selectionMode === 'multiple' && (
				<Text {...styles.selectedIndicator()}>
					{isSelected ? figures.checkboxOn : figures.checkboxOff}
				</Text>
			)}

			{/* Expand/collapse indicator */}
			<Text {...styles.expandIndicator({isExpanded})}>{expandChar}</Text>

			{/* Node label */}
			<Text {...styles.label({isFocused, isSelected})}>{node.label}</Text>

			{/* Single-select tick */}
			{selectionMode === 'single' && isSelected && (
				<Text {...styles.selectedIndicator()}> {figures.tick}</Text>
			)}
		</Box>
	);
}
