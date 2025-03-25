import { node } from "./node"
import { getSnapshot } from "./snapshot/getSnapshot"
import { substituteNodeKeys } from "./substituteNodeKeys"

/**
 * Clones a node. It will generate new node keys deeply using `substituteNodeKeys`.
 *
 * @param nodeToClone Node to clone.
 * @returns The cloned node.
 */
export function clone<T extends object>(nodeToClone: T): T {
  const snapshotWithChangedKeys = substituteNodeKeys(getSnapshot(nodeToClone))

  return node(snapshotWithChangedKeys)
}
