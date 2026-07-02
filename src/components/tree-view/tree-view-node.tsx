import {memo} from 'react';
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
	isScreenReaderEnabled: boolean;
	siblingPosition: number;
	siblingCount: number;
};

export function buildNodeAriaLabel(
	label: string,
	nodeState: TreeNodeState,
	siblingPosition: number,
	siblingCount: number,
): string {
	const {depth, hasChildren, isExpanded, isLoading, isSelected} = nodeState;
	const parts: string[] = [label, `item ${siblingPosition} of ${siblingCount}`];
	if (depth > 0) {
		parts.push(`depth ${depth}`);
	}

	if (hasChildren) {
		parts.push(isExpanded ? 'expanded' : 'collapsed');
	}

	if (isLoading) {
		parts.push('loading');
	}

	if (isSelected) {
		parts.push('selected');
	}

	return parts.join(', ');
}

export function buildNodeAriaState(
	nodeState: TreeNodeState,
	selectionMode: SelectionMode,
): {expanded?: boolean; selected?: boolean} | undefined {
	const state: {expanded?: boolean; selected?: boolean} = {};
	if (nodeState.hasChildren) {
		state.expanded = nodeState.isExpanded;
	}

	if (selectionMode !== 'none') {
		state.selected = nodeState.isSelected;
	}

	return Object.keys(state).length > 0 ? state : undefined;
}

/**
 * Compares two sets of `TreeViewNode` props by their primitive values so
 * `React.memo` can skip re-rendering rows whose state did not change. Without
 * this, a keypress recreates every row's `nodeState` object and forces the
 * whole viewport to re-render.
 */
export function areTreeViewNodePropsEqual<T>(
	previous: TreeViewNodeProps<T>,
	next: TreeViewNodeProps<T>,
): boolean {
	const a = previous.nodeState;
	const b = next.nodeState;
	return (
		previous.node === next.node &&
		previous.selectionMode === next.selectionMode &&
		previous.styles === next.styles &&
		previous.isScreenReaderEnabled === next.isScreenReaderEnabled &&
		previous.siblingPosition === next.siblingPosition &&
		previous.siblingCount === next.siblingCount &&
		a.isFocused === b.isFocused &&
		a.isExpanded === b.isExpanded &&
		a.isSelected === b.isSelected &&
		a.depth === b.depth &&
		a.hasChildren === b.hasChildren &&
		a.isLoading === b.isLoading
	);
}

function TreeViewNodeInner<T>({
	node,
	nodeState,
	selectionMode,
	styles,
	isScreenReaderEnabled,
	siblingPosition,
	siblingCount,
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

	const ariaLabel = isScreenReaderEnabled
		? buildNodeAriaLabel(node.label, nodeState, siblingPosition, siblingCount)
		: undefined;

	return (
		<Box
			{...styles.node({isFocused})}
			aria-role="listitem"
			aria-state={buildNodeAriaState(nodeState, selectionMode)}
		>
			{ariaLabel ? <Text aria-label={ariaLabel} /> : null}
			{/* Focus indicator */}
			{isFocused ? <Text {...styles.focusIndicator()} aria-hidden>{figures.pointer}</Text> : null}

			{/* Indentation based on depth */}
			{depth > 0 && <Box {...styles.indent({depth})} aria-hidden />}

			{/* Multi-select checkbox */}
			{selectionMode === 'multiple' && (
				<Text {...styles.selectedIndicator()} aria-hidden>
					{isSelected ? figures.checkboxOn : figures.checkboxOff}
				</Text>
			)}

			{/* Expand/collapse indicator */}
			<Text {...(isLoading ? styles.loadingIndicator() : styles.expandIndicator({isExpanded}))} aria-hidden>{expandChar}</Text>

			{/* Node label */}
			<Text {...styles.label({isFocused, isSelected})}>{node.label}</Text>

			{/* Single-select tick */}
			{selectionMode === 'single' && isSelected ? <Text {...styles.selectedIndicator()} aria-hidden> {figures.tick}</Text> : null}
		</Box>
	);
}

// Memoized on primitive props so unrelated rows do not re-render on every
// keypress. The `as typeof TreeViewNodeInner` cast preserves the generic
// call signature that `memo` would otherwise erase.
// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
export const TreeViewNode = memo(
	TreeViewNodeInner,
	areTreeViewNodePropsEqual,
) as typeof TreeViewNodeInner;
