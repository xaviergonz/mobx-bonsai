import { assertIsNode } from "../node/node"
import { getSnapshot } from "../node/snapshot/getSnapshot"
import { onSnapshot, OnSnapshotListener } from "../node/snapshot/onSnapshot"
import { Dispose } from "../utils/disposable"

export const reduxActionType = "applyAction"

/**
 * A redux store for mobx-bonsai.
 */
export interface ReduxStore<T> {
  getState(): T
  subscribe(listener: OnSnapshotListener<T>): Dispose
}

/**
 * Generates a redux compatible store out of a mobx-bonsai object.
 *
 * @typeparam T Object type.
 * @param target Root object.
 * @returns A redux compatible store.
 */
export function asReduxStore<T extends object>(target: T): ReduxStore<T> {
  assertIsNode(target, "target")

  const store: ReduxStore<T> = {
    getState() {
      return getSnapshot(target)
    },
    subscribe(listener) {
      return onSnapshot(target, listener)
    },
  }

  return store
}
