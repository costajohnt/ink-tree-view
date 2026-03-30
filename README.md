# ink-tree-view

A tree view component for [Ink](https://github.com/vadimdemedes/ink) (React for CLIs). Display hierarchical data with expand/collapse, keyboard navigation, selection modes, custom rendering, virtual scrolling, and async lazy loading.

## Features

- Hierarchical data display with expand/collapse
- Full keyboard navigation (arrows, Home/End, Enter, Space)
- Selection modes: none, single, and multiple (with checkboxes)
- Custom node rendering via `renderNode` prop
- Virtual scrolling for large trees (`visibleNodeCount`)
- Async/lazy-loaded children via `loadChildren`
- Headless hooks (`useTreeViewState`, `useTreeView`) for full control
- TypeScript-first with complete type exports

## Install

```
npm install ink-tree-view
```

Peer dependencies: `ink` (>=5.0.0), `react` (>=18.0.0)

## Quick Start

```tsx
import {render} from 'ink';
import {TreeView} from 'ink-tree-view';

const data = [
  {
    id: 'src',
    label: 'src',
    children: [
      {id: 'index', label: 'index.ts'},
      {
        id: 'components',
        label: 'components',
        children: [
          {id: 'button', label: 'button.tsx'},
          {id: 'input', label: 'input.tsx'},
        ],
      },
    ],
  },
  {id: 'readme', label: 'README.md'},
  {id: 'package', label: 'package.json'},
];

render(<TreeView data={data} />);
```

Use arrow keys to navigate, Right to expand, Left to collapse, and Enter to toggle.

## Data Model

Tree data is an array of `TreeNode<T>` objects. Each node must have a unique `id` across the entire tree.

```ts
type TreeNode<T = Record<string, unknown>> = {
  /** Unique identifier. Must be unique across the entire tree. */
  id: string;
  /** Display label used by the default renderer. */
  label: string;
  /** Arbitrary user data attached to this node. */
  data?: T;
  /** Child nodes. Undefined or empty array means leaf node. */
  children?: Array<TreeNode<T>>;
};
```

### Example with custom data

```tsx
type FileInfo = {size: number; modified: string};

const data: TreeNode<FileInfo>[] = [
  {
    id: 'doc',
    label: 'document.pdf',
    data: {size: 1024, modified: '2025-01-15'},
  },
];
```

## Props API

`TreeViewProps<T>` accepts the following props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `TreeNode<T>[]` | (required) | Array of root-level tree nodes. |
| `selectionMode` | `'none' \| 'single' \| 'multiple'` | `'none'` | Selection behavior. `'single'` allows one selected node; `'multiple'` shows checkboxes and allows toggling. |
| `defaultExpanded` | `ReadonlySet<string> \| 'all'` | `undefined` | Set of node IDs expanded on mount, or `'all'` to expand everything. |
| `defaultSelected` | `ReadonlySet<string>` | `undefined` | Set of node IDs selected on mount (ignored in `'none'` mode). |
| `visibleNodeCount` | `number` | `Infinity` | Number of visible rows in the viewport. Enables virtual scrolling when set to a finite value. |
| `renderNode` | `(props: TreeNodeRendererProps<T>) => ReactNode` | `undefined` | Custom renderer for each node. Receives `{node, state}`. |
| `loadChildren` | `(node: TreeNode<T>) => Promise<TreeNode<T>[]>` | `undefined` | Async function called when expanding a node with no children. Enables lazy loading. |
| `onFocusChange` | `(nodeId: string) => void` | `undefined` | Called when the focused node changes (not called on initial mount). |
| `onExpandChange` | `(expandedIds: ReadonlySet<string>) => void` | `undefined` | Called when the set of expanded nodes changes. |
| `onSelectChange` | `(selectedIds: ReadonlySet<string>) => void` | `undefined` | Called when the selection changes. |
| `isDisabled` | `boolean` | `false` | When true, all keyboard input is ignored. |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Up Arrow | Move focus to the previous visible node |
| Down Arrow | Move focus to the next visible node |
| Right Arrow | Expand focused node, or move to first child if already expanded. Triggers async load if `loadChildren` is provided. |
| Left Arrow | Collapse focused node, or move to parent if already collapsed |
| Enter | Toggle expand/collapse (in `'none'` mode) or select (in `'single'`/`'multiple'` mode) |
| Space | Toggle expand/collapse (in `'none'`/`'single'` mode) or toggle selection (in `'multiple'` mode) |
| Home | Jump to the first node |
| End | Jump to the last node |

## Custom Rendering

Use the `renderNode` prop to completely control how each node is displayed.

```tsx
import {Box, Text} from 'ink';
import {TreeView, type TreeNodeRendererProps} from 'ink-tree-view';

type FileData = {size: number};

function CustomNode({node, state}: TreeNodeRendererProps<FileData>) {
  const prefix = state.hasChildren
    ? state.isExpanded ? 'v ' : '> '
    : '  ';

  return (
    <Box>
      <Text dimColor={!state.isFocused}>
        {'  '.repeat(state.depth)}
        {prefix}
        {node.label}
      </Text>
      {node.data && (
        <Text color="gray"> ({node.data.size} bytes)</Text>
      )}
      {state.isSelected && <Text color="green"> [selected]</Text>}
    </Box>
  );
}

render(
  <TreeView<FileData>
    data={data}
    selectionMode="single"
    renderNode={CustomNode}
  />
);
```

The `TreeNodeRendererProps<T>` includes:

- `node` - The `TreeNode<T>` data
- `state` - A `TreeNodeState` object with: `isFocused`, `isExpanded`, `isSelected`, `depth`, `hasChildren`, `isLoading`

## Selection Modes

### No selection (default)

```tsx
<TreeView data={data} />
```

Enter and Space toggle expand/collapse.

### Single selection

```tsx
<TreeView
  data={data}
  selectionMode="single"
  onSelectChange={(selectedIds) => {
    const selected = [...selectedIds][0];
    console.log('Selected:', selected);
  }}
/>
```

Enter selects the focused node. Only one node can be selected at a time.

### Multiple selection

```tsx
<TreeView
  data={data}
  selectionMode="multiple"
  defaultSelected={new Set(['node-1', 'node-3'])}
  onSelectChange={(selectedIds) => {
    console.log('Selected:', [...selectedIds]);
  }}
/>
```

Enter and Space toggle selection on the focused node. Checkboxes are shown next to each node.

## Virtual Scrolling

For large trees, set `visibleNodeCount` to limit the number of visible rows. The viewport automatically scrolls to keep the focused node in view, and scroll indicators appear when there are nodes above or below the viewport.

```tsx
<TreeView
  data={largeTree}
  defaultExpanded="all"
  visibleNodeCount={15}
/>
```

The component displays up/down indicators (e.g., "3 more above", "42 more below") when the tree content extends beyond the viewport.

## Async Children

Use the `loadChildren` prop to lazily load children when a node is first expanded. Nodes that have `children: undefined` or `children: []` combined with a `loadChildren` prop will trigger the async load on expand. A loading indicator is shown while the request is in progress.

```tsx
async function fetchChildren(node) {
  const response = await fetch(`/api/tree/${node.id}/children`);
  return response.json();
}

const data = [
  {id: 'root', label: 'Root', children: []},
];

render(
  <TreeView
    data={data}
    loadChildren={fetchChildren}
  />
);
```

To mark a node as having lazy-loadable children, give it an empty `children` array. The `hasChildren` flag in `TreeNodeState` will be `true`, and the expand indicator will show. When the user presses Right Arrow on such a node, `loadChildren` is called and the children are inserted into the tree.

## Hooks API

For headless/custom usage, the two hooks powering the component are exported directly.

### `useTreeViewState<T>(props)`

Manages all tree state: focus, expansion, selection, viewport scrolling, and loading state.

```tsx
import {useTreeViewState} from 'ink-tree-view';

const state = useTreeViewState({
  data,
  selectionMode: 'multiple',
  defaultExpanded: new Set(['root']),
  visibleNodeCount: 10,
  onFocusChange: (id) => { /* ... */ },
  onExpandChange: (ids) => { /* ... */ },
  onSelectChange: (ids) => { /* ... */ },
});

// state.focusedId        - currently focused node ID
// state.expandedIds      - set of expanded node IDs
// state.selectedIds      - set of selected node IDs
// state.viewportNodes    - array of {node, state} for current viewport
// state.visibleCount     - total visible node count
// state.hasScrollUp      - whether there are nodes above the viewport
// state.hasScrollDown    - whether there are nodes below the viewport
// state.loadingIds       - set of currently loading node IDs
// state.nodeMap          - the underlying TreeNodeMap for advanced queries
//
// Actions:
// state.focusNext()      - move focus down
// state.focusPrevious()  - move focus up
// state.focusFirst()     - jump to first node
// state.focusLast()      - jump to last node
// state.expand()         - expand focused node
// state.expandNode(id)   - expand a specific node by ID
// state.collapse()       - collapse focused node
// state.collapseNode(id) - collapse a specific node by ID
// state.toggleExpanded() - toggle expand/collapse on focused node
// state.expandAll()      - expand all nodes
// state.collapseAll()    - collapse all nodes
// state.select()         - select/deselect focused node
// state.focusParent()    - move focus to parent
// state.focusFirstChild()- move focus to first child
// state.setLoading(id, bool) - mark a node as loading
// state.insertChildren(parentId, children) - insert children under a parent
```

### `useTreeView<T>(props)`

Wires keyboard input handling to a `TreeViewState` instance. Call this in your component after `useTreeViewState` to enable keyboard navigation.

```tsx
import {useTreeViewState, useTreeView} from 'ink-tree-view';

function MyTree({data}) {
  const state = useTreeViewState({data});

  useTreeView({
    state,
    selectionMode: 'none',
    loadChildren: async (node) => {
      // fetch children...
    },
  });

  // Render state.viewportNodes however you like
  return (
    <Box flexDirection="column">
      {state.viewportNodes.map(({node, state: ns}) => (
        <Text key={node.id} bold={ns.isFocused}>
          {'  '.repeat(ns.depth)}{node.label}
        </Text>
      ))}
    </Box>
  );
}
```

## TypeScript

All types are exported from the package entry point:

```ts
import type {
  // Core data types
  TreeNode,
  TreeNodeState,
  SelectionMode,
  AsyncChildrenFn,

  // Component props
  TreeViewProps,
  TreeNodeRendererProps,

  // Hook types
  TreeViewState,
  UseTreeViewStateProps,
  UseTreeViewProps,

  // Theme
  TreeViewTheme,

  // Data structure (for advanced usage)
  FlatNode,
} from 'ink-tree-view';

// Also exported:
// TreeView       - the main component
// useTreeViewState - state management hook
// useTreeView    - keyboard input hook
// treeViewTheme  - default theme object
// TreeNodeMap    - the internal data structure class
```

## License

MIT
