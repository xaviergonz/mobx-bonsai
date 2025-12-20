# Copilot Instructions for mobx-bonsai

This repository is a monorepo containing the `mobx-bonsai` library, its Yjs integration, and the documentation/benchmark apps.

## Overview

`mobx-bonsai` is a MobX-powered state tree library (in the “tree / nodes” family, similar in spirit to MST/keystone) with snapshotting and utilities for structuring state.
`mobx-bonsai-yjs` provides a Yjs two-way binding layer for `mobx-bonsai`.

## Project Structure

- `packages/mobx-bonsai`: Core library source and tests.
- `packages/mobx-bonsai-yjs`: Yjs integration source and tests.
- `apps/site`: Docusaurus documentation site (consumes workspace packages).
- `apps/benchmark`: Performance benchmarks.
- `apps/profiling`: Profiling utilities.

## Tech Stack

- **Language**: TypeScript (strict)
- **State**: MobX (supports MobX 4/5/6 via peerDependency ranges)
- **Package Manager**: pnpm (workspace)
- **Monorepo Orchestration**: Turbo
- **Linting/Formatting**: Biome
- **Testing**: Vitest
- **Build**: Vite + `tsc` (typecheck/emits) and `vite-plugin-dts`
- **Docs**: Docusaurus + TypeDoc (API docs generated per release/build)

## Core Concepts & Terminology

When working in the core library, these are the key areas you’ll commonly touch:

- **Nodes / Tree**: The primary state graph structures live under `packages/mobx-bonsai/src/node`.
- **Snapshots**: Immutable-ish representations of state; used for serialization and testing.
- **Transforms**: Helpers for converting / adapting structures.
- **Undo/Redo**: Undo manager and patch-like history primitives.
- **Redux integration**: If present, it lives under `packages/mobx-bonsai/src/redux`.

If you’re unsure where something belongs, prefer following existing folder boundaries rather than creating new top-level concepts.

## Commands (run from repo root)

Use `pnpm`.

### Core library (`mobx-bonsai`)

- `pnpm -w lib:build`: Build the core package via Turbo.
- `pnpm -w lib:test`: Run core tests via Turbo.
- `pnpm -w lib:test:ci`: Run core tests with coverage.
- `pnpm -w lib:build-docs`: Generate TypeDoc API docs and copy them into the site.

### Yjs integration (`mobx-bonsai-yjs`)

- `pnpm -w yjs-lib:build`
- `pnpm -w yjs-lib:test`
- `pnpm -w yjs-lib:test:ci`

### Docs site

- `pnpm -w site:start`: Dev server (Turbo persistent task).
- `pnpm -w site:build`: Builds site (depends on library build + API docs).
- `pnpm -w site:serve`: Serves the built site.
- `pnpm -w build-netlify`: Netlify build entrypoint.
- `pnpm -w netlify-dev`: Local Netlify dev.

### General

- `pnpm -w lint`: Biome lint.

## Standards:

- Tests use Vitest and live under each package’s `test/` folder.
- Turbo test tasks declare `MOBX_VERSION` as an env input. When validating compatibility, run tests with a specific MobX version, e.g. `MOBX_VERSION=6 pnpm -w lib:test` (and similarly for 4/5 if supported by the test setup).
- **Biome is the source of truth** for formatting/lint. Let it handle all formatting and linting concerns automatically. Always run `pnpm -w lint` before finishing a task.
- **Types**: Avoid `any`; prefer `unknown` + narrowing, or precise generics.
- **Public API**: Avoid breaking changes unless explicitly requested. Exports are centralized in `packages/*/src/index.ts` and package `exports` maps.
- **Build artifacts**: Don’t edit generated files in `dist/`, `api-docs/`, `coverage/`, `apps/site/build/`, or `apps/site/copy-to-build/`. Always change source and re-generate.
- Don’t bump package versions or publish to npm unless explicitly requested.
- Package root files (`README.md`, `LICENSE`, `CHANGELOG.md`, `logo.png`) are copied into each package during builds; update the root copies if you need to change them.
- Follow existing patterns in adjacent modules (especially for node lifecycle, snapshots, and undo/history semantics).
- When fixing a bug or changing behavior, add/adjust a Vitest test to cover it.
- If you change user-facing behavior or public APIs, also update relevant documentation under `apps/site/docs` and the relevant `CHANGELOG.md`.
- Prefer workspace commands (`pnpm ...` from root) over running package scripts directly, unless debugging a single package.
- Don’t add new dependencies unless necessary; prefer existing utilities already used in the repo.
