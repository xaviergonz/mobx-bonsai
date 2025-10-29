import { runInAction } from "mobx"
import { nodeType } from "../../src/node/nodeTypeKey/nodeType"
import { UndoManager } from "../../src/undo/UndoManager"
import "../commonSetup"

describe("UndoManager - Max Levels", () => {
  type Counter = {
    value: number
  }

  const TCounter = nodeType<Counter>().defaults({
    value: () => 0,
  })

  test("should respect maxUndoLevels", () => {
    const counter = TCounter({ value: 0 })
    const manager = new UndoManager({
      rootNode: counter,
      maxUndoLevels: 2,
    })

    runInAction(() => {
      counter.value = 1
    })
    runInAction(() => {
      counter.value = 2
    })
    runInAction(() => {
      counter.value = 3
    })

    expect(manager.undoLevels).toBe(2)

    manager.undo()
    expect(counter.value).toBe(2)

    manager.undo()
    expect(counter.value).toBe(1)

    // Can't undo further
    expect(manager.canUndo).toBe(false)

    manager.dispose()
  })

  test("should respect maxRedoLevels", () => {
    const counter = TCounter({ value: 0 })
    const manager = new UndoManager({
      rootNode: counter,
      maxRedoLevels: 2,
    })

    runInAction(() => {
      counter.value = 1
    })
    runInAction(() => {
      counter.value = 2
    })
    runInAction(() => {
      counter.value = 3
    })

    // Undo all
    manager.undo()
    manager.undo()
    manager.undo()

    expect(manager.redoLevels).toBe(2) // Only 2 redo levels kept

    manager.redo()
    expect(counter.value).toBe(2)

    manager.redo()
    expect(counter.value).toBe(3)

    // Can't redo further
    expect(manager.canRedo).toBe(false)

    manager.dispose()
  })
})
