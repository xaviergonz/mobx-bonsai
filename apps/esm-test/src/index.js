/**
 * ESM test demonstrating the correct way to use yjs-binding in ESM environments
 *
 * SOLUTION: In ESM environments, you must import and register Y.js before using yjs-binding
 */

import { bindYjsToNode, setYjs } from "mobx-bonsai"
import * as Y from "yjs"

console.log("Step 1: Register Y.js with mobx-bonsai (required in ESM)")
setYjs(Y)

console.log("Step 2: Create Y.Doc...")
const ydoc = new Y.Doc()
const yjsObject = ydoc.getMap("data")

console.log("Step 3: Set initial data in Y.js...")
yjsObject.set("name", "Test")
yjsObject.set("count", 42)

console.log("Step 4: Bind Y.js to node...")
try {
  const binding = bindYjsToNode({
    yjsDoc: ydoc,
    yjsObject: yjsObject,
  })

  console.log("✅ SUCCESS: Y.js binding created without errors!")
  console.log("Bound node:", binding.node)

  // Verify the data
  console.log("Bound node.name:", binding.node.name)
  console.log("Bound node.count:", binding.node.count)

  // Clean up
  binding.dispose()

  console.log("\n✅ All tests passed! ESM + yjs-binding works correctly.")
} catch (error) {
  console.error("❌ ERROR:", error.message)
  console.error("Stack:", error.stack)
  process.exit(1)
}
