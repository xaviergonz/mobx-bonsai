import { runInAction } from "mobx"
import { nodeType } from "../../src/node/nodeTypeKey/nodeType"
import { UndoManager } from "../../src/undo/UndoManager"
import "../commonSetup"

describe("UndoManager - Dispose", () => {
  type Counter = {
    value: number
  }

  const TCounter = nodeType<Counter>().defaults({
    value: () => 0,
  })

  test("dispose should stop tracking changes", () => {
    const counter = TCounter({ value: 0 })
    const manager = new UndoManager({ rootNode: counter })

    runInAction(() => {
      counter.value = 1
    })

    expect(manager.undoLevels).toBe(1)

    manager.dispose()

    runInAction(() => {
      counter.value = 2
    })

    // No new undo event after dispose
    expect(manager.undoLevels).toBe(1)
  })

  test("dispose can be called multiple times safely", () => {
    const counter = TCounter({ value: 0 })
    const manager = new UndoManager({ rootNode: counter })

    expect(() => {
      manager.dispose()
      manager.dispose()
      manager.dispose()
    }).not.toThrow()
  })
})
