import { nodeType, type TNode } from "../node/nodeTypeKey/nodeType"
import type { UndoableChange } from "./types"

const undoEventTypeKey = "mobx-bonsai/UndoEvent"

/**
 * Represents a single undo/redo event.
 * Contains all changes that occurred during a single MobX action.
 */
export type UndoEvent = TNode<
  typeof undoEventTypeKey,
  {
    changes: readonly UndoableChange[]
    attachedState?: {
      beforeEvent: unknown
      afterEvent: unknown
    }
  }
>

/**
 * Node type for UndoEvent.
 * Events are frozen (immutable) nodes.
 */
export const TUndoEvent = nodeType<UndoEvent>(undoEventTypeKey).frozen()

const undoStoreTypeKey = "mobx-bonsai/UndoStore"

/**
 * UndoStore holds the undo and redo event queues.
 * Simple observable data structure - all manipulation is handled by UndoManager.
 */
export type UndoStore = TNode<
  typeof undoStoreTypeKey,
  {
    undoEvents: UndoEvent[]
    redoEvents: UndoEvent[]
  }
>

/**
 * Node type for UndoStore with default empty arrays.
 */
export const TUndoStore = nodeType<UndoStore>(undoStoreTypeKey).defaults({
  undoEvents: () => [],
  redoEvents: () => [],
})

/**
 * Creates a new UndoStore with empty undo/redo queues.
 */
export function createUndoStore(): UndoStore {
  return TUndoStore({})
}
