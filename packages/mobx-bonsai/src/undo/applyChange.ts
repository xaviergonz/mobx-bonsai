import { action, isObservableArray, isObservableObject, remove, set } from "mobx"
import { failure } from "../error/failure"
import { assertIsNode } from "../node/node"
import { reconcileData } from "../node/reconcileData"
import { resolvePath } from "../node/tree/resolvePath"
import type { UndoableChange } from "./types"

/**
 * Applies a single change in forward or reverse mode.
 * Used by UndoManager during undo/redo operations.
 *
 * @param rootNode - The tracked root node
 * @param change - The change to apply
 * @param mode - Whether to apply the change forward (redo) or reverse (undo)
 */
export const applyChange = action(
  (rootNode: object, change: UndoableChange, mode: "forward" | "reverse"): void => {
    // Resolve the target object/array using the path
    const result = resolvePath(rootNode, change.path)

    if (!result.resolved) {
      throw failure(`cannot resolve path: ${change.path.join(".")}`)
    }

    const target = result.value as any

    // Ensure target is a node
    assertIsNode(target, "target")

    // Validate target type matches operation type
    if (change.operation.startsWith("object-")) {
      if (!isObservableObject(target)) {
        throw failure(
          `cannot apply ${change.operation} to non-object target at path: ${change.path.join(".")}`
        )
      }
    } else if (change.operation.startsWith("array-")) {
      if (!isObservableArray(target)) {
        throw failure(
          `cannot apply ${change.operation} to non-array target at path: ${change.path.join(".")}`
        )
      }
    }

    if (mode === "reverse") {
      // Apply changes in reverse (undo)
      switch (change.operation) {
        case "object-add":
          remove(target, change.propertyName)
          break
        case "object-remove":
          set(target, change.propertyName, reconcileData(undefined, change.oldValue, target))
          break
        case "object-update":
          set(
            target,
            change.propertyName,
            reconcileData(target[change.propertyName], change.oldValue, target)
          )
          break
        case "array-splice":
          // Special case: when added.length === removed.length, use consecutive set operations
          if (change.added.length === change.removed.length) {
            for (let i = 0; i < change.removed.length; i++) {
              set(
                target,
                change.index + i,
                reconcileData(target[change.index + i], change.removed[i], target)
              )
            }
          } else {
            target.splice(
              change.index,
              change.added.length,
              ...change.removed.map((val: any) => reconcileData(undefined, val, target))
            )
          }
          break
      }
    } else {
      // Apply changes forward (redo)
      switch (change.operation) {
        case "object-add":
          set(target, change.propertyName, reconcileData(undefined, change.newValue, target))
          break
        case "object-remove":
          remove(target, change.propertyName)
          break
        case "object-update":
          set(
            target,
            change.propertyName,
            reconcileData(target[change.propertyName], change.newValue, target)
          )
          break
        case "array-splice":
          // Special case: when added.length === removed.length, use consecutive set operations
          if (change.added.length === change.removed.length) {
            for (let i = 0; i < change.added.length; i++) {
              set(
                target,
                change.index + i,
                reconcileData(target[change.index + i], change.added[i], target)
              )
            }
          } else {
            target.splice(
              change.index,
              change.removed.length,
              ...change.added.map((val: any) => reconcileData(undefined, val, target))
            )
          }
          break
      }
    }
  }
)
