# Agent instructions for mobx-bonsai

This repository is a `pnpm` + Turbo monorepo for:

- `mobx-bonsai` (core library)
- `mobx-bonsai-yjs` (Yjs bindings)
- docs site, benchmarks, and profiling tools

## Quick facts

- Package manager: `pnpm` (`pnpm@10.29.3`)
- Task runner: `turbo`
- Build tool: Vite (library packaging) + `tsc` (type-checking)
- Language: TypeScript (`strict: true` across packages)
- Test runner: Vitest (not Jest)
- Lint/format: Biome (`pnpm lint`; auto-fix with `pnpm exec biome check --write .`)
- CI runtime: Node `25.6.1`

## Monorepo map (source of truth)

- `packages/mobx-bonsai`: Core library. Main entry `packages/mobx-bonsai/src/index.ts`. Tests in `packages/mobx-bonsai/test`.
- `packages/mobx-bonsai-yjs`: Yjs integration package. Main entry `packages/mobx-bonsai-yjs/src/index.ts`. Tests in `packages/mobx-bonsai-yjs/test`.
- `apps/site`: Docusaurus docs site. Docs in `apps/site/docs`. Generated docs assets in `apps/site/copy-to-build/api`.
- `apps/benchmark`: Benchmark app and model comparisons.
- `apps/profiling`: Profiling utilities and fixture generation.

## Core concepts and terminology

- **Nodes / Tree**: Main graph structures under `packages/mobx-bonsai/src/node`.
- **Snapshots**: Serializable snapshot representations used for reconciliation and testing.
- **Transforms**: Helpers for converting/adapting structures (Date, Map/Set, BigInt, etc).
- **Undo/Redo**: Undo manager and change capture/apply primitives.
- **Redux integration**: Devtools/redux helpers under `packages/mobx-bonsai/src/redux`.

If unsure where code belongs, prefer existing folder boundaries over adding new top-level concepts.

## Core library architecture (where to edit)

`packages/mobx-bonsai/src` is split by concern:

- `error`: error classes/helpers (`MobxBonsaiError`, `failure`).
- `globalConfig.ts`: global runtime configuration.
- `node`: node model/tree lifecycle, context, clone, reconciliation, snapshots.
- `plainTypes`: plain-object type/check helpers.
- `redux`: Redux/devtools integration.
- `transforms`: data transforms (`asMap`, `asSet`, Date/BigInt conversions, etc).
- `undo`: undo manager and change history capture/apply.
- `utils`: shared runtime utilities.

Tests follow similar boundaries in `packages/mobx-bonsai/test/**`.

## Yjs integration architecture

`packages/mobx-bonsai-yjs/src` is split by concern:

- `yjsBinding/bindYjsToNode.ts`: top-level binding entry.
- `yjsBinding/nodeToYjs/*`: node-to-Yjs replication and value conversion.
- `yjsBinding/yjsToNode/*`: Yjs-to-node object creation and replication.
- `yjsBinding/yjsTypes/*`: Yjs type checks and type helpers.
- `error/*`: package-specific errors (`MobxBonsaiYjsError`, `failure`).

Tests live in `packages/mobx-bonsai-yjs/test/yjsBinding/**`.

## Commands (run from repo root)

### Root turbo commands

- `pnpm lib:build`
- `pnpm lib:build-docs`
- `pnpm lib:test`
- `pnpm lib:test:ci`
- `pnpm yjs-lib:build`
- `pnpm yjs-lib:test`
- `pnpm yjs-lib:test:ci`
- `pnpm site:start`
- `pnpm site:build`
- `pnpm site:serve`
- `pnpm build-netlify`
- `pnpm netlify-dev`
- `pnpm lint`

### Useful package-local commands

- `pnpm --dir packages/mobx-bonsai test test/<file>.test.ts`
- `pnpm --dir packages/mobx-bonsai-yjs test test/<file>.test.ts`
- `pnpm --dir apps/benchmark bench`
- `pnpm --dir apps/profiling profile:node-creation`

## CI parity and compatibility matrix

CI currently runs:

1. `pnpm site:build`
2. `pnpm lib:build` and `pnpm yjs-lib:build`
3. `pnpm lib:test:ci` and `pnpm yjs-lib:test:ci` for each `MOBX_VERSION={6,5,4}`
4. `pnpm lib:build` and benchmark build in `apps/benchmark`

`pnpm lint` is not part of CI. Run it manually before finishing.

When touching MobX-compat-sensitive behavior, run at least the reduced matrix locally:

