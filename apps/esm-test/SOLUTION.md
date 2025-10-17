# ESM + Y.js Binding Solution

## The Problem

When using `mobx-bonsai` with Y.js binding in an ESM environment (projects with `"type": "module"`), you get:

```
ReferenceError: require is not defined
```

This happens because:
1. Y.js is an optional peer dependency (to keep bundle size small for users who don't need it)
2. The original code used `require("yjs")` which works in CommonJS but not in ESM
3. Bundlers preserve this `require()` call since yjs is marked as external
4. At runtime in ESM, `require` doesn't exist

## The Solution

After investigating multiple approaches, **there is no way to make this fully automatic in ESM without**:
- Making Y.js a required dependency (increases bundle size for all users)
- Making the API async (breaks existing code)
- Bundling Y.js directly (defeats the purpose of it being optional)

### The Implemented Solution

Users in ESM environments must manually register Y.js before using yjs-binding features:

```typescript
import * as Y from 'yjs'
import { setYjs, bindYjsToNode } from 'mobx-bonsai'

// Register Y.js (do this once at app startup)
setYjs(Y)

// Now you can use yjs-binding features
const binding = bindYjsToNode({
  yjsDoc: doc,
  yjsObject: map
})
```

### Why This Works

1. **CommonJS**: `require("yjs")` works automatically (wrapped in try-catch)
2. **ESM**: User explicitly imports and registers Y.js via `setYjs()`
3. **No breaking changes**: Existing CommonJS users continue to work
4. **Bundle size**: Y.js remains optional for users who don't need it
5. **Type safety**: Full TypeScript support maintained

### Alternative Approaches Considered

#### 1. Use `new Function()` with `require` ❌
- Still fails in ESM because `require` is not defined
- Just moves the error from compile-time to runtime

#### 2. Use dynamic `import()` ❌
- Must be async, which would break the synchronous API
- Would require changing all call sites to `await bindYjsToNode(...)`

#### 3. Top-level await ❌
- Not supported in all environments
- Makes the entire module async
- Breaks tree-shaking

#### 4. Bundle Y.js directly ❌
- Defeats the purpose of it being an optional dependency
- Increases bundle size for all users

#### 5. Import Y.js directly at top level ❌
- Makes Y.js a required dependency
- Breaks for users who don't have it installed

## Conclusion

The `setYjs()` approach is the **correct and only viable solution** that:
- ✅ Works in both ESM and CommonJS
- ✅ Keeps Y.js optional
- ✅ Maintains synchronous API
- ✅ Preserves type safety
- ✅ Works with all bundlers
- ✅ No breaking changes for CommonJS users

ESM users just need one extra line of setup code, which is a reasonable tradeoff.
