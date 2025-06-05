let yjs: typeof import("yjs") | undefined

export function requireYjs() {
  // we must require yjs like this so it can be a static dynamic dependency
  if (!yjs) {
    yjs = require("yjs")
  }
  return yjs!
}
