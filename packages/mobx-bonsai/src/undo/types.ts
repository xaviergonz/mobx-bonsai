/**
 * Base interface for all undoable changes.
 * Contains the path from the tracked root to the changed node.
 */
export interface UndoableChangeBase {
  readonly path: readonly string[]
}

/**
 * Represents adding a new property to an object.
 */
export type UndoableObjectAddChange = Readonly<
  UndoableChangeBase & {
    operation: "object-add"
    propertyName: string
    newValue: unknown
  }
>

/**
 * Represents updating an existing property on an object.
 */
export type UndoableObjectUpdateChange = Readonly<
  UndoableChangeBase & {
    operation: "object-update"
    propertyName: string
    oldValue: unknown
    newValue: unknown
  }
>

/**
 * Represents removing a property from an object.
 */
export type UndoableObjectRemoveChange = Readonly<
  UndoableChangeBase & {
    operation: "object-remove"
    propertyName: string
    oldValue: unknown
  }
>

/**
 * Union of all object change types.
 */
export type UndoableObjectChange =
  | UndoableObjectAddChange
  | UndoableObjectUpdateChange
  | UndoableObjectRemoveChange

/**
 * Represents splicing elements into/from an array.
 * Note: When added.length === removed.length, this represents element updates.
 */
export type UndoableArraySpliceChange = Readonly<
  UndoableChangeBase & {
    operation: "array-splice"
    index: number
    added: unknown[]
    removed: unknown[]
  }
>

/**
 * Union of all array change types.
 */
export type UndoableArrayChange = UndoableArraySpliceChange

/**
 * Union of all undoable change types.
 */
export type UndoableChange = UndoableObjectChange | UndoableArrayChange
