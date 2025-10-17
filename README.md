<p align="center">
  <img src="./logo.png" height="128" />
  <h1 align="center">mobx-bonsai</h1>
</p>
<p align="center">
  <i>A fast lightweight alternative to MobX-State-Tree + Y.js two-way binding</i>
</p>

<p align="center">
  <a aria-label="NPM version" href="https://www.npmjs.com/package/mobx-bonsai">
    <img src="https://img.shields.io/npm/v/mobx-bonsai.svg?style=for-the-badge&logo=npm&labelColor=333" />
  </a>
  <a aria-label="License" href="./LICENSE">
    <img src="https://img.shields.io/npm/l/mobx-bonsai.svg?style=for-the-badge&labelColor=333" />
  </a>
  <a aria-label="Types" href="./packages/mobx-bonsai/tsconfig.json">
    <img src="https://img.shields.io/npm/types/mobx-bonsai.svg?style=for-the-badge&logo=typescript&labelColor=333" />
  </a>
  <br />
  <a aria-label="CI" href="https://github.com/xaviergonz/mobx-bonsai/actions/workflows/main.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/xaviergonz/mobx-bonsai/main.yml?branch=master&label=CI&logo=github&style=for-the-badge&labelColor=333" />
  </a>
  <a aria-label="Codecov" href="https://codecov.io/gh/xaviergonz/mobx-bonsai">
    <img src="https://img.shields.io/codecov/c/github/xaviergonz/mobx-bonsai?token=6MLRFUBK8V&label=codecov&logo=codecov&style=for-the-badge&labelColor=333" />
  </a>
</p>

> ### Full documentation can be found on the site:
>
> ## [mobx-bonsai.js.org](https://mobx-bonsai.js.org)

## Introduction

A fast lightweight alternative to `mobx-state-tree` that combines the simplicity of plain data with the power of MobX reactivity. Unlike `mobx-state-tree`, tree nodes in `mobx-bonsai` are always plain data objects with no embedded methods, getters, or setters. Instead, all interactions are managed via external functions—getters and MobX actions like embracing a more functional approach, thus improving performance and memory usage. Your application state remains a simple, observable plain object. Instead of modifying the nodes directly with object methods, you work with pure functions that inspect or update the state, ensuring clarity and reproducibility.

By using `mobx-bonsai`, you get:

- **Lightweight and fast:** Optimized for performance while consuming less memory.
- **Functional accessors:** Interaction is achieved through pure functions, keeping state manipulation decoupled from the data structure.
- **Immutable snapshots:** Effortlessly capture a stable state of your tree at any point.
- **MobX Integration:** Since `mobx-bonsai` uses MobX behind the scenes, it integrates seamlessly with [`mobx`](https://mobx.js.org) and [`mobx-react`](https://github.com/mobxjs/mobx-react).
- **Seamless Y.js binding:** Two-way binding between `Y.js` state trees and `mobx-bonsai` reactive trees available via the `mobx-bonsai-yjs` package.

### Installation

Core package:

> `npm install mobx-bonsai`

> `yarn add mobx-bonsai`

For Y.js integration (optional):

> `npm install mobx-bonsai-yjs yjs`

> `yarn add mobx-bonsai-yjs yjs`
