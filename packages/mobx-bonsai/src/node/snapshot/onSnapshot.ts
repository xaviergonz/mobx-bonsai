import { reaction } from "mobx"
import { Dispose, disposeOnce } from "../../utils/disposable"
import { assertIsNode } from "../node"
import { getSnapshot } from "./getSnapshot"

/**
 * Listener function for onSnapshot.
 */
export type OnSnapshotListener<T> = (sn: T, prevSn: T) => void

/**
 * Adds a reaction that will trigger every time an snapshot changes.
 *
 * @template T Node type.
 * @param nodeOrFn Node to get the snapshot from or a function to get it.
 * @param listener Function that will be triggered when the snapshot changes.
 * @returns A disposer.
 */
export function onSnapshot<T extends object>(
  nodeOrFn: T | (() => T),
  listener: OnSnapshotListener<T>
): Dispose {
  const nodeFn = typeof nodeOrFn === "function" ? (nodeOrFn as () => T) : () => nodeOrFn

  const node = nodeFn()
  assertIsNode(node, "node")

  let currentSnapshot: T = getSnapshot(node)

  const disposeReaction = reaction(
    () => getSnapshot(nodeFn()),
    (newSnapshot) => {
      const prevSn = currentSnapshot
      currentSnapshot = newSnapshot
      listener(newSnapshot, prevSn)
    }
  )

  return disposeOnce(disposeReaction)
}
