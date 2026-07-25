# Changelog

## [0.4.0](https://github.com/costajohnt/ink-tree-view/compare/v0.3.0...v0.4.0) (2026-07-24)


### Features

* add optional theme prop to TreeView ([bbca3cd](https://github.com/costajohnt/ink-tree-view/commit/bbca3cd4ec2e03830a8a01a69206d275f061386d)), closes [#7](https://github.com/costajohnt/ink-tree-view/issues/7)

## 0.3.0 (2026-07-01)

### Features

- Controlled mode: `expanded`, `selected`, and `focusedId` props as controlled
  counterparts to `defaultExpanded` / `defaultSelected`. When provided, keys
  report intent via the matching callback and the prop stays authoritative.
- `PageUp` / `PageDown` keys move focus by one viewport page, exposed on the
  headless hook as `focusPageDown()` / `focusPageUp()`.

### Bug Fixes

- Fixed dead `Home` / `End` keys under Ink 6, which delivers them as `key.home`
  / `key.end` booleans rather than raw escape sequences.
- Fixed scroll indicators rendering literal escape text instead of the `↑` /
  `↓` glyphs (the escapes lived in JSX text nodes, which do not process
  backslash escapes).

### Performance

- Tree rows are memoized (`React.memo` on primitive props) so a keypress only
  re-renders rows whose state changed, not every visible row.

### Documentation

- Corrected peer dependencies to `ink >=6`, `react >=19`, `node >=20`.
- Documented controlled mode, `PageUp` / `PageDown`, and the recommendation to
  set a finite `visibleNodeCount` for large trees.

## 0.2.0 (2026-03-31)

Accessibility release.

### Features

- Screen reader support via Ink's `useIsScreenReaderEnabled`, emitting
  descriptive `aria-label`s per node (label, sibling position, depth, expanded /
  collapsed, loading, selected).
- ARIA roles and state: `list` / `listitem` roles with `aria-state` reporting
  expanded and selected status.
- Focus, expand, and selection indicators marked `aria-hidden` so visual glyphs
  are not double-announced.

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
