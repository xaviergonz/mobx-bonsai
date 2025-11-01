import { action, runInAction, when } from "mobx"
import { failure } from "../error/failure"
import { onDeepChange, onDeepInterceptedChange } from "../node/node"
import { isChildOfParent } from "../node/tree/isChildOfParent"
import type { Dispose } from "../utils/disposable"
import { isInsideMobxAction } from "../utils/isInsideMobxAction"
import { applyChange } from "./applyChange"
import { captureChange, type NodeChange } from "./captureChange"
import type { UndoableChange } from "./types"
import { createUndoStore, TUndoEvent, type UndoEvent, type UndoStore } from "./UndoStore"

/**
 * Interface for managing attached state with undo events.
 */
export interface AttachedStateHandler<TAttachedState = unknown> {
  save(): TAttachedState
  restore(state: TAttachedState): void
}

/**
 * Options for creating an UndoManager.
 */
export interface UndoManagerOptions<TAttachedState = unknown> {
  /**
   * The subtree root to track changes on.
   */
  rootNode: object

  /**
   * Optional UndoStore to use. If not provided, a new one will be created.
   *
   * Note: The UndoStore is not subject to the undo manager, even if it is
   * a child of the rootNode. Changes to the UndoStore itself will not
   * be tracked or undoable.
   */
  store?: UndoStore

  /**
   * Maximum number of undo levels to keep.
   * @default Infinity
   */
  maxUndoLevels?: number

  /**
   * Maximum number of redo levels to keep.
   * @default Infinity
   */
  maxRedoLevels?: number

  /**
   * Attached state management for storing additional state with each undo event.
   */
  attachedState?: AttachedStateHandler<TAttachedState>

  /**
   * Time window in milliseconds for grouping changes into a single undo event.
   * If undefined (default), changes are only grouped within the same MobX action.
   * If set to a number, changes that occur within this time window will be merged
   * into the last undo event, even if they come from different actions.
   *
   * @default undefined
   */
  groupingDebounceMs?: number
}

/**
 * Manages undo/redo functionality for a mobx-bonsai node tree.
 * Automatically groups changes that occur within a single MobX action.
 */
export class UndoManager<TAttachedState = unknown> {
  private disposer: Dispose | undefined
  private interceptDisposer: Dispose | undefined

  private isRecordingDisabled = false

  private readonly _maxUndoLevels: number
  private readonly _maxRedoLevels: number

  private readonly attachedState?: AttachedStateHandler<TAttachedState>

  private readonly groupingDebounceMs?: number

  /**
   * Timestamp (performance.now()) of when the last undo event was recorded.
   * Used for grouping debounce logic.
   */
  private lastEventTimestamp: number | undefined

  /**
   * The root node being tracked.
   */
  readonly rootNode: object

  /**
   * The UndoStore holding the undo/redo queues.
   */
  readonly store: UndoStore

  /**
   * Array of changes accumulated during the current action.
   * These will be flushed as a single UndoEvent when the action completes.
   * If length > 0, a flush is already enqueued.
   */
  private pendingChanges: UndoableChange[] = []

  /**
   * State saved at the start of the current pending event (before any changes).
   * This is captured lazily when the first change is intercepted.
   * Undefined means it hasn't been captured yet for the current event.
   */
  private attachedStateBeforeNextEvent: TAttachedState | undefined

  constructor(options: UndoManagerOptions<TAttachedState>) {
    this.rootNode = options.rootNode
    this.store = options.store ?? createUndoStore()

    this._maxUndoLevels = options.maxUndoLevels ?? Number.POSITIVE_INFINITY
    this._maxRedoLevels = options.maxRedoLevels ?? Number.POSITIVE_INFINITY
    this.attachedState = options.attachedState
    this.groupingDebounceMs = options.groupingDebounceMs

    // Start tracking changes
    this.startTracking()
  }

