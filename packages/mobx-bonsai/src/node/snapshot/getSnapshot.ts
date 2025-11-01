import { action, createAtom, IAtom, isObservableArray, isObservableObject } from "mobx"
import { failure } from "../../error/failure"
import { isPrimitive } from "../../plainTypes/checks"
import { assertIsNode, isFrozenNode } from "../node"
import { getParentPath } from "../tree/getParentPath"

const snapshots = new WeakMap<object, object>()
const snapshotAtoms = new WeakMap<object, IAtom>()

export const invalidateSnapshotTreeToRoot = action((node: object): void => {
  assertIsNode(node, "node")

  let current: object | undefined = node
  while (current) {
    snapshots.delete(current)
    snapshotAtoms.get(current)?.reportChanged()
    current = getParentPath(current)?.parent
  }
})

const createSnapshot = action(<T extends object>(node: T): T => {
  assertIsNode(node, "node")
  if (isFrozenNode(node)) {
    // the snapshot of a frozen node is the frozen node itself
    return node
  }

  if (isObservableArray(node)) {
    return node.map((v) => getSnapshotOrPrimitive(v, true)) as T
  }

  if (isObservableObject(node)) {
    const obj = {} as any
    Object.entries(node as any).forEach(([key, v]) => {
      obj[key] = getSnapshotOrPrimitive(v, true)
    })
    return obj
  }

  throw failure(`only observable objects, observable arrays and primitives are supported`)
})

function getSnapshotOrPrimitive<T>(value: T, acceptPrimitives: boolean): T {
  if (acceptPrimitives && isPrimitive(value)) {
    return value
  }

  const node = value as object
  assertIsNode(node, "value")

  let existingSnapshot = snapshots.get(node)
  if (!existingSnapshot) {
    existingSnapshot = createSnapshot(node)
    snapshots.set(node, existingSnapshot)
  }

  let atom = snapshotAtoms.get(node)
  if (!atom) {
    atom = createAtom("snapshot")
    snapshotAtoms.set(node, atom)
  }
  atom.reportObserved()

  return existingSnapshot as T
}

/**
 * Returns a stable snapshot of a node.
 *
 * This function computes and caches a snapshot of the given node.
 * It preserves referential integrity by reusing snapshots for unchanged sub-parts.
 *
 * If not a node it will throw.
 *
 * @param node - The node to snapshot.
 * @returns A snapshot of the node.
 */
export function getSnapshot<T extends object>(node: T): T {
  return getSnapshotOrPrimitive(node, false)
}
