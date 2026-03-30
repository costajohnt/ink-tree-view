// Component
export {TreeView} from './components/tree-view/tree-view.js';

// Hooks (for advanced/headless usage)
export {useTreeViewState} from './components/tree-view/use-tree-view-state.js';
export type {
	TreeViewState,
	UseTreeViewStateProps,
} from './components/tree-view/use-tree-view-state.js';
export {useTreeView} from './components/tree-view/use-tree-view.js';
export type {UseTreeViewProps} from './components/tree-view/use-tree-view.js';

// Types
export type {
	TreeNode,
	TreeNodeState,
	TreeNodeRendererProps,
	TreeViewProps,
	SelectionMode,
	AsyncChildrenFn,
} from './types.js';

// Theme (for customization)
export {default as treeViewTheme} from './components/tree-view/theme.js';
export type {Theme as TreeViewTheme} from './components/tree-view/theme.js';

// Data structure (for advanced usage)
export {TreeNodeMap} from './tree-node-map.js';
export type {FlatNode} from './tree-node-map.js';
