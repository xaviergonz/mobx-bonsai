# ESM Test Project

This test project successfully reproduces the issue where using `mobx-bonsai` with the `yjs-binding` in an ESM environment causes:

```text
Uncaught ReferenceError: require is not defined
```

## The Issue

The problem occurs in `requireYjs.ts` which uses CommonJS `require()`:

```typescript
export function requireYjs() {
  if (!yjs) {
    yjs = require("yjs")  // ❌ This fails in ESM
  }
  return yjs!
}
```

When the package is built as `mobx-bonsai.esm.mjs` and imported in a project with `"type": "module"`, the `require()` call is not available in the runtime environment.

## Running the Test

```bash
# From the root of the repository
yarn install

# Run the test
yarn workspace esm-test start
```

## Expected Behavior

The test should create a Y.js binding without errors and print:
```
SUCCESS: Y.js binding created without errors!
```

## Actual Behavior

The test fails with:
```
ERROR: require is not defined
Stack: ReferenceError: require is not defined
    at requireYjs (file:///.../mobx-bonsai.esm.mjs:1918:5)
```

## Potential Solutions

### Option 1: Use dynamic import() (async)
```typescript
let yjsPromise: Promise<typeof import("yjs")> | undefined

export async function requireYjs() {
  if (!yjsPromise) {
    yjsPromise = import("yjs")
  }
  return await yjsPromise
}
```
**Note:** This would require making all calling code async.

### Option 2: Use createRequire for Node.js
```typescript
import { createRequire } from 'module'

const require = typeof createRequire !== 'undefined'
  ? createRequire(import.meta.url)
  : undefined

export function requireYjs() {
  if (!yjs) {
    if (require) {
      yjs = require("yjs")
    } else {
      throw new Error("Cannot load yjs in this environment")
    }
  }
  return yjs!
}
```
**Note:** This only works in Node.js, not in browsers.

### Option 3: Make yjs a regular dependency
Remove the optional peer dependency and import it normally:
```typescript
import * as yjs from 'yjs'

export function requireYjs() {
  return yjs
}
```
**Note:** This increases bundle size for users who don't use the yjs-binding feature.

### Option 4: Separate the yjs-binding into its own package
Create `mobx-bonsai-yjs` as a separate package that has yjs as a regular dependency.

