import { runInAction } from "mobx"
import { nodeType } from "../../src/node/nodeTypeKey/nodeType"
import { UndoManager } from "../../src/undo/UndoManager"
import "../commonSetup"

describe("UndoManager - Attached State", () => {
  type Counter = {
    value: number
  }

  const TCounter = nodeType<Counter>().defaults({
    value: () => 0,
  })

  test("attached state save and restore", () => {
    const counter = TCounter({ value: 0 })
    const externalState = { cursor: 0 }

    const manager = new UndoManager<{ cursor: number }>({
      rootNode: counter,
      attachedState: {
        save: () => ({ cursor: externalState.cursor }),
        restore: (state) => {
          externalState.cursor = state.cursor
        },
      },
    })

    // First change: cursor at 10, change value to 1
    externalState.cursor = 10
    runInAction(() => {
      counter.value = 1
      // Cursor is still at 10 after the action
    })

    // Second change: cursor at 20, change value to 2
    externalState.cursor = 20
    runInAction(() => {
      counter.value = 2
      // Cursor is still at 20 after the action
    })

    expect(counter.value).toBe(2)
    expect(externalState.cursor).toBe(20)

    // Undo - should restore counter to 1 and cursor to 20 (the state before the second change)
    externalState.cursor = 30
    manager.undo()

    expect(counter.value).toBe(1)
    expect(externalState.cursor).toBe(20)

    // Undo again - should restore counter to 0 and cursor to 10 (the state before the first change)
    manager.undo()

    expect(counter.value).toBe(0)
    expect(externalState.cursor).toBe(10)

    // Redo - should restore counter to 1 and cursor to 20 (the cursor state before the second undo)
    manager.redo()

    expect(counter.value).toBe(1)
    expect(externalState.cursor).toBe(20)

    // Redo again - should restore counter to 2 and cursor to 30 (the state after the undo)
    manager.redo()

    expect(counter.value).toBe(2)
    expect(externalState.cursor).toBe(30)

    manager.dispose()
  })

  test("attached state should capture 'before' state right before change, not at end of previous event", () => {
    const counter = TCounter({ value: 0 })
    const externalState = { cursor: 0 }

    const manager = new UndoManager<{ cursor: number }>({
      rootNode: counter,
      attachedState: {
        save: () => ({ cursor: externalState.cursor }),
        restore: (state) => {
          externalState.cursor = state.cursor
        },
      },
    })

    // First change: cursor at 0, change value to 1
    externalState.cursor = 0
    runInAction(() => {
      counter.value = 1
    })
    // After action completes, cursor is still at 0

    // Now user moves cursor (outside of any tracked action)
    externalState.cursor = 10

    // Second change: cursor at 10, change value to 2
    runInAction(() => {
      counter.value = 2
    })

    // Current state: value=2, cursor=10
    expect(counter.value).toBe(2)
    expect(externalState.cursor).toBe(10)

    // Undo the second change
    // Should restore: value=1, cursor=10 (the cursor position BEFORE the second change)
    manager.undo()

    expect(counter.value).toBe(1)
    expect(externalState.cursor).toBe(10) // This will FAIL with current implementation (will be 0)

    manager.dispose()
  })
})
