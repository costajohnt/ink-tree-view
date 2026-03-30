# Contributing

Thanks for your interest in contributing to ink-tree-view! Here's how to get started.

## Setup

```bash
git clone https://github.com/costajohnt/ink-tree-view.git
cd ink-tree-view
npm install
```

## Development

```bash
npm run dev        # watch mode (rebuild on changes)
npm test           # run the test suite
npm run typecheck  # check types with tsc
npm run build      # production build
```

## Running examples

```bash
npx tsx examples/basic.tsx
npx tsx examples/demo-recording.tsx
```

## Making changes

1. Fork the repo and create a feature branch from `master`.
2. Make your changes and add tests if applicable.
3. Run `npm test` and `npm run typecheck` to make sure everything passes.
4. Open a pull request with a clear description of what you changed and why.

## Code style

- TypeScript throughout, no `any` unless absolutely necessary.
- Tabs for indentation (enforced by the project config).
- Keep dependencies minimal -- Ink components should be lightweight.

## Reporting bugs

Open an issue at https://github.com/costajohnt/ink-tree-view/issues with:

- A minimal reproduction (code snippet or repo link)
- Your Node.js version and OS
- What you expected vs. what happened

## Feature requests

Open an issue describing the use case. Let's discuss the approach before jumping into a PR -- it saves everyone time.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