  /**
   * Starts tracking changes on the root node.
   */
  private startTracking(): void {
    // Track intercepted changes to capture attached state BEFORE changes are committed
    this.interceptDisposer = onDeepInterceptedChange(this.rootNode, (change) => {
      // Skip if recording is disabled
      if (this.isRecordingDisabled) {
        return change
      }

      // Skip if the change is to the UndoStore itself
      const isUndoStoreChange =
        change.object === this.store || isChildOfParent(change.object, this.store)
      if (isUndoStoreChange) {
        return change
      }

      // Capture attached state before the first change of this event
      if (this.attachedState && this.pendingChanges.length === 0) {
        this.attachedStateBeforeNextEvent = this.attachedState.save()
      }

      return change
    })

    // Track committed changes to record them in the undo queue
    this.disposer = onDeepChange(this.rootNode, (change: NodeChange) => {
      // Skip if recording is disabled
      if (this.isRecordingDisabled) {
        return
      }

      // Skip if the change is to the UndoStore itself
      const isUndoStoreChange =
        change.object === this.store || isChildOfParent(change.object, this.store)
      if (isUndoStoreChange) {
        return
      }

      // Record the change
      this.recordChange(captureChange(change, this.rootNode))
    })
  }

  /**
   * Records a change. If this is the first change in an action, schedules a flush.
   */
  private recordChange(change: UndoableChange): void {
    this.pendingChanges.push(change)

    // If this is the first change, schedule a flush
    if (this.pendingChanges.length === 1) {
      this.scheduleFlush()
    }
  }

  /**
   * Schedules a flush to occur when the current action completes.
   */
  private scheduleFlush(): void {
    when(
      () => true,
      () => {
        this.flushPendingChanges()
      }
    )
  }

  /**
   * Flushes pending changes as a single UndoEvent.
   */
  private flushPendingChanges(): void {
    if (this.pendingChanges.length === 0) {
      return
    }

    const now = performance.now()

    runInAction(() => {
      // Save attached state after the event (this becomes the "before" state for the next event)
      const attachedStateAfterEvent = this.attachedState?.save()

      const shouldMergeWithLastEvent =
        this.groupingDebounceMs !== undefined &&
        this.lastEventTimestamp !== undefined &&
        this.store.undoEvents.length > 0 &&
        now - this.lastEventTimestamp <= this.groupingDebounceMs

      if (shouldMergeWithLastEvent) {
        // Merge with the last undo event by creating a new event with combined changes
        const lastEvent = this.store.undoEvents[this.store.undoEvents.length - 1]
        const mergedChanges = [...lastEvent.changes, ...this.pendingChanges]

        // Create new event with merged changes
        const mergedEvent = TUndoEvent({
          changes: mergedChanges,
          attachedState: lastEvent.attachedState
            ? {
                beforeEvent: lastEvent.attachedState.beforeEvent,
                afterEvent: attachedStateAfterEvent,
              }
            : undefined,
        })

        // Replace the last event with the merged one
        this.store.undoEvents[this.store.undoEvents.length - 1] = mergedEvent
      } else {
        // Create the undo event
        const event = TUndoEvent({
          changes: this.pendingChanges,
          attachedState: this.attachedState
            ? {
                beforeEvent: this.attachedStateBeforeNextEvent,
                afterEvent: attachedStateAfterEvent,
              }
            : undefined,
        })

        // Add to undo queue
        this.store.undoEvents.push(event)
      }

      // Enforce max undo levels
      while (this.store.undoEvents.length > this._maxUndoLevels) {
        this.store.undoEvents.shift()
      }

      // Clear redo queue
      this.store.redoEvents.length = 0

      // Reset pending changes to a new array
      this.pendingChanges = []

      // Reset the attached state so the next event will capture new state
      this.attachedStateBeforeNextEvent = undefined

      // Update the timestamp for debounce logic
      this.lastEventTimestamp = now
    })
  }

  /**
   * The undo queue.
   */
  get undoQueue(): ReadonlyArray<UndoEvent> {
    return this.store.undoEvents
  }

  /**
   * The redo queue.
   */
  get redoQueue(): ReadonlyArray<UndoEvent> {
    return this.store.redoEvents
  }

  /**
   * Number of undo steps available.
   */
  get undoLevels(): number {
    return this.store.undoEvents.length
  }

  /**
   * Whether undo is possible.
   */
  get canUndo(): boolean {
    return this.undoLevels > 0
  }

  /**
   * Number of redo steps available.
   */
  get redoLevels(): number {
    return this.store.redoEvents.length
  }

