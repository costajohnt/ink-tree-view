import {type ReactNode} from 'react';

/**
 * A single node in the tree. Generic over the user's data shape.
 * The `id` field MUST be unique across the entire tree.
 */
export type TreeNode<T = Record<string, unknown>> = {
	/** Unique identifier for this node. Used as the key for all lookups. */
	id: string;
	/** Display label. Used by the default renderer. */
	label: string;
	/** Arbitrary user data attached to this node. */
	data?: T;
	/** Child nodes. Undefined or empty array means leaf node. */
	children?: Array<TreeNode<T>>;
	/**
	 * Explicitly marks this node as a parent that can have children loaded
	 * asynchronously via `loadChildren`. When true, the node shows an expand
	 * indicator even if `children` is empty or undefined, and expanding it
	 * triggers the `loadChildren` callback.
	 */
	isParent?: boolean;
};

/**
 * For async/lazy loading: a function that resolves children on demand.
 */
export type AsyncChildrenFn<T = Record<string, unknown>> = (
	node: TreeNode<T>,
) => Promise<Array<TreeNode<T>>>;

/**
 * State passed to custom renderers and theme functions.
 */
export type TreeNodeState = {
	/** Whether this node is currently focused (cursor is on it). */
	isFocused: boolean;
	/** Whether this node is expanded (children visible). */
	isExpanded: boolean;
	/** Whether this node is selected (in select/multi-select mode). */
	isSelected: boolean;
	/** Depth of this node in the tree (root = 0). */
	depth: number;
	/** Whether this node has children (or a lazy loader). */
	hasChildren: boolean;
	/** Whether children are currently loading (async mode). */
	isLoading: boolean;
};

/**
 * Props received by a custom node renderer.
 */
export type TreeNodeRendererProps<T = Record<string, unknown>> = {
	/** The tree node data. */
	node: TreeNode<T>;
	/** Current state of this node. */
	state: TreeNodeState;
};

/**
 * Selection mode for the tree view.
 */
export type SelectionMode = 'none' | 'single' | 'multiple';

/**
 * Props for the TreeView component.
 */
export type TreeViewProps<T = Record<string, unknown>> = {
	/** The tree data. Array of root-level nodes. */
	readonly data: Array<TreeNode<T>>;

	/**
	 * Selection mode.
	 * - 'none': No selection behavior (default).
	 * - 'single': One node can be selected at a time.
	 * - 'multiple': Multiple nodes can be selected (checkboxes shown).
	 * @default 'none'
	 */
	readonly selectionMode?: SelectionMode;

	/**
	 * Set of node IDs that are expanded by default.
	 * If not provided, all nodes start collapsed.
	 */
	readonly defaultExpanded?: ReadonlySet<string> | 'all';

	/**
	 * Set of node IDs that are selected by default.
	 */
	readonly defaultSelected?: ReadonlySet<string>;

	/**
	 * Number of visible nodes in the viewport (for virtualization).
	 * @default Infinity (no virtualization)
	 */
	readonly visibleNodeCount?: number;

	/**
	 * Custom node renderer. Receives node + state, returns Ink JSX.
	 */
	readonly renderNode?: (props: TreeNodeRendererProps<T>) => ReactNode;

	/**
	 * Async function to load children on demand.
	 */
	readonly loadChildren?: AsyncChildrenFn<T>;

	/**
	 * Called when `loadChildren` rejects. Receives the node ID and error.
	 * The node's loading state is automatically cleared so the user can retry.
	 */
	readonly onLoadError?: (nodeId: string, error: Error) => void;

	/** Called when the focused node changes. */
	readonly onFocusChange?: (nodeId: string) => void;

	/** Called when expanded set changes. */
	readonly onExpandChange?: (expandedIds: ReadonlySet<string>) => void;

	/** Called when selection changes. */
	readonly onSelectChange?: (selectedIds: ReadonlySet<string>) => void;

	/**
	 * When disabled, user input is ignored.
	 * @default false
	 */
	readonly isDisabled?: boolean;

	/**
	 * Accessible label for the tree container.
	 * Useful when multiple tree views are on screen.
	 * @default 'Tree view'
	 */
	readonly ariaLabel?: string;
};
