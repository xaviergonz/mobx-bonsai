import type { IArrayDidChange, IObjectDidChange } from "mobx"
import { getSnapshot } from "../node/snapshot/getSnapshot"
import { getParentToChildPath } from "../node/tree/getParentToChildPath"
import { isPrimitive } from "../plainTypes/checks"
import type { UndoableChange } from "./types"

/**
 * MobX change events from onDeepChange.
 */
export type NodeChange = IObjectDidChange | IArrayDidChange

/**
 * Captures a value for undo storage - returns primitives as-is or gets snapshot for objects/arrays.
 */
function captureValue(value: unknown): unknown {
  if (isPrimitive(value)) {
    return value
  }
  return getSnapshot(value as object)
}

/**
 * Converts a MobX change event to an UndoableChange.
 * Calculates the path from the tracked root to the changed object/array.
 * Values are stored using getSnapshot for immutability.
 *
 * @param change - The MobX change event
 * @param rootNode - The root node being tracked by the UndoManager
 * @returns An UndoableChange representing the change
 */
export function captureChange(change: NodeChange, rootNode: object): UndoableChange {
  const changedObject = change.object

  // Calculate path from the tracked root to the changed object
  const path = getParentToChildPath(rootNode, changedObject)

  if (path === undefined) {
    throw new Error(
      "Changed object is not a child of the tracked root node. " +
        "This should not happen as onDeepChange should only detect changes within the tracked subtree."
    )
  }

  // In MobX 5, observableKind doesn't exist, but we can check for the presence of 'name' vs 'index'
  // to distinguish between object and array changes
  const isObjectChange = "name" in change

  if (isObjectChange) {
    switch (change.type) {
      case "add": {
        return {
          operation: "object-add",
          path,
          propertyName: String(change.name),
          newValue: captureValue(change.newValue),
        }
      }

      case "update": {
        return {
          operation: "object-update",
          path,
          propertyName: String(change.name),
          oldValue: captureValue(change.oldValue),
          newValue: captureValue(change.newValue),
        }
      }

      case "remove": {
        return {
          operation: "object-remove",
          path,
          propertyName: String(change.name),
          oldValue: captureValue(change.oldValue),
        }
      }
    }
  } else {
    // Array change - has 'index' property
    switch (change.type) {
      case "splice": {
        return {
          operation: "array-splice",
          path,
          index: change.index,
          added: change.added.map(captureValue),
          removed: change.removed.map(captureValue),
        }
      }

      case "update": {
        // Convert update to splice with 1 remove and 1 add
        return {
          operation: "array-splice",
          path,
          index: change.index,
          added: [captureValue(change.newValue)],
          removed: [captureValue(change.oldValue)],
        }
      }
    }
  }

  // This should never happen, but TypeScript needs a return
  throw new Error("unknown change type")
}
