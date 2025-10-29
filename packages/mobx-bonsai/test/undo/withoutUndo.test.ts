import { runInAction } from "mobx"
import { nodeType } from "../../src/node/nodeTypeKey/nodeType"
import { UndoManager } from "../../src/undo/UndoManager"
import "../commonSetup"

describe("UndoManager - withoutUndo", () => {
  type Counter = {
    value: number
    temp: number
  }

  const TCounter = nodeType<Counter>().defaults({
    value: () => 0,
    temp: () => 0,
  })

  test("withoutUndo should prevent recording changes", () => {
    const counter = TCounter({ value: 0, temp: 0 })
    const manager = new UndoManager({ rootNode: counter })

    // Normal change - should be recorded
    runInAction(() => {
      counter.value = 1
    })

    expect(manager.undoLevels).toBe(1)

    // Change within withoutUndo - should NOT be recorded
    manager.withoutUndo(() => {
      runInAction(() => {
        counter.value = 2
      })
    })

    expect(manager.undoLevels).toBe(1)
    expect(counter.value).toBe(2)

    manager.undo()
    expect(counter.value).toBe(0) // Undoes to initial value, skipping the withoutUndo change

    // Test mixing tracked and untracked changes in a single action
    runInAction(() => {
      counter.value = 5 // This should be tracked
      manager.withoutUndo(() => {
        counter.temp = 100 // This should NOT be tracked
      })
    })

    expect(manager.undoLevels).toBe(1)
    expect(counter.value).toBe(5)
    expect(counter.temp).toBe(100)

    manager.undo()
    expect(counter.value).toBe(0) // Undoes the tracked change
    expect(counter.temp).toBe(100) // The untracked change remains

    manager.dispose()
  })

  test("withoutUndo should return function result", () => {
    const counter = TCounter({ value: 0 })
    const manager = new UndoManager({ rootNode: counter })

    const result = manager.withoutUndo(() => {
      runInAction(() => {
        counter.value = 42
      })
      return "success"
    })

    expect(result).toBe("success")
    expect(counter.value).toBe(42)
    expect(manager.undoLevels).toBe(0)

    manager.dispose()
  })

  test("withoutUndo should be nestable", () => {
    const counter = TCounter({ value: 0 })
    const manager = new UndoManager({ rootNode: counter })

    manager.withoutUndo(() => {
      manager.withoutUndo(() => {
        runInAction(() => {
          counter.value = 100
        })
      })
    })

    expect(counter.value).toBe(100)
    expect(manager.undoLevels).toBe(0)

    manager.dispose()
  })

  test("isUndoRecordingDisabled should reflect current state", () => {
    const counter = TCounter({ value: 0 })
    const manager = new UndoManager({ rootNode: counter })

    expect(manager.isUndoRecordingDisabled).toBe(false)

    manager.withoutUndo(() => {
      expect(manager.isUndoRecordingDisabled).toBe(true)
    })

    expect(manager.isUndoRecordingDisabled).toBe(false)

    manager.dispose()
  })
})
