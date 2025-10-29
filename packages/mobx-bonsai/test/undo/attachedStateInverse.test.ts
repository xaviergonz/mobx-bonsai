import { runInAction } from "mobx"
import { nodeType } from "../../src/node/nodeTypeKey/nodeType"
import { UndoManager } from "../../src/undo/UndoManager"
import "../commonSetup"

describe("UndoManager - Attached State Inverse", () => {
  type Counter = {
    value: number
  }

  const TCounter = nodeType<Counter>().defaults({
    value: () => 0,
  })

  test("should preserve attached state changes made between undo/redo operations", () => {
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

    // Action 1: cursor at 10, change value to 1
    externalState.cursor = 10
    runInAction(() => {
      counter.value = 1
    })

    // Current state: value=1, cursor=10
    expect(counter.value).toBe(1)
    expect(externalState.cursor).toBe(10)

    // User moves cursor to 20 (no tracked changes)
    externalState.cursor = 20

    // Now undo
    manager.undo()

    // Should restore: value=0, cursor=10 (before the action)
    expect(counter.value).toBe(0)
    expect(externalState.cursor).toBe(10)

    // User moves cursor to 30 (no tracked changes)
    externalState.cursor = 30

    // Now redo
    manager.redo()

    // Should restore: value=1, cursor=20 (the state that existed before undo was called)
    expect(counter.value).toBe(1)
    expect(externalState.cursor).toBe(20) // Now preserved!

    manager.undo()

    // back to what was before the last redo
    expect(counter.value).toBe(0)
    expect(externalState.cursor).toBe(30)

    manager.dispose()
  })
})
