import { runInAction } from "mobx"
import { nodeType } from "../../src/node/nodeTypeKey/nodeType"
import { applySnapshot } from "../../src/node/snapshot/applySnapshot"
import { getSnapshot } from "../../src/node/snapshot/getSnapshot"
import { UndoManager } from "../../src/undo/UndoManager"
import "../commonSetup"

describe("UndoManager - Store Snapshot", () => {
  type Counter = {
    value: number
  }

  const TCounter = nodeType<Counter>().defaults({
    value: () => 0,
  })

  test("should support serializing and deserializing UndoStore", () => {
    const counter = TCounter({ value: 0 })
    const manager = new UndoManager({ rootNode: counter })

    // Make changes and undo once
    runInAction(() => {
      counter.value = 5
    })
    runInAction(() => {
      counter.value = 10
    })
    manager.undo()

    // Serialize and deserialize through JSON
    const serialized = JSON.stringify(getSnapshot(manager.store))
    const deserialized = JSON.parse(serialized)

    manager.clearUndo()
    manager.clearRedo()
    applySnapshot(manager.store, deserialized)

    // Verify undo/redo works after deserialization
    expect(manager.undoLevels).toBe(1)
    expect(manager.redoLevels).toBe(1)
    manager.undo()
    expect(counter.value).toBe(0)
    manager.redo()
    expect(counter.value).toBe(5)

    manager.dispose()
  })
})