  /**
   * Whether redo is possible.
   */
  get canRedo(): boolean {
    return this.redoLevels > 0
  }

  /**
   * Maximum number of undo levels to keep.
   */
  get maxUndoLevels(): number {
    return this._maxUndoLevels
  }

  /**
   * Maximum number of redo levels to keep.
   */
  get maxRedoLevels(): number {
    return this._maxRedoLevels
  }

  /**
   * Undoes the last change.
   * @throws if called while inside a MobX action
   * @throws if there are no undo events
   */
  undo(): void {
    if (isInsideMobxAction()) {
      throw failure("cannot call undo() while inside a MobX action")
    }

    this.undoAction()
  }

  @action
  private undoAction(): void {
    if (!this.canUndo) {
      throw failure("nothing to undo")
    }

    const event = this.store.undoEvents.pop()!

    // Save current attached state before restoring and create updated event
    let eventToStore = event
    if (event.attachedState && this.attachedState) {
      const currentState = this.attachedState.save()
      // Create a new event with updated afterEvent state
      eventToStore = TUndoEvent({
        changes: event.changes,
        attachedState: {
          beforeEvent: event.attachedState.beforeEvent,
          afterEvent: currentState,
        },
      })
    }

    // Apply changes in reverse
    this.withoutUndo(() => {
      for (let i = event.changes.length - 1; i >= 0; i--) {
        applyChange(this.rootNode, event.changes[i], "reverse")
      }
    })

    // Add to redo queue
    this.store.redoEvents.push(eventToStore)

    // Enforce max redo levels (keep most recent, remove oldest from end)
    while (this.store.redoEvents.length > this._maxRedoLevels) {
      this.store.redoEvents.pop()
    }

    // Restore attached state
    if (event.attachedState && this.attachedState) {
      this.attachedState.restore(event.attachedState.beforeEvent as TAttachedState)
    }
  }

  /**
   * Redoes the last undone change.
   * @throws if called while inside a MobX action
   * @throws if there are no redo events
   */
  redo(): void {
    if (isInsideMobxAction()) {
      throw failure("cannot call redo() while inside a MobX action")
    }

    this.redoAction()
  }

  @action
  private redoAction(): void {
    if (!this.canRedo) {
      throw failure("nothing to redo")
    }

    const event = this.store.redoEvents.pop()!

    // Save current attached state before restoring and create updated event
    let eventToStore = event
    if (event.attachedState && this.attachedState) {
      const currentState = this.attachedState.save()
      // Create a new event with updated beforeEvent state
      eventToStore = TUndoEvent({
        changes: event.changes,
        attachedState: {
          beforeEvent: currentState,
          afterEvent: event.attachedState.afterEvent,
        },
      })
    }

    // Apply changes forward
    this.withoutUndo(() => {
      for (const change of event.changes) {
        applyChange(this.rootNode, change, "forward")
      }
    })

    // Add back to undo queue
    this.store.undoEvents.push(eventToStore)

    // Enforce max undo levels
    while (this.store.undoEvents.length > this._maxUndoLevels) {
      this.store.undoEvents.shift()
    }

    // Restore attached state
    if (event.attachedState && this.attachedState) {
      this.attachedState.restore(event.attachedState.afterEvent as TAttachedState)
    }
  }

  /**
   * Clears the undo queue.
   */
  @action
  clearUndo(): void {
    this.store.undoEvents.length = 0
  }

  /**
   * Clears the redo queue.
   */
  @action
  clearRedo(): void {
    this.store.redoEvents.length = 0
  }

  /**
   * Executes a function without recording changes.
   */
  withoutUndo<T>(fn: () => T): T {
    const wasDisabled = this.isRecordingDisabled
    this.isRecordingDisabled = true
    try {
      return fn()
    } finally {
      this.isRecordingDisabled = wasDisabled
    }
  }

  /**
   * Whether undo recording is currently disabled.
   */
  get isUndoRecordingDisabled(): boolean {
    return this.isRecordingDisabled
  }

  /**
   * Disposes the undo manager, stopping change tracking.
   */
  dispose(): void {
    if (this.disposer) {
      this.disposer()
      this.disposer = undefined
    }
    if (this.interceptDisposer) {
      this.interceptDisposer()
      this.interceptDisposer = undefined
    }
  }
}
