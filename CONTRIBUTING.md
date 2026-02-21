# Contributing to PlotMate Storyboards

Thanks for your interest in contributing! PlotMate is a community-driven, open-source project and we welcome contributions of all kinds — bug fixes, new features, documentation improvements, and more.

## Getting Started

### 1. Fork and clone

```bash
git clone https://github.com/<your-username>/plotmate-storyboards.git
cd "PlotMate Storyboards"
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create an environment file

```bash
cp .env.example .env.local
```

Add your Gemini API key to `.env.local` if you want to test AI features. The app works without it.

### 4. Run the app

```bash
npm run dev
```

This starts both the frontend and the backend API on localhost.

## Making Changes

### Branch naming

Create a branch from `main` with a descriptive name:

- `fix/shot-gallery-scroll` — bug fixes
- `feature/export-pdf` — new features
- `docs/update-readme` — documentation changes
- `refactor/continuity-state` — code refactoring

### Code style

- **TypeScript** — all source files use TypeScript. Avoid `any` where possible.
- **React** — functional components with hooks. State management through Context API (`ProjectContext`).
- **Tailwind CSS** — use utility classes for styling. Avoid custom CSS unless absolutely necessary.
- **No commented-out code** — remove dead code rather than commenting it out.
- **Meaningful names** — use clear, descriptive variable and function names.

### Commit messages

Write clear, concise commit messages that explain *why* the change was made:

```
fix: prevent duplicate shots when importing scenes

The import logic was not deduplicating by slugline, causing
duplicate shot entries when re-importing the same script.
```

Use conventional commit prefixes: `fix:`, `feat:`, `docs:`, `refactor:`, `chore:`, `test:`.

## Submitting a Pull Request

1. Push your branch to your fork
2. Open a Pull Request against `main` on the upstream repo
3. Fill out the PR description — explain what changed and why
4. Link any related issues (e.g., "Closes #12")
5. Wait for review — maintainers may request changes

### PR checklist

- [ ] The app builds without errors (`npm run build`)
- [ ] New features work in both online and offline modes
- [ ] No API keys or secrets are committed
- [ ] The README is updated if the change affects setup or usage

## Reporting Bugs

Use the [Bug Report](https://github.com/PressPlayCollective/plotmate-storyboards/issues/new?template=bug_report.md) issue template. Include:

- Steps to reproduce
- Expected vs actual behavior
- Browser and OS info
- Screenshots if applicable

## Requesting Features

Use the [Feature Request](https://github.com/PressPlayCollective/plotmate-storyboards/issues/new?template=feature_request.md) issue template. Describe the problem you're trying to solve and your proposed solution.

## Code of Conduct

Be respectful and constructive. We're all here to build something useful for filmmakers. Harassment, discrimination, and toxic behavior will not be tolerated.

## Questions?

Open a [discussion](https://github.com/PressPlayCollective/plotmate-storyboards/discussions) or reach out through an issue. We're happy to help you get started.