```bash
for mobx in 6 5 4; do
  MOBX_VERSION="$mobx" pnpm lib:test:ci
  MOBX_VERSION="$mobx" pnpm yjs-lib:test:ci
done
```

## Turbo dependency graph (important)

- `build` depends on `^build`.
- `test` and `test:ci` depend on `^build` and use `MOBX_VERSION` as an env input.
- `site#build` depends on `^build` and `mobx-bonsai#build-docs`.
- `site#start` depends on `^build` and `mobx-bonsai#build-docs`.
- `site#serve` depends on `site#build`.
- `profiling#profile:node-creation` depends on `^build`.

Prefer root turbo commands so dependency ordering is handled automatically.

## Test configuration

Core and Yjs vitest configs use one environment variable:

- `MOBX_VERSION` (default `6`): selects MobX version `6`, `5`, or `4`.

This is used to:

- Pick `test/tsconfig*.json` (`tsconfig.json`, `tsconfig.mobx5.json`, `tsconfig.mobx4.json`).
- Alias `mobx` imports to `mobx`, `mobx-v5`, or `mobx-v4`.
- Load package setup from `test/commonSetup.ts`.

Yjs tests additionally alias `mobx-bonsai` to workspace source for local package integration.

## Code standards

- Use strict TypeScript; avoid `any` unless there is no practical alternative.
- Use Biome for formatting/linting; do not hand-format around Biome.
- Keep imports/exports idiomatic to existing style and preserve module boundaries.
- Keep public API stable unless explicitly asked to break it.
- Do not add dependencies unless necessary; prefer existing utilities.
- When changing behavior, add or adjust Vitest tests.
- Prefer workspace commands from repo root unless doing targeted debugging.

## Git safety

Do not run git write/mutation commands without express user permission. This includes staging/unstaging, commits/amends, branch switching, rebase/merge, and reset operations.

## Error handling conventions

Do not throw raw strings.

- Core library errors should use helpers in `packages/mobx-bonsai/src/error` (for example `failure(...)` returning `MobxBonsaiError`).
- Yjs package errors should use helpers in `packages/mobx-bonsai-yjs/src/error` (for example `MobxBonsaiYjsError`).

## Generated files and forbidden edit targets

Do not manually edit generated artifacts. Edit source and regenerate.

- `**/dist/**`
- `packages/mobx-bonsai/api-docs/**`
- `packages/*/coverage/**`
- `apps/site/.docusaurus/**`
- `apps/site/build/**`
- `apps/site/copy-to-build/**`

Root package files (`README.md`, `LICENSE`, `CHANGELOG.md`, `logo.png`) are copied into package folders during builds. Update root copies when needed.

## Documentation and API updates

When public behavior or API changes:

1. Update docs in `apps/site/docs/**`.
2. Update `CHANGELOG.md` (root; copied into package folders during build).
3. Regenerate docs artifacts as needed with `pnpm lib:build-docs` and `pnpm site:build`.

## Task playbooks

### Bug fix in core library

1. Reproduce with a failing test in `packages/mobx-bonsai/test/**`.
2. Implement a minimal fix in the relevant `packages/mobx-bonsai/src/**` module.
3. Run focused tests, then broader package tests.
4. Run MobX matrix tests if behavior may vary by MobX version.
5. Run `pnpm lint`.

### Change in Yjs bindings

1. Edit `packages/mobx-bonsai-yjs/src/**`.
2. Add/update tests in `packages/mobx-bonsai-yjs/test/yjsBinding/**`.
3. Run package tests via root command (`pnpm yjs-lib:test` or `pnpm yjs-lib:test:ci`).
4. Run MobX matrix tests when compatibility could be impacted.
5. Run `pnpm lint`.

### Docs-only changes

1. Edit `apps/site/docs/**`.
2. Run `pnpm site:build` (or `pnpm site:start` for local iteration).
3. Do not hand-edit generated site folders.

### Performance-sensitive changes

If touching node reconciliation/snapshot/undo internals, run benchmarks/profiling:

- `pnpm --dir apps/benchmark bench`
- `pnpm --dir apps/profiling profile:node-creation`

## Definition of done (agent checklist)

Before finishing, ensure all applicable items are done:

1. Correct package source and matching tests were updated.
2. Public exports (`index.ts` barrels / exports maps) were updated when API surface changed.
3. Relevant tests pass (`lib`, `yjs`, and MobX matrix as needed).
4. `pnpm lint` passes.
5. Docs/changelog were updated for public behavior or API changes.
6. No generated artifact was edited manually.
