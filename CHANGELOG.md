# Changelog

## 0.1.0 (2026-03-30)

Initial release.

### Features

- `TreeView` component with expand/collapse and keyboard navigation
- Selection modes: `none`, `single`, and `multiple` (with checkboxes)
- Custom node rendering via `renderNode` prop
- Virtual scrolling for large trees (`visibleNodeCount`)
- Async/lazy-loaded children via `loadChildren` and `isParent`
- Error handling for failed async loads via `onLoadError`
- Headless hooks: `useTreeViewState` and `useTreeView`
- Full TypeScript types exported from the package entry point
- Default theme with focus, selection, and loading indicators
