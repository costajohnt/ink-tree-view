# ink-tree-view

[![CI](https://github.com/costajohnt/ink-tree-view/actions/workflows/ci.yml/badge.svg)](https://github.com/costajohnt/ink-tree-view/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/ink-tree-view)](https://www.npmjs.com/package/ink-tree-view)
[![license](https://img.shields.io/npm/l/ink-tree-view)](https://github.com/costajohnt/ink-tree-view/blob/main/LICENSE)

<p align="center">
  <img src="media/demo.gif" alt="ink-tree-view demo" width="600">
</p>

A tree view component for [Ink](https://github.com/vadimdemedes/ink) (React for CLIs). Display hierarchical data with expand/collapse, keyboard navigation, selection modes, custom rendering, virtual scrolling, and async lazy loading.

## Features

- Hierarchical data display with expand/collapse
- Full keyboard navigation (arrows, Home/End, Enter, Space)
- Selection modes: none, single, and multiple (with checkboxes)
- Custom node rendering via `renderNode` prop
- Virtual scrolling for large trees (`visibleNodeCount`)
- Async/lazy-loaded children via `loadChildren` + `isParent`
- Error handling for failed async loads via `onLoadError`
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
  /** Mark as a parent whose children will be loaded via loadChildren. */
  isParent?: boolean;
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

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `TreeNode<T>[]` | *required* | Array of root-level tree nodes. |
| `selectionMode` | `'none' \| 'single' \| 'multiple'` | `'none'` | Selection behavior. `'single'` allows one selected node; `'multiple'` shows checkboxes. |
| `defaultExpanded` | `ReadonlySet<string> \| 'all'` | `undefined` | Node IDs expanded on mount, or `'all'` to expand everything. |
| `defaultSelected` | `ReadonlySet<string>` | `undefined` | Node IDs selected on mount (ignored in `'none'` mode). |
| `visibleNodeCount` | `number` | `Infinity` | Max visible rows. Enables virtual scrolling when finite. |
| `renderNode` | `(props: TreeNodeRendererProps<T>) => ReactNode` | `undefined` | Custom renderer for each node. Receives `{node, state}`. |
| `loadChildren` | `(node: TreeNode<T>) => Promise<TreeNode<T>[]>` | `undefined` | Async loader called when expanding an `isParent: true` node. |
| `onLoadError` | `(nodeId: string, error: Error) => void` | `undefined` | Called when `loadChildren` rejects. Loading state is cleared so the user can retry. |
| `onFocusChange` | `(nodeId: string) => void` | `undefined` | Called when the focused node changes (not on initial mount). |
| `onExpandChange` | `(expandedIds: ReadonlySet<string>) => void` | `undefined` | Called when the set of expanded nodes changes. |
| `onSelectChange` | `(selectedIds: ReadonlySet<string>) => void` | `undefined` | Called when the selection changes. |
| `isDisabled` | `boolean` | `false` | When true, all keyboard input is ignored. |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Up Arrow | Move focus to the previous visible node |
| Down Arrow | Move focus to the next visible node |
| Right Arrow | Expand focused node, or move to first child if already expanded. Triggers async load for `isParent` nodes. |
| Left Arrow | Collapse focused node, or move to parent if already collapsed |
| Enter | Toggle expand/collapse (`'none'` mode) or select (`'single'`/`'multiple'` mode) |
| Space | Toggle expand/collapse (`'none'`/`'single'` mode) or toggle selection (`'multiple'` mode) |
| Home | Jump to the first node |
| End | Jump to the last node |

## Custom Rendering

Use the `renderNode` prop to completely control how each node looks.

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

`TreeNodeRendererProps<T>` includes:

- `node` -- the `TreeNode<T>` data
- `state` -- a `TreeNodeState` with: `isFocused`, `isExpanded`, `isSelected`, `depth`, `hasChildren`, `isLoading`

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

Enter and Space toggle selection on the focused node. Checkboxes appear next to each node.

## Virtual Scrolling

For large trees, set `visibleNodeCount` to limit the number of visible rows. The viewport scrolls to keep the focused node in view, and scroll indicators appear when content extends beyond the viewport.

```tsx
<TreeView
  data={largeTree}
  defaultExpanded="all"
  visibleNodeCount={15}
/>
```

## Async Children

Use `loadChildren` to lazily load children when a node is first expanded. Mark on-demand nodes with `isParent: true`. A loading indicator is shown while the request is in progress.

```tsx
async function fetchChildren(node) {
  const response = await fetch(`/api/tree/${node.id}/children`);
  return response.json();
}

const data = [
  {id: 'root', label: 'Root', isParent: true},
  {id: 'leaf', label: 'Leaf'},
];

render(
  <TreeView
    data={data}
    loadChildren={fetchChildren}
    onLoadError={(nodeId, error) => {
      console.error(`Failed to load children for ${nodeId}:`, error.message);
    }}
  />
);
```

When `loadChildren` rejects, `onLoadError` fires and the loading state is cleared so the user can retry by pressing Right Arrow again.

## Hooks API

For headless/custom usage, two hooks are exported directly.

### `useTreeViewState<T>(props)`

Manages all tree state: focus, expansion, selection, viewport scrolling, and loading.

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
```

**Returned state:**

| Property | Type | Description |
|----------|------|-------------|
| `focusedId` | `string \| undefined` | Currently focused node ID |
| `expandedIds` | `ReadonlySet<string>` | Set of expanded node IDs |
| `selectedIds` | `ReadonlySet<string>` | Set of selected node IDs |
| `viewportNodes` | `Array<{node, state}>` | Nodes in current viewport |
| `visibleCount` | `number` | Total visible node count |
| `hasScrollUp` | `boolean` | Nodes exist above the viewport |
| `hasScrollDown` | `boolean` | Nodes exist below the viewport |
| `loadingIds` | `ReadonlySet<string>` | Currently loading node IDs |
| `nodeMap` | `TreeNodeMap<T>` | Underlying data structure |

**Actions:**

| Method | Description |
|--------|-------------|
| `focusNext()` | Move focus down |
| `focusPrevious()` | Move focus up |
| `focusFirst()` | Jump to first node |
| `focusLast()` | Jump to last node |
| `expand()` | Expand focused node |
| `expandNode(id)` | Expand a specific node |
| `collapse()` | Collapse focused node |
| `collapseNode(id)` | Collapse a specific node |
| `toggleExpanded()` | Toggle expand/collapse on focused node |
| `expandAll()` | Expand all nodes |
| `collapseAll()` | Collapse all nodes |
| `select()` | Select/deselect focused node |
| `focusParent()` | Move focus to parent |
| `focusFirstChild()` | Move focus to first child |
| `setLoading(id, bool)` | Mark a node as loading |
| `setChildrenError(id)` | Clear loading state after failure |
| `insertChildren(parentId, children)` | Insert children under a parent |

### `useTreeView<T>(props)`

Wires keyboard input to a `TreeViewState` instance. Call this after `useTreeViewState` to enable keyboard navigation.

```tsx
import {Box, Text} from 'ink';
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
  TreeNode,
  TreeNodeState,
  SelectionMode,
  AsyncChildrenFn,
  TreeViewProps,
  TreeNodeRendererProps,
  TreeViewState,
  UseTreeViewStateProps,
  UseTreeViewProps,
  TreeViewTheme,
  FlatNode,
} from 'ink-tree-view';

import {
  TreeView,
  useTreeViewState,
  useTreeView,
  treeViewTheme,
  TreeNodeMap,
} from 'ink-tree-view';
```

## Contributing

Contributions are welcome. Please open an issue to discuss your idea before submitting a PR.

```bash
git clone https://github.com/costajohnt/ink-tree-view.git
cd ink-tree-view
npm install
npm test
```

Run `npm run build` to compile and `npm run typecheck` to verify types.

## Changelog

See [GitHub Releases](https://github.com/costajohnt/ink-tree-view/releases) for a list of changes.

## License

[MIT](LICENSE) -- Copyright (c) 2024-2026 John Costa
