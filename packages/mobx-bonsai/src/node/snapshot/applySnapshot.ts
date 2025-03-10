import { action, isObservableObject } from "mobx"
import { failure } from "../../error/failure"
import { assertIsObject, isArray, isMap, isPlainObject, isSet } from "../../plainTypes/checks"
import { assertIsNode, isFrozenNode } from "../node"
import { getNodeTypeAndKey, nodeTypeKey } from "../nodeTypeKey/nodeType"
import { reconcileData } from "../reconcileData"

/**
 * Applies a full snapshot over an node, reconciling it with the current contents of the object.
 *
 * @template T Object type.
 * @param node Target node.
 * @param snapshot Snapshot to apply.
 */
export const applySnapshot = action(<T extends object>(node: T, snapshot: T): void => {
  assertIsNode(node, "node")
  assertIsObject(snapshot, "snapshot")

  const reconcile = () => {
    const ret = reconcileData(node, snapshot, node)

    if (ret !== node) {
      throw failure("assertion failed: reconciled object has to be the same")
    }
  }

  if (isArray(snapshot)) {
    if (!isArray(node)) {
      throw failure("if the snapshot is an array the target must be an array too")
    }

    reconcile()
    return
  }

  if (isPlainObject(snapshot)) {
    if (isFrozenNode(node)) {
      // no reconciliation possible, unless it is the same ref
      if (node === snapshot) {
        return // no need to reconcile
      } else {
        throw failure("applySnapshot does not work on frozen nodes")
      }
    }

    if (!isObservableObject(node)) {
      // no reconciliation possible
      throw failure("if the snapshot is an object the target must be an object too")
    }

    // if present, type and key changes are not allowed in first level reconciliation
    const typeKey = getNodeTypeAndKey(node)
    const newTypeKey = getNodeTypeAndKey(snapshot)
    if (typeKey.type !== newTypeKey.type) {
      throw failure(
        `applySnapshot does not allow changes to the '${nodeTypeKey}' property of the node the snapshot is being applied to`
      )
    }
    if (typeKey.key !== newTypeKey.key) {
      const keyProp = typeKey.type && "key" in typeKey.type ? typeKey.type.key : undefined
      throw failure(
        `applySnapshot does not allow changes to the '${keyProp}' property of the node the snapshot is being applied to`
      )
    }

    reconcile()
    return
  }

  if (isMap(snapshot)) {
    throw failure("a snapshot must not contain maps")
  }

  if (isSet(snapshot)) {
    throw failure("a snapshot must not contain sets")
  }

  throw failure(`unsupported snapshot - ${snapshot}`)
})
